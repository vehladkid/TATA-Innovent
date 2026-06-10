# apps/pwa

> Phone-side Progressive Web App — Owner: Dhruv (ML pipeline) + Amber (UI/UX)

## Responsibilities
- Camera capture via `getUserMedia`
- On-device PPE detection (YOLOv8n via ONNX Runtime Web)
- Pose estimation (MediaPipe PoseLandmarker)
- SORT tracker (imported from `packages/shared/sort.ts`)
- HMI Engine: zone occupancy, velocity, trajectory, posture, fall detection
- Risk Engine: score formula, breakdown, banding
- On-device Hindi voice alerts + Vibration API
- IndexedDB offline buffer + WebSocket sync to backend
- PWA install: service worker, manifest, QR flow

## Stack
Next.js 14 · ONNX Runtime Web · MediaPipe · Zustand · TypeScript

## Dev
```bash
pnpm dev   # → http://localhost:3001
```

---

## ONNX Model — `public/models/ppe_model.onnx`

### Model facts

| Property | Value |
|---|---|
| Architecture | YOLOv8s (fine-tuned) |
| Training dataset | SH17 + Hard Hat Workers + Pictor-PPE (merged, ~29 GB raw) |
| Input tensor | `float32 [1, 3, 640, 640]` — NCHW, normalised 0–1 |
| Output tensor | `float32 [1, 29, 8400]` — 4 bbox coords + 25 class scores × 8 400 anchors |
| File size | ~43 MB — committed directly (under GitHub's 100 MB limit) |
| Training script | `ml/training/train.py` |

### Raw class index → DetectionClass mapping

The model has 25 raw output classes. We only map 9 to `DetectionClass` (contracts.ts). Everything else is ignored at inference time.

| Raw index | Model label | `DetectionClass` |
|---|---|---|
| 0 | Excavator | `excavator` |
| 1 | Gloves | `gloves` |
| 2 | Hardhat | `helmet` |
| 3 | Ladder | `ladder` |
| 4 | Mask | `mask` |
| 5 | NO-Hardhat | `no_helmet` |
| 7 | NO-Safety Vest | `no_vest` |
| 8 | Person | `person` |
| 11 | Safety Vest | `vest` |
| 6, 9–10, 12–24 | (other vehicles / cones / etc.) | ← **skip** |

### Install ONNX Runtime Web

```bash
pnpm add onnxruntime-web
```

Copy the WASM backend files to your public directory (required for in-browser inference):

```bash
# from your project root
cp node_modules/onnxruntime-web/dist/*.wasm public/
```

Or configure Vite to serve them automatically:

```ts
// vite.config.ts
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    viteStaticCopy({
      targets: [{ src: 'node_modules/onnxruntime-web/dist/*.wasm', dest: '.' }],
    }),
  ],
});
```

### Load the model

```ts
import * as ort from 'onnxruntime-web';

// Point the WASM backend at the files you copied above
ort.env.wasm.wasmPaths = '/';

// Load once at app start — reuse the session for every frame
const session = await ort.InferenceSession.create('/models/ppe_model.onnx', {
  executionProviders: ['webgpu', 'wasm'],  // WebGPU with WASM fallback
});
```

### Preprocess a camera frame

```ts
/**
 * Convert an HTMLVideoElement (or canvas) to a [1, 3, 640, 640] float32 tensor.
 * Letterboxes the image to preserve aspect ratio.
 */
function preprocessFrame(video: HTMLVideoElement): ort.Tensor {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d')!;

  // Letterbox: grey background + centred image
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 640, 640);
  const scale = Math.min(640 / video.videoWidth, 640 / video.videoHeight);
  const dw   = (640 - video.videoWidth  * scale) / 2;
  const dh   = (640 - video.videoHeight * scale) / 2;
  ctx.drawImage(video, dw, dh, video.videoWidth * scale, video.videoHeight * scale);

  const { data } = ctx.getImageData(0, 0, 640, 640);  // RGBA uint8

  // RGBA → NCHW float32, normalised 0–1
  const float32 = new Float32Array(1 * 3 * 640 * 640);
  for (let i = 0; i < 640 * 640; i++) {
    float32[i]               = data[i * 4]     / 255;  // R channel
    float32[640 * 640 + i]   = data[i * 4 + 1] / 255;  // G channel
    float32[2 * 640 * 640 + i] = data[i * 4 + 2] / 255; // B channel
  }
  return new ort.Tensor('float32', float32, [1, 3, 640, 640]);
}
```

### Run inference

```ts
const inputTensor = preprocessFrame(videoElement);

const { output0 } = await session.run({ images: inputTensor });
// output0.dims → [1, 29, 8400]
// output0.data → Float32Array of length 29 × 8400
```

### Parse output → Detection[]

```ts
import type { Detection, DetectionClass } from '@suraksha/shared/contracts';

// Only these raw indices map to a DetectionClass we care about
const CLASS_MAP: Record<number, DetectionClass> = {
   0: 'excavator',
   1: 'gloves',
   2: 'helmet',
   3: 'ladder',
   4: 'mask',
   5: 'no_helmet',
   7: 'no_vest',
   8: 'person',
  11: 'vest',
};

const CONF_THRESHOLD = 0.20;  // pre-NMS gate — postProcess() applies per-class thresholds

function parseOutput(
  output: ort.Tensor,
  frameId: number,
  timestamp: number,
): Detection[] {
  const data     = output.data as Float32Array;
  const numClasses  = 25;
  const numAnchors  = 8400;
  const detections: Detection[] = [];

  for (let a = 0; a < numAnchors; a++) {
    // YOLOv8 output layout: rows = [cx, cy, w, h, cls0…cls24]
    const cx = data[0 * numAnchors + a];
    const cy = data[1 * numAnchors + a];
    const bw = data[2 * numAnchors + a];
    const bh = data[3 * numAnchors + a];

    // Find the highest-scoring class among the ones we care about
    let bestScore = CONF_THRESHOLD;
    let bestRawIdx = -1;
    for (const rawIdx of Object.keys(CLASS_MAP).map(Number)) {
      const score = data[(4 + rawIdx) * numAnchors + a];
      if (score > bestScore) { bestScore = score; bestRawIdx = rawIdx; }
    }
    if (bestRawIdx === -1) continue;

    // Convert cx/cy/w/h (pixels, 640-space) → [x, y, w, h] normalised 0–1
    const x = (cx - bw / 2) / 640;
    const y = (cy - bh / 2) / 640;
    const w = bw / 640;
    const h = bh / 640;

    detections.push({
      class:      CLASS_MAP[bestRawIdx],
      bbox:       [x, y, w, h],
      confidence: bestScore,
      frameId,
      timestamp,
    });
  }

  return detections;  // feed into postProcess() from src/lib/postProcessor.ts
}
```

### Full per-frame pipeline

```ts
import { postProcess, FRAME_BUFFER_SIZE } from './src/lib/postProcessor';
import type { Detection } from '@suraksha/shared/contracts';

let frameBuffer: Detection[][] = [];
let frameId = 0;

async function onAnimationFrame(video: HTMLVideoElement) {
  frameId++;
  const ts = Date.now();

  const tensor = preprocessFrame(video);
  const { output0 } = await session.run({ images: tensor });

  const raw = parseOutput(output0, frameId, ts);

  // Append current frame, keep last FRAME_BUFFER_SIZE entries
  frameBuffer = [...frameBuffer.slice(-(FRAME_BUFFER_SIZE - 1)), raw];

  // Apply thresholds, FP suppression, Person+Vest inference, temporal smoothing
  const detections = postProcess(raw, frameBuffer, frameId, ts);

  // Hand off to SORT tracker → HMI Engine → Risk Engine
  renderBoundingBoxes(detections);
}
```

### Swapping the mock detector

When the model is ready, replace the `mockDetect()` call with the real pipeline:

```ts
// Before (Week 1 parallel dev)
const detections = mockDetect(frameId, ts);

// After (real ONNX pipeline)
const { output0 } = await session.run({ images: preprocessFrame(video) });
const raw = parseOutput(output0, frameId, ts);
frameBuffer = [...frameBuffer.slice(-(FRAME_BUFFER_SIZE - 1)), raw];
const detections = postProcess(raw, frameBuffer, frameId, ts);
```

`mockDetector.ts` stays in the codebase as a fallback — toggle via `NEXT_PUBLIC_USE_MOCK_DETECTOR=true`.
