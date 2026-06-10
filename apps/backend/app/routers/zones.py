"""Zone management endpoints.

Zone state is in-memory, seeded with 4 default zones that match the dashboard
floor-plan layout.

Endpoints:
  GET  /api/zones                     → list all zones
  POST /api/zones                     → create a zone
  GET  /api/zones/{zone_id}/heatmap   → event density for heatmap overlay
"""

from __future__ import annotations

import time
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# ── Zone model ────────────────────────────────────────────────────────────────

RiskLevel = Literal["low", "medium", "high", "critical"]


class ZoneCoordinates(BaseModel):
    x: float  # normalized 0-1 on floor plan
    y: float  # normalized 0-1 on floor plan


class ZoneRecord(BaseModel):
    zone_id: str
    name: str
    risk_level: RiskLevel
    worker_count: int = 0
    coordinates: ZoneCoordinates
    required_ppe: list[str] = ["helmet", "vest"]

    model_config = {"populate_by_name": True}

    def to_response(self) -> dict:
        return {
            "zoneId":       self.zone_id,
            "name":         self.name,
            "riskLevel":    self.risk_level,
            "workerCount":  self.worker_count,
            "coordinates":  self.coordinates.model_dump(),
            "requiredPPE":  self.required_ppe,
            # Polygon: small square centred on coordinates, for HMI Engine compat.
            # Replace with real polygon data when floor plan is finalized.
            "polygon": _bbox_polygon(self.coordinates.x, self.coordinates.y, 0.08),
            "hazardLevel": self.risk_level,
        }


def _bbox_polygon(cx: float, cy: float, half: float) -> list[list[float]]:
    """Generate a square polygon centred at (cx, cy) with side = 2×half."""
    return [
        [cx - half, cy - half],
        [cx + half, cy - half],
        [cx + half, cy + half],
        [cx - half, cy + half],
    ]


class ZoneCreate(BaseModel):
    zone_id: str
    name: str
    risk_level: RiskLevel
    worker_count: int = 0
    coordinates: ZoneCoordinates
    required_ppe: list[str] = ["helmet", "vest"]


# ── Default zones — seeded to match Vanshika's dashboard floor plan ──────────

_zones: dict[str, ZoneRecord] = {
    z.zone_id: z
    for z in [
        ZoneRecord(
            zone_id="zone-excavation-a",
            name="Excavation Zone A",
            risk_level="critical",
            worker_count=0,
            coordinates=ZoneCoordinates(x=0.25, y=0.30),
            required_ppe=["helmet", "vest"],
        ),
        ZoneRecord(
            zone_id="zone-machinery-b",
            name="Heavy Machinery Bay B",
            risk_level="high",
            worker_count=0,
            coordinates=ZoneCoordinates(x=0.70, y=0.35),
            required_ppe=["helmet", "vest"],
        ),
        ZoneRecord(
            zone_id="zone-loading-c",
            name="Loading & Unloading Bay C",
            risk_level="medium",
            worker_count=0,
            coordinates=ZoneCoordinates(x=0.50, y=0.70),
            required_ppe=["helmet", "vest"],
        ),
        ZoneRecord(
            zone_id="zone-admin-d",
            name="Site Office / Admin Area D",
            risk_level="low",
            worker_count=0,
            coordinates=ZoneCoordinates(x=0.15, y=0.75),
            required_ppe=["helmet"],
        ),
    ]
}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/api/zones")
async def list_zones() -> dict:
    """Return all configured zones with floor-plan coordinates."""
    return {"zones": [z.to_response() for z in _zones.values()]}


@router.post("/api/zones", status_code=201)
async def create_zone(body: ZoneCreate) -> dict:
    """Create a new zone.  Returns 409 if zone_id already exists."""
    if body.zone_id in _zones:
        raise HTTPException(status_code=409, detail=f"Zone '{body.zone_id}' already exists.")
    record = ZoneRecord(**body.model_dump())
    _zones[body.zone_id] = record
    return record.to_response()


@router.get("/api/zones/{zone_id}/heatmap")
async def zone_heatmap(zone_id: str, limit: int = 100) -> dict:
    """Return event-density data for the heatmap overlay.

    Each point has x/y coordinates (from the zone's floor-plan position),
    an intensity derived from the event's riskScore, and the event timestamp.

    Falls back to the in-memory broker if Supabase is unavailable.
    """
    if zone_id not in _zones:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")

    zone = _zones[zone_id]

    # Try Supabase first
    from app.services.database import get_events_by_zone
    db_events = await get_events_by_zone(zone_id, limit=limit)

    if db_events:
        points = [
            {
                "x":         zone.coordinates.x,
                "y":         zone.coordinates.y,
                "intensity": round(e.risk_score / 100, 3),
                "timestamp": e.timestamp,
            }
            for e in db_events
        ]
    else:
        # Fall back to in-memory broker ring buffer
        from app.services.event_broker import broker

        raw = broker.recent(limit)
        points = [
            {
                "x":         zone.coordinates.x,
                "y":         zone.coordinates.y,
                "intensity": round(msg["data"].get("riskScore", 0) / 100, 3),
                "timestamp": msg["data"].get("timestamp", int(time.time() * 1000)),
            }
            for msg in raw
            if msg.get("data", {}).get("zoneId") == zone_id
        ]

    return {"zoneId": zone_id, "points": points}


# ── Helper for other modules ──────────────────────────────────────────────────

def get_all_zones() -> list[ZoneRecord]:
    """Return all zones (used by the copilot context endpoint)."""
    return list(_zones.values())
