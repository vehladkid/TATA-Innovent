// App.tsx — PWA demo harness (Dhruv).
//
// Mounts the camera, runs the full edge pipeline via CameraLoop with the MOCK
// detector, draws detections + hazard zones on a canvas overlay, computes a
// stand-in risk score (riskStub) to fire Hindi voice/vibration alerts, and
// shows live FPS / latency / alert feed. This is the runnable end-to-end proof
// of deliverables #2/#3/#6 (and #4/#5/#7 wire in by swapping detect/pose/sync).

import { useCallback, useRef, useState } from 'react'
import type { Detection, Zone } from '@suraksha/shared/contracts'
import { CameraLoop } from './lib/cameraLoop'
import type { EnrichedPerson } from './lib/hmiEngine'
import { mockDetect } from './lib/mockDetector'
import { preloadAlerts, handleRiskEvent, resetAlertState } from './lib/alertEngine'
import { scoreEnriched } from './demo/riskStub'

// One sample hazard zone, positioned over the mock scene's right-hand worker +
// excavator so the demo reliably produces danger-band alerts.
const ZONES: Zone[] = [
  {
    zoneId: 'press-a',
    name: 'Press Machine A',
    polygon: [
      [0.5, 0.08],
      [0.86, 0.08],
      [0.86, 0.82],
      [0.5, 0.82],
    ],
    hazardLevel: 'high',
    requiredPPE: ['helmet', 'vest'],
  },
]

const CLASS_COLOR: Record<string, string> = {
  person: '#34d0e0',
  helmet: '#38d39f',
  vest: '#38d39f',
  no_helmet: '#f25563',
  no_vest: '#f25563',
  excavator: '#f5b340',
}

type AlertRow = { type: string; band: string; track: number; t: number }

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loopRef = useRef<CameraLoop | null>(null)

  const [running, setRunning] = useState(false)
  const [stats, setStats] = useState({ fps: 0, latencyMs: 0, persons: 0, detections: 0 })
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(async () => {
    setError(null)
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    // Must be inside the click handler so audio autoplay is unblocked.
    preloadAlerts()

    const loop = new CameraLoop({
      video,
      detect: (_v, id, ts) => mockDetect(id, ts),
      zones: ZONES,
      targetFps: 20,
      handlers: {
        onDetections: (dets) => {
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          if (canvas.width !== video.videoWidth && video.videoWidth) {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
          }
          drawScene(ctx, canvas.width, canvas.height, dets)
        },
        onEnriched: (people, ctx) => {
          const fired: AlertRow[] = []
          const overlay = canvas.getContext('2d')
          for (const p of people) {
            const event = scoreEnriched(p, ctx.timestamp)
            if (overlay) drawPersonRisk(overlay, canvas.width, canvas.height, p, event.band)
            const type = handleRiskEvent(event)
            if (type) fired.push({ type, band: event.band, track: p.trackId, t: ctx.timestamp })
          }
          if (fired.length) setAlerts((prev) => [...fired.reverse(), ...prev].slice(0, 25))
          setStats((s) => ({ ...s, persons: people.length }))
        },
        onStats: (st) =>
          setStats((s) => ({ ...s, fps: Math.round(st.fps), latencyMs: Math.round(st.latencyMs) })),
        onError: (e) => setError(String(e)),
      },
    })

    try {
      await loop.start()
      loopRef.current = loop
      setRunning(true)
    } catch (e) {
      setError('Could not open camera: ' + String(e))
    }
  }, [])

  const stop = useCallback(() => {
    loopRef.current?.stop()
    loopRef.current = null
    setRunning(false)
    resetAlertState()
    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  return (
    <div className="app">
      <h1>
        Suraksha <span>AI</span> — Edge Monitor
      </h1>
      <p className="subtitle">
        Mock-detector demo · full pipeline: detect → track → HMI → risk → Hindi voice + vibration
      </p>

      <div className="layout">
        <div>
          <div className="stage">
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} />
            {!running && (
              <div className="placeholder">
                <strong>Camera idle</strong>
                <span className="note">
                  Press Start to grant the camera and run the pipeline. Synthetic workers are
                  overlaid by the mock detector; the red box is hazard zone “Press Machine A”.
                </span>
              </div>
            )}
          </div>

          <div className="controls">
            {!running ? (
              <button onClick={start}>▶ Start</button>
            ) : (
              <button className="secondary" onClick={stop}>
                ◼ Stop
              </button>
            )}
          </div>

          {error && <div className="error">{error}</div>}
        </div>

        <div>
          <div className="panel">
            <h2>Live stats</h2>
            <div className="stat-grid">
              <div className="stat">
                <div className="v">{stats.fps}</div>
                <div className="k">FPS</div>
              </div>
              <div className="stat">
                <div className="v">{stats.latencyMs}ms</div>
                <div className="k">frame latency</div>
              </div>
              <div className="stat">
                <div className="v">{stats.persons}</div>
                <div className="k">tracked workers</div>
              </div>
              <div className="stat">
                <div className="v">{stats.detections}</div>
                <div className="k">detections</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Alert feed</h2>
            <div className="alerts">
              {alerts.length === 0 && <div className="empty">No alerts yet.</div>}
              {alerts.map((a, i) => (
                <div key={i} className={'alert ' + (a.band === 'critical' ? 'critical' : '')}>
                  <span>
                    🔊 {a.type} · #{a.track}
                  </span>
                  <span className={'badge ' + a.band}>{a.band}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Keep a running detections count for the stat card.
  function bumpDetections(n: number) {
    setStats((s) => (s.detections === n ? s : { ...s, detections: n }))
  }

  function drawScene(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    dets: Detection[],
  ) {
    ctx.clearRect(0, 0, w, h)
    bumpDetections(dets.length)

    // Hazard zones
    for (const z of ZONES) {
      ctx.beginPath()
      z.polygon.forEach(([px, py], i) => {
        const x = px * w
        const y = py * h
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.closePath()
      ctx.fillStyle = 'rgba(242,85,99,0.12)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(242,85,99,0.8)'
      ctx.lineWidth = 2
      ctx.stroke()
      const [lx, ly] = z.polygon[0]
      label(ctx, z.name, lx * w + 6, ly * h + 16, 'rgba(242,85,99,0.9)')
    }

    // Detection boxes
    for (const d of dets) {
      const [x, y, bw, bh] = d.bbox
      const color = CLASS_COLOR[d.class] ?? '#8b97a7'
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(x * w, y * h, bw * w, bh * h)
      label(ctx, `${d.class} ${(d.confidence * 100) | 0}%`, x * w, y * h - 4, color)
    }
  }

  function drawPersonRisk(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    p: EnrichedPerson,
    band: string,
  ) {
    const [cx, cy] = p.centre
    const color = band === 'critical' ? '#f25563' : band === 'danger' ? '#f5b340' : '#38d39f'
    ctx.beginPath()
    ctx.arc(cx * w, cy * h, 7, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    if (band === 'danger' || band === 'critical') {
      label(ctx, band.toUpperCase(), cx * w + 10, cy * h + 4, color)
    }
  }
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
) {
  ctx.font = '12px system-ui, sans-serif'
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
}
