"""Pydantic v2 models mirroring contracts.ts exactly.

All models use camelCase JSON aliases (matching TypeScript) while
Python code uses snake_case. populate_by_name=True means both work.
"""

from typing import Annotated, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

_CAMEL = ConfigDict(alias_generator=to_camel, populate_by_name=True)

# ── 1. Detection ────────────────────────────────────────────────────────────

# ⚠️  CONTRACT CHANGE 2026-06-09: 'excavator' added — mirrors contracts.ts.
# ⚠️  CONTRACT CHANGE 2026-06-10: 'ladder', 'gloves', 'mask' added for 9-class model.
#     Risk Engine ignores these three (scores 0 pts); they pass through to the UI.
DetectionClass = Literal[
    "person", "helmet", "vest", "no_helmet", "no_vest",
    "excavator", "ladder", "gloves", "mask",
]


class Detection(BaseModel):
    model_config = _CAMEL
    # 'class' is a Python keyword; to_camel("class_") → "class" but we're explicit
    class_: DetectionClass = Field(alias="class")
    bbox: tuple[float, float, float, float]
    confidence: float
    frame_id: int
    timestamp: int


# ── 2. Keypoint ──────────────────────────────────────────────────────────────

class Keypoint(BaseModel):
    model_config = _CAMEL
    name: str
    x: float
    y: float
    z: float
    visibility: float


# ── 3. TrackedPerson ─────────────────────────────────────────────────────────

class PPEStatus(BaseModel):
    model_config = _CAMEL
    helmet: bool
    vest: bool


class TrackedPerson(BaseModel):
    model_config = _CAMEL
    track_id: int
    bbox: tuple[float, float, float, float]
    velocity: tuple[float, float]
    ppe: PPEStatus
    pose_keypoints: Optional[list[Keypoint]] = None
    first_seen_ms: int
    last_seen_ms: int


# ── 4. Zone ───────────────────────────────────────────────────────────────────

HazardLevel = Literal["low", "medium", "high", "critical"]
PPEItem = Literal["helmet", "vest"]


class Zone(BaseModel):
    model_config = _CAMEL
    zone_id: str
    name: str
    polygon: list[tuple[float, float]]
    hazard_level: HazardLevel
    # to_camel("required_ppe") → "requiredPpe", but contracts.ts has "requiredPPE"
    required_ppe: list[PPEItem] = Field(alias="requiredPPE")


# ── 5. RiskEvent ──────────────────────────────────────────────────────────────

RiskBand = Literal["safe", "caution", "danger", "critical"]


class RiskBreakdown(BaseModel):
    model_config = _CAMEL
    ppe_violation: int       # 0-40
    proximity_to_zone: int   # 0-30
    velocity_toward: int     # 0-20
    posture: int             # 0-10
    fall_detected: int       # 0 or 30


class RiskEvent(BaseModel):
    model_config = _CAMEL
    event_id: str
    track_id: int
    risk_score: int
    band: RiskBand
    breakdown: RiskBreakdown
    predicted_entry_ms: Optional[int] = None
    zone_id: Optional[str] = None
    snapshot_url: Optional[str] = None
    timestamp: int


# ── 6. LLM Copilot ────────────────────────────────────────────────────────────

class ShiftSummary(BaseModel):
    model_config = _CAMEL
    shift_id: str
    started_at: int
    incidents_prevented: int
    critical_count: int
    active_workers: int


class CopilotContext(BaseModel):
    model_config = _CAMEL
    recent_events: list[RiskEvent]
    active_zones: list[Zone]
    shift_summary: ShiftSummary
    user_question: str


class CopilotResponse(BaseModel):
    model_config = _CAMEL
    answer: str
    cited_event_ids: list[str]
    suggested_actions: Optional[list[str]] = None


# ── 7. AlertPayload ───────────────────────────────────────────────────────────

AlertSeverity = Literal["critical", "high", "medium"]


class AlertPayload(BaseModel):
    model_config = _CAMEL
    severity: AlertSeverity
    event: RiskEvent
    llm_summary: str
    supervisor_ids: list[str]


# ── 8. WSMessage (discriminated union) ────────────────────────────────────────

class WSRiskEvent(BaseModel):
    type: Literal["risk_event"] = "risk_event"
    data: RiskEvent


class WSShiftUpdate(BaseModel):
    type: Literal["shift_update"] = "shift_update"
    data: ShiftSummary


class WSZoneUpdate(BaseModel):
    type: Literal["zone_update"] = "zone_update"
    data: Zone


class WSHeartbeat(BaseModel):
    type: Literal["heartbeat"] = "heartbeat"
    data: dict[str, int]  # {"ts": <epoch_ms>}


WSMessage = Annotated[
    Union[WSRiskEvent, WSShiftUpdate, WSZoneUpdate, WSHeartbeat],
    Field(discriminator="type"),
]


# ── 9. RawIngestPayload — accepted by POST /api/events/raw ───────────────────
#
# This is the backend-scored ingestion path.  The PWA sends raw YOLO detections
# and optional enrichment; the Risk Engine computes the RiskScore server-side.
# The existing POST /api/events (accepts full RiskEvent) is kept as a
# compatibility shim for PWA builds that already compute scores on-device.

class RawIngestPayload(BaseModel):
    model_config = _CAMEL
    track_id: int
    detections: list[Detection]
    tracked_person: Optional[TrackedPerson] = None
    # Normalized [x, y, w, h] bboxes for heavy machinery in the same frame.
    # Populated automatically once the PWA labels excavator detections with the
    # 'excavator' DetectionClass — the risk engine extracts them from `detections`
    # directly.  This field remains for callers that compute machinery bboxes
    # externally (e.g. a separate object-detector).
    machinery_bboxes: Optional[list[tuple[float, float, float, float]]] = None
    zone_id: Optional[str] = None
    snapshot_url: Optional[str] = None
    predicted_entry_ms: Optional[int] = None
    timestamp: int
