// hmiEngine.ts — the "brain" of the phone (Owner: Dhruv, deliverable #2)
//
// Takes SORT-tracked persons + hazard zones and works out what is actually
// happening on the floor: who is inside a danger zone, how fast and which way
// they are moving, where they will be in 2 seconds, and whether anyone has
// fallen. Output (EnrichedPerson[]) is consumed by the Risk Engine.
//
// Pure, framework-free, no external deps — mirrors the style of postProcessor.ts.
// All coordinates are normalised 0–1.
//
// ⚠️ bbox convention (verified against postProcessor.ts computeIoU + ONNX
//    parseOutput in apps/pwa/README.md): bbox = [x, y, w, h] where (x, y) is the
//    TOP-LEFT corner, NOT the centre. Centre = [x + w/2, y + h/2].

import type { TrackedPerson, Zone } from '@suraksha/shared/contracts';

// ============================================================
// Output types (no EnrichedPerson exists in contracts.ts yet —
// this module owns the shape the Risk Engine reads).
// ============================================================

/** Whether a person is currently standing inside a hazard zone, and for how long. */
export type ZoneStatus = {
  inside: boolean;
  zoneId: string | null;
  /** Continuous time inside the current zone, in ms. 0 when outside. */
  dwellMs: number;
};

/** Linear 2-second forward projection of where the person is heading. */
export type Trajectory = {
  /** Predicted centre [x, y] PREDICT_HORIZON_S into the future. */
  predicted: [number, number];
  /** True if the projected path crosses into any hazard zone within the horizon. */
  willEnterZone: boolean;
  predictedZoneId: string | null;
  /** Estimated ms until the path first enters a zone, null if it never does. */
  msToEntry: number | null;
};

/** Posture / fall assessment combining bbox shape and (optional) pose. */
export type Posture = {
  fallen: boolean;
  /** bbox aspect ratio w/h. > 1 means wider than tall. */
  aspectRatio: number;
  /** 0–1 confidence in the `fallen` verdict. */
  confidence: number;
};

/** TrackedPerson enriched with HMI-computed situational fields. */
export type EnrichedPerson = TrackedPerson & {
  /** Centre of the bbox [x, y], normalised. */
  centre: [number, number];
  /** Jitter-smoothed velocity [vx, vy] in normalised units/sec. */
  smoothedVelocity: [number, number];
  /** Magnitude of smoothedVelocity. */
  speed: number;
  zoneStatus: ZoneStatus;
  trajectory: Trajectory;
  posture: Posture;
};

// ============================================================
// Tunables
// ============================================================

/** How many recent position samples feed the weighted velocity average. */
const VELOCITY_WINDOW = 8;
/** Seconds to project forward for the trajectory prediction. */
const PREDICT_HORIZON_S = 2;
/** Steps to sample along the projected path when locating zone entry. */
const TRAJECTORY_SAMPLES = 20;
/** bbox aspect ratio above which the person is "lying down" wide. */
const FALL_ASPECT_RATIO = 1.4;
/**
 * If pose is available, shoulders and hips within this normalised vertical
 * distance of each other means the torso is roughly horizontal (a fall).
 */
const FALL_TORSO_FLAT_Y = 0.12;

// ============================================================
// Per-track history (module-level state; wipe with resetHmiState()).
// ============================================================

type Sample = { cx: number; cy: number; t: number };

type TrackHistory = {
  samples: Sample[];          // last VELOCITY_WINDOW centres + timestamps
  zoneId: string | null;      // zone the person is currently inside
  zoneSinceMs: number;        // when they entered that zone
};

const _history = new Map<number, TrackHistory>();

/** Wipe all per-track history. Call between demo scenarios. */
export function resetHmiState(): void {
  _history.clear();
}

// ============================================================
// Geometry helpers
// ============================================================

/** Centre of a top-left [x, y, w, h] bbox. */
export function bboxCentre(
  bbox: [number, number, number, number],
): [number, number] {
  return [bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2];
}

