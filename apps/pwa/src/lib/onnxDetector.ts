// onnxDetector.ts — real YOLOv8s PPE detector (Owner: Dhruv, deliverable #4)
//
// Loads public/models/ppe_model.onnx with ONNX Runtime Web, runs it on each
// camera frame, and emits the same Detection[] shape as mockDetector.ts so the
// frame loop can swap between them with one line:
//
//   const detections = mockDetect(frameId, ts);              // mock
//   const detections = await onnx.detect(video, frameId, ts); // real
//
// Like mockDetector, this owns its frame buffer and calls postProcess() before
// returning, so downstream (SORT → HMI → Risk) is identical for both detectors.
//
// Model facts (apps/pwa/README.md):
//   input  'float32 [1,3,640,640]' NCHW, normalised 0–1, letterboxed
//   output 'float32 [1,29,8400]'   rows = [cx,cy,w,h, cls0..cls24] in 640 px space
//
// bbox convention out: [x, y, w, h] TOP-LEFT, normalised to the ORIGINAL frame
// (letterbox padding reversed) — matches postProcessor.ts / hmiEngine.ts.

import * as ort from 'onnxruntime-web';
import type { Detection, DetectionClass } from '@suraksha/shared/contracts';
import { postProcess, computeIoU, FRAME_BUFFER_SIZE } from './postProcessor';

// ============================================================
// Constants
// ============================================================

const MODEL_URL = '/models/ppe_model.onnx';
const INPUT_SIZE = 640;
const NUM_CLASSES = 25;   // raw model classes
const NUM_ANCHORS = 8400;
/** Pre-NMS gate. postProcess() applies the real per-class thresholds afterwards. */
const CONF_THRESHOLD = 0.2;
/** IoU above which the lower-confidence box of the same class is suppressed. */
const NMS_IOU = 0.45;

// Raw model index → DetectionClass. Indices not listed (6, 9–10, 12–24) are
// vehicles/cones/etc. and ignored. Source: apps/pwa/README.md.
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
const MAPPED_INDICES = Object.keys(CLASS_MAP).map(Number);

/** Anything with width/height we can draw to a canvas. */
type FrameSource = HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

/** Letterbox transform needed to map model-space boxes back to the frame. */
type Letterbox = {
  scale: number; // frame px → 640 px
  padX: number;  // left padding in 640 space
  padY: number;  // top padding in 640 space
  srcW: number;  // original frame width
  srcH: number;  // original frame height
};

// ============================================================
// Detector
// ============================================================

export class OnnxDetector {
  private session: ort.InferenceSession | null = null;
  private inputName = 'images';
  private outputName = 'output0';

  // Reused across frames to avoid per-frame allocation.
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private readonly inputData = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE);

  // Caller-transparent frame buffer for postProcess temporal smoothing.
  private frameBuffer: Detection[][] = [];
  private frameCounter = 0;

  /** True once the model is loaded and ready to run. */
  get ready(): boolean {
    return this.session !== null;
  }

  /**
   * Load the model. Call once at app start; reuse the session for every frame.
   * @param modelUrl override for tests / alternate model versions.
   */
  async init(modelUrl: string = MODEL_URL): Promise<void> {
    if (this.session) return;

    // Serve the WASM backend from the site root (see README: copy *.wasm to public/).
    ort.env.wasm.wasmPaths = '/';

    this.session = await ort.InferenceSession.create(modelUrl, {
      executionProviders: ['webgpu', 'wasm'], // WebGPU, WASM fallback
    });

    // Don't assume tensor names — read them from the loaded graph.
    this.inputName = this.session.inputNames[0] ?? 'images';
    this.outputName = this.session.outputNames[0] ?? 'output0';
  }

  /**
   * Run detection on one frame. Mirrors mockDetect(): returns post-processed
   * Detection[] and advances the internal frame buffer.
   */
  async detect(
    source: FrameSource,
    frameId?: number,
    timestamp?: number,
  ): Promise<Detection[]> {
    if (!this.session) {
      throw new Error('OnnxDetector.detect() called before init() — await init() first.');
    }
    this.frameCounter++;
    const fid = frameId ?? this.frameCounter;
    const ts = timestamp ?? Date.now();

    const { tensor, letterbox } = this.preprocess(source);

    const outputs = await this.session.run({ [this.inputName]: tensor });
    const output = outputs[this.outputName];

    const candidates = parseOutput(output.data as Float32Array, letterbox, fid, ts);
    const deduped = nonMaxSuppression(candidates, NMS_IOU);

    // Append current frame, keep last FRAME_BUFFER_SIZE — same pattern as mockDetector.
    this.frameBuffer = [...this.frameBuffer.slice(-(FRAME_BUFFER_SIZE - 1)), deduped];
    return postProcess(deduped, this.frameBuffer, fid, ts);
  }

  /** Reset frame buffer + counter (e.g. when switching camera sources). */
  reset(): void {
    this.frameBuffer = [];
    this.frameCounter = 0;
  }

  /** Release the inference session. */
  async dispose(): Promise<void> {
    await this.session?.release();
    this.session = null;
  }

  // --- internals -------------------------------------------------

  /**
   * Letterbox the frame into a [1,3,640,640] float32 tensor (aspect preserved,
   * grey padding) and return the transform needed to undo it later.
   */
  private preprocess(source: FrameSource): { tensor: ort.Tensor; letterbox: Letterbox } {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.canvas.width = INPUT_SIZE;
      this.canvas.height = INPUT_SIZE;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = this.ctx!;

    const srcW = sourceWidth(source);
    const srcH = sourceHeight(source);
    const scale = Math.min(INPUT_SIZE / srcW, INPUT_SIZE / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const padX = (INPUT_SIZE - drawW) / 2;
    const padY = (INPUT_SIZE - drawH) / 2;

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    ctx.drawImage(source as CanvasImageSource, padX, padY, drawW, drawH);

    const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE); // RGBA uint8
    const px = INPUT_SIZE * INPUT_SIZE;
    const out = this.inputData;
    // RGBA → NCHW float32 normalised 0–1
    for (let i = 0; i < px; i++) {
      out[i] = data[i * 4] / 255;             // R
      out[px + i] = data[i * 4 + 1] / 255;    // G
      out[2 * px + i] = data[i * 4 + 2] / 255; // B
    }

    const tensor = new ort.Tensor('float32', out, [1, 3, INPUT_SIZE, INPUT_SIZE]);
    return { tensor, letterbox: { scale, padX, padY, srcW, srcH } };
  }
}

