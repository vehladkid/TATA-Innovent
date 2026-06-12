"""Supabase persistence layer.

Graceful degradation: if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not set,
all functions log a warning once and become no-ops.  The API continues to work
entirely in-memory via the EventBroker ring buffer.

══════════════════════════════════════════════════════════════════
SQL — run this in your Supabase dashboard (SQL Editor) once:
══════════════════════════════════════════════════════════════════

  CREATE TABLE IF NOT EXISTS events (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id         TEXT        UNIQUE NOT NULL,
      track_id         INTEGER,
      risk_score       INTEGER     NOT NULL,
      band             TEXT        NOT NULL,
      breakdown        JSONB,
      zone_id          TEXT,
      snapshot_url     TEXT,
      predicted_entry_ms BIGINT,
      timestamp        BIGINT      NOT NULL,
      created_at       TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS events_timestamp_idx  ON events (timestamp DESC);
  CREATE INDEX IF NOT EXISTS events_zone_ts_idx    ON events (zone_id, timestamp DESC);
  CREATE INDEX IF NOT EXISTS events_band_ts_idx    ON events (band,    timestamp DESC);

══════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

_log = logging.getLogger(__name__)

# Module-level Supabase AsyncClient — None until init_supabase() succeeds.
_client = None
_warned = False  # emit the "no Supabase" warning only once


async def init_supabase() -> None:
    """Initialise the Supabase async client.

    Called from main.py lifespan.  Safe to call multiple times.
    """
    global _client, _warned
    from app.config import settings

    if not settings.supabase_url or not settings.supabase_service_role_key:
        _log.warning(
            "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — "
            "events will not be persisted to Supabase (in-memory only)."
        )
        _warned = True
        return

    try:
        from supabase import create_async_client  # type: ignore[import]

        _client = await create_async_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        _log.info("Supabase async client initialised — persistence enabled.")
    except Exception as exc:
        _log.warning(
            "Failed to initialise Supabase client (%s). "
            "Running in-memory only.",
            exc,
        )


def is_connected() -> bool:
    """Return True if the Supabase client is ready."""
    return _client is not None


# ── Write ────────────────────────────────────────────────────────────────────

async def save_event(event) -> None:  # event: RiskEvent
    """Persist a RiskEvent to Supabase.  Silently skips if not connected."""
    if _client is None:
        return
    try:
        row = {
            "event_id":           event.event_id,
            "track_id":           event.track_id,
            "risk_score":         event.risk_score,
            "band":               event.band,
            "breakdown":          event.breakdown.model_dump(by_alias=True) if event.breakdown else None,
            "zone_id":            event.zone_id,
            "snapshot_url":       event.snapshot_url,
            "predicted_entry_ms": event.predicted_entry_ms,
            "timestamp":          event.timestamp,
        }
        await _client.table("events").upsert(row, on_conflict="event_id").execute()
    except Exception as exc:
        _log.warning("save_event failed for %s: %s", event.event_id, exc)


# ── Read ─────────────────────────────────────────────────────────────────────

async def get_recent_events(limit: int = 50) -> list:
    """Return the most recent `limit` RiskEvents from Supabase, newest first.

    Returns an empty list if Supabase is unavailable — callers fall back to
    the in-memory broker.
    """
    if _client is None:
        return []
    try:
        result = (
            await _client.table("events")
            .select("*")
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )
        return _rows_to_risk_events(result.data or [])
    except Exception as exc:
        _log.warning("get_recent_events failed: %s", exc)
        return []


async def get_events_by_zone(zone_id: str, limit: int = 20) -> list:
    """Return the most recent `limit` RiskEvents for the given zone."""
    if _client is None:
        return []
    try:
        result = (
            await _client.table("events")
            .select("*")
            .eq("zone_id", zone_id)
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )
        return _rows_to_risk_events(result.data or [])
    except Exception as exc:
        _log.warning("get_events_by_zone(%s) failed: %s", zone_id, exc)
        return []


async def get_events_since(since_ms: int, limit: int = 1000) -> list:
    """Return up to `limit` RiskEvents with timestamp >= `since_ms`, newest first.

    Falls back to filtering the in-memory broker ring buffer when Supabase is
    unavailable, so incident reports always have data even without a DB connection.
    """
    if _client is None:
        from app.services.event_broker import broker
        cutoff = since_ms
        return [e for e in broker.recent(limit) if e.get("timestamp", 0) >= cutoff][:limit]
    try:
        result = (
            await _client.table("events")
            .select("*")
            .gte("timestamp", since_ms)
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        )
        return _rows_to_risk_events(result.data or [])
    except Exception as exc:
        _log.warning("get_events_since(since=%d) failed: %s", since_ms, exc)
        return []


async def get_critical_events(since_ms: int) -> list:
    """Return all critical-band RiskEvents after `since_ms` (epoch ms)."""
    if _client is None:
        return []
    try:
        result = (
            await _client.table("events")
            .select("*")
            .eq("band", "critical")
            .gte("timestamp", since_ms)
            .order("timestamp", desc=True)
            .execute()
        )
        return _rows_to_risk_events(result.data or [])
    except Exception as exc:
        _log.warning("get_critical_events(since=%d) failed: %s", since_ms, exc)
        return []


# ── Internal helper ───────────────────────────────────────────────────────────

def _rows_to_risk_events(rows: list[dict]) -> list:
    from app.schemas.events import RiskBreakdown, RiskEvent

    events: list = []
    for row in rows:
        try:
            bd = row.get("breakdown") or {}
            events.append(
                RiskEvent(
                    event_id=row["event_id"],
                    track_id=row.get("track_id", 0),
                    risk_score=row["risk_score"],
                    band=row["band"],
                    breakdown=RiskBreakdown.model_validate(bd) if bd else RiskBreakdown(
                        ppe_violation=0,
                        proximity_to_zone=0,
                        velocity_toward=0,
                        posture=0,
                        fall_detected=0,
                    ),
                    zone_id=row.get("zone_id"),
                    snapshot_url=row.get("snapshot_url"),
                    predicted_entry_ms=row.get("predicted_entry_ms"),
                    timestamp=row["timestamp"],
                )
            )
        except Exception as exc:
            _log.debug("Skipping malformed row %s: %s", row.get("event_id"), exc)
    return events
