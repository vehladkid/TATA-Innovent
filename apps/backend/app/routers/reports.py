"""Incident report endpoint.

  POST /api/reports/incident  -> generates a one-page PDF incident report

Body (all optional):
  { "eventIds": ["evt-1", ...],   # specific events; omit to use a time window
    "minutes": 60 }               # window size when eventIds is omitted

Returns application/pdf as an attachment.
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Response
from pydantic import BaseModel

router = APIRouter()


class IncidentReportRequest(BaseModel):
    eventIds: Optional[list[str]] = None
    minutes: int = 60


@router.post("/api/reports/incident")
async def incident_report(body: IncidentReportRequest) -> Response:
    from app.services.incident_report import build_report, render_pdf

    report = await build_report(body.eventIds, body.minutes)
    pdf = render_pdf(report)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="suraksha_incident_report.pdf"',
            "X-Report-Provider": report["provider"],
            "X-Report-Event-Count": str(report["eventCount"]),
        },
    )
