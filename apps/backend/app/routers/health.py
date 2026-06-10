"""Health-check endpoints.

GET /        → minimal liveness probe (used by Render health checks)
GET /health  → rich status for the keep-alive cron and ops dashboard

Uptime is tracked from the module import time; it resets on each dyno restart.
"""

import time

from fastapi import APIRouter

router = APIRouter()

_start_time: float = time.time()


@router.get("/")
async def root() -> dict:
    """Minimal liveness probe."""
    return {"service": "suraksha-ai", "status": "ok", "version": "1.0.0"}


@router.get("/health")
async def health() -> dict:
    """Rich health status for the keep-alive cron and ops monitoring.

    Returns:
      status           "ok"
      database         "connected" if Supabase client is ready, else "degraded"
      version          semver string
      uptime           seconds since last server restart
      activeConnections number of live WebSocket subscribers
    """
    from app.services.database import is_connected
    from app.services.event_broker import broker

    return {
        "status":            "ok",
        "database":          "connected" if is_connected() else "degraded",
        "version":           "1.0.0",
        "uptime":            round(time.time() - _start_time),
        "activeConnections": broker.subscriber_count,
    }
