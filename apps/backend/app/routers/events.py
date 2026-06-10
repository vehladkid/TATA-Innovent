"""Real event ingestion path — used by the PWA once it's live.

Endpoints:
  POST /api/events       → compatibility shim: PWA submits a pre-scored RiskEvent
  POST /api/events/raw   → backend-scored path: PWA submits Detection[]; Risk Engine runs here
  GET  /api/events       → dashboard polls recent events (last n from in-memory history)
  WS   /ws/events        → dashboard subscribes to live broadcast stream
"""

import json
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.schemas.events import RawIngestPayload, RiskEvent
from app.services.event_broker import broker
from app.services.risk_engine import compute_risk

router = APIRouter()


@router.post("/api/events", status_code=202)
async def ingest_event(event: RiskEvent) -> dict:
    """Compatibility shim — accepts a fully pre-scored RiskEvent from the PWA.

    The PWA's own Risk Engine has already computed the score; backend stores
    and broadcasts without re-scoring.  Kept for PWA builds that do on-device
    scoring.  Prefer POST /api/events/raw for new integrations.

    TODO: write to Supabase via AsyncSessionLocal when DATABASE_URL is set.
    """
    message = {"type": "risk_event", "data": event.model_dump(by_alias=True)}
    await broker.publish(message)
    return {"accepted": True, "eventId": event.event_id}


@router.post("/api/events/raw", status_code=202)
async def ingest_raw_detections(payload: RawIngestPayload) -> dict:
    """Backend-scored ingestion path.

    Accepts raw YOLO detections (Detection[]) and optional enrichment data.
    The Risk Engine computes score + breakdown server-side, assembles a full
    RiskEvent, and broadcasts it to all WS subscribers.

    Excavator bboxes are extracted automatically from detections labelled with
    the 'excavator' DetectionClass, supplemented by any explicit machinery_bboxes
    in the payload.

    TODO: write to Supabase via AsyncSessionLocal when DATABASE_URL is set.
    """
    # Pull excavator bboxes out of the detection list so the risk engine can
    # compute proximity without needing the 'excavator' class to be a separate
    # machinery_bboxes field — both paths are merged here.
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

    message = {"type": "risk_event", "data": event.model_dump(by_alias=True)}
    await broker.publish(message)
    return {"accepted": True, "eventId": event.event_id}


@router.get("/api/events")
async def get_recent_events(n: int = 50) -> dict:
    """Return the last n events from the in-memory ring buffer."""
    return {"events": broker.recent(n)}


@router.websocket("/ws/events")
async def events_ws(ws: WebSocket) -> None:
    """Subscribe to the live event stream. Each published RiskEvent is forwarded here."""
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
