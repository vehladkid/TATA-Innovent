# Suraksha AI

> Real-time edge AI safety system for industrial workers — runs on any smartphone, costs ₹0 to deploy.

**Status:** 🚧 Active development — Tata InnoVent hackathon build, 3-week sprint
**Track:** Edge AI Solutions for Industrial Heavy Machinery — Operator Safety & HMI

---

## What It Is

Suraksha AI ("suraksha" = protection in Hindi/Sanskrit) is a Progressive Web App that turns any modern smartphone into a real-time safety monitor for factory and construction workers. It detects PPE violations, predicts hazardous trajectories, issues Hindi voice warnings on-device, and streams events to a supervisor dashboard.

**The wedge:** Traditional industrial safety AI requires ₹50,00,000+ in dedicated cameras, edge devices, and cloud infrastructure. Suraksha AI does it on hardware every MSME owner already owns — for ₹0.

## Key Capabilities

- **PPE detection** — helmet, vest, no-helmet, no-vest via on-device YOLOv8n
- **Pose & fall detection** — via MediaPipe PoseLandmarker
- **Predictive risk scoring** — trajectory + zone proximity + posture → 0–100 score
- **Hindi voice alerts** — pre-cached WAVs for sub-100ms warnings
- **Supervisor dashboard** — live ops view, hazard heatmap, executive safety score
- **LLM Safety Copilot** — natural-language Q&A grounded in event history
- **Auto incident reports** — PDF generated on critical events, emailed to plant manager
- **Offline-first** — IndexedDB buffer, syncs when connectivity returns

## Tech Stack At a Glance

| Layer | Technology |
|---|---|
| Edge (phone/laptop) | Next.js 14 PWA, ONNX Runtime Web, MediaPipe, Web Speech, Vibration API |
| Backend | Python 3.11, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Database | Supabase Postgres (ap-south-1) |
| Frontend host | Vercel (Hobby tier) |
| Backend host | Render (Singapore, free tier) |
| Cache | Upstash Redis (free tier) |
| LLM | Groq Cloud — Llama 3.3 70B (free tier) |
| Alerts | n8n (self-hosted) → Telegram + Resend email |
| ML training | Ultralytics YOLOv8 on RTX 4050 (local) |

**Total monthly cost:** ₹0. Full breakdown in [`docs/COST.md`](docs/COST.md).

## Repo Layout

```
suraksha-ai/
├── README.md                  # ← you are here
├── ARCHITECTURE.md            # system design, data flow, AI-coding conventions
├── packages/
│   └── shared/
│       └── contracts.ts       # 🔒 single source of truth — DO NOT modify without PR review
├── apps/
│   ├── pwa/                   # phone-side PWA (Dhruv + Amber)
│   ├── dashboard/             # supervisor dashboard (Vanshika)
│   └── backend/               # FastAPI backend (Tejvir + Samarth)
├── ml/
│   └── training/              # YOLOv8 training scripts, datasets, exports (Tejvir)
├── n8n/                       # workflow definitions (Dhruv)
└── docs/
    ├── PROMPTS.md             # LLM Copilot system prompts (Samarth)
    ├── VOICE_BANK.md          # Hindi alert phrases (Samarth)
    └── DEMO_SCRIPT.md         # demo-day sequence & Q&A playbook
```

## Quickstart

### Prerequisites

- Node.js 20+, pnpm 9+
- Python 3.11+
- Git
- (For ML training only) NVIDIA GPU + CUDA 12

### Clone & Install

```bash
git clone https://github.com/<org>/suraksha-ai.git
cd suraksha-ai
pnpm install                          # installs all JS workspaces
cd apps/backend && pip install -r requirements.txt
```

### Run the Stack Locally

```bash
# Terminal 1 — backend (FastAPI + fake event stream)
cd apps/backend
uvicorn main:app --reload --port 8000

# Terminal 2 — dashboard
cd apps/dashboard
pnpm dev                              # → http://localhost:3000

# Terminal 3 — PWA (must be over HTTPS or localhost for camera access)
cd apps/pwa
pnpm dev                              # → http://localhost:3001
```

### Verify Everything Works

```bash
curl http://localhost:8000/health
# → {"status":"ok"}

curl "http://localhost:8000/api/fake-events/batch?n=3"
# → 3 fake RiskEvent objects
```

Open `http://localhost:3000` — within ~2 seconds you should see fake risk events flowing into the dashboard event log.

## Deployed Environments

| Environment | URL | Notes |
|---|---|---|
| Backend (prod) | `https://suraksha-backend.onrender.com` | Render free tier, sleeps after 15 min |
| Dashboard | `https://suraksha-ai.vercel.app` | Vercel auto-deploys from `main` |
| PWA | `https://suraksha-pwa.vercel.app` | Install on phone via "Add to Home Screen" |

## Team & Ownership

| Owner | Scope |
|---|---|
| **Tejvir** (Tech Lead) | YOLOv8 training, FastAPI backend, Supabase, Risk Engine, contracts, DevOps, code review |
| **Dhruv** | PWA edge ML, HMI Engine, MediaPipe, voice/vibration, n8n workflows, alert fan-out |
| **Vanshika** | Supervisor dashboard (Live Ops, risk panel, heatmap, exec view), SORT tracker, WebSocket client |
| **Samarth** | LLM Copilot (Groq + context + chat UI), auto-incident PDFs, Hindi voice bank, Q&A playbook |
| **Amber** | PWA visual design, install/QR flow, worker kiosk UI, pitch slides, demo video |

Detailed boundaries and the integration sequence are in [`ARCHITECTURE.md`](ARCHITECTURE.md).

## For AI Coding Assistants (Claude Code, Cursor, etc.)

If you are an AI assistant working in this repo, **read `ARCHITECTURE.md` first.** It defines:

- The data contracts you must not break
- Which files belong to which app
- The dummy-data convention for parallel development
- Anti-patterns to avoid

The contracts in `packages/shared/contracts.ts` are the single source of truth. Pydantic schemas in `apps/backend/app/schemas/` mirror these — both must change together via PR.

## License

Private — Tata InnoVent submission. Do not distribute.

## Contact

Tejvir (Tech Lead) — see commit history for current contact details.
