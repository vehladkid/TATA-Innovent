# Samarth — Work Log & Handoff (Suraksha AI)

**Owner:** Samarth · **Branch:** `samarth/dev` · **Commit email:** `samarthsgsits23@gmail.com`
**My scope:** LLM Safety Copilot (end-to-end) · Hindi voice bank · auto-incident PDF reports · system prompts · Q&A playbook

This file is my single source of truth: what I built, how to run/see/check it, what's
still left for me, and the bugs/risks we found across the whole app (with why + how to fix).

---

## 1. What I built (my contribution as a team member)

| Area | What it does | Where |
|---|---|---|
| **LLM Safety Copilot — backend** | `POST /api/copilot/chat` answers a supervisor's question over live site data; cites the exact event IDs it used. Provider cascade **Groq Llama 3.3 → Claude → offline rule-based**, so it answers even with no API key. | `apps/backend/app/routers/copilot.py`, `apps/backend/app/services/llm.py` |
| **Copilot — chat UI** | Floating "COPILOT" button on the dashboard; self-contained (doesn't touch the shared store). | `apps/dashboard/src/components/copilot/CopilotPanel.tsx` (+1 line in `App.tsx`) |
| **Auto-incident PDF** | `POST /api/reports/incident` → one-page PDF (summary, timeline, contributing factors, corrective actions, Factories Act / ILO compliance note) via fpdf2. | `apps/backend/app/routers/reports.py`, `apps/backend/app/services/incident_report.py` |
| **Hindi voice bank** | 20 alert phrases + generated audio clips for the PWA to play on-device. | `docs/VOICE_BANK.md`, `apps/pwa/public/audio/hi/*.mp3`, `tools/generate_voice_bank.py` |
| **System prompts** | Production system prompt + few-shot + incident-report prompt. | `docs/PROMPTS.md` |
| **Q&A playbook** | Judge questions + rehearsed answers (esp. the Copilot ones). | `docs/QA_PLAYBOOK.md` |
| **Demo helpers** | Seed believable events so the Copilot/PDF have data to talk about. | `tools/seed_demo_events.py` |
| **Run/test guide** | How to run my whole slice. | `docs/COPILOT.md` |

**Design choices worth knowing:**
- **No vendor SDKs** — Groq and Claude are called over their REST APIs with `httpx` (already a dependency). Zero extra installs, and it's fully testable with **no API key** thanks to the rule-based fallback (the demo safety net).
- **PDF uses `fpdf2`, not WeasyPrint** — WeasyPrint needs GTK/Cairo native libs (painful on Windows). fpdf2 is pure-Python, one `pip install`.
- **Reused Tejvir's context assembly** — `GET /api/copilot/context` already existed; I refactored it into `assemble_context()` and built `/chat` on top, so there's no duplicate logic.

---

## 2. How to run, see, use, and check it

### Backend (terminal 1)
```powershell
cd E:\TATA-innovent\repo\apps\backend
python -m venv .venv                                  # first time only
.\.venv\Scripts\python.exe -m pip install -r requirements.txt   # first time only
.\.venv\Scripts\python.exe -m uvicorn main:app --port 8000
```

### Seed demo data + dashboard (terminal 2)
```powershell
cd E:\TATA-innovent\repo
.\apps\backend\.venv\Scripts\python.exe tools\seed_demo_events.py
cd apps\dashboard
npm install                                           # first time only
npm run dev
```
Open the URL Vite prints (usually `http://localhost:5173`), click past the
landing/boot screen → the **COPILOT** button is bottom-right.

### Try it
- Ask the Copilot: *"what just happened on site?"* → it answers and shows a real event chip (e.g. `demo-05`) + a provider badge.
- Generate a PDF:
  ```powershell
  curl -X POST http://localhost:8000/api/reports/incident -H "Content-Type: application/json" -d "{\"minutes\":60}" -o incident.pdf
  start incident.pdf
  ```
- Hear Hindi: play `apps\pwa\public\audio\hi\step_back_danger.mp3`.

### Quick health check (no UI)
```powershell
curl http://localhost:8000/health
curl -X POST http://localhost:8000/api/copilot/chat -H "Content-Type: application/json" -d "{\"question\":\"status?\"}"
```
`provider` reads `offline-rule-based` until a Groq key is set (see §3).

### Record a demo
Press **Win + G** (Xbox Game Bar) to screen-record, or use OBS.

---

## 3. What's LEFT for me (Samarth) — and how to do it

| # | Task | Why | How |
|---|---|---|---|
| 1 | **Add a Groq API key** | Flips the Copilot from offline fallback to live Llama 3.3 (sharper answers; Hindi questions answered in Hindi). The single thing that upgrades "works" → "wow". | Get a free key (no card) at console.groq.com → create `apps/backend/.env` with `GROQ_API_KEY=gsk_...` → restart backend. Badge then shows ⚡ Llama 3.3. Optionally add `ANTHROPIC_API_KEY=sk-ant-...` for fallback. |
| 2 | **Commit + push `samarth/dev`** | My work is local only right now. | See §3.1 below (needs identity unlock — the governance hook blocks a non-`ozpool` identity until I set an env var). |
| 3 | **Open a PR `samarth/dev → main`** | Tejvir reviews/merges per team rules (I never merge). | `gh pr create --base main --head samarth/dev` (make sure `gh auth status` is my account). PR body: `Refs #<issue>` if there is one. |
| 4 | **Add `provider?: string` to `CopilotResponse`** | My panel reads `data.provider` as a superset; the contract should be honest. **Contract change = PR + tag owners** (ARCHITECTURE rule). | Edit `packages/shared/contracts.ts` + mirror `apps/backend/app/schemas/events.py`, in one PR. |
| 5 | **Cultural review of Hindi phrasing** | Tone must feel natural to a worker, not robotic. | Read `docs/VOICE_BANK.md` with a native Hindi speaker; tweak wording; re-run `python tools/generate_voice_bank.py`. |
| 6 | **(Optional) hash-chain audit trail** | The "tamper-evident incident log" differentiator — only if Week 3 has slack. ~100 lines, no crypto: `prev_hash + event → sha256`, one Postgres column, one "audit verified ✓" UI badge. | New `app/services/audit_chain.py` + a column on the events table + a small dashboard badge. Coordinate the schema with Tejvir. |
| 7 | **Coordinate the incident-report DB query with Tejvir** | My PDF currently fetches the newest 1000 events then time-filters in Python (mitigated, see flag F-A3). Proper fix is a DB-side time query. | Ask Tejvir to add `get_events_since(since_ms)` in `database.py`; then call it from `incident_report.py`. |

### 3.1 Commit & push commands (run in PowerShell — the hook needs you, I can't set the env)
```powershell
$env:CLAUDE_SKIP_IDENTITY_CHECK = '1'          # lifts the identity guard for this shell only
cd E:\TATA-innovent\repo
git config user.name "Samarth"; git config user.email "samarthsgsits23@gmail.com"
git add -A                                      # .venv and node_modules are gitignored
git commit -m "feat(copilot): LLM safety copilot, hindi voice bank, incident PDF reports"
git push -u origin samarth/dev
```
First check `gh auth status` shows **my** GitHub account, not `ozpool` — otherwise the
push goes out under the wrong identity. Do **not** add any AI / Co-Authored-By trailer.

---

## 4. Bugs & risks we found (whole-app audit) — FLAGS

We reviewed every file across the app (not just mine). Below are real problems in code
that is **already written** — things that error, are improper, or will break later.
Format: **severity · file · problem · why it matters · how to fix · owner**.

### ✅ Already fixed (my slice, tested)
- **F-A1 · CRITICAL · `CopilotPanel.tsx`** — chat could hang forever if the backend stalled. *Fix applied:* 15s `AbortController` timeout + clear "timed out" message.
- **F-A2 · MEDIUM · `llm.py`** — a clean "safe" event was mislabeled as a PPE violation (`max()` over an all-zero breakdown). *Fix applied:* guard with `any(bd.values())`.
- **F-A3 · MEDIUM · `incident_report.py`** — PDF silently truncated at 100 events. *Mitigated:* raised cap to 1000; proper DB-query fix flagged for Tejvir (see §3 task 7).

### 🔴 CRITICAL — will break in production (not on localhost)
- **F1 · `apps/backend/main.py:44` · CORS** — `allow_origins=["*"]` **with** `allow_credentials=True` is invalid per the Fetch spec; browsers reject every cross-origin request (including my Copilot's). **Why:** the deployed dashboard/PWA can't talk to the backend at all. **Fix:** `allow_credentials=(origins != ["*"])`, or set explicit Vercel origins in `CORS_ORIGINS`. **Owner:** Tejvir.
- **F2 · `apps/dashboard/src/lib/websocket.ts:10` · WS URL** — hardcoded `ws://localhost:8000/ws/fake-events`. **Why:** in production it points at the user's own machine, reads the **fake demo** stream instead of the real `/ws/events`, and `ws://` is blocked as mixed content on an https page. **Fix:** `const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws/events'` and set `VITE_WS_URL=wss://<backend>/ws/events` in Vercel. **Owner:** Vanshika.
- **F3 · `apps/dashboard/src/lib/websocket.ts:233` · cleanup** — `disconnectWebSocket()` can't actually stop the socket: `onclose` fires after cleanup and **restarts** the simulation + reconnect. **Why:** leaked timers/sockets, double audio. **Fix:** add an `intentionalClose` flag, set it in disconnect, early-return in `onclose`. **Owner:** Vanshika.

### 🟠 HIGH — wrong behavior / silent failures
- **F4 · `apps/backend/tests/test_health.py:20`** — assertion is wrong (`== {"status":"ok"}` vs the real richer body); the test has **never passed**. **Fix:** `assert r.json()["status"] == "ok"`. **Owner:** Tejvir.
- **F5 · `requirements.txt` / `app/db/session.py`** — `asyncpg` not installed, but the async engine needs it; first SQL query crashes if `DATABASE_URL` is set. **Fix:** add `asyncpg==0.30.0` (or drop the SQLAlchemy path until needed). **Owner:** Tejvir.
- **F6 · `render.yaml` + `.env.example`** — missing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `N8N_WEBHOOK_URL`. **Why:** deploy silently runs in-memory only, Copilot always falls back, webhook never fires — **no error in logs**. This is what keeps *my* Copilot from going live in prod. **Fix:** add all five (`sync: false` in render.yaml; commented placeholders in `.env.example`). **Owner:** Tejvir.
- **F7 · `apps/backend/app/services/event_broker.py:16`** — unbounded `asyncio.Queue` per subscriber → memory leak if a WS client is slow/frozen. **Fix:** `Queue(maxsize=256)` + `put_nowait` in try/except `QueueFull` (drop + log). **Owner:** Tejvir.
- **F8 · hostname mismatch** — README, ARCHITECTURE, `render.yaml`, and `keepalive.yml` reference **three different** backend hostnames. **Why:** the keep-alive cron pings a host that won't exist, so the free-tier service sleeps. **Fix:** pick one canonical host; make all four agree. **Owner:** Tejvir.
- **F9 · `apps/pwa/README.md`** — documents a **25-class** model map, but training produces **9 classes in a different order**. **Why:** following the README mislabels every detection (index 0 → "excavator" when it's really helmet). **Fix:** rewrite the map/dims to the 9-class order from `merge_datasets.py`. **Owner:** Dhruv/Tejvir.
- **F10 · `apps/pwa/src/lib/postProcessor.ts:146`** — inferred `no_vest` detections are always dropped by temporal smoothing (buffer holds raw pre-processed frames). **Why:** the Person+Vest→no_vest feature is effectively dead and its tests fail. **Fix:** exempt `inferred` detections from smoothing. **Owner:** Dhruv.
- **F11 · `ml/training/augment_minority.py:39`** — image flip and bbox flip are decided independently → **silent label corruption** of exactly the classes being boosted. **Fix:** make the image-flip return its decision and reuse it for the bbox. **Owner:** Tejvir.
- **F12 · `apps/dashboard/src/app/boot/BootScreen.tsx:76`** — 7 `setTimeout`s never cleaned up → setState on an unmounted component. **Fix:** collect timeout IDs, `clearTimeout` them in the effect cleanup. **Owner:** Amber/Vanshika.
- **F13 · `apps/dashboard/src/App.tsx:26`** — the 50ms physics tick runs on LANDING/BOOT views (20 renders/sec for nothing). **Fix:** skip the interval unless the view is a live one. **Owner:** Vanshika.

### 🟡 MEDIUM / LOW (condensed)
- `event-store.ts` infers helmet/vest with `Math.random()` (non-deterministic UI) → derive from `breakdown.ppeViolation`. *(Vanshika)*
- `AlertTicker.tsx` uses array index as `key` → CSS ticker animation restarts on every event; key by content. *(Vanshika)*
- `SortTrackerMap.tsx` defines `<marker id="arrow">` after it's referenced (forward-ref) → arrow can render invisibly; also a dead SVG CSS transition. *(Vanshika)*
- `apps/dashboard/src/lib/contracts.ts` is a **manual duplicate** of `packages/shared/contracts.ts` (currently in sync, drifts later). Wire the workspace alias + delete the copy. *(Vanshika)*
- No `PROTOCOL_VERSION` constant although ARCHITECTURE references one → add + export it. *(Tejvir)*
- ml: `prepare_dataset.py` reads `sh17_full` but `download_datasets.py` writes `sh17` (FileNotFoundError); `merge_datasets.py` overwrites same-named images across datasets (data loss); pipeline lacks an NMS step; `train.py` crashes formatting a missing metric; stale `ppe.yaml` with a hardcoded Linux path. *(Tejvir/Dhruv)*
- Docs drift: ARCHITECTURE still says "Next.js", `NEXT_PUBLIC_*`, and `feat/<owner>` branches — reality is **Vite**, `VITE_*`, and `<name>/dev`. *(Tejvir)*

---

## 5. The plan — what to fix, when, and why

1. **Before any local demo / recording — nothing blocks you.** All criticals only bite in *deployment*; localhost works end-to-end. ✅ Safe to record now.
2. **Before deploying to Vercel/Render (team-blocking):** F1, F2, F3 + F6 + F8. Mostly Tejvir + Vanshika, ~1–2 hrs total. Without these the deployed app simply can't talk to itself.
3. **Before wiring the real trained model:** F9, F10, F11 + the ml/NMS items (Dhruv/Tejvir) — otherwise detections are mislabeled or corrupted.
4. **Cleanup pass (anytime):** the Medium/Low list — fix the broken test (F4), wire the contracts alias, tidy the docs, add `PROTOCOL_VERSION`.

**Why this order:** fix what *blocks the whole team* first (deploy), then what *corrupts the core data* (model), then polish. Don't spend Week-3 time on Low items while a deploy-blocker is open.

---

## 6. Important info & gotchas

- **Git identity / hooks:** this repo's machine defaults to the `ozpool` identity, and a governance hook **blocks** committing as anyone else until you run `$env:CLAUDE_SKIP_IDENTITY_CHECK = '1'` (per shell). Always commit as `samarthsgsits23@gmail.com`. Never add an AI / `Co-Authored-By` trailer. Never merge/close — Tejvir does that.
- **The Copilot's data source ≠ the dashboard's animation.** The HUD's moving workers come from the dashboard's own simulator; the Copilot answers about events in the backend's broker/DB. For a coherent demo, run `tools/seed_demo_events.py` first so both have a believable story (the critical-in-machinery-bay event).
- **"Offline mode" is a feature, not a bug.** When the badge says `offline-rule-based`, say: *"if Groq is down or there's no internet, it still answers from the same data — the Copilot never goes dark."* That's a strong resilience point for judges.
- **Contract drift was a FALSE ALARM.** We suspected the three contract copies had diverged; they currently agree (same 9 `DetectionClass` values, same `WSMessage` variants, same `shiftSummary`). The risk is *future* drift from the duplication, not a present bug.
- **`.venv/` and `node_modules/` are gitignored** — `git add -A` only stages my actual work.

---

## 7. Integration handoffs to teammates

- **Dhruv (PWA):** play the clips in `apps/pwa/public/audio/hi/` on the matching alert; mapping (alert → filename → tone) is in `docs/VOICE_BANK.md`. Browsers decode the `.mp3`s via `AudioContext.decodeAudioData` — no conversion needed.
- **Vanshika (dashboard):** the Copilot panel is fully self-contained and does **not** touch the shared event-store; the only shared edit is one line in `App.tsx` rendering `<CopilotPanel />`. The chat UI calls `VITE_BACKEND_URL` (defaults to `http://localhost:8000`).
- **Tejvir (backend):** new dep `fpdf2`. LLM calls go over REST via the existing `httpx` (no SDK added). Set `GROQ_API_KEY` / `ANTHROPIC_API_KEY` in Render env to enable the live LLM. `copilot.py` now exposes `assemble_context()` reused by `/context` and `/chat`.

---

*Full run/test reference: `docs/COPILOT.md`. Prompts: `docs/PROMPTS.md`. Voice: `docs/VOICE_BANK.md`. Judge Q&A: `docs/QA_PLAYBOOK.md`.*
