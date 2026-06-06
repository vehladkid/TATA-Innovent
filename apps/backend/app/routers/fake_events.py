# fake_events.py — backend fake event generator
# Run this on the FastAPI backend so Vanshika's dashboard and Samarth's LLM Copilot
# have realistic data flowing from Day 1, before Dhruv's PWA pipeline is ready.
#
# Usage:
#   1. Add to your FastAPI app:
#        from fake_events import router as fake_events_router
#        app.include_router(fake_events_router)
#   2. Frontend connects to: ws://localhost:8000/ws/fake-events
#   3. Receives a RiskEvent JSON every 2 seconds.
#
# Remove this route once real events from the PWA are flowing.

import asyncio
import json
import random
import time
import uuid
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

ZONES = ["zone_press_A", "zone_forklift_lane", "zone_welding_bay", None]
BANDS = ["safe", "caution", "danger", "critical"]
BAND_WEIGHTS = [0.45, 0.30, 0.18, 0.07]  # mostly safe, occasional critical


def _band_to_score(band: str) -> int:
    """Map a band to a realistic score within its range."""
    if band == "safe":
        return random.randint(0, 30)
    if band == "caution":
        return random.randint(31, 55)
    if band == "danger":
        return random.randint(56, 80)
    return random.randint(81, 100)  # critical


def _generate_breakdown(score: int) -> dict:
    """Generate a breakdown that roughly sums to the score."""
    remaining = score
    ppe = min(40, random.randint(0, remaining))
    remaining -= ppe
    prox = min(30, random.randint(0, remaining))
    remaining -= prox
    velo = min(20, random.randint(0, remaining))
    remaining -= velo
    posture = min(10, max(0, remaining))
    fall = 30 if score > 85 and random.random() < 0.3 else 0
    return {
        "ppeViolation": ppe,
        "proximityToZone": prox,
        "velocityToward": velo,
        "posture": posture,
        "fallDetected": fall,
    }


def _predicted_entry(band: str) -> Optional[int]:
    """Critical/danger events sometimes have a predicted entry countdown."""
    if band in ("danger", "critical") and random.random() < 0.6:
        return random.choice([800, 1200, 1800, 2400, 3000])
    return None


def generate_fake_event() -> dict:
    band = random.choices(BANDS, weights=BAND_WEIGHTS, k=1)[0]
    score = _band_to_score(band)
    return {
        "eventId": str(uuid.uuid4()),
        "trackId": random.randint(1, 6),
        "riskScore": score,
        "band": band,
        "breakdown": _generate_breakdown(score),
        "predictedEntryMs": _predicted_entry(band),
        "zoneId": random.choice(ZONES),
        "timestamp": int(time.time() * 1000),
    }


def generate_shift_summary() -> dict:
    return {
        "shiftId": "shift_2026_06_06_morning",
        "startedAt": int(time.time() * 1000) - 3600_000,
        "incidentsPrevented": random.randint(3, 15),
        "criticalCount": random.randint(0, 4),
        "activeWorkers": random.randint(8, 22),
    }


@router.websocket("/ws/fake-events")
async def fake_events_ws(ws: WebSocket):
    """Streams fake events every 2 seconds. Also sends a shift summary every 10 events."""
    await ws.accept()
    counter = 0
    try:
        while True:
            event_msg = {"type": "risk_event", "data": generate_fake_event()}
            await ws.send_text(json.dumps(event_msg))
            counter += 1

            if counter % 10 == 0:
                summary_msg = {"type": "shift_update", "data": generate_shift_summary()}
                await ws.send_text(json.dumps(summary_msg))

            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return


@router.get("/api/fake-events/batch")
def fake_events_batch(n: int = 50) -> dict:
    """REST endpoint returning a batch of fake events.
    Samarth uses this to seed his LLM Copilot context for prompt testing.
    """
    n = max(1, min(n, 200))
    events = [generate_fake_event() for _ in range(n)]
    return {
        "recentEvents": events,
        "shiftSummary": generate_shift_summary(),
    }