/**
 * Ray-casting point-in-polygon. Zones are arbitrary polygons, not rectangles.
 * `polygon` is an array of [x, y] vertices in order.
 */
export function pointInPolygon(
  point: [number, number],
  polygon: [number, number][],
): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** First zone containing the point, or null. */
function zoneAt(
  point: [number, number],
  zones: Zone[],
): Zone | null {
  for (const z of zones) {
    if (pointInPolygon(point, z.polygon)) return z;
  }
  return null;
}

// ============================================================
// Velocity — weighted average of recent per-step velocities,
// recent steps weighted more heavily to cut jitter while staying responsive.
// ============================================================

function computeSmoothedVelocity(
  history: TrackHistory,
  fallback: [number, number],
): [number, number] {
  const s = history.samples;
  if (s.length < 2) return fallback;

  let vx = 0;
  let vy = 0;
  let weightSum = 0;
  // Per-step velocity between consecutive samples; weight = step index (recent = larger).
  for (let i = 1; i < s.length; i++) {
    const dt = (s[i].t - s[i - 1].t) / 1000; // seconds
    if (dt <= 0) continue;
    const w = i; // 1, 2, 3, ... — most recent step gets the highest weight
    vx += ((s[i].cx - s[i - 1].cx) / dt) * w;
    vy += ((s[i].cy - s[i - 1].cy) / dt) * w;
    weightSum += w;
  }
  if (weightSum === 0) return fallback;
  return [vx / weightSum, vy / weightSum];
}

// ============================================================
// Trajectory — linear projection, then sample the path to find zone entry.
// ============================================================

function computeTrajectory(
  centre: [number, number],
  velocity: [number, number],
  zones: Zone[],
  alreadyInside: boolean,
): Trajectory {
  const predicted: [number, number] = [
    clamp01(centre[0] + velocity[0] * PREDICT_HORIZON_S),
    clamp01(centre[1] + velocity[1] * PREDICT_HORIZON_S),
  ];

  // Already standing in a zone → no future "entry" to predict.
  if (alreadyInside) {
    return { predicted, willEnterZone: false, predictedZoneId: null, msToEntry: null };
  }

  // Walk the projected path in small steps; report the first zone we cross into.
  for (let i = 1; i <= TRAJECTORY_SAMPLES; i++) {
    const frac = i / TRAJECTORY_SAMPLES;
    const p: [number, number] = [
      centre[0] + velocity[0] * PREDICT_HORIZON_S * frac,
      centre[1] + velocity[1] * PREDICT_HORIZON_S * frac,
    ];
    const z = zoneAt(p, zones);
    if (z) {
      return {
        predicted,
        willEnterZone: true,
        predictedZoneId: z.zoneId,
        msToEntry: Math.round(frac * PREDICT_HORIZON_S * 1000),
      };
    }
  }

  return { predicted, willEnterZone: false, predictedZoneId: null, msToEntry: null };
}

// ============================================================
// Posture / fall — combine bbox aspect ratio with pose, when available.
//   • bbox wider than tall (aspect > FALL_ASPECT_RATIO), AND
//   • (if pose present) shoulders and hips at roughly the same height.
// Without pose we fall back to the bbox signal alone at lower confidence.
// ============================================================

function computePosture(person: TrackedPerson): Posture {
  const [, , w, h] = person.bbox;
  const aspectRatio = h > 0 ? w / h : 0;
  const wideEnough = aspectRatio > FALL_ASPECT_RATIO;

  const kp = person.poseKeypoints;
  const shoulderY = avgY(kp, 'left_shoulder', 'right_shoulder');
  const hipY = avgY(kp, 'left_hip', 'right_hip');

  if (shoulderY !== null && hipY !== null) {
    const torsoFlat = Math.abs(shoulderY - hipY) < FALL_TORSO_FLAT_Y;
    const fallen = wideEnough && torsoFlat;
    // Both signals agree → high confidence; one signal → low.
    const confidence = fallen ? 0.95 : wideEnough || torsoFlat ? 0.4 : 0.0;
    return { fallen, aspectRatio, confidence };
  }

  // No pose: rely on bbox shape alone, hedge the confidence.
  return { fallen: wideEnough, aspectRatio, confidence: wideEnough ? 0.6 : 0.0 };
}

