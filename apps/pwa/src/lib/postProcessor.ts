// postProcessor.ts — PPE detection post-processing layer
// Sits between raw YOLO NMS output and the SORT tracker / HMI Engine.
//
// Pure: no I/O, no side effects. The frame buffer is caller-owned and
// must include the current frame as its last entry before calling postProcess().
//
// CONTRACT NOTE: uses 'helmet' (contracts.ts spelling), NOT 'hardhat'.

import type { Detection, DetectionClass } from '@suraksha/shared/contracts';

// Local extension for synthetic detections created by the Person+Vest rule.
// The inferred flag is not yet in contracts.ts — promote it via a contract PR
// when the dashboard needs to style these differently. Until then, consumers
// that need the flag import ProcessedDetection from this module.
export type ProcessedDetection = Detection & { inferred?: true };

// Exported so callers can slice buffers correctly without duplicating the constant.
export const FRAME_BUFFER_SIZE = 5;

// ------------------------------------------------------------
// Per-class confidence thresholds — all 9 DetectionClass values required
// by Record<DetectionClass, number> exhaustiveness.
// 'helmet' spelling matches contracts.ts (not 'hardhat').
// ladder/gloves/mask are pass-through: they appear in output but score 0 pts
// in the Risk Engine today.
// ------------------------------------------------------------
const CLASS_THRESHOLDS: Record<DetectionClass, number> = {
  helmet:    0.55,
  no_helmet: 0.25,
  vest:      0.55,
  no_vest:   0.20,
  person:    0.30,
  excavator: 0.55,
  ladder:    0.50,
  gloves:    0.45,
  mask:      0.40,
};

// Violation classes (missing safety PPE) need stricter temporal confirmation.
const VIOLATION_CLASSES = new Set<DetectionClass>(['no_helmet', 'no_vest']);

const VIOLATION_MIN_FRAMES = 3;
const PRESENCE_MIN_FRAMES  = 2;

// Quantize to 2.5 % grid to absorb inter-frame bbox jitter without a tracker.
function quantize(v: number): number {
  return Math.round(v * 40) / 40;
}

function bboxKey(bbox: [number, number, number, number]): string {
  return bbox.map(quantize).join(',');
}

// ------------------------------------------------------------
// IoU — both bboxes in [x, y, w, h] normalized 0-1 format
// ------------------------------------------------------------
export function computeIoU(
  a: [number, number, number, number],
  b: [number, number, number, number],
): number {
  const ax2 = a[0] + a[2];
  const ay2 = a[1] + a[3];
  const bx2 = b[0] + b[2];
  const by2 = b[1] + b[3];

  const iw = Math.max(0, Math.min(ax2, bx2) - Math.max(a[0], b[0]));
  const ih = Math.max(0, Math.min(ay2, by2) - Math.max(a[1], b[1]));
  const intersection = iw * ih;
  if (intersection === 0) return 0;

  return intersection / (a[2] * a[3] + b[2] * b[3] - intersection);
}

// ------------------------------------------------------------
// Stage 1 — Per-class confidence threshold filtering
// ------------------------------------------------------------
function applyThresholds(detections: Detection[]): Detection[] {
  return detections.filter(d => d.confidence >= CLASS_THRESHOLDS[d.class]);
}

// ------------------------------------------------------------
// Stage 2 — False-positive suppression
//   • bbox area > 0.70 → whole-image spurious detection
//   • bbox area < 0.005 → too small to be meaningful
//   • helmet ↔ no_helmet conflict at same region → keep higher confidence
// ------------------------------------------------------------
function suppressFalsePositives(detections: Detection[]): Detection[] {
  const areaFiltered = detections.filter(d => {
    const area = d.bbox[2] * d.bbox[3];
    return area >= 0.005 && area <= 0.7;
  });

  const helmets   = areaFiltered.filter(d => d.class === 'helmet');
  const noHelmets = areaFiltered.filter(d => d.class === 'no_helmet');
  const rest      = areaFiltered.filter(d => d.class !== 'helmet' && d.class !== 'no_helmet');

  const resolved: Detection[] = [...rest];
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

  for (let i = 0; i < noHelmets.length; i++) {
    if (!consumedNoHelmets.has(i)) resolved.push(noHelmets[i]);
  }

  return resolved;
}

