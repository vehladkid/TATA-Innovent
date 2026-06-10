"""Auto-incident PDF report generation.

Gathers recent (or explicitly listed) RiskEvents, asks the LLM to draft a
formal report narrative (Groq -> Claude -> rule-based fallback), and renders it
to a one-page PDF with fpdf2 (pure-Python, no native dependencies — unlike
WeasyPrint, which needs GTK/Cairo on Windows).
"""

from __future__ import annotations

import time
from typing import Optional

_SECTION_HEADERS = {
    "SUMMARY",
    "TIMELINE",
    "CONTRIBUTING FACTORS",
    "RECOMMENDED CORRECTIVE ACTIONS",
    "COMPLIANCE NOTE",
}


async def gather_events(event_ids: Optional[list[str]], minutes: int) -> list[dict]:
    """Pull events from Supabase (preferred) or the in-memory broker."""
    from app.services.database import get_recent_events
    from app.services.event_broker import broker

    # NOTE: fetches newest N then time-filters in Python. Raised to 1000 to avoid
    # silent truncation for busy shifts. Proper fix (Tejvir): add a
    # get_events_since(since_ms) query in database.py and call it here.
    db = await get_recent_events(limit=1000)
    if db:
        events = [e.model_dump(by_alias=True) for e in db]
    else:
        events = [
            m["data"] for m in broker.recent(100) if m.get("type") == "risk_event"
        ]

    if event_ids:
        wanted = set(event_ids)
        return [e for e in events if e.get("eventId") in wanted]

    since = int(time.time() * 1000) - minutes * 60 * 1000
    return [e for e in events if e.get("timestamp", 0) >= since]


async def build_report(event_ids: Optional[list[str]] = None, minutes: int = 60) -> dict:
    events = await gather_events(event_ids, minutes)

    from app.services.llm import generate_incident_narrative

    narrative, provider = await generate_incident_narrative(events)
    return {
        "title": "Suraksha AI - Incident Report",
        "generatedAt": int(time.time() * 1000),
        "provider": provider,
        "eventCount": len(events),
        "narrative": narrative,
    }


def _ascii(text: str) -> str:
    """fpdf2 core fonts are latin-1 only; sanitize common unicode."""
    repl = {"₹": "Rs ", "–": "-", "—": "-", "‘": "'",
            "’": "'", "“": '"', "”": '"', "…": "...", "→": "->"}
    for k, v in repl.items():
        text = text.replace(k, v)
    return text.encode("latin-1", "replace").decode("latin-1")


def render_pdf(report: dict) -> bytes:
    from fpdf import FPDF
    from fpdf.enums import XPos, YPos

    # Always return the cursor to the left margin on the next line.
    nl = {"new_x": XPos.LMARGIN, "new_y": YPos.NEXT}

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 16)
    pdf.multi_cell(0, 10, _ascii(report["title"]), **nl)

    ts = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(report["generatedAt"] / 1000))
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(120)
    pdf.multi_cell(
        0, 6,
        _ascii(f"Generated {ts}  |  events: {report['eventCount']}  |  drafted by: {report['provider']}"),
        **nl,
    )
    pdf.set_text_color(0)
    pdf.ln(2)

    for raw in report["narrative"].splitlines():
        line = raw.rstrip()
        if not line:
            pdf.ln(2)
            continue
        key = line.strip().rstrip(":").upper()
        if key in _SECTION_HEADERS:
            pdf.ln(1)
            pdf.set_font("Helvetica", "B", 11)
            pdf.multi_cell(0, 6, _ascii(line.strip()), **nl)
        else:
            pdf.set_font("Helvetica", "", 10)
            pdf.multi_cell(0, 5, _ascii(line), **nl)

    return bytes(pdf.output())
