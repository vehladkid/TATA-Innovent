"""LLM Copilot answer service for Suraksha AI.

Generates a natural-language safety answer from an assembled CopilotContext.

Provider order (first available wins, graceful cascade on error):
  1. Groq      - Llama 3.3 70B   (settings.groq_api_key)
  2. Anthropic - Claude          (settings.anthropic_api_key)
  3. Rule-based summarizer        (no key required) - always available

No vendor SDKs: both providers are called over their REST APIs with httpx
(already a pinned dependency), so the Copilot runs and is fully testable with
zero extra installs and zero API keys.  The fallback is the demo safety net -
if Groq is rate-limited or no key is set, the Copilot still answers.
"""

from __future__ import annotations

import json
import logging
from typing import Optional

import httpx

from app.config import settings

_log = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"
ANTHROPIC_VERSION = "2023-06-01"

_TIMEOUT = 20.0
_MAX_TOKENS = 500

# Kept in sync with docs/PROMPTS.md (the canonical, fuller version).
SYSTEM_PROMPT = """You are Suraksha AI's Safety Copilot for an industrial worksite in India.
You receive structured, real-time data from an edge safety-monitoring system:
recent risk events, active hazard zones, and a shift summary. Answer a
supervisor's or EHS manager's question like an expert safety officer.

RULES
1. Use ONLY facts present in the provided context. Never invent statistics,
   times, worker names, or zones.
2. Be concise: 2-5 sentences (read on a live dashboard).
3. When you reference an event, cite its eventId so the UI can link it.
4. If the question implies a problem, suggest ONE concrete action.
5. If the data lacks the answer, say so plainly. Do not guess.
6. Refer to roles, zones, and track IDs - never invented identities.
7. Reply in the language of the question (Hindi question -> Hindi answer).

Risk scoring reference (do not recite unless asked):
  ppeViolation 0-40, proximityToZone 0-30, velocityToward 0-20, posture 0-10,
  fallDetected 0|30. Bands: 0-30 safe, 31-55 caution, 56-80 danger, 81-100 critical.
"""


async def answer_question(context: dict, question: str) -> dict:
    """Return a CopilotResponse-shaped dict (superset, adds `provider`)."""
    text, provider = await _generate(context, question)
    cited = _extract_cited_event_ids(text, context)
    return {
        "answer": text,
        "citedEventIds": cited,
        "suggestedActions": None,
        "provider": provider,
    }


async def _generate(context: dict, question: str) -> tuple[str, str]:
    user_content = (
        "Context:\n" + json.dumps(context, default=str) + f"\n\nQuestion: {question}"
    )
    text, provider = await _llm_complete(SYSTEM_PROMPT, user_content, max_tokens=_MAX_TOKENS)
    if text is not None:
        return text, provider
    return _fallback_answer(context), "offline-rule-based"


async def _llm_complete(
    system_prompt: str, user_content: str, max_tokens: int = _MAX_TOKENS
) -> tuple[Optional[str], Optional[str]]:
    """Cascade Groq -> Anthropic. Returns (text, provider) or (None, None)."""
    if settings.groq_api_key:
        try:
            return await _call_groq(system_prompt, user_content, max_tokens), "groq-llama-3.3-70b"
        except Exception as exc:
            _log.warning("Groq call failed, cascading: %s", exc)

    if settings.anthropic_api_key:
        try:
            return await _call_anthropic(system_prompt, user_content, max_tokens), "claude"
        except Exception as exc:
            _log.warning("Anthropic call failed, cascading: %s", exc)

    return None, None