// ============================================================
// Output parsing — model space → normalised original-frame Detection[]
// ============================================================

/**
 * Parse the [1,29,8400] tensor into Detection[], reversing the letterbox so
 * bboxes are normalised to the ORIGINAL frame. Confidence-gated; NMS happens next.
 */
function parseOutput(
  data: Float32Array,
  lb: Letterbox,
  frameId: number,
  timestamp: number,
): Detection[] {
  const detections: Detection[] = [];

  for (let a = 0; a < NUM_ANCHORS; a++) {
    const cx = data[0 * NUM_ANCHORS + a];
    const cy = data[1 * NUM_ANCHORS + a];
    const bw = data[2 * NUM_ANCHORS + a];
    const bh = data[3 * NUM_ANCHORS + a];

    // Highest-scoring class among the ones we map.
    let bestScore = CONF_THRESHOLD;
    let bestRawIdx = -1;
    for (const rawIdx of MAPPED_INDICES) {
      const score = data[(4 + rawIdx) * NUM_ANCHORS + a];
      if (score > bestScore) {
        bestScore = score;
        bestRawIdx = rawIdx;
      }
    }
    if (bestRawIdx === -1) continue;

    // Reverse letterbox: 640-space px → original-frame px → normalised 0–1 top-left.
    const ox = (cx - lb.padX) / lb.scale;
    const oy = (cy - lb.padY) / lb.scale;
    const ow = bw / lb.scale;
    const oh = bh / lb.scale;

    const x = clamp01((ox - ow / 2) / lb.srcW);
    const y = clamp01((oy - oh / 2) / lb.srcH);
    const w = clamp01(ow / lb.srcW);
    const h = clamp01(oh / lb.srcH);

    detections.push({
      class: CLASS_MAP[bestRawIdx],
      bbox: [x, y, w, h],
      confidence: bestScore,
      frameId,
      timestamp,
    });
  }

  return detections;
}

/**
 * Greedy per-class Non-Max Suppression. YOLOv8 emits many overlapping anchors
 * per object; without this, downstream would see dozens of boxes per worker.
 * Reuses computeIoU from postProcessor (top-left [x,y,w,h]).
 */
export function nonMaxSuppression(detections: Detection[], iouThreshold: number): Detection[] {
  const byClass = new Map<DetectionClass, Detection[]>();
  for (const d of detections) {
    const arr = byClass.get(d.class);
    if (arr) arr.push(d);
    else byClass.set(d.class, [d]);
  }

  const kept: Detection[] = [];
  for (const group of byClass.values()) {
    group.sort((a, b) => b.confidence - a.confidence);
    const suppressed = new Array<boolean>(group.length).fill(false);
    for (let i = 0; i < group.length; i++) {
      if (suppressed[i]) continue;
      kept.push(group[i]);
      for (let j = i + 1; j < group.length; j++) {
        if (!suppressed[j] && computeIoU(group[i].bbox, group[j].bbox) > iouThreshold) {
          suppressed[j] = true;
        }
      }
    }
  }
  return kept;
}

// ============================================================
// Helpers
// ============================================================

function sourceWidth(s: FrameSource): number {
  return s instanceof HTMLVideoElement ? s.videoWidth : s.width;
}
function sourceHeight(s: FrameSource): number {
  return s instanceof HTMLVideoElement ? s.videoHeight : s.height;
}
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Singleton convenience — most callers want one detector for the app's lifetime. */
export const onnxDetector = new OnnxDetector();
