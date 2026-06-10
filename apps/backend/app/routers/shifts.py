"""Shift management endpoints.

Shift state is in-memory (Supabase persistence is a Week 3 TODO once the
events table is populated and we can query by timestamp range).

Endpoints:
  POST /api/shifts/start          → start a new shift
  POST /api/shifts/end            → end the current shift, return summary
  GET  /api/shifts/current        → current shift status
  GET  /api/shifts/{shift_id}/summary → full summary for any shift
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

from fastapi import APIRouter, HTTPException

router = APIRouter()

# ── Cost formula ──────────────────────────────────────────────────────────────
# Each critical event caught in time = ₹75,000 avoided (industry estimate for
# a single reportable incident: medical, legal, downtime, reputational cost).
_COST_PER_INCIDENT_INR = 75_000


# ── In-memory state ───────────────────────────────────────────────────────────

@dataclass
class ShiftState:
    shift_id: str
    start_time: int              # epoch ms
    end_time: Optional[int]      # epoch ms or None if active
    events: list[dict] = field(default_factory=list)  # broker message dicts


# Keyed by shift_id; current shift is the last entry with end_time == None.
_shifts: dict[str, ShiftState] = {}
_current_shift_id: Optional[str] = None


def _active_shift() -> Optional[ShiftState]:
    if _current_shift_id and _current_shift_id in _shifts:
        return _shifts[_current_shift_id]
    return None


def record_event(message: dict) -> None:
    """Called by the events router to record each RiskEvent into the active shift."""
    shift = _active_shift()
    if shift is not None:
        shift.events.append(message)


def _build_summary(shift: ShiftState) -> dict:
    """Compute the shift summary from stored events."""
    total = len(shift.events)
    critical_events = [
        e for e in shift.events
        if e.get("data", {}).get("band") == "critical"
    ]
    danger_events = [
        e for e in shift.events
        if e.get("data", {}).get("band") == "danger"
    ]
    critical_count = len(critical_events)
    incidents_prevented = critical_count  # every critical alert = 1 prevented incident

    cost_avoided = incidents_prevented * _COST_PER_INCIDENT_INR

    # Safety score: start at 100, deduct 5 per critical + 2 per danger, floor 0
    safety_score = max(0, 100 - critical_count * 5 - len(danger_events) * 2)

    # Derive top violations from PPE breakdown
    top_violations = _infer_top_violations(shift.events)

    # Risk scores across all events
    scores = [
        e.get("data", {}).get("riskScore", 0)
        for e in shift.events
    ]
    avg_score = round(sum(scores) / len(scores)) if scores else 0

    return {
        "shiftId":           shift.shift_id,
        "startTime":         shift.start_time,
        "endTime":           shift.end_time,
        "totalEvents":       total,
        "criticalEvents":    critical_count,
        "costAvoided":       cost_avoided,
        "topViolations":     top_violations,
        "safetyScore":       safety_score,
        "avgRiskScore":      avg_score,
        "incidentsPrevented": incidents_prevented,
    }


def _infer_top_violations(events: list[dict]) -> list[str]:
    """Heuristically derive the most common PPE violation type from breakdown scores.

    no_helmet penalty: 25 pts × confidence  → ppe_violation ≥ 20 suggests no_helmet
    no_vest   penalty: 15 pts × confidence  → ppe_violation  5–19 suggests no_vest
    """
    no_helmet_count = 0
    no_vest_count = 0
    for e in events:
        bd = e.get("data", {}).get("breakdown", {})
        ppe = bd.get("ppeViolation", 0)
        if ppe >= 20:
            no_helmet_count += 1
        elif ppe > 0:
            no_vest_count += 1

    violations: list[str] = []
    if no_helmet_count >= no_vest_count:
        if no_helmet_count > 0:
            violations.append("no_helmet")
        if no_vest_count > 0:
            violations.append("no_vest")
    else:
        if no_vest_count > 0:
            violations.append("no_vest")
        if no_helmet_count > 0:
            violations.append("no_helmet")
    return violations or ["no_helmet", "no_vest"]  # default for fresh shift


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/api/shifts/start", status_code=201)
async def start_shift() -> dict:
    """Start a new shift.  Ends any currently active shift automatically."""
    global _current_shift_id

    # Auto-close any open shift
    existing = _active_shift()
    if existing and existing.end_time is None:
        existing.end_time = int(time.time() * 1000)

    shift_id = f"shift-{uuid.uuid4().hex[:8]}"
    now_ms = int(time.time() * 1000)
    _shifts[shift_id] = ShiftState(shift_id=shift_id, start_time=now_ms, end_time=None)
    _current_shift_id = shift_id

    return {
        "shiftId":   shift_id,
        "startTime": now_ms,
        "status":    "started",
    }


@router.post("/api/shifts/end")
async def end_shift() -> dict:
    """End the current active shift and return its full summary."""
    shift = _active_shift()
    if shift is None:
        raise HTTPException(status_code=404, detail="No active shift to end.")

    shift.end_time = int(time.time() * 1000)
    return _build_summary(shift)


@router.get("/api/shifts/current")
async def get_current_shift() -> dict:
    """Return the status and running summary of the active shift.

    Returns 404 if no shift is currently active.
    """
    shift = _active_shift()
    if shift is None:
        raise HTTPException(status_code=404, detail="No active shift.")

    summary = _build_summary(shift)
    summary["active"] = True
    return summary


@router.get("/api/shifts/{shift_id}/summary")
async def get_shift_summary(shift_id: str) -> dict:
    """Return the full summary for any shift by ID."""
    shift = _shifts.get(shift_id)
    if shift is None:
        raise HTTPException(status_code=404, detail=f"Shift '{shift_id}' not found.")
    return _build_summary(shift)
