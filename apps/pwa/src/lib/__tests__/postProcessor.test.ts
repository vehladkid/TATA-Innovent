import { describe, it, expect } from 'vitest';
import {
  postProcess,
  computeIoU,
  FRAME_BUFFER_SIZE,
  type ProcessedDetection,
} from '../postProcessor';
import type { Detection } from '@suraksha/shared/contracts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TS = 1_000;

function det(
  cls: Detection['class'],
  bbox: [number, number, number, number],
  confidence: number,
  frameId = 1,
): Detection {
  return { class: cls, bbox, confidence, frameId, timestamp: TS };
}

/**
 * Simulate N consecutive frames of the same detections and return the result
 * of the final frame. Buffer accumulates correctly across calls.
 */
function runFrames(
  detections: Detection[],
  frameCount: number,
): { result: Detection[]; buffer: Detection[][] } {
  let buffer: Detection[][] = [];
  let result: Detection[] = [];
  for (let f = 1; f <= frameCount; f++) {
    const frame = detections.map(d => ({ ...d, frameId: f }));
    buffer = [...buffer.slice(-(FRAME_BUFFER_SIZE - 1)), frame];
    result = postProcess(frame, buffer, f, TS);
  }
  return { result, buffer };
}

// ---------------------------------------------------------------------------
// IoU
// ---------------------------------------------------------------------------

describe('computeIoU', () => {
  it('returns 1.0 for identical boxes', () => {
    expect(computeIoU([0.1, 0.1, 0.2, 0.2], [0.1, 0.1, 0.2, 0.2])).toBeCloseTo(1.0);
  });

  it('returns 0 for non-overlapping boxes', () => {
    expect(computeIoU([0.0, 0.0, 0.1, 0.1], [0.9, 0.9, 0.1, 0.1])).toBe(0);
  });

  it('returns ≈0.33 for 50 % horizontal overlap', () => {
    // a covers [0.0–0.2], b covers [0.1–0.3], both 0.1 tall
    const iou = computeIoU([0.0, 0.0, 0.2, 0.1], [0.1, 0.0, 0.2, 0.1]);
    expect(iou).toBeCloseTo(0.333, 2);
  });
});

// ---------------------------------------------------------------------------
// Per-class threshold filtering
// ---------------------------------------------------------------------------

