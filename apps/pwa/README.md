# apps/pwa

> Phone-side Progressive Web App — Owner: Dhruv (ML pipeline) + Amber (UI/UX)

## Responsibilities
- Camera capture via `getUserMedia`
- On-device PPE detection (YOLOv8n via ONNX Runtime Web)
- Pose estimation (MediaPipe PoseLandmarker)
- SORT tracker (imported from `packages/shared/sort.ts`)
- HMI Engine: zone occupancy, velocity, trajectory, posture, fall detection
- Risk Engine: score formula, breakdown, banding
- On-device Hindi voice alerts + Vibration API
- IndexedDB offline buffer + WebSocket sync to backend
- PWA install: service worker, manifest, QR flow

## Stack
Next.js 14 · ONNX Runtime Web · MediaPipe · Zustand · TypeScript

## Dev
```bash
pnpm dev   # → http://localhost:3001
```
