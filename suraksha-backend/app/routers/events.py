"""Real event ingestion path — used by the PWA once it's live.

Endpoints:
  POST /api/events       → PWA submits a RiskEvent; broadcasts to WS subscribers
  GET  /api/events       → dashboard polls recent events (last n from in-memory history)
  WS   /ws/events        → dashboard subscribes to live broadcast stream
"""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.schemas.events import RiskEvent
from app.services.event_broker import broker

router = APIRouter()


@router.post("/api/events", status_code=202)
async def ingest_event(event: RiskEvent) -> dict:
    """Accept a RiskEvent from the PWA, broadcast to all WS subscribers.

    TODO: write to Supabase via AsyncSessionLocal when DATABASE_URL is set.
    """
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
