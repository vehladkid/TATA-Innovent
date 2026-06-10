"""n8n webhook fan-out for critical safety events.

Fire-and-forget: never blocks the HTTP response, never crashes the endpoint.
Only fires when band == 'critical' OR risk_score >= 75.
Silently skips if N8N_WEBHOOK_URL is not configured.
"""

from __future__ import annotations

import asyncio
import logging

import httpx

_log = logging.getLogger(__name__)

# Threshold below which we skip the webhook even if band isn't 'critical'
_SCORE_THRESHOLD = 75
_TIMEOUT_SECONDS = 5.0


async def fire_webhook(event) -> None:  # event: RiskEvent
    """Schedule a non-blocking webhook POST for a critical event.

    Silently skips if:
      - N8N_WEBHOOK_URL is not set
      - event.band != 'critical' AND event.risk_score < 75
    """
    from app.config import settings

    url = settings.n8n_webhook_url
    if not url:
        return

    if event.band != "critical" and event.risk_score < _SCORE_THRESHOLD:
        return

    payload = {
        "type": "critical_alert",
        "eventId": event.event_id,
        "riskScore": event.risk_score,
        "band": event.band,
        "zoneId": event.zone_id,
        "timestamp": event.timestamp,
        "breakdown": event.breakdown.model_dump(by_alias=True) if event.breakdown else {},
        "message": f"CRITICAL: Worker at risk — score {event.risk_score}/100",
    }

    # Fire-and-forget: task runs independently of the HTTP response cycle
    asyncio.create_task(_post(url, payload, event.event_id))


async def _post(url: str, payload: dict, event_id: str) -> None:
    """Send the webhook POST.  All exceptions are caught and logged."""
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload)
            _log.info(
                "Webhook fired for event %s → %s [HTTP %d]",
                event_id,
                url,
                response.status_code,
            )
    except httpx.TimeoutException:
        _log.warning("Webhook timed out for event %s (url=%s)", event_id, url)
    except Exception as exc:
        _log.warning("Webhook failed for event %s: %s", event_id, exc)
