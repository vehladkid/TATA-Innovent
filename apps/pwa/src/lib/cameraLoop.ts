// cameraLoop.ts — the heartbeat (Owner: Dhruv, deliverable #3)
//
// Opens the phone camera and drives the full edge pipeline once per frame:
//
//   frame ──▶ detect ──▶ track (SORT) ──▶ [pose] ──▶ HMI ──▶ handlers
//             (#1/#4)    (Vanshika)       (#5)       (#2)    (risk/alerts/sync)
//
// Design choices:
//   • Detector is INJECTED (detect fn) so this file couples to neither mock nor
//     onnx — the NEXT_PUBLIC_USE_MOCK_DETECTOR toggle lives at the call site
//     (see createDefaultDetect()).
//   • Tracker is an INTERFACE — Vanshika's SORT from packages/shared/sort.ts
//     drops in by implementing Tracker. SimpleTracker below is a runnable
//     fallback so the pipeline works end-to-end before SORT lands.
//   • Pose (#5) and the risk/alert/sync handlers (#5/#6/#7) are optional hooks.
//   • requestAnimationFrame loop (not setInterval) per the build doc, throttled
//     to a target FPS, and re-entrancy guarded (skips a tick if the previous
//     async frame is still in flight).
//
// ⚠️ Camera requires HTTPS or localhost — getUserMedia is blocked on plain HTTP.

import type {
  Detection,
  TrackedPerson,
  Zone,
  Keypoint,
} from '@suraksha/shared/contracts';
import { processFrame, type EnrichedPerson } from './hmiEngine';
import { computeIoU } from './postProcessor';

// ============================================================
// Pluggable collaborators
// ============================================================

/** Detector signature shared by mockDetect and OnnxDetector.detect. */
export type DetectFn = (
  source: HTMLVideoElement,
  frameId: number,
  timestamp: number,
) => Detection[] | Promise<Detection[]>;

/** SORT tracker contract. Vanshika's implementation satisfies this. */
export interface Tracker {
  update(detections: Detection[], frameId: number, timestampMs: number): TrackedPerson[];
  reset(): void;
}

/** Optional pose estimator (deliverable #5) — attaches keypoints per person. */
export type PoseFn = (
  source: HTMLVideoElement,
  people: TrackedPerson[],
) => Keypoint[][] | Promise<Keypoint[][]>;

export type FrameContext = {
  frameId: number;
  timestamp: number;
  /** Whole-frame latency in ms (detect → handlers). */
  latencyMs: number;
};

export type CameraLoopHandlers = {
  /** Main output → Risk Engine. Fired every processed frame. */
  onEnriched?: (people: EnrichedPerson[], ctx: FrameContext) => void;
  /** Raw post-processed detections, e.g. for drawing bounding boxes. */
  onDetections?: (detections: Detection[], ctx: FrameContext) => void;
  /** Per-frame stats for an FPS/latency overlay. */
  onStats?: (stats: { fps: number; latencyMs: number }) => void;
  onError?: (err: unknown) => void;
};

export type CameraLoopOptions = {
  video: HTMLVideoElement;
  detect: DetectFn;
  zones: Zone[];
  tracker?: Tracker;        // defaults to SimpleTracker
  pose?: PoseFn;            // optional (deliverable #5)
  handlers?: CameraLoopHandlers;
  targetFps?: number;       // default 30
  /** getUserMedia constraints override. Defaults to rear camera. */
  constraints?: MediaStreamConstraints;
};

// ============================================================
// CameraLoop
// ============================================================

export class CameraLoop {
  private readonly video: HTMLVideoElement;
  private readonly detect: DetectFn;
  private readonly tracker: Tracker;
  private readonly pose?: PoseFn;
  private readonly handlers: CameraLoopHandlers;
  private readonly frameIntervalMs: number;
  private readonly constraints: MediaStreamConstraints;

  private zones: Zone[];
  private stream: MediaStream | null = null;
  private rafId = 0;
  private running = false;
  private inFlight = false;     // re-entrancy guard for the async frame
  private frameId = 0;
  private lastTickMs = 0;       // throttle clock
  private lastFrameMs = 0;      // for FPS calc

  constructor(opts: CameraLoopOptions) {
    this.video = opts.video;
    this.detect = opts.detect;
    this.tracker = opts.tracker ?? new SimpleTracker();
    this.pose = opts.pose;
    this.handlers = opts.handlers ?? {};
    this.zones = opts.zones;
    this.frameIntervalMs = 1000 / (opts.targetFps ?? 30);
    this.constraints =
      opts.constraints ?? { video: { facingMode: 'environment' }, audio: false };
  }

  /** Live zones can change at runtime (supervisor edits the floor plan). */
  setZones(zones: Zone[]): void {
    this.zones = zones;
  }

  /** Open the camera and start the loop. Resolves once video is playing. */
  async start(): Promise<void> {
    if (this.running) return;
    this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.playsInline = true;
    await this.video.play();

    this.running = true;
    this.lastTickMs = 0;
    this.rafId = requestAnimationFrame(this.tick);
  }

