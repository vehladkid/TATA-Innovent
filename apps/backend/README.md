# apps/backend

> FastAPI backend — Owner: Tejvir (infra, ingestion) + Samarth (Copilot, PDF reports)

## Responsibilities
- `POST /api/events` — ingest RiskEvent from PWA
- `WS /ws/events` — broadcast events to dashboard subscribers
- `WS /ws/fake-events` — fake stream for parallel dev (remove before demo day)
- `GET /api/copilot/context` — assembles CopilotContext for LLM
- `POST /api/copilot/chat` — proxies to Groq Llama 3.3
- `POST /api/reports/incident` — PDF generation via WeasyPrint
- Supabase Postgres persistence + Storage for snapshots
- Webhook trigger to n8n on critical events

## Stack
Python 3.11 · FastAPI · SQLAlchemy 2.0 (async) · Pydantic v2 · Supabase · Upstash Redis · Groq

## Dev
```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