function avgY(
  kp: TrackedPerson['poseKeypoints'],
  a: string,
  b: string,
): number | null {
  if (!kp || kp.length === 0) return null;
  const ka = kp.find(k => k.name === a);
  const kb = kp.find(k => k.name === b);
  const ys: number[] = [];
  if (ka && ka.visibility > 0.3) ys.push(ka.y);
  if (kb && kb.visibility > 0.3) ys.push(kb.y);
  if (ys.length === 0) return null;
  return ys.reduce((s, y) => s + y, 0) / ys.length;
}

// ============================================================
// Main entry point
// ============================================================

/**
 * Enrich tracked persons with zone, velocity, trajectory and posture info.
 * Stateful: maintains per-track history across calls for velocity smoothing
 * and zone-dwell timing. `nowMs` defaults to each person's lastSeenMs.
 */
export function processFrame(
  trackedPersons: TrackedPerson[],
  zones: Zone[],
): EnrichedPerson[] {
  const seen = new Set<number>();

  const enriched = trackedPersons.map<EnrichedPerson>(person => {
    seen.add(person.trackId);
    const now = person.lastSeenMs;
    const centre = bboxCentre(person.bbox);

    // --- history bookkeeping ---
    let hist = _history.get(person.trackId);
    if (!hist) {
      hist = { samples: [], zoneId: null, zoneSinceMs: now };
      _history.set(person.trackId, hist);
    }
    hist.samples.push({ cx: centre[0], cy: centre[1], t: now });
    if (hist.samples.length > VELOCITY_WINDOW) hist.samples.shift();

    // --- velocity (smoothed, falls back to SORT's raw velocity) ---
    const smoothedVelocity = computeSmoothedVelocity(hist, person.velocity);
    const speed = Math.hypot(smoothedVelocity[0], smoothedVelocity[1]);

    // --- zone occupancy + dwell ---
    const currentZone = zoneAt(centre, zones);
    if (currentZone) {
      if (hist.zoneId !== currentZone.zoneId) {
        hist.zoneId = currentZone.zoneId;
        hist.zoneSinceMs = now;
      }
    } else {
      hist.zoneId = null;
      hist.zoneSinceMs = now;
    }
    const zoneStatus: ZoneStatus = {
      inside: currentZone !== null,
      zoneId: currentZone ? currentZone.zoneId : null,
      dwellMs: currentZone ? now - hist.zoneSinceMs : 0,
    };

    // --- trajectory ---
    const trajectory = computeTrajectory(
      centre,
      smoothedVelocity,
      zones,
      currentZone !== null,
    );

    // --- posture / fall ---
    const posture = computePosture(person);

    return {
      ...person,
      centre,
      smoothedVelocity,
      speed,
      zoneStatus,
      trajectory,
      posture,
    };
  });

  // Drop history for tracks that disappeared, so the map doesn't grow forever.
  for (const id of _history.keys()) {
    if (!seen.has(id)) _history.delete(id);
  }

  return enriched;
}

// ============================================================
// Helpers + console debug
// ============================================================

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Pretty-print the enriched state — call from the browser console on demo day. */
export function debugHmiState(enriched: EnrichedPerson[]): void {
  // eslint-disable-next-line no-console
  console.table(
    enriched.map(p => ({
      track: p.trackId,
      centre: `${p.centre[0].toFixed(2)}, ${p.centre[1].toFixed(2)}`,
      speed: p.speed.toFixed(3),
      zone: p.zoneStatus.inside ? `${p.zoneStatus.zoneId} (${p.zoneStatus.dwellMs}ms)` : '—',
      willEnter: p.trajectory.willEnterZone
        ? `${p.trajectory.predictedZoneId} in ${p.trajectory.msToEntry}ms`
        : '—',
      fallen: p.posture.fallen ? `yes (${p.posture.confidence.toFixed(2)})` : 'no',
    })),
  );
}
