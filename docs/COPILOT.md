# LLM Safety Copilot + Voice Bank + Incident Reports

Owner: Samarth · branch `samarth/dev`

This is Samarth's full slice of Suraksha AI: the LLM Copilot (backend + chat UI),
the Hindi voice bank, and the auto-incident PDF reports.

---

## What's included

| Piece | Where | Notes |
|---|---|---|
| Copilot answer endpoint | `apps/backend/app/routers/copilot.py` → `POST /api/copilot/chat` | Returns `{answer, citedEventIds, suggestedActions, provider}` |
| LLM service | `apps/backend/app/services/llm.py` | Groq Llama 3.3 → Claude → rule-based fallback (no key needed) |
| Incident PDF | `apps/backend/app/routers/reports.py` → `POST /api/reports/incident` | fpdf2, returns a PDF |
| Chat UI | `apps/dashboard/src/components/copilot/CopilotPanel.tsx` | Floating panel, self-contained |
| System prompts | `docs/PROMPTS.md` | System prompt + few-shot |
| Hindi voice bank | `docs/VOICE_BANK.md` + `apps/pwa/public/audio/hi/*.mp3` | 20 clips, already generated |
| Voice generator | `tools/generate_voice_bank.py` | Regenerate audio if phrasing changes |
| Q&A playbook | `docs/QA_PLAYBOOK.md` | Judge questions + answers |

**Provider order:** Groq → Claude → offline rule-based. Without any API key the
Copilot still answers (lower quality) — this is the demo safety net. Add a key to
auto-upgrade.

---

## How to TEST it yourself

### 1. Backend (Python)

```powershell
cd apps\backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

In a second terminal:

```powershell
# health
curl http://127.0.0.1:8000/health

# seed a critical event so the Copilot has data
curl -X POST http://127.0.0.1:8000/api/events -H "Content-Type: application/json" -d "{\"eventId\":\"evt-1\",\"trackId\":3,\"riskScore\":86,\"band\":\"critical\",\"breakdown\":{\"ppeViolation\":25,\"proximityToZone\":30,\"velocityToward\":15,\"posture\":0,\"fallDetected\":0},\"predictedEntryMs\":1100,\"zoneId\":\"zone-machinery-b\",\"timestamp\":1749574800000}"

# ask the Copilot
curl -X POST http://127.0.0.1:8000/api/copilot/chat -H "Content-Type: application/json" -d "{\"question\":\"what just happened?\"}"

# generate an incident PDF (saves to incident.pdf)
curl -X POST http://127.0.0.1:8000/api/reports/incident -H "Content-Type: application/json" -d "{\"minutes\":600000}" -o incident.pdf
```

You should see a grounded answer citing `evt-1`, and `incident.pdf` opens as a
real PDF. `provider` will be `offline-rule-based` until a key is set.

### 2. Add the LLM key (optional, upgrades quality)

Create `apps/backend/.env`:

```
GROQ_API_KEY=gsk_...your_free_groq_key...
# ANTHROPIC_API_KEY=sk-ant-...   # optional fallback
```

Restart the server. `provider` now reads `groq-llama-3.3-70b`, answers get
sharper, and Hindi questions are answered in Hindi.

### 3. See the chat UI (dashboard)

```powershell
cd apps\dashboard
npm install
npm run dev
```

Open the dashboard, enter the command center (any view past the landing/boot
screen) — a **COPILOT** button floats bottom-right. Click it, ask a question.
It talks to the backend at `VITE_BACKEND_URL` (defaults to
`http://localhost:8000`). To point at the deployed backend, create
`apps/dashboard/.env`:

```
VITE_BACKEND_URL=https://suraksha-backend.onrender.com
```

### 4. Hear the Hindi voice bank

Play any file in `apps/pwa/public/audio/hi/` (e.g. `step_back_danger.mp3`).
Dhruv wires these into the PWA by filename (see `docs/VOICE_BANK.md`).

---

## Integration handoffs

- **Dhruv (PWA):** play the clips in `apps/pwa/public/audio/hi/` on alert. Map
  alert → filename per `docs/VOICE_BANK.md`. Browsers decode the `.mp3`s via
  `AudioContext.decodeAudioData`.
- **Vanshika (dashboard):** the Copilot panel is fully self-contained; it does
  not touch the shared event-store. The only shared edit is one line in
  `App.tsx` rendering `<CopilotPanel />`.
- **Tejvir (backend):** `copilot.py` now has `assemble_context()` reused by both
  `/context` and `/chat`. New deps: `fpdf2` (PDF). LLM calls go over REST via the
  existing `httpx` dep — no SDK added. Set `GROQ_API_KEY` / `ANTHROPIC_API_KEY`
  in Render env for production.