// ------------------------------------------------------------
// Stage 3 — Person + Vest inference rule
// For each 'person' detection:
//   - If no 'vest' overlaps it (IoU > 0.3) AND no 'no_vest' already nearby
//   → inject a synthetic no_vest detection marked inferred: true
// ------------------------------------------------------------
function injectPersonVestInference(
  detections: ProcessedDetection[],
  frameId: number,
  timestamp: number,
): ProcessedDetection[] {
  const persons = detections.filter(d => d.class === 'person');
  const vests   = detections.filter(d => d.class === 'vest');
  const noVests = detections.filter(d => d.class === 'no_vest');
  const result  = [...detections];

  for (const person of persons) {
    const hasVest   = vests.some(v  => computeIoU(person.bbox, v.bbox)  > 0.3);
    const hasNoVest = noVests.some(nv => computeIoU(person.bbox, nv.bbox) > 0.3);

    if (!hasVest && !hasNoVest) {
      result.push({
        class:      'no_vest',
        bbox:       person.bbox,
        confidence: person.confidence * 0.65,
        frameId,
        timestamp,
        inferred:   true,
      });
    }
  }

  return result;
}

// ------------------------------------------------------------
// Stage 4 — Temporal smoothing
//
// frameBuffer: caller-managed array of recent Detection[] snapshots.
// Must include the current frame as the last entry before this call.
// Maximum FRAME_BUFFER_SIZE entries; caller is responsible for trimming.
//
// A detection survives if it has appeared in:
//   violation classes → VIOLATION_MIN_FRAMES of the last N frames
//   presence classes  → PRESENCE_MIN_FRAMES  of the last N frames
// "Appeared" means same class + quantized bbox in that frame.
// ------------------------------------------------------------
function countFramesWithMatch(
  cls: DetectionClass,
  bbox: [number, number, number, number],
  frameBuffer: Detection[][],
): number {
  const key = bboxKey(bbox);
  let count = 0;
  for (const frame of frameBuffer) {
    if (frame.some(d => d.class === cls && bboxKey(d.bbox) === key)) {
      count++;
    }
  }
  return count;
}

function applyTemporalSmoothing(
  detections: ProcessedDetection[],
  frameBuffer: Detection[][],
): ProcessedDetection[] {
  return detections.filter(d => {
    const seen   = countFramesWithMatch(d.class, d.bbox, frameBuffer);
    const needed = VIOLATION_CLASSES.has(d.class) ? VIOLATION_MIN_FRAMES : PRESENCE_MIN_FRAMES;
    return seen >= needed;
  });
}

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Post-process raw YOLO detections (after NMS).
 *
 * Pipeline: threshold filter → area suppression + conflict resolution
 *           → Person+Vest inference → temporal smoothing.
 *
 * @param detections  Detection[] from the current YOLO frame (after NMS).
 * @param frameBuffer Caller-managed ring of recent frames. **Must include the
 *                    current frame as its last entry** so temporal counts are
 *                    correct. Trim to FRAME_BUFFER_SIZE before passing.
 * @param frameId     Stamped onto synthetic no_vest detections.
 * @param timestamp   Stamped onto synthetic no_vest detections (ms since epoch).
 * @returns           Detection[] — filtered, enriched, smoothed. Synthetic entries
 *                    carry { inferred: true } when cast to ProcessedDetection.
 */
export function postProcess(
  detections: Detection[],
  frameBuffer: Detection[][],
  frameId: number,
  timestamp: number,
): Detection[] {
  let ds: ProcessedDetection[] = detections as ProcessedDetection[];

  ds = applyThresholds(ds) as ProcessedDetection[];
  ds = suppressFalsePositives(ds) as ProcessedDetection[];
  ds = injectPersonVestInference(ds, frameId, timestamp);
  ds = applyTemporalSmoothing(ds, frameBuffer);

  return ds;
}
