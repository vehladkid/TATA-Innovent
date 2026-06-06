# n8n

> Workflow automation — Owner: Dhruv

## Workflows
- **Critical-event fan-out:** backend webhook → Telegram + Resend email + LLM summary
- **End-of-shift report:** nightly cron → fetch shift events → summary → email plant manager

## Hosting
Self-hosted on Render free tier (separate service from backend).

Workflow JSON exports are committed here for version control.