async def _call_groq(system_prompt: str, user_content: str, max_tokens: int) -> str:
    headers = {"Authorization": f"Bearer {settings.groq_api_key}"}
    body = {
        "model": GROQ_MODEL,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(GROQ_URL, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
    return data["choices"][0]["message"]["content"].strip()


async def _call_anthropic(system_prompt: str, user_content: str, max_tokens: int) -> str:
    headers = {
        "x-api-key": settings.anthropic_api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
    }
    body = {
        "model": ANTHROPIC_MODEL,
        "max_tokens": max_tokens,
        "system": system_prompt,
        "messages": [{"role": "user", "content": user_content}],
    }
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        r = await client.post(ANTHROPIC_URL, headers=headers, json=body)
        r.raise_for_status()
        data = r.json()
    return data["content"][0]["text"].strip()


# ── Incident report narrative (used by /api/reports/incident) ──────────────────

INCIDENT_SYSTEM_PROMPT = """Generate a formal factory incident report from the provided event data.
Structure with these exact section headers, each on its own line:
SUMMARY
TIMELINE
CONTRIBUTING FACTORS
RECOMMENDED CORRECTIVE ACTIONS
COMPLIANCE NOTE

- SUMMARY: 2 sentences.
- TIMELINE: bulleted, each line starting with '- ', include HH:MM:SS from timestamps.
- CONTRIBUTING FACTORS: derive from the breakdown fields.
- RECOMMENDED CORRECTIVE ACTIONS: 3-5 bulleted items.
- COMPLIANCE NOTE: reference general duties under the Factories Act 1948 and ILO
  general safety principles. Do NOT cite specific clause numbers unless present in data.
Style: factual, neutral, no anthropomorphizing, no invented data."""


async def generate_incident_narrative(events: list[dict]) -> tuple[str, str]:
    """Return (narrative_text, provider). Falls back to a templated report."""
    user_content = "Events:\n" + json.dumps(events, default=str)
    text, provider = await _llm_complete(INCIDENT_SYSTEM_PROMPT, user_content, max_tokens=900)
    if text is not None:
        return text, provider
    return _fallback_incident(events), "offline-rule-based"


def _fallback_incident(events: list[dict]) -> str:
    import time as _t

    if not events:
        return "SUMMARY\nNo events were supplied for this report.\n"

    def hms(ts: int) -> str:
        return _t.strftime("%H:%M:%S", _t.localtime((ts or 0) / 1000))

    crit = [e for e in events if e.get("band") == "critical"]
    top = max(events, key=lambda e: e.get("riskScore", 0))
    lines = []
    lines.append("SUMMARY")
    lines.append(
        f"{len(events)} risk events were logged, including {len(crit)} critical. "
        f"The peak risk score was {top.get('riskScore')} ({top.get('band')} band)."
    )
    lines.append("\nTIMELINE")
    for e in sorted(events, key=lambda e: e.get("timestamp", 0)):
        lines.append(
            f"- {hms(e.get('timestamp'))} track #{e.get('trackId')} "
            f"score {e.get('riskScore')} ({e.get('band')}) zone {e.get('zoneId') or 'n/a'}"
        )
    lines.append("\nCONTRIBUTING FACTORS")
    agg: dict[str, int] = {}
    for e in events:
        for k, v in (e.get("breakdown") or {}).items():
            agg[k] = agg.get(k, 0) + (v or 0)
    for k, v in sorted(agg.items(), key=lambda kv: -kv[1]):
        if v:
            lines.append(f"- {_FACTOR_LABEL.get(k, k)}: cumulative {v} pts")
    lines.append("\nRECOMMENDED CORRECTIVE ACTIONS")
    lines.append("- Re-brief the affected crew on PPE and hazard-zone discipline.")
    lines.append("- Review machine-spacing and barriers in the highest-risk zone.")
    lines.append("- Increase supervisor presence during the affected shift window.")
    lines.append("\nCOMPLIANCE NOTE")
    lines.append(
        "This report supports general employer safety duties under the Factories "
        "Act 1948 and ILO general occupational-safety principles. No specific "
        "clause numbers are asserted beyond the supplied data."
    )
    return "\n".join(lines)


# ── Rule-based fallback (no key) ───────────────────────────────────────────────

_FACTOR_LABEL = {
    "ppeViolation": "a PPE violation (missing helmet/vest)",
    "proximityToZone": "dangerous proximity to machinery",
    "velocityToward": "fast movement toward a hazard",
    "posture": "an unsafe posture",
    "fallDetected": "a detected fall",
}
_FACTOR_ACTION = {
    "ppeViolation": "Recommend a PPE-compliance check for that zone this shift.",
    "proximityToZone": "Recommend reinforcing machine-spacing discipline in that zone.",
    "velocityToward": "Recommend reminding the crew to slow down near hazard zones.",
    "posture": "Recommend an ergonomics/posture reminder for that crew.",
    "fallDetected": "Dispatch a supervisor to check on the worker immediately.",
}


def _zone_name(zone_id: Optional[str], zones: list) -> str:
    for z in zones:
        if z.get("zoneId") == zone_id:
            return z.get("name", zone_id)
    return zone_id or "an unnamed zone"


def _fallback_answer(context: dict) -> str:
    events = context.get("recentEvents", []) or []
    zones = context.get("activeZones", []) or []
    if not events:
        return (
            "No risk events are recorded in the current window - the monitored "
            "zones are clear. Nothing to action right now."
        )

    top = max(events, key=lambda e: e.get("riskScore", 0))
    score = top.get("riskScore", 0)
    band = top.get("band", "safe")
    track = top.get("trackId", "?")
    zone = _zone_name(top.get("zoneId"), zones)
    bd = top.get("breakdown", {}) or {}
    # Only name a dominant factor if at least one breakdown value is non-zero —
    # otherwise max() would label a clean 'safe' event as a PPE violation.
    dominant = max(bd, key=bd.get) if bd and any(bd.values()) else None

    factor = _FACTOR_LABEL.get(dominant, "an elevated risk reading")
    action = _FACTOR_ACTION.get(dominant, "Recommend a safety review of that zone.")

    crit = context.get("criticalCount", 0)
    safety = context.get("safetyIndex")

    parts = [
        f"The highest recent risk was track #{track} in {zone}: a {band}-band "
        f"score of {score}, driven by {factor} (event {top.get('eventId')})."
    ]
    if crit:
        plural = "event" if crit == 1 else "events"
        parts.append(f"There {'has' if crit == 1 else 'have'} been {crit} critical {plural} this shift.")
    if safety is not None:
        parts.append(f"Current site safety index is {safety}/100.")
    parts.append(action)
    return " ".join(parts)


def _extract_cited_event_ids(text: str, context: dict) -> list[str]:
    ids = [e.get("eventId") for e in context.get("recentEvents", []) if e.get("eventId")]
    return [eid for eid in ids if eid and eid in text]
