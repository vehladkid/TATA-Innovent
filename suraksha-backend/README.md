# Suraksha AI — Backend

FastAPI backend for the Suraksha AI real-time industrial safety system.
Deployed on Render (Singapore). Serves the PWA, supervisor dashboard, and LLM Copilot.

---

## 60-Second Local Quickstart

```bash
cd suraksha-backend

python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # edit DATABASE_URL if you have Supabase creds; leave blank otherwise

uvicorn main:app --reload
```

Verify it's alive:

```bash
curl http://localhost:8000/health
# {"status":"ok"}

curl http://localhost:8000/
# {"service":"suraksha-ai","status":"ok","version":"0.1.0"}

curl "http://localhost:8000/api/fake-events/batch?n=5"
# {"recentEvents":[...5 RiskEvents...],"shiftSummary":{...}}

curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{"eventId":"test-001","trackId":1,"riskScore":72,"band":"danger","breakdown":{"ppeViolation":30,"proximityToZone":20,"velocityToward":15,"posture":7,"fallDetected":0},"predictedEntryMs":1800,"zoneId":"zone_press_A","timestamp":1700000000000}'
# {"accepted":true,"eventId":"test-001"}

curl http://localhost:8000/api/events
# {"events":[...]}
```

---

## Render Deploy (One-Click)

1. Push this repo to GitHub.
2. Go to [dashboard.render.com](https://dashboard.render.com) → **New Web Service** → connect repo.
3. Render reads `render.yaml` automatically — region, plan, build/start commands are pre-filled.
4. Set `DATABASE_URL` in **Environment → Secret Files** (paste your Supabase connection string).
5. Deploy. Health check at `/health` confirms startup.

> **Free tier note:** Render spins down after 15 min of inactivity. Set up an external cron (cron-job.org)
> to `GET https://your-app.onrender.com/health` every 10 minutes to keep it warm.

---

## Endpoint Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Service info (`service`, `status`, `version`) |
| `GET` | `/health` | Render health check — returns `{"status":"ok"}` |
| `GET` | `/api/fake-events/batch?n=50` | Batch of n fake RiskEvents + shift summary (max 200) |
| `WS` | `/ws/fake-events` | Streams fake events every 2 s; shift_update every 10 events |
| `POST` | `/api/events` | PWA submits a RiskEvent; broadcasts to `/ws/events` subscribers |
| `GET` | `/api/events?n=50` | Last n events from in-memory ring buffer |
| `WS` | `/ws/events` | Subscribe to live broadcast from POST /api/events |

---

## Teammate Connection Examples

### Vanshika (Dashboard) — WebSocket

```javascript
// Connect to fake stream while PWA pipeline isn't ready
const ws = new WebSocket("wss://suraksha-ai.onrender.com/ws/fake-events");

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === "risk_event") {
    renderEvent(msg.data);          // msg.data is a RiskEvent
  }
  if (msg.type === "shift_update") {
    updateShiftPanel(msg.data);     // msg.data is ShiftSummary
  }
};

// When PWA is live, switch to real stream:
// const ws = new WebSocket("wss://suraksha-ai.onrender.com/ws/events");
```

### Samarth (LLM Copilot) — REST batch

```python
import httpx

resp = httpx.get("https://suraksha-ai.onrender.com/api/fake-events/batch", params={"n": 50})
data = resp.json()

context = {
    "recentEvents": data["recentEvents"],   # list[RiskEvent]
    "shiftSummary": data["shiftSummary"],   # ShiftSummary
}
# Pass context to your Claude/GPT call
```

---

## Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `DATABASE_URL` | `None` | No | Supabase Postgres connection string |
| `CORS_ORIGINS` | `*` | No | Comma-separated allowed origins |
| `LOG_LEVEL` | `INFO` | No | Python logging level |
| `ENVIRONMENT` | `development` | No | `development` or `production` |

---

## Adding the Database (Week 2)

1. `pip install asyncpg==0.30.0` and add it to `requirements.txt`.
2. Set `DATABASE_URL` in `.env`.
3. Run `alembic init alembic && alembic revision --autogenerate -m "init" && alembic upgrade head`.
4. In `app/routers/events.py`, replace the `TODO` comment with an async insert using `AsyncSessionLocal`.
