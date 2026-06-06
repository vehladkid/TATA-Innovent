// mockDetector.ts — drop-in replacement for the real ONNX model
// Use this until Tejvir delivers the trained YOLOv8 ONNX file.
// Swap is one line: replace `mockDetect(frame)` with `realModel.detect(frame)`.

import type { Detection } from './contracts';

let frameCounter = 0;

/**
 * Returns fake but realistic Detection objects.
 * Two people on screen:
 *   - Person 1: walks left-to-right in a sine pattern, NO helmet, NO vest (dangerous)
 *   - Person 2: stands still on the right, WITH helmet and vest (safe)
 *
 * This is enough to drive the entire downstream pipeline:
 *   SORT tracker -> HMI Engine -> Risk Engine -> Dashboard
 *
 * Once the real model is ready, the output shape is identical so nothing else changes.
 */
export function mockDetect(_videoFrame?: ImageData): Detection[] {
  frameCounter++;
  const t = frameCounter / 30; // assume ~30 fps

  // Person 1 oscillates horizontally between x=0.1 and x=0.8
  const p1X = 0.1 + (Math.sin(t * 0.3) + 1) * 0.35;
  const p1Y = 0.4;
  const p1W = 0.15;
  const p1H = 0.4;

  // Person 2 is stationary on the right
  const p2X = 0.75;
  const p2Y = 0.45;
  const p2W = 0.12;
  const p2H = 0.35;

  const now = Date.now();

  return [
    // Person 1 — the dangerous worker
    {
      class: 'person',
      bbox: [p1X, p1Y, p1W, p1H],
      confidence: 0.92,
      frameId: frameCounter,
      timestamp: now,
    },
    {
      class: 'no_helmet',
      bbox: [p1X, p1Y, p1W, 0.08],
      confidence: 0.87,
      frameId: frameCounter,
      timestamp: now,
    },
    {
      class: 'no_vest',
      bbox: [p1X, p1Y + 0.1, p1W, 0.2],
      confidence: 0.81,
      frameId: frameCounter,
      timestamp: now,
    },

    // Person 2 — the safe worker
    {
      class: 'person',
      bbox: [p2X, p2Y, p2W, p2H],
      confidence: 0.95,
      frameId: frameCounter,
      timestamp: now,
    },
    {
      class: 'helmet',
      bbox: [p2X, p2Y, p2W, 0.08],
      confidence: 0.91,
      frameId: frameCounter,
      timestamp: now,
    },
    {
      class: 'vest',
      bbox: [p2X, p2Y + 0.1, p2W, 0.2],
      confidence: 0.89,
      frameId: frameCounter,
      timestamp: now,
    },
  ];
}

/**
 * Reset the frame counter — useful for tests or when switching demo scenarios.
 */
export function resetMockDetector(): void {
  frameCounter = 0;
}
