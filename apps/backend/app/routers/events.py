"""Real event ingestion path — used by the PWA once it's live.

Endpoints:
  POST /api/events                → compatibility shim: pre-scored RiskEvent from PWA
  POST /api/events/raw            → backend-scored path: raw YOLO detections
  GET  /api/events                → recent events (Supabase → broker fallback)
  GET  /api/events/critical       → critical-band events in last 60 minutes
  GET  /api/events/zones/{zone_id}→ recent events for a specific zone
  WS   /ws/events                 → live broadcast stream for dashboard
"""

import json
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.schemas.events import RawIngestPayload, RiskEvent
from app.services.event_broker import broker
from app.services.risk_engine import compute_risk

router = APIRouter()

_ONE_HOUR_MS = 60 * 60 * 1_000


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _persist_and_broadcast(event: RiskEvent) -> None:
    """Persist to Supabase (if connected), broadcast to WS subscribers,
    record in the active shift, and fire the n8n webhook if critical."""
    # 1. Persist
    from app.services.database import save_event
    await save_event(event)

    # 2. Broadcast
    message = {"type": "risk_event", "data": event.model_dump(by_alias=True)}
    await broker.publish(message)

    # 3. Record in active shift
    from app.routers.shifts import record_event
    record_event(message)

    # 4. Webhook fan-out (fire-and-forget)
    from app.services.webhook import fire_webhook
    await fire_webhook(event)


# ── Ingestion endpoints ───────────────────────────────────────────────────────

@router.post("/api/events", status_code=202)
async def ingest_event(event: RiskEvent) -> dict:
    """Compatibility shim — accepts a fully pre-scored RiskEvent from the PWA.

    The PWA's own Risk Engine has already computed the score; backend persists
    and broadcasts without re-scoring.  Prefer POST /api/events/raw for new
    integrations.
    """
    await _persist_and_broadcast(event)
    return {"accepted": True, "eventId": event.event_id}


@router.post("/api/events/raw", status_code=202)
async def ingest_raw_detections(payload: RawIngestPayload) -> dict:
    """Backend-scored ingestion path.

    Accepts raw YOLO detections (Detection[]) and optional enrichment data.
    The Risk Engine computes score + breakdown server-side, assembles a full
    RiskEvent, persists it, and broadcasts it to all WS subscribers.

    Excavator bboxes are extracted automatically from detections labelled with
    the 'excavator' DetectionClass, supplemented by any explicit machinery_bboxes
    in the payload.
    """
    excavator_bboxes: list[tuple[float, float, float, float]] = [
        d.bbox for d in payload.detections if d.class_ == "excavator"
    ]
    extra_bboxes: list[tuple[float, float, float, float]] = payload.machinery_bboxes or []
    all_machinery_bboxes = excavator_bboxes + extra_bboxes

    risk = compute_risk(
        detections=payload.detections,
        tracked_person=payload.tracked_person,
        machinery_bboxes=all_machinery_bboxes,
    )

    event = RiskEvent(
        event_id=str(uuid.uuid4()),
        track_id=payload.track_id,
        risk_score=risk.score,
        band=risk.band,
        breakdown=risk.breakdown,
        predicted_entry_ms=payload.predicted_entry_ms,
        zone_id=payload.zone_id,
        snapshot_url=payload.snapshot_url,
        timestamp=payload.timestamp if payload.timestamp else int(time.time() * 1000),
    )

    await _persist_and_broadcast(event)
    return {"accepted": True, "eventId": event.event_id}


# ── Query endpoints ───────────────────────────────────────────────────────────

@router.get("/api/events")
async def get_recent_events(n: int = 50) -> dict:
    """Return the last n events.

    Tries Supabase first; falls back to the in-memory ring buffer so the
    endpoint always works even without a database connection.
    """
    from app.services.database import get_recent_events as db_get

    db_events = await db_get(limit=n)
    if db_events:
        return {"events": [e.model_dump(by_alias=True) for e in db_events], "source": "database"}

    return {"events": broker.recent(n), "source": "memory"}


@router.get("/api/events/critical")
async def get_critical_events(minutes: int = 60) -> dict:
    """Return critical-band events in the last `minutes` minutes.

    Tries Supabase first; falls back to scanning the in-memory ring buffer.
    """
    since_ms = int(time.time() * 1000) - minutes * 60 * 1_000

    from app.services.database import get_critical_events as db_get

    db_events = await db_get(since_ms=since_ms)
    if db_events:
        return {
            "events": [e.model_dump(by_alias=True) for e in db_events],
            "since": since_ms,
            "source": "database",
        }

    # In-memory fallback
    memory_events = [
        msg["data"]
        for msg in broker.recent(100)
        if msg.get("data", {}).get("band") == "critical"
        and msg.get("data", {}).get("timestamp", 0) >= since_ms
    ]
    return {"events": memory_events, "since": since_ms, "source": "memory"}


@router.get("/api/events/zones/{zone_id}")
async def get_zone_events(zone_id: str, n: int = 20) -> dict:
    """Return the last n events for a specific zone.

    Tries Supabase first; falls back to the in-memory ring buffer.
    """
    from app.services.database import get_events_by_zone as db_get

    db_events = await db_get(zone_id=zone_id, limit=n)
    if db_events:
        return {
            "zoneId": zone_id,
            "events": [e.model_dump(by_alias=True) for e in db_events],
            "source": "database",
        }

    # In-memory fallback
    memory_events = [
        msg["data"]
        for msg in broker.recent(100)
        if msg.get("data", {}).get("zoneId") == zone_id
    ][-n:]
    return {"zoneId": zone_id, "events": memory_events, "source": "memory"}


# ── WebSocket stream ──────────────────────────────────────────────────────────

@router.websocket("/ws/events")
async def events_ws(ws: WebSocket) -> None:
    """Subscribe to the live RiskEvent broadcast stream.

    Each published RiskEvent is forwarded as a JSON-encoded WSMessage.
    """
    await ws.accept()
    q = broker.subscribe()
    try:
        while True:
            message = await q.get()
            await ws.send_text(json.dumps(message))
    except WebSocketDisconnect:
        pass
    finally:
        broker.unsubscribe(q)
