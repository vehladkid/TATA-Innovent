"""Fake event generator — drop this router once real PWA events are flowing.

Endpoints:
  GET  /api/fake-events/batch?n=50   → batch for LLM Copilot prompt seeding
  WS   /ws/fake-events               → streams one RiskEvent every 2 s
"""

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
BAND_WEIGHTS = [0.45, 0.30, 0.18, 0.07]


def _band_to_score(band: str) -> int:
    if band == "safe":
        return random.randint(0, 30)
    if band == "caution":
        return random.randint(31, 55)
    if band == "danger":
        return random.randint(56, 80)
    return random.randint(81, 100)


def _generate_breakdown(score: int) -> dict:
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
        "startedAt": int(time.time() * 1000) - 3_600_000,
        "incidentsPrevented": random.randint(3, 15),
        "criticalCount": random.randint(0, 4),
        "activeWorkers": random.randint(8, 22),
    }


@router.websocket("/ws/fake-events")
async def fake_events_ws(ws: WebSocket) -> None:
    """Streams fake events every 2 s; injects a shift_update every 10 events."""
    await ws.accept()
    counter = 0
    try:
        while True:
            await ws.send_text(json.dumps({"type": "risk_event", "data": generate_fake_event()}))
            counter += 1
            if counter % 10 == 0:
                await ws.send_text(json.dumps({"type": "shift_update", "data": generate_shift_summary()}))
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        return


@router.get("/api/fake-events/batch")
async def fake_events_batch(n: int = 50) -> dict:
    """Batch of fake RiskEvents for LLM Copilot prompt testing (max 200)."""
    n = max(1, min(n, 200))
    return {
        "recentEvents": [generate_fake_event() for _ in range(n)],
        "shiftSummary": generate_shift_summary(),
    }
