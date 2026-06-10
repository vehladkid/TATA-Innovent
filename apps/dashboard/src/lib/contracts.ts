// contracts.ts — Suraksha AI shared data contracts
// This is the single source of truth. Every team member codes against these types.
// Do not change without telling the team. Push changes via PR with review.
//
// ⚠️  ARCHITECTURE VIOLATION — this file is a local duplicate of
//    packages/shared/contracts.ts.  ARCHITECTURE.md §6 forbids duplicating
//    contract types across apps.  TODO (Vanshika): wire @suraksha/shared as a
//    workspace dependency (vite alias + package.json) and delete this file.
//    Until then, keep this file manually in sync with packages/shared/contracts.ts.

// ============================================================
// 1. DETECTION — what the ML model emits per frame
// ============================================================
export type DetectionClass =
  | 'person'
  | 'helmet'
  | 'vest'
  | 'no_helmet'
  | 'no_vest'
  | 'excavator'   // added 2026-06-09
  | 'ladder'      // added 2026-06-10
  | 'gloves'      // added 2026-06-10
  | 'mask';       // added 2026-06-10

export type Detection = {
  class: DetectionClass;
  bbox: [number, number, number, number]; // [x, y, w, h] normalized 0-1
  confidence: number;                      // 0-1
  frameId: number;
  timestamp: number;                       // ms since epoch
};

// ============================================================
// 2. POSE KEYPOINT — from MediaPipe PoseLandmarker
// ============================================================
export type Keypoint = {
  name: string;        // e.g. 'left_shoulder', 'right_knee'
  x: number;           // normalized 0-1
  y: number;           // normalized 0-1
  z: number;           // depth, normalized
  visibility: number;  // 0-1
};

// ============================================================
// 3. TRACKED PERSON — SORT tracker output, HMI Engine input
// ============================================================
export type TrackedPerson = {
  trackId: number;
  bbox: [number, number, number, number];
  velocity: [number, number];              // [vx, vy] in normalized units/sec
  ppe: {
    helmet: boolean;
    vest: boolean;
  };
  poseKeypoints?: Keypoint[];              // optional, MediaPipe output
  firstSeenMs: number;
  lastSeenMs: number;
};

// ============================================================
// 4. ZONE — hazard zones defined on the floor plan
// ============================================================
export type Zone = {
  zoneId: string;
  name: string;                            // e.g. 'Press Machine A'
  polygon: [number, number][];             // normalized coords of zone boundary
  hazardLevel: 'low' | 'medium' | 'high' | 'critical';
  requiredPPE: ('helmet' | 'vest')[];
};

// ============================================================
// 5. RISK EVENT — the core event that flows edge -> backend -> dashboard
// ============================================================
export type RiskBand = 'safe' | 'caution' | 'danger' | 'critical';

export type RiskBreakdown = {
  ppeViolation: number;       // 0-40
  proximityToZone: number;    // 0-30
  velocityToward: number;     // 0-20
  posture: number;            // 0-10
  fallDetected: number;       // 0 or 30 (binary boost)
};

export type RiskEvent = {
  eventId: string;            // uuid
  trackId: number;
  riskScore: number;          // 0-100
  band: RiskBand;
  breakdown: RiskBreakdown;
  predictedEntryMs: number | null;  // ms until predicted hazard entry, null if N/A
  zoneId: string | null;
  snapshotUrl?: string;       // Supabase storage URL, face-blurred
  timestamp: number;
};

// ============================================================
// 6. LLM COPILOT — context envelope for the chat
// ============================================================
export type CopilotContext = {
  recentEvents: RiskEvent[];   // last 50 events
  activeZones: Zone[];
  shiftSummary: {
    shiftId: string;
    startedAt: number;
    incidentsPrevented: number;
    criticalCount: number;
    activeWorkers: number;
  };
  userQuestion: string;
};

export type CopilotResponse = {
  answer: string;
  citedEventIds: string[];     // events the answer references
  suggestedActions?: string[];
};

// ============================================================
// 7. ALERT PAYLOAD — what n8n receives to fan out
// ============================================================
export type AlertPayload = {
  severity: 'critical' | 'high' | 'medium';
  event: RiskEvent;
  llmSummary: string;          // pre-generated 1-line summary
  supervisorIds: string[];
};

// ============================================================
// 8. WEBSOCKET MESSAGE — wire format between PWA / backend / dashboard
// ============================================================
export type WSMessage =
  | { type: 'risk_event'; data: RiskEvent }
  | { type: 'shift_update'; data: CopilotContext['shiftSummary'] }
  | { type: 'zone_update'; data: Zone }
  | { type: 'heartbeat'; data: { ts: number } };