  /** Stop the loop and release the camera. */
  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.tracker.reset();
  }

  get isRunning(): boolean {
    return this.running;
  }

  // --- the loop --------------------------------------------------

  private tick = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    // Throttle to target FPS; skip if previous frame still processing.
    if (now - this.lastTickMs < this.frameIntervalMs || this.inFlight) return;
    this.lastTickMs = now;

    // Wait for the camera to actually have pixels.
    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    this.inFlight = true;
    void this.processOneFrame().finally(() => {
      this.inFlight = false;
    });
  };

  private async processOneFrame(): Promise<void> {
    const started = performance.now();
    this.frameId++;
    const fid = this.frameId;
    const ts = Date.now();

    try {
      // [1/4] detect (mock or onnx — both run postProcess internally)
      const detections = await this.detect(this.video, fid, ts);

      // [2] track → TrackedPerson[]
      const tracked = this.tracker.update(detections, fid, ts);

      // [3] pose (optional) → attach keypoints
      if (this.pose && tracked.length > 0) {
        const keypoints = await this.pose(this.video, tracked);
        tracked.forEach((p, i) => {
          if (keypoints[i]) p.poseKeypoints = keypoints[i];
        });
      }

      // [4] HMI enrichment → EnrichedPerson[]
      const enriched = processFrame(tracked, this.zones);

      const latencyMs = performance.now() - started;
      const ctx: FrameContext = { frameId: fid, timestamp: ts, latencyMs };

      this.handlers.onDetections?.(detections, ctx);
      this.handlers.onEnriched?.(enriched, ctx);

      if (this.handlers.onStats) {
        const fps = this.lastFrameMs ? 1000 / (started - this.lastFrameMs) : 0;
        this.handlers.onStats({ fps, latencyMs });
      }
      this.lastFrameMs = started;
    } catch (err) {
      this.handlers.onError?.(err);
    }
  }
}

// ============================================================
// SimpleTracker — runnable fallback until Vanshika's SORT lands.
//
// Greedy IoU association of `person` boxes across frames for stable track IDs,
// velocity from centre delta over dt, and PPE fusion (helmet/vest detections
// overlapping a person → ppe booleans). NOT a Kalman SORT — good enough to drive
// the pipeline with the mock detector for demos. Replace with packages/shared/sort.ts.
// ============================================================

type TrackState = {
  trackId: number;
  bbox: [number, number, number, number];
  centre: [number, number];
  velocity: [number, number];
  firstSeenMs: number;
  lastSeenMs: number;
};

const IOU_MATCH_THRESHOLD = 0.3;
const TRACK_TTL_MS = 1500; // drop tracks unseen for this long

export class SimpleTracker implements Tracker {
  private tracks = new Map<number, TrackState>();
  private nextId = 1;

  reset(): void {
    this.tracks.clear();
    this.nextId = 1;
  }

  update(detections: Detection[], _frameId: number, ts: number): TrackedPerson[] {
    const persons = detections.filter(d => d.class === 'person');

    // Greedy match each person to the best-IoU existing track.
    const unmatched = new Set(this.tracks.keys());
    const result: TrackedPerson[] = [];

    for (const det of persons) {
      let bestId = -1;
      let bestIoU = IOU_MATCH_THRESHOLD;
      for (const id of unmatched) {
        const iou = computeIoU(det.bbox, this.tracks.get(id)!.bbox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestId = id;
        }
      }

      const centre: [number, number] = [
        det.bbox[0] + det.bbox[2] / 2,
        det.bbox[1] + det.bbox[3] / 2,
      ];

      let track: TrackState;
      if (bestId === -1) {
        track = {
          trackId: this.nextId++,
          bbox: det.bbox,
          centre,
          velocity: [0, 0],
          firstSeenMs: ts,
          lastSeenMs: ts,
        };
        this.tracks.set(track.trackId, track);
      } else {
        track = this.tracks.get(bestId)!;
        unmatched.delete(bestId);
        const dt = (ts - track.lastSeenMs) / 1000;
        if (dt > 0) {
          track.velocity = [(centre[0] - track.centre[0]) / dt, (centre[1] - track.centre[1]) / dt];
        }
        track.bbox = det.bbox;
        track.centre = centre;
        track.lastSeenMs = ts;
      }

      result.push({
        trackId: track.trackId,
        bbox: track.bbox,
        velocity: track.velocity,
        ppe: fusePPE(det.bbox, detections),
        firstSeenMs: track.firstSeenMs,
        lastSeenMs: track.lastSeenMs,
      });
    }

    // Expire stale tracks.
    for (const [id, t] of this.tracks) {
      if (ts - t.lastSeenMs > TRACK_TTL_MS) this.tracks.delete(id);
    }

    return result;
  }
}

/**
 * Derive {helmet, vest} for a person box. A person HAS the PPE unless a
 * matching violation box (no_helmet / no_vest) overlaps them more than the
 * positive box. Conservative: defaults to compliant when there's no signal.
 */
function fusePPE(
  personBbox: [number, number, number, number],
  detections: Detection[],
): { helmet: boolean; vest: boolean } {
  const overlap = (cls: Detection['class']) => {
    let best = 0;
    for (const d of detections) {
      if (d.class === cls) best = Math.max(best, computeIoU(personBbox, d.bbox));
    }
    return best;
  };
  return {
    helmet: overlap('no_helmet') <= overlap('helmet'),
    vest: overlap('no_vest') <= overlap('vest'),
  };
}

// ============================================================
// Default detector wiring — reads the env toggle so callers don't have to.
// ============================================================

/**
 * Build the detect fn based on NEXT_PUBLIC_USE_MOCK_DETECTOR.
 * Real path lazy-loads + inits the ONNX session on first use.
 */
export function createDefaultDetect(): DetectFn {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DETECTOR === 'true';

  if (useMock) {
    // Static import kept out of the onnx path to avoid bundling the runtime in mock mode.
    return async (_video, frameId, ts) => {
      const { mockDetect } = await import('./mockDetector');
      return mockDetect(frameId, ts);
    };
  }

  let initialized = false;
  return async (video, frameId, ts) => {
    const { onnxDetector } = await import('./onnxDetector');
    if (!initialized) {
      await onnxDetector.init();
      initialized = true;
    }
    return onnxDetector.detect(video, frameId, ts);
  };
}
