import { describe, it, expect, beforeEach } from 'vitest';
import {
  postProcess,
  computeIoU,
  createSmoothingBuffer,
  type SmoothingBuffer,
} from '../postProcessor';
import type { Detection } from '@suraksha/shared/contracts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FRAME = 1;
const TS    = 1000;

function det(
  cls: Detection['class'],
  bbox: [number, number, number, number],
  confidence: number,
  frameId = FRAME,
): Detection {
  return { class: cls, bbox, confidence, frameId, timestamp: TS };
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

  it('returns ~0.33 for 50% overlap on one axis', () => {
    // a: x 0–0.2, b: x 0.1–0.3 → overlap 0.1 wide, each 0.2 wide
    const iou = computeIoU([0.0, 0.0, 0.2, 0.1], [0.1, 0.0, 0.2, 0.1]);
    expect(iou).toBeCloseTo(0.333, 2);
  });
});

// ---------------------------------------------------------------------------
// Per-class threshold filtering
// ---------------------------------------------------------------------------

describe('postProcess — threshold filtering', () => {
  it('drops detections below class threshold', () => {
    let buf: SmoothingBuffer = createSmoothingBuffer();
    const raw: Detection[] = [
      det('no_helmet', [0.1, 0.1, 0.1, 0.1], 0.15),  // below 0.25 threshold
      det('helmet',    [0.3, 0.1, 0.1, 0.1], 0.60),  // above 0.55 threshold
    ];

    // Run 3 frames to pass temporal smoothing (violation threshold = 3/5)
    for (let f = 1; f <= 3; f++) {
      const updated = raw.map(d => ({ ...d, frameId: f }));
      postProcess(updated, buf, f, TS);
    }
    // Final call — helmet should survive (presence: 2/5 needed, seen 3 times)
    const result = postProcess(raw.map(d => ({ ...d, frameId: 4 })), buf, 4, TS);

    expect(result.find(d => d.class === 'no_helmet')).toBeUndefined();
    expect(result.find(d => d.class === 'helmet')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// False-positive suppression — area filters
// ---------------------------------------------------------------------------

describe('postProcess — false-positive suppression', () => {
  it('drops whole-image detections (area > 0.7)', () => {
    const buf = createSmoothingBuffer();
    const raw: Detection[] = [
      det('helmet', [0.0, 0.0, 1.0, 1.0], 0.90),  // area = 1.0 → dropped
    ];
    const result = postProcess(raw, buf, FRAME, TS);
    expect(result).toHaveLength(0);
  });

  it('drops tiny detections (area < 0.005)', () => {
    const buf = createSmoothingBuffer();
    const raw: Detection[] = [
      det('no_helmet', [0.5, 0.5, 0.03, 0.03], 0.80),  // area = 0.0009 → dropped
    ];
    const result = postProcess(raw, buf, FRAME, TS);
    expect(result).toHaveLength(0);
  });

  it('keeps detections that conflict with neither area bound', () => {
    const buf = createSmoothingBuffer();
    // Run 2 frames so presence class passes smoothing (needed: 2/5)
    const d = det('helmet', [0.1, 0.1, 0.2, 0.3], 0.70);  // area = 0.06 ✓
    postProcess([d], buf, 1, TS);
    const result = postProcess([{ ...d, frameId: 2 }], buf, 2, TS);
    expect(result).toHaveLength(1);
  });

  it('resolves helmet/no_helmet conflict at same bbox by keeping higher confidence', () => {
    const buf = createSmoothingBuffer();
    const bbox: [number, number, number, number] = [0.1, 0.1, 0.15, 0.15];
    const raw: Detection[] = [
      det('helmet',    bbox, 0.70),
      det('no_helmet', bbox, 0.55),
    ];
    // Run 3 frames so no_helmet (violation) also passes smoothing
    for (let f = 1; f <= 3; f++) {
      postProcess(raw.map(d => ({ ...d, frameId: f })), buf, f, TS);
    }
    const result = postProcess(raw.map(d => ({ ...d, frameId: 4 })), buf, 4, TS);

    // Only one should survive — the higher-confidence helmet
    const conflict = result.filter(d => d.class === 'helmet' || d.class === 'no_helmet');
    expect(conflict).toHaveLength(1);
    expect(conflict[0].class).toBe('helmet');
  });
});

// ---------------------------------------------------------------------------
// Person + Vest inference rule
// ---------------------------------------------------------------------------

describe('postProcess — Person+Vest inference', () => {
  it('injects synthetic no_vest when person has no overlapping vest', () => {
    const buf = createSmoothingBuffer();
    const personBbox: [number, number, number, number] = [0.1, 0.1, 0.2, 0.5];
    const raw: Detection[] = [
      det('person', personBbox, 0.85),
      // No vest detection present
    ];
    // Run enough frames for presence class (person: 2/5) and violation (no_vest: 3/5)
    for (let f = 1; f <= 5; f++) {
      postProcess(raw.map(d => ({ ...d, frameId: f })), buf, f, TS);
    }
    const result = postProcess(raw.map(d => ({ ...d, frameId: 6 })), buf, 6, TS);

    const synth = result.find(d => d.class === 'no_vest');
    expect(synth).toBeDefined();
    expect((synth as any).inferred).toBe(true);
  });

  it('does NOT inject no_vest when vest overlaps person (IoU > 0.3)', () => {
    const buf = createSmoothingBuffer();
    const personBbox: [number, number, number, number] = [0.1, 0.2, 0.2, 0.5];
    const vestBbox:   [number, number, number, number] = [0.1, 0.3, 0.2, 0.3];
    const raw: Detection[] = [
      det('person', personBbox, 0.85),
      det('vest',   vestBbox,   0.70),
    ];
    for (let f = 1; f <= 3; f++) {
      postProcess(raw.map(d => ({ ...d, frameId: f })), buf, f, TS);
    }
    const result = postProcess(raw.map(d => ({ ...d, frameId: 4 })), buf, 4, TS);
    expect(result.find(d => d.class === 'no_vest')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Temporal smoothing
// ---------------------------------------------------------------------------

describe('postProcess — temporal smoothing', () => {
  it('suppresses a detection that only appears in 1 of 5 frames (presence class)', () => {
    const buf = createSmoothingBuffer();
    const d = det('helmet', [0.1, 0.1, 0.2, 0.2], 0.70);

    // Appear only on frame 1
    postProcess([{ ...d, frameId: 1 }], buf, 1, TS);
    // Absent frames 2–4
    for (let f = 2; f <= 4; f++) postProcess([], buf, f, TS);

    const result = postProcess([], buf, 5, TS);
    expect(result).toHaveLength(0);
  });

  it('confirms a presence class after appearing in 2 consecutive frames', () => {
    const buf = createSmoothingBuffer();
    const d = det('excavator', [0.5, 0.3, 0.25, 0.4], 0.65);

    postProcess([{ ...d, frameId: 1 }], buf, 1, TS);
    const result = postProcess([{ ...d, frameId: 2 }], buf, 2, TS);

    expect(result.find(r => r.class === 'excavator')).toBeDefined();
  });

  it('confirms a violation class only after 3 frames', () => {
    const buf = createSmoothingBuffer();
    const d = det('no_helmet', [0.1, 0.1, 0.15, 0.15], 0.45);

    postProcess([{ ...d, frameId: 1 }], buf, 1, TS);
    const after2 = postProcess([{ ...d, frameId: 2 }], buf, 2, TS);
    expect(after2.find(r => r.class === 'no_helmet')).toBeUndefined();  // 2/5 < 3 required

    const after3 = postProcess([{ ...d, frameId: 3 }], buf, 3, TS);
    expect(after3.find(r => r.class === 'no_helmet')).toBeDefined();    // 3/5 ✓
  });

  it('drops a violation that disappears after being confirmed', () => {
    const buf = createSmoothingBuffer();
    const d = det('no_vest', [0.2, 0.2, 0.15, 0.4], 0.30);

    for (let f = 1; f <= 3; f++) postProcess([{ ...d, frameId: f }], buf, f, TS);
    // Absent frames 4 & 5
    for (let f = 4; f <= 5; f++) postProcess([], buf, f, TS);
    // Only 1 recent seen out of last 3 frames → below threshold of 3/5
    const result = postProcess([{ ...d, frameId: 6 }], buf, 6, TS);
    expect(result.find(r => r.class === 'no_vest')).toBeUndefined();
  });
});