describe('threshold filtering', () => {
  it('drops no_helmet below the 0.25 threshold', () => {
    const { result } = runFrames(
      [det('no_helmet', [0.1, 0.1, 0.15, 0.15], 0.20)],
      FRAME_BUFFER_SIZE,
    );
    expect(result.find(d => d.class === 'no_helmet')).toBeUndefined();
  });

  it('keeps helmet at or above the 0.55 threshold after 2 frames', () => {
    const { result } = runFrames(
      [det('helmet', [0.1, 0.1, 0.15, 0.15], 0.60)],
      2,
    );
    expect(result.find(d => d.class === 'helmet')).toBeDefined();
  });

  it('keeps ladder (threshold 0.50) above threshold after 2 frames', () => {
    const { result } = runFrames(
      [det('ladder', [0.2, 0.2, 0.15, 0.4], 0.55)],
      2,
    );
    expect(result.find(d => d.class === 'ladder')).toBeDefined();
  });

  it('keeps gloves (threshold 0.45) above threshold after 2 frames', () => {
    const { result } = runFrames(
      [det('gloves', [0.3, 0.3, 0.12, 0.12], 0.50)],
      2,
    );
    expect(result.find(d => d.class === 'gloves')).toBeDefined();
  });

  it('keeps mask (threshold 0.40) above threshold after 2 frames', () => {
    const { result } = runFrames(
      [det('mask', [0.4, 0.1, 0.10, 0.10], 0.45)],
      2,
    );
    expect(result.find(d => d.class === 'mask')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// False-positive suppression — area filters
// ---------------------------------------------------------------------------

describe('false-positive suppression', () => {
  it('drops whole-image bbox (area > 0.7)', () => {
    const { result } = runFrames(
      [det('helmet', [0.0, 0.0, 1.0, 1.0], 0.90)],
      FRAME_BUFFER_SIZE,
    );
    expect(result).toHaveLength(0);
  });

  it('drops sub-pixel bbox (area < 0.005)', () => {
    const { result } = runFrames(
      [det('no_helmet', [0.5, 0.5, 0.03, 0.03], 0.80)],
      FRAME_BUFFER_SIZE,
    );
    expect(result).toHaveLength(0);
  });

  it('resolves helmet/no_helmet conflict — keeps higher confidence', () => {
    const bbox: [number, number, number, number] = [0.1, 0.1, 0.15, 0.15];
    // helmet=0.70 wins over no_helmet=0.55 at same location
    const { result } = runFrames(
      [det('helmet', bbox, 0.70), det('no_helmet', bbox, 0.55)],
      FRAME_BUFFER_SIZE,
    );
    const headDets = result.filter(d => d.class === 'helmet' || d.class === 'no_helmet');
    expect(headDets).toHaveLength(1);
    expect(headDets[0].class).toBe('helmet');
  });

  it('resolves helmet/no_helmet conflict — no_helmet wins when confidence is higher', () => {
    const bbox: [number, number, number, number] = [0.2, 0.1, 0.15, 0.15];
    const { result } = runFrames(
      [det('helmet', bbox, 0.56), det('no_helmet', bbox, 0.80)],
      FRAME_BUFFER_SIZE,
    );
    const headDets = result.filter(d => d.class === 'helmet' || d.class === 'no_helmet');
    expect(headDets).toHaveLength(1);
    expect(headDets[0].class).toBe('no_helmet');
  });
});

// ---------------------------------------------------------------------------
// Person + Vest inference rule
// ---------------------------------------------------------------------------

describe('Person+Vest inference', () => {
  it('injects synthetic no_vest when person has no overlapping vest', () => {
    const personBbox: [number, number, number, number] = [0.1, 0.1, 0.2, 0.5];
    const { result } = runFrames(
      [det('person', personBbox, 0.85)],
      FRAME_BUFFER_SIZE,  // violation class needs 3+ frames
    );
    const synth = result.find(d => d.class === 'no_vest') as ProcessedDetection | undefined;
    expect(synth).toBeDefined();
    expect(synth?.inferred).toBe(true);
    expect(synth?.confidence).toBeCloseTo(0.85 * 0.65, 3);
  });

  it('does NOT inject no_vest when vest overlaps person (IoU > 0.3)', () => {
    const personBbox: [number, number, number, number] = [0.1, 0.2, 0.2, 0.5];
    const vestBbox:   [number, number, number, number] = [0.1, 0.3, 0.2, 0.3];
    const { result } = runFrames(
      [det('person', personBbox, 0.85), det('vest', vestBbox, 0.72)],
      FRAME_BUFFER_SIZE,
    );
    expect(result.find(d => d.class === 'no_vest')).toBeUndefined();
  });

  it('does NOT inject no_vest when explicit no_vest already present', () => {
    const personBbox:  [number, number, number, number] = [0.1, 0.1, 0.2, 0.5];
    const noVestBbox:  [number, number, number, number] = [0.1, 0.2, 0.2, 0.3];
    const { result } = runFrames(
      [det('person', personBbox, 0.85), det('no_vest', noVestBbox, 0.30)],
      FRAME_BUFFER_SIZE,
    );
    // Only one no_vest (the real one, not a duplicate)
    expect(result.filter(d => d.class === 'no_vest')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Temporal smoothing
// ---------------------------------------------------------------------------

describe('temporal smoothing', () => {
  it('suppresses a presence class appearing only once (1/5 < 2 required)', () => {
    const bbox: [number, number, number, number] = [0.1, 0.1, 0.2, 0.2];
    const d = det('helmet', bbox, 0.70, 1);
    // Frame 1: appears; frames 2-5: absent
    let buffer: Detection[][] = [[d]];
    for (let f = 2; f <= 5; f++) {
      buffer = [...buffer.slice(-(FRAME_BUFFER_SIZE - 1)), []];
    }
    const result = postProcess([], buffer, 5, TS);
    expect(result).toHaveLength(0);
  });

  it('confirms a presence class after 2 consecutive frames', () => {
    const { result } = runFrames(
      [det('excavator', [0.5, 0.3, 0.25, 0.4], 0.65)],
      2,
    );
    expect(result.find(r => r.class === 'excavator')).toBeDefined();
  });

  it('confirms violation class only at frame 3 (3/5 threshold)', () => {
    const d = det('no_helmet', [0.1, 0.1, 0.15, 0.15], 0.45);

    // Frame 1 + Frame 2: not yet confirmed
    const buf1: Detection[][] = [[{ ...d, frameId: 1 }]];
    const r1 = postProcess([{ ...d, frameId: 1 }], buf1, 1, TS);
    expect(r1.find(x => x.class === 'no_helmet')).toBeUndefined(); // 1/5

    const buf2 = [...buf1, [{ ...d, frameId: 2 }]];
    const r2 = postProcess([{ ...d, frameId: 2 }], buf2, 2, TS);
    expect(r2.find(x => x.class === 'no_helmet')).toBeUndefined(); // 2/5

    // Frame 3: confirmed
    const buf3 = [...buf2, [{ ...d, frameId: 3 }]];
    const r3 = postProcess([{ ...d, frameId: 3 }], buf3, 3, TS);
    expect(r3.find(x => x.class === 'no_helmet')).toBeDefined(); // 3/5 ✓
  });

  it('drops a confirmed violation once it disappears for 2+ frames', () => {
    const d = det('no_vest', [0.2, 0.2, 0.15, 0.4], 0.30);

    // Confirmed for 3 frames
    let buffer: Detection[][] = [];
    for (let f = 1; f <= 3; f++) {
      buffer = [...buffer.slice(-(FRAME_BUFFER_SIZE - 1)), [{ ...d, frameId: f }]];
    }

    // Absent frames 4 & 5
    for (let f = 4; f <= 5; f++) {
      buffer = [...buffer.slice(-(FRAME_BUFFER_SIZE - 1)), []];
    }

    // Frame 6 it appears again but only has 1/5 seen in current window → filtered
    const frame6 = [{ ...d, frameId: 6 }];
    buffer = [...buffer.slice(-(FRAME_BUFFER_SIZE - 1)), frame6];
    const result = postProcess(frame6, buffer, 6, TS);
    expect(result.find(r => r.class === 'no_vest')).toBeUndefined();
  });

  it('noisy detection array: noisy detections are filtered while real ones survive', () => {
    // Mix of:
    //   - real person (above threshold, valid area)
    //   - noise: whole-image helmet (area > 0.7)
    //   - noise: tiny no_helmet (area < 0.005)
    //   - noise: no_vest below threshold (conf 0.15 < 0.20)
    const realPerson = det('person', [0.1, 0.1, 0.20, 0.50], 0.88);
    const noisyHuge  = det('helmet',    [0.0, 0.0, 1.0, 1.0],   0.80);
    const noisyTiny  = det('no_helmet', [0.5, 0.5, 0.03, 0.03], 0.60);
    const noisyConf  = det('no_vest',   [0.3, 0.3, 0.10, 0.10], 0.15);

    const allNoise = [realPerson, noisyHuge, noisyTiny, noisyConf];
    const { result } = runFrames(allNoise, FRAME_BUFFER_SIZE);

    // Real person (presence: 2/5 needed — satisfied after 2+ frames) should appear
    expect(result.find(d => d.class === 'person')).toBeDefined();
    // Person+Vest rule also fires → synthetic no_vest should appear after 3 frames
    expect(result.find(d => d.class === 'no_vest')).toBeDefined();
    // All noise entries should be gone
    expect(result.filter(d => d.class === 'helmet')).toHaveLength(0);
    // noisyTiny no_helmet was too small, noisyConf was below threshold → no_helmet absent
    expect(result.filter(d => d.class === 'no_helmet')).toHaveLength(0);
  });
});
