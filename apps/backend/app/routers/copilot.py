"""LLM Copilot context endpoint.

Samarth's Copilot queries GET /api/copilot/context before answering any
user question.  The response is assembled from:
  - Last 10 RiskEvents (Supabase if available, broker ring buffer otherwise)
  - All active zones
  - Current shift summary (or a default if no shift is active)
  - Safety index (100 - avg risk score across recent events)

Response shape is a superset of contracts.ts CopilotContext, adding
criticalCount and safetyIndex for richer LLM context.

Endpoints:
  GET /api/copilot/context
"""

from __future__ import annotations

import time

from fastapi import APIRouter

router = APIRouter()

_RECENT_EVENTS_FOR_COPILOT = 10


@router.get("/api/copilot/context")
async def get_copilot_context() -> dict:
    """Assemble and return the full context for the LLM Copilot.

    All fields are optional sources — if Supabase is down or no shift is active,
    the response still contains useful data from the in-memory broker.
    """
    # ── Recent events ─────────────────────────────────────────────────────────
    from app.services.database import get_recent_events
    from app.services.event_broker import broker

    db_events = await get_recent_events(limit=_RECENT_EVENTS_FOR_COPILOT)

    if db_events:
        recent_events = [e.model_dump(by_alias=True) for e in db_events]
    else:
        raw = broker.recent(_RECENT_EVENTS_FOR_COPILOT)
        recent_events = [msg["data"] for msg in raw if msg.get("type") == "risk_event"]

    # ── Active zones ──────────────────────────────────────────────────────────
    from app.routers.zones import get_all_zones

    active_zones = [z.to_response() for z in get_all_zones()]

    # ── Shift summary ─────────────────────────────────────────────────────────
    from app.routers.shifts import _active_shift, _build_summary

    shift = _active_shift()
    if shift:
        summary = _build_summary(shift)
        shift_summary = {
            "shiftId":            summary["shiftId"],
            "startedAt":          summary["startTime"],
            "incidentsPrevented": summary["incidentsPrevented"],
            "criticalCount":      summary["criticalEvents"],
            "activeWorkers":      _count_active_workers(),
        }
        critical_count = summary["criticalEvents"]
    else:
        now_ms = int(time.time() * 1000)
        shift_summary = {
            "shiftId":            "no-active-shift",
            "startedAt":          now_ms,
            "incidentsPrevented": 0,
            "criticalCount":      0,
            "activeWorkers":      0,
        }
        critical_count = sum(
            1 for e in recent_events if e.get("band") == "critical"
        )

    # ── Safety index ──────────────────────────────────────────────────────────
    scores = [e.get("riskScore", 0) for e in recent_events]
    avg_risk = round(sum(scores) / len(scores)) if scores else 0
    safety_index = max(0, 100 - avg_risk)

    return {
        # contracts.ts CopilotContext fields
        "recentEvents":  recent_events,
        "activeZones":   active_zones,
        "shiftSummary":  shift_summary,
        "userQuestion":  "",  # populated by the frontend before sending to LLM
        # Extra fields for richer LLM context
        "criticalCount": critical_count,
        "safetyIndex":   safety_index,
        "avgRiskScore":  avg_risk,
        "generatedAt":   int(time.time() * 1000),
    }


def _count_active_workers() -> int:
    """Estimate active workers from the broker's recent unique track IDs."""
    from app.services.event_broker import broker

    recent = broker.recent(50)
    track_ids = {
        msg.get("data", {}).get("trackId")
        for msg in recent
        if msg.get("type") == "risk_event"
    }
    track_ids.discard(None)
    return len(track_ids)
