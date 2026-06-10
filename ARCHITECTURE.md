# Suraksha AI — Architecture

> **This document is the source of truth for system design.** Every team member and every AI assistant working in this repo reads this first. If something here is wrong or stale, fix it in a PR — do not work around it.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Data Flow](#2-data-flow)
3. [Component Responsibilities](#3-component-responsibilities)
4. [The Contracts](#4-the-contracts)
5. [Dummy-Data Convention (Parallel Development)](#5-dummy-data-convention-parallel-development)
6. [Repository Conventions](#6-repository-conventions)
7. [Integration Sequence](#7-integration-sequence)
8. [Deployment Topology](#8-deployment-topology)
9. [Environment Variables](#9-environment-variables)
10. [Rules for AI Coding Assistants](#10-rules-for-ai-coding-assistants)
11. [Anti-Patterns](#11-anti-patterns)

---

## 1. System Overview

Suraksha AI is composed of four logical components running across three physical surfaces:

```
┌──────────────────────────────────────────────────────────────┐
│  PHONE / LAPTOP BROWSER (PWA — Dhruv + Amber)                │
│                                                              │
│  Camera ──► YOLOv8n ONNX ──► SORT Tracker ──► HMI Engine     │
│                                                  │           │
│                                                  ▼           │
│                                          Risk Scoring        │
│                                                  │           │
│                                Hindi Voice / Vibration ◄──┐  │
│                                                           │  │
│                                              IndexedDB    │  │
│                                                  │        │  │
└──────────────────────────────────────────────────┼────────┼──┘
                                                   │ WS     │
                                                   ▼        │
┌──────────────────────────────────────────────────────────────┐
│  BACKEND (FastAPI on Render — Tejvir + Samarth)              │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Event       │  │ LLM Copilot  │  │ Auto Incident      │   │
│  │ Ingestion   │  │ Context API  │  │ Report (WeasyPrint)│   │
│  └──────┬──────┘  └──────────────┘  └────────────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  Supabase Postgres ◄──► Supabase Storage (snapshots)         │
│         │                                                    │
│         ▼                                                    │
│  WebSocket Broadcast                                         │
└──────────────────┬──────────────────┬────────────────────────┘
                   │ WS               │ webhook
                   ▼                  ▼
┌────────────────────────────┐ ┌─────────────────────────────┐
│ DASHBOARD (Vercel —         │ │ n8n WORKFLOWS (Dhruv)       │
│ Vanshika)                  │ │                             │
│                            │ │ Critical event ──►          │
│ • Live Ops View            │ │   Telegram + Resend email   │
│ • Risk Breakdown Panel     │ │   + LLM summary             │
│ • Hazard Heatmap           │ │                             │
│ • Site Safety Score        │ │ End of shift ──►            │
│ • LLM Copilot Chat         │ │   PDF report + email        │
└────────────────────────────┘ └─────────────────────────────┘
```

**Key architectural choice:** all ML inference happens **on the client**. The backend never runs a model. This keeps the backend stateless, free-tier-friendly, and privacy-preserving (face blur happens before any image leaves the phone).

---

## 2. Data Flow

The system has exactly **one canonical event type** that flows end-to-end: `RiskEvent`.

```
[Camera frame, 30fps]
    │
    ▼
[YOLOv8n ONNX inference on-device]  →  Detection[]
    │
    ▼
[SORT tracker assigns track IDs]    →  TrackedPerson[]
    │
    ▼
[MediaPipe pose on cropped persons] →  Keypoint[] per track
    │
    ▼
[HMI Engine: zones, velocity,
 trajectory, posture, fall]         →  enriched TrackedPerson[]
    │
    ▼
[Risk Engine: score + breakdown]    →  RiskEvent  ◄── ONE CANONICAL TYPE
    │
    ├──► [On-device] Voice alert (Hindi WAV) + Vibration
    │
    ├──► [IndexedDB] Local buffer for offline mode
    │
    └──► [WebSocket → Backend]
              │
              ▼
         [FastAPI receives RiskEvent]
              │
              ├──► [Supabase Postgres] Persist
              ├──► [WebSocket broadcast] → Dashboard live update
              └──► [Critical band only] Webhook → n8n → Telegram/Email
```

Every consumer downstream — dashboard, LLM Copilot, n8n, PDF generator — reads `RiskEvent` and nothing else. This is what makes the dummy-data strategy work.

---

## 3. Component Responsibilities

### 3.1 PWA (`apps/pwa/`)

**Owner:** Dhruv (ML pipeline, engines), Amber (UI shell, design)

**Responsibilities:**
- Camera capture via `getUserMedia`
- On-device PPE detection (YOLOv8n via ONNX Runtime Web)
- Pose estimation (MediaPipe PoseLandmarker)
- SORT tracker (imported from `packages/shared/sort.ts` — owned by Vanshika)
- HMI Engine: zone occupancy, velocity smoothing, predicted trajectory, posture, fall
- Risk Engine: score formula, breakdown, banding
- On-device alerts: Hindi WAV playback, Web Speech fallback, Vibration API
- IndexedDB offline buffer + WebSocket sync to backend
- PWA features: install-to-home-screen, service worker, manifest
- Face blur applied to any snapshot before upload (privacy requirement)

**Does NOT:**
- Run any ML inference on the backend (model never leaves the client)
- Persist data to Supabase directly (always via backend WS)
- Make direct LLM calls (goes through backend Copilot endpoint)

### 3.2 Backend (`apps/backend/`)

**Owner:** Tejvir (infra, ingestion, broadcast), Samarth (Copilot context, PDF reports)

**Responsibilities:**
- FastAPI app, async throughout
- `POST /api/events` — **compatibility shim**: accepts a pre-scored `RiskEvent` from PWA builds that compute risk on-device; stores and broadcasts without re-scoring
- `POST /api/events/raw` — **backend-scored path**: accepts `Detection[]` + optional `TrackedPerson`; the backend Risk Engine (`app/services/risk_engine.py`) computes the score and assembles a full `RiskEvent` before broadcasting
- `WS /ws/events` — broadcasts events to dashboard subscribers
- `WS /ws/fake-events` — fake event stream for parallel dev (remove before prod)
- `GET /api/copilot/context` — assembles `CopilotContext` for LLM (recent events, zones, shift)
- `POST /api/copilot/chat` — proxies to Groq Llama 3.3, returns `CopilotResponse`
- `POST /api/reports/incident` — generates PDF via WeasyPrint
- Webhook trigger to n8n on critical events
- Supabase Postgres for persistence, Supabase Storage for snapshots

**Event ingestion — two supported flows:**

```
Flow A (on-device scoring — existing PWA path):
  PWA Risk Engine → RiskEvent → POST /api/events → broadcast

Flow B (server-side scoring — new /raw path):
  YOLO detections → POST /api/events/raw → backend Risk Engine → RiskEvent → broadcast
```

Both flows emit identical `RiskEvent` shapes to the WebSocket; the dashboard and n8n are unaware of which flow produced an event.

**Does NOT:**
- Run ML inference (YOLO/MediaPipe always on the client)
- Hold business logic the PWA could do itself

### 3.3 Dashboard (`apps/dashboard/`)

**Owner:** Vanshika

**Responsibilities:**
- Live Operations View — video tile + event log streaming from `WS /ws/events`
- Risk Breakdown Panel — visualizes `RiskEvent.breakdown` (the explainability moment)
- Hazard Heatmap — aggregates events onto floor-plan SVG
- Site Safety Score — executive rollup
- LLM Copilot Chat UI — talks to `POST /api/copilot/chat`
- Zone configuration UI (admin)

**Does NOT:**
- Receive raw detections (only receives `RiskEvent` after risk scoring)
- Run any inference

### 3.4 n8n Workflows (`n8n/`)

**Owner:** Dhruv

**Responsibilities:**
- Critical-event fan-out: receives webhook from backend → fans out to Telegram + Resend + 1-line LLM summary
- End-of-shift report: triggered nightly → fetches shift events → generates summary → emails plant manager

**Hosting:** self-hosted on Render free tier, separate service from the backend

### 3.5 ML Training (`ml/training/`)

**Owner:** Tejvir

**Responsibilities:**
- YOLOv8n fine-tuning on PPE datasets (Roboflow Universe: SH17, Hard Hat Workers, Pictor-PPE)
- ONNX export with opset 12 + INT8 quantization
- Model versioning — exported models land at `apps/pwa/public/models/yolov8n-ppe-v{N}.onnx`

**Not deployed.** Training runs locally on RTX 4050. Only the exported `.onnx` file is committed (or pulled via Git LFS if size grows).

---

## 4. The Contracts

`packages/shared/contracts.ts` is the **single source of truth** for all cross-component data shapes.

### Canonical Types

| Type | Producer | Consumers |
|---|---|---|
| `Detection` | YOLOv8 ONNX (PWA) | SORT tracker |
| `Keypoint[]` | MediaPipe (PWA) | HMI Engine |
| `TrackedPerson` | SORT tracker | HMI Engine, Risk Engine |
| `Zone` | Admin config | HMI Engine, Dashboard |
| `RiskEvent` | Risk Engine (PWA) | Backend, Dashboard, n8n, LLM Copilot |
| `CopilotContext` | Backend | Groq LLM |
| `CopilotResponse` | Backend (post-LLM) | Dashboard chat UI |
| `AlertPayload` | Backend webhook | n8n |
| `WSMessage` | Backend | Dashboard |

### Rules for Modifying Contracts

1. **Open a PR.** Tag every owner. No exceptions.
2. **Update the Pydantic mirror** in `apps/backend/app/schemas/events.py` in the same PR.
3. **Bump the protocol version** in `contracts.ts` (`PROTOCOL_VERSION` constant — add if missing).
4. **Update this document** if the change affects the data-flow diagram.

The Pydantic and TypeScript versions must remain bit-identical in field names (using `populate_by_name=True` with camelCase aliases on the Python side).

---

## 5. Dummy-Data Convention (Parallel Development)

The team builds in parallel against fake data until the real YOLOv8 model is trained (end of Week 1). The three dummy-data sources are:

| File | Location | Used By | Replaced By |
|---|---|---|---|
| `mockDetector.ts` | `apps/pwa/src/lib/` | Dhruv (PWA pipeline) | Real ONNX model end of Week 1 |
| `fake_events.py` | `apps/backend/app/routers/` | Vanshika (dashboard), Samarth (LLM prompts) | Real events from PWA mid-Week 2 |
| Fake events REST batch | `GET /api/fake-events/batch?n=50` | Samarth (Groq Playground testing) | Same — kept for prompt iteration |

### The Swap

The contracts make the swap trivial:

```ts
// Before — Week 1
const detections = mockDetect(frame);

// After — Week 1 end / Week 2
const detections = await onnxModel.detect(frame);
```

Everything downstream is unchanged because both sides emit `Detection[]` matching `contracts.ts`.

### When to Remove Dummy Sources

- `mockDetector.ts` — keep as a fallback for offline demo. Don't delete; toggle via env flag.
- `fake_events.py` WebSocket route — **remove before demo day**. Real events should be flowing.
- `fake_events.py` batch endpoint — keep. Samarth uses it indefinitely for prompt iteration.

---

## 6. Repository Conventions

### Monorepo Layout

```
suraksha-ai/
├── packages/shared/           # contracts.ts + shared utilities (SORT tracker lives here)
├── apps/pwa/                  # Next.js PWA, Dhruv + Amber
├── apps/dashboard/            # Next.js dashboard, Vanshika
├── apps/backend/              # FastAPI backend, Tejvir + Samarth
├── ml/training/               # YOLOv8 training scripts, Tejvir
├── n8n/                       # workflow JSON exports, Dhruv
└── docs/                      # prompts, voice bank, demo script
```

### Branch Strategy

- `main` — protected, deploys automatically to production
- `staging` — protected, used for demo rehearsal
- `feat/<owner>-<short-name>` — feature branches (e.g. `feat/vanshika-heatmap`)
- All merges to `main` require Tejvir's review

### Commit Style

Conventional commits:
- `feat(pwa): wire ONNX runtime with WebGPU fallback`
- `fix(backend): handle WS reconnect after sleep`
- `docs(arch): document Copilot context envelope`
- `chore(ci): add keep-alive cron`

### Naming

- **TypeScript files:** `camelCase.ts` for utilities, `PascalCase.tsx` for components
- **Python files:** `snake_case.py` for everything
- **Type names:** `PascalCase` in both languages
- **Field names:** `camelCase` on the wire (JSON); Python uses `snake_case` internally with Pydantic aliases

### Imports

- Cross-app shared code lives in `packages/shared/` — import via workspace path:
  ```ts
  import type { RiskEvent } from '@suraksha/shared/contracts';
  ```
- **Never duplicate `contracts.ts` content** into any app. Always import.
- Backend mirrors via Pydantic in `apps/backend/app/schemas/events.py` — also import from there:
  ```python
  from app.schemas.events import RiskEvent
  ```

---

## 7. Integration Sequence

The three planned merge points (each is a 2–4 hour pair-programming session with Claude Code assistance):

### Merge Point 1 — "Real model in PWA" (End of Week 1)
- **Who:** Tejvir + Dhruv
- **What:** Trained ONNX swaps `mockDetector.ts`
- **Success:** Phone detects real helmet/no-helmet in <300ms

### Merge Point 2 — "Edge → Cloud event flow" (Mid Week 2)
- **Who:** Tejvir + Dhruv + Vanshika
- **What:** PWA emits real `RiskEvent`s; backend stores and broadcasts; dashboard renders them
- **Success:** Walk in front of phone → bounding box on phone → row on dashboard within 500ms

### Merge Point 3 — "Predictive risk + voice" (End of Week 2)
- **Who:** Tejvir + Dhruv + Vanshika
- **What:** Risk Engine + predictive trajectory + Hindi voice + risk breakdown panel
- **Success:** Predicted-entry countdown appears on dashboard before walker crosses the line; phone speaks Hindi before they cross

### Merge Point 4 — "Intelligence layer" (Week 3)
- **Who:** Samarth + Dhruv + Tejvir
- **What:** LLM Copilot, auto-incident PDFs, n8n fan-out
- **Success:** Judge can ask "what was the riskiest moment in the last 5 minutes?" and get a grounded answer

---

## 8. Deployment Topology

```
┌────────────────────────────────────────────────────────────┐
│ GitHub  (suraksha-ai monorepo)                             │
└──────┬─────────────────────────┬───────────────────────────┘
       │ on push to main         │
       ▼                         ▼
┌───────────────────┐    ┌─────────────────────┐
│ Vercel            │    │ Render (Singapore)  │
│  ├─ Dashboard     │    │  ├─ FastAPI Backend │
│  └─ PWA           │    │  └─ n8n Workflow    │
└─────────┬─────────┘    └──────────┬──────────┘
          │                         │
          │     ┌───────────────────┼─────────────────┐
          ▼     ▼                   ▼                 ▼
   ┌──────────────────┐   ┌─────────────────┐  ┌──────────────┐
   │ Supabase         │   │ Upstash Redis   │  │ Groq Cloud   │
   │  ├─ Postgres     │   │  (cache)        │  │  (LLM)       │
   │  └─ Storage      │   └─────────────────┘  └──────────────┘
   │  ap-south-1      │
   └──────────────────┘
```

**Keep-alive:** A GitHub Actions cron pings `/health` on Render every 10 minutes (configured in `.github/workflows/keepalive.yml`) to prevent free-tier sleep.

---

## 9. Environment Variables

| Variable | Used By | Required | Example |
|---|---|---|---|
| `DATABASE_URL` | backend | Week 2+ | `postgresql+asyncpg://...supabase.co:5432/postgres` |
| `SUPABASE_URL` | backend, pwa | Week 2+ | `https://<id>.supabase.co` |
| `SUPABASE_ANON_KEY` | pwa, dashboard | Week 2+ | `eyJh...` |
| `SUPABASE_SERVICE_ROLE_KEY` | backend only | Week 2+ | `eyJh...` (NEVER expose to client) |
| `REDIS_URL` | backend | optional | `rediss://default:...@upstash.io:6379` |
| `GROQ_API_KEY` | backend | Week 3 | `gsk_...` |
| `ANTHROPIC_API_KEY` | backend (fallback) | Week 3 | `sk-ant-...` |
| `N8N_WEBHOOK_URL` | backend | Week 3 | `https://<n8n-host>/webhook/critical-event` |
| `TELEGRAM_BOT_TOKEN` | n8n | Week 3 | `123:ABC...` |
| `RESEND_API_KEY` | n8n | Week 3 | `re_...` |
| `CORS_ORIGINS` | backend | always | `https://suraksha-ai.vercel.app,https://suraksha-pwa.vercel.app` |
| `NEXT_PUBLIC_BACKEND_URL` | pwa, dashboard | always | `https://suraksha-backend.onrender.com` |
| `NEXT_PUBLIC_WS_URL` | pwa, dashboard | always | `wss://suraksha-backend.onrender.com` |

`NEXT_PUBLIC_*` are safe to expose to the browser. Anything else **must not** appear in any frontend code.

---

## 10. Rules for AI Coding Assistants

This section is written for Claude Code, Cursor, and any other AI assistant working in this repo. **Read this before generating any code.**

### Always

1. **Read `packages/shared/contracts.ts` before writing or modifying any data-handling code.** It is the source of truth.
2. **Import types from `contracts.ts`. Do not redeclare them locally.**
3. **Keep changes scoped to one app/package per PR.** If a change spans `apps/pwa` and `apps/backend`, it probably touches a contract — flag it as a contract change.
4. **Match the existing async style.** Backend is async-throughout (FastAPI + async SQLAlchemy). PWA uses async/await for all I/O.
5. **Pin dependencies.** Every package in `requirements.txt` or `package.json` must have a version specifier.
6. **Use the dummy data sources** (`mockDetector.ts`, `fake_events.py`) when downstream components are not yet available. Do not invent new dummy sources.

### Never

1. **Never modify `contracts.ts` without flagging it.** If a task seems to require a contract change, stop and surface the proposed change to the user before writing code.
2. **Never duplicate type definitions across apps.** Use imports.
3. **Never put ML inference on the backend.** All models run on the client.
4. **Never call LLM APIs directly from the frontend.** Go through the backend Copilot endpoint.
5. **Never store secrets in frontend code or commit them to the repo.** Secrets are env vars only.
6. **Never add a new third-party service** (auth provider, payment, analytics, etc.) without explicit user approval. The stack is intentionally minimal.
7. **Never upload raw images or video frames to the backend.** Snapshots must be face-blurred client-side first.
8. **Never auto-create database tables in production.** Use Alembic migrations.

### When in Doubt

If a request is ambiguous, ask. If a task seems to require breaking one of the rules above, surface it explicitly to the user before proceeding.

---

## 11. Anti-Patterns

These have already been considered and rejected. Do not reintroduce them.

| Pattern | Why Rejected |
|---|---|
| Native Android (Kotlin + TFLite) | Team has no Android experience; PWA reaches every device |
| React Native | Bundling complexity, app-store friction, no real benefit over PWA |
| Backend ML inference | Defeats the privacy and cost story; backend stays stateless |
| Kubernetes / microservices / message broker | Massive overkill; monolith FastAPI ships faster |
| Custom pose / fall models | MediaPipe pretrained is already excellent |
| Forms-based authentication this week | Not needed for demo; add post-hackathon |
| Postgres on the PWA via wasm | Out of scope; IndexedDB is sufficient |
| WhatsApp Business API (demo) | Per-conversation cost; Telegram is identical for demo |
| Auto-merging PRs to `main` | All merges require Tejvir's review |
| Adding more LLM providers | Groq + Claude fallback is enough; do not add OpenAI / Gemini / etc. |

---

## Change Log

| Date | Change | Author |
|---|---|---|
| 2026-06-06 | Initial architecture document | Tejvir |
| 2026-06-09 | Add backend Risk Engine (`/api/events/raw`), dual-flow §3.2, 'excavator' DetectionClass | Tejvir |

When you make a change to this document, append a row above.
