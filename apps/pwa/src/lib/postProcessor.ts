// postProcessor.ts — PPE detection post-processing layer
// Sits between raw YOLO NMS output and the SORT tracker / HMI Engine.
// Pure: no I/O, no side effects. Smoothing state is caller-owned.
//
// CONTRACT NOTES:
//   - Keys on DetectionClass from contracts.ts ('helmet', not 'hardhat').
//   - 'ladder', 'gloves', 'mask' omitted — not yet in DetectionClass; add via contract PR.
//   - Temporal smoothing uses class+bbox-hash as object proxy; true per-trackId smoothing
//     requires post-SORT TrackedPerson[] and is a separate pipeline stage.

import type { Detection, DetectionClass } from '@suraksha/shared/contracts';

// Local extension — adds inferred flag to synthetic no_vest detections.
// Do NOT import from contracts.ts; this field does not exist there yet.
// A future contract PR can promote it. Downstream consumers import ProcessedDetection
// from this module to get typed access to the flag.
export type ProcessedDetection = Detection & { inferred?: true };

// ------------------------------------------------------------
// Per-class confidence thresholds
// 'helmet' mirrors contracts.ts DetectionClass (spec called it 'hardhat').
// Intended future entries (pending contract PR):
//   'ladder': 0.50,  'gloves': 0.45,  'mask': 0.40
// ------------------------------------------------------------
const CLASS_THRESHOLDS: Record<DetectionClass, number> = {
  helmet:    0.55,
  no_helmet: 0.25,
  vest:      0.55,
  no_vest:   0.20,
  person:    0.30,
  excavator: 0.55,
};

// Classes where a positive detection means a PPE violation.
// These require 3/5 frames to confirm (vs 2/5 for presence classes).
const VIOLATION_CLASSES = new Set<DetectionClass>(['no_helmet', 'no_vest']);

// ------------------------------------------------------------
// Temporal smoothing state
// Key: `${class}:${quantizedBbox}` — stable object proxy without trackId.
// Value: ring of booleans, one per frame, newest last. Max FRAME_BUFFER_SIZE.
// Caller creates this once and passes it on every postProcess() call.
// ------------------------------------------------------------
export type SmoothingBuffer = Map<string, boolean[]>;

export function createSmoothingBuffer(): SmoothingBuffer {
  return new Map();
}

const FRAME_BUFFER_SIZE = 5;
const VIOLATION_MIN_FRAMES = 3;
const PRESENCE_MIN_FRAMES = 2;

// Quantize a bbox coordinate to 2.5 % grid to absorb inter-frame jitter.
function quantize(v: number): number {
  return Math.round(v * 40) / 40;
}

function bboxKey(bbox: [number, number, number, number]): string {
  return bbox.map(quantize).join(',');
}

function smoothingKey(cls: DetectionClass, bbox: [number, number, number, number]): string {
  return `${cls}:${bboxKey(bbox)}`;
}

// ------------------------------------------------------------
// IoU — both boxes in [x, y, w, h] normalized 0-1 format
// ------------------------------------------------------------
export function computeIoU(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const ax2 = a[0] + a[2];
  const ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2];
  const by2 = b[1] + b[3];

  const ix1 = Math.max(a[0], b[0]);
  const iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(ax2, bx2);
  const iy2 = Math.min(ay2, by2);

  const iw = Math.max(0, ix2 - ix1);
  const ih = Math.max(0, iy2 - iy1);
  const intersection = iw * ih;
  if (intersection === 0) return 0;

  const aArea = a[2] * a[3];
  const bArea = b[2] * b[3];
  return intersection / (aArea + bArea - intersection);
}

// ------------------------------------------------------------
// Stage 1 — Per-class threshold filtering
// ------------------------------------------------------------
function applyThresholds(detections: Detection[]): Detection[] {
  return detections.filter(d => d.confidence >= CLASS_THRESHOLDS[d.class]);
}

