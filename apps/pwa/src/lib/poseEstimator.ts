// poseEstimator.ts — MediaPipe pose estimation (Owner: Dhruv, deliverable #5)
//
// Runs Google's MediaPipe PoseLandmarker on each detected person to get 33 body
// joints. Output Keypoint[] is attached to TrackedPerson.poseKeypoints and read
// by hmiEngine.ts fall detection (shoulders 11/12 vs hips 23/24).
//
// Performance (build doc):
//   • Run pose on the CROPPED person region, never the full frame.
//   • Skip frames (default: every 2nd) — pose is expensive; cached results from
//     the last run are reused (keyed by trackId) on skipped frames.
//
// Satisfies cameraLoop's PoseFn:  (video, people) => Keypoint[][]
// (one Keypoint[] per person, index-aligned with the input array).

import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { Keypoint, TrackedPerson } from '@suraksha/shared/contracts';

// ============================================================
// Config
// ============================================================

// WASM backend + model. Self-host these under public/ for true offline use;
// the CDN/Google-storage defaults make it work out of the box.
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/** Run pose on 1 of every N frames; reuse cached keypoints between runs. */
const DEFAULT_FRAME_SKIP = 2;

/** BlazePose 33-landmark names — index matches MediaPipe output order. */
const POSE_LANDMARK_NAMES: readonly string[] = [
  'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
  'right_eye_inner', 'right_eye', 'right_eye_outer', 'left_ear', 'right_ear',
  'mouth_left', 'mouth_right', 'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist',
  'left_pinky', 'right_pinky', 'left_index', 'right_index',
  'left_thumb', 'right_thumb', 'left_hip', 'right_hip',
  'left_knee', 'right_knee', 'left_ankle', 'right_ankle',
  'left_heel', 'right_heel', 'left_foot_index', 'right_foot_index',
];

export type PoseEstimatorOptions = {
  wasmBase?: string;
  modelUrl?: string;
  /** Run pose every Nth frame (>=1). Default 2. */
  frameSkip?: number;
};

// ============================================================
// PoseEstimator
// ============================================================

export class PoseEstimator {
  private landmarker: PoseLandmarker | null = null;
  private readonly wasmBase: string;
  private readonly modelUrl: string;
  private readonly frameSkip: number;

  // Reused crop canvas to avoid per-person allocation.
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private frameCounter = 0;
  private monotonicTs = 0; // strictly-increasing timestamp for detectForVideo
  private cache = new Map<number, Keypoint[]>(); // trackId → last keypoints

  constructor(opts: PoseEstimatorOptions = {}) {
    this.wasmBase = opts.wasmBase ?? WASM_BASE;
    this.modelUrl = opts.modelUrl ?? MODEL_URL;
    this.frameSkip = Math.max(1, opts.frameSkip ?? DEFAULT_FRAME_SKIP);
  }

  get ready(): boolean {
    return this.landmarker !== null;
  }

  /** Load the MediaPipe model. Call once at app start. */
  async init(): Promise<void> {
    if (this.landmarker) return;
    const fileset = await FilesetResolver.forVisionTasks(this.wasmBase);
    this.landmarker = await PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: this.modelUrl, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1, // one crop = one person
    });
  }

  /** Free the model. */
  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.cache.clear();
  }

  /**
   * Estimate poses for the given tracked persons. Returns one Keypoint[] per
   * person (index-aligned). On skipped frames, returns cached keypoints so the
   * HMI engine still sees pose data without paying the per-frame cost.
   */
  estimate(video: HTMLVideoElement, people: TrackedPerson[]): Keypoint[][] {
    if (!this.landmarker || people.length === 0) {
      return people.map(() => []);
    }

    this.frameCounter++;
    const runThisFrame = this.frameCounter % this.frameSkip === 0;
    if (!runThisFrame) {
      // Reuse cache; prune entries for tracks no longer present.
      const result = people.map(p => this.cache.get(p.trackId) ?? []);
      this.syncCache(people);
      return result;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const out: Keypoint[][] = [];

    for (const person of people) {
      const kp = this.estimateOne(video, vw, vh, person.bbox);
      this.cache.set(person.trackId, kp);
      out.push(kp);
    }

    this.syncCache(people);
    return out;
  }

  /** Adapter so callers can pass `poseEstimator.asPoseFn()` to CameraLoop. */
  asPoseFn(): (v: HTMLVideoElement, p: TrackedPerson[]) => Keypoint[][] {
    return (v, p) => this.estimate(v, p);
  }

  // --- internals -------------------------------------------------

  private estimateOne(
    video: HTMLVideoElement,
    vw: number,
    vh: number,
    bbox: [number, number, number, number],
  ): Keypoint[] {
    // bbox is top-left [x, y, w, h] normalised → crop rect in source pixels.
    const sx = Math.max(0, Math.round(bbox[0] * vw));
    const sy = Math.max(0, Math.round(bbox[1] * vh));
    const sw = Math.max(1, Math.min(vw - sx, Math.round(bbox[2] * vw)));
    const sh = Math.max(1, Math.min(vh - sy, Math.round(bbox[3] * vh)));

    const ctx = this.ensureCanvas(sw, sh);
    ctx.clearRect(0, 0, sw, sh);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    // detectForVideo requires strictly increasing timestamps.
    this.monotonicTs += 1;
    const result = this.landmarker!.detectForVideo(this.canvas!, this.monotonicTs);
    const landmarks = result.landmarks[0];
    if (!landmarks) return [];

    // Map crop-local normalised coords back to full-frame normalised coords.
    const bx = bbox[0];
    const by = bbox[1];
    const bw = bbox[2];
    const bh = bbox[3];
    return landmarks.map((lm: NormalizedLandmark, i: number) => ({
      name: POSE_LANDMARK_NAMES[i] ?? `landmark_${i}`,
      x: clamp01(bx + lm.x * bw),
      y: clamp01(by + lm.y * bh),
      z: lm.z,
      visibility: lm.visibility ?? 0,
    }));
  }

  private ensureCanvas(w: number, h: number): CanvasRenderingContext2D {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    return this.ctx!;
  }

  /** Drop cached keypoints for tracks that are no longer on screen. */
  private syncCache(people: TrackedPerson[]): void {
    const live = new Set(people.map(p => p.trackId));
    for (const id of this.cache.keys()) {
      if (!live.has(id)) this.cache.delete(id);
    }
  }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Singleton convenience — most callers want one estimator per app. */
export const poseEstimator = new PoseEstimator();
