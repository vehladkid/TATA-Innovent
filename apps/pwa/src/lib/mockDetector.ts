// mockDetector.ts — dummy PPE detector for parallel development (Week 1)
// Emits plausible Detection[] that mirrors what YOLOv8n ONNX will produce.
// Swap: replace mockDetect() call site with onnxModel.detect(frame) when model is ready.
// Keep as fallback for offline demo — toggle via NEXT_PUBLIC_USE_MOCK_DETECTOR=true.
//
// ARCHITECTURE.md §5: keep this file, do not delete. Toggle via env flag.

import type { Detection, DetectionClass } from '@suraksha/shared/contracts';
import { postProcess, FRAME_BUFFER_SIZE } from './postProcessor';

// Caller-managed frame buffer — lives for the lifetime of the detector instance.
// Each call to mockDetect() appends the current raw frame and trims to FRAME_BUFFER_SIZE.
let _frameBuffer: Detection[][] = [];
let _frameCounter = 0;

/** Reset detector state (useful in tests or when switching camera sources). */
export function resetMockDetector(): void {
  _frameBuffer = [];
  _frameCounter = 0;
}

// Stable scene layout: each "object" in the scene has a fixed bbox so the
// temporal smoother has persistent keys to track across frames.
const SCENE: Array<{ class: DetectionClass; bbox: [number, number, number, number]; baseConf: number }> = [
  { class: 'person',    bbox: [0.10, 0.20, 0.18, 0.55], baseConf: 0.88 },
  { class: 'person',    bbox: [0.55, 0.15, 0.20, 0.60], baseConf: 0.82 },
  { class: 'helmet',    bbox: [0.12, 0.18, 0.14, 0.12], baseConf: 0.78 },
  // Second person deliberately has no helmet → expect no_helmet inference from postProcess
  { class: 'vest',      bbox: [0.11, 0.35, 0.16, 0.22], baseConf: 0.72 },
  // Second person has no vest → Person+Vest rule should inject no_vest
  { class: 'excavator', bbox: [0.70, 0.30, 0.25, 0.45], baseConf: 0.65 },
];

// Occasional noise entries that should be suppressed by area / confidence filters
const NOISE: Array<{ class: DetectionClass; bbox: [number, number, number, number]; baseConf: number }> = [
  { class: 'helmet',    bbox: [0.00, 0.00, 1.00, 1.00], baseConf: 0.60 }, // whole-image bbox → area > 0.7, dropped
  { class: 'no_helmet', bbox: [0.48, 0.48, 0.002, 0.002], baseConf: 0.40 }, // too small → area < 0.005, dropped
  { class: 'no_vest',   bbox: [0.30, 0.20, 0.05, 0.05], baseConf: 0.15 }, // below no_vest threshold 0.20, dropped
];

function jitter(v: number, magnitude = 0.008): number {
  // Deterministic-ish jitter using frame counter to avoid Math.random()
  const offset = (((_frameCounter * 1301 + v * 9973) % 100) / 100 - 0.5) * magnitude * 2;
  return Math.max(0, Math.min(1, v + offset));
}

/**
 * Produce a mock Detection[] for the given frame, then run it through postProcess().
 * Output matches what the real ONNX pipeline will emit after post-processing.
 */
export function mockDetect(frameId?: number, timestamp?: number): Detection[] {
  _frameCounter++;
  const fid = frameId ?? _frameCounter;
  const ts  = timestamp ?? Date.now();

  const raw: Detection[] = [];

  // Stable scene entries — add slight jitter to simulate real detector variance
  for (const obj of SCENE) {
    raw.push({
      class:      obj.class,
      bbox:       obj.bbox.map(v => jitter(v)) as [number, number, number, number],
      confidence: Math.min(0.99, obj.baseConf + jitter(0, 0.05)),
      frameId:    fid,
      timestamp:  ts,
    });
  }

  // Inject noise (should be filtered by postProcess)
  for (const n of NOISE) {
    raw.push({
      class:      n.class,
      bbox:       [...n.bbox] as [number, number, number, number],
      confidence: n.baseConf,
      frameId:    fid,
      timestamp:  ts,
    });
  }

  // Append current frame, keep last FRAME_BUFFER_SIZE entries
  _frameBuffer = [..._frameBuffer.slice(-(FRAME_BUFFER_SIZE - 1)), raw];
  return postProcess(raw, _frameBuffer, fid, ts);
}