// ------------------------------------------------------------
// Stage 2 — False-positive suppression
//   • Drop bbox area > 70 % of image (whole-frame spurious detection)
//   • Drop bbox area < 0.5 % of image (too small to be meaningful)
//   • Resolve helmet ↔ no_helmet conflicts at the same bbox: keep higher confidence
// ------------------------------------------------------------
function suppressFalsePositives(detections: Detection[]): Detection[] {
  // Area filter pass
  const areaFiltered = detections.filter(d => {
    const area = d.bbox[2] * d.bbox[3];
    return area >= 0.005 && area <= 0.7;
  });

  // Separate helmet / no_helmet from everything else
  const helmets   = areaFiltered.filter(d => d.class === 'helmet');
  const noHelmets = areaFiltered.filter(d => d.class === 'no_helmet');
  const rest      = areaFiltered.filter(d => d.class !== 'helmet' && d.class !== 'no_helmet');

  const resolved: Detection[] = [...rest];

  // For each helmet, check for an overlapping no_helmet
  const consumedNoHelmets = new Set<number>();
  for (const h of helmets) {
    let conflictIdx = -1;
    for (let i = 0; i < noHelmets.length; i++) {
      if (!consumedNoHelmets.has(i) && computeIoU(h.bbox, noHelmets[i].bbox) > 0.5) {
        conflictIdx = i;
        break;
      }
    }
    if (conflictIdx === -1) {
      resolved.push(h);
    } else {
      consumedNoHelmets.add(conflictIdx);
      resolved.push(
        h.confidence >= noHelmets[conflictIdx].confidence ? h : noHelmets[conflictIdx],
      );
    }
  }

  // Pass through no_helmets that had no conflict
  for (let i = 0; i < noHelmets.length; i++) {
    if (!consumedNoHelmets.has(i)) resolved.push(noHelmets[i]);
  }

  return resolved;
}

// ------------------------------------------------------------
// Stage 3 — Person + Vest inference
// For each 'person' with no overlapping 'vest' (IoU > 0.3) and no existing
// 'no_vest' in the same region, synthesise a no_vest detection.
// ------------------------------------------------------------
function injectPersonVestInference(
  detections: ProcessedDetection[],
  frameId: number,
  timestamp: number,
): ProcessedDetection[] {
  const persons  = detections.filter(d => d.class === 'person');
  const vests    = detections.filter(d => d.class === 'vest');
  const noVests  = detections.filter(d => d.class === 'no_vest');
  const injected: ProcessedDetection[] = [...detections];

  for (const person of persons) {
    const hasVest   = vests.some(v  => computeIoU(person.bbox, v.bbox)  > 0.3);
    const hasNoVest = noVests.some(nv => computeIoU(person.bbox, nv.bbox) > 0.3);

    if (!hasVest && !hasNoVest) {
      injected.push({
        class:      'no_vest',
        bbox:       person.bbox,
        confidence: person.confidence * 0.65,
        frameId,
        timestamp,
        inferred:   true,
      });
    }
  }

  return injected;
}

// ------------------------------------------------------------
// Stage 4 — Temporal smoothing
// Mutates `buffer` (caller-owned state). Filters out detections that have not
// appeared consistently across recent frames.
// ------------------------------------------------------------
function applyTemporalSmoothing(
  detections: ProcessedDetection[],
  buffer: SmoothingBuffer,
): ProcessedDetection[] {
  // Collect keys seen in this frame
  const seenThisFrame = new Set<string>(
    detections.map(d => smoothingKey(d.class, d.bbox)),
  );

  // Advance all existing buffer entries by one frame
  for (const [key, frames] of buffer.entries()) {
    frames.push(seenThisFrame.has(key));
    if (frames.length > FRAME_BUFFER_SIZE) frames.shift();
  }

  // Register keys appearing for the first time
  for (const key of seenThisFrame) {
    if (!buffer.has(key)) {
      buffer.set(key, [true]);
    }
  }

  // Keep only detections that have reached their class-specific frame threshold
  return detections.filter(d => {
    const key    = smoothingKey(d.class, d.bbox);
    const frames = buffer.get(key) ?? [true];
    const seen   = frames.filter(Boolean).length;
    const needed = VIOLATION_CLASSES.has(d.class) ? VIOLATION_MIN_FRAMES : PRESENCE_MIN_FRAMES;
    return seen >= needed;
  });
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Post-process raw YOLO detections (after NMS) into a cleaned, enriched array.
 *
 * @param rawDetections  Detection[] directly from the YOLO NMS stage.
 * @param buffer         Caller-owned smoothing state. Create once with createSmoothingBuffer().
 * @param frameId        Current frame ID, stamped onto synthetic detections.
 * @param timestamp      Current frame timestamp (ms since epoch).
 * @returns              ProcessedDetection[] — filtered, inferred, smoothed.
 */
export function postProcess(
  rawDetections: Detection[],
  buffer: SmoothingBuffer,
  frameId: number,
  timestamp: number,
): ProcessedDetection[] {
  let detections: ProcessedDetection[] = rawDetections as ProcessedDetection[];

  detections = applyThresholds(detections) as ProcessedDetection[];
  detections = suppressFalsePositives(detections) as ProcessedDetection[];
  detections = injectPersonVestInference(detections, frameId, timestamp);
  detections = applyTemporalSmoothing(detections, buffer);

  return detections;
}
