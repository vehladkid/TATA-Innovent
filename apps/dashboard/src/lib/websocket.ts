import { useEventStore } from './event-store';
import type { RiskEvent, RiskBand } from './contracts';
import { playAlarmSweep, playDangerWarning, playSonarPing } from './risk-utils';

let ws: WebSocket | null = null;
let reconnectTimer: any = null;
let simulationTimer: any = null;
let heartbeatTimer: any = null;

const WS_URL = 'ws://localhost:8000/ws/fake-events';

// Client-side local generator matching fake_events.py logic
function generateLocalEvent(): RiskEvent {
  const bands: RiskBand[] = ['safe', 'caution', 'danger', 'critical'];
  const weights = [0.45, 0.30, 0.18, 0.07]; // mostly safe, occasional danger/critical
  
  // Weighted random selection
  let rand = Math.random();
  let selectedBand: RiskBand = 'safe';
  for (let i = 0; i < bands.length; i++) {
    rand -= weights[i];
    if (rand <= 0) {
      selectedBand = bands[i];
      break;
    }
  }

  // Band to score
  let score = 0;
  if (selectedBand === 'safe') score = Math.floor(Math.random() * 30);
  else if (selectedBand === 'caution') score = Math.floor(31 + Math.random() * 25);
  else if (selectedBand === 'danger') score = Math.floor(56 + Math.random() * 25);
  else score = Math.floor(81 + Math.random() * 20);

  // Generate breakdown
  let remaining = score;
  const ppeViolation = Math.min(40, Math.floor(Math.random() * remaining));
  remaining -= ppeViolation;
  const proximityToZone = Math.min(30, Math.floor(Math.random() * remaining));
  remaining -= proximityToZone;
  const velocityToward = Math.min(20, Math.floor(Math.random() * remaining));
  remaining -= velocityToward;
  const posture = Math.min(10, Math.max(0, remaining));
  const fallDetected = (score > 85 && Math.random() < 0.3) ? 30 : 0;

  // Predicted entry
  let predictedEntryMs: number | null = null;
  if ((selectedBand === 'danger' || selectedBand === 'critical') && Math.random() < 0.6) {
    predictedEntryMs = [800, 1200, 1800, 2400, 3000][Math.floor(Math.random() * 5)];
  }

  const zones = ['zone_press_A', 'zone_forklift_lane', 'zone_welding_bay', null];
  const zoneId = zones[Math.floor(Math.random() * zones.length)];

  return {
    eventId: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
    trackId: Math.floor(1 + Math.random() * 6), // tracks 1 to 6
    riskScore: score,
    band: selectedBand,
    breakdown: {
      ppeViolation,
      proximityToZone,
      velocityToward,
      posture,
      fallDetected,
    },
    predictedEntryMs,
    zoneId,
    timestamp: Date.now(),
  };
}

function generateLocalShift() {
  const store = useEventStore.getState();
  return {
    shiftId: 'shift_2026_06_06_morning',
    startedAt: store.shiftSummary.startedAt,
    incidentsPrevented: store.shiftSummary.incidentsPrevented + (Math.random() > 0.85 ? 1 : 0),
    criticalCount: store.shiftSummary.criticalCount + (Math.random() > 0.96 ? 1 : 0),
    activeWorkers: Math.floor(8 + Math.random() * 15),
  };
}

/**
 * Starts generating local events to simulate FastAPI backend when offline.
 */
function startSimulation() {
  if (simulationTimer) return;
  console.log('🔌 WebSocket offline. Initializing local HUD simulation stream.');
  
  let count = 0;
  simulationTimer = setInterval(() => {
    const event = generateLocalEvent();
    const store = useEventStore.getState();
    
    // Play sounds according to critical levels if not muted
    if (!store.soundMuted) {
      if (event.band === 'critical') {
        playAlarmSweep();
      } else if (event.band === 'danger') {
        playDangerWarning();
      } else {
        // play occasional sonar ping for visual updates
        if (Math.random() > 0.7) {
          playSonarPing();
        }
      }
    }

    store.addRiskEvent(event);
    count++;

    // Every 10 events, send a shift summary
    if (count % 10 === 0) {
      store.updateShiftSummary(generateLocalShift());
    }

    // Heartbeat simulator
    store.setHeartbeat(Date.now());
  }, 2000);
}

/**
 * Stops local simulation when WebSocket successfully connects.
 */
function stopSimulation() {
  if (simulationTimer) {
    clearInterval(simulationTimer);
    simulationTimer = null;
    console.log('🔌 WebSocket connected. Terminating local simulation stream.');
  }
}

/**
 * Connect to FastAPI WebSocket endpoint
 */
export function connectWebSocket() {
  if (ws) {
    ws.close();
  }

  const store = useEventStore.getState();
  store.setWebsocketStatus('RECONNECTING');

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('🤖 WebSocket connected successfully.');
      store.setWebsocketStatus('CONNECTED');
      stopSimulation();

      // Clear any pending reconnect
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      // Start ping heartbeat
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      heartbeatTimer = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat', data: { ts: Date.now() } }));
        }
      }, 5000);
    };

    ws.onmessage = (messageEvent) => {
      try {
        const payload = JSON.parse(messageEvent.data);
        store.setHeartbeat(Date.now());

        if (payload.type === 'risk_event') {
          const event = payload.data as RiskEvent;
          
          // Sound warnings
          if (!store.soundMuted) {
            if (event.band === 'critical') {
              playAlarmSweep();
            } else if (event.band === 'danger') {
              playDangerWarning();
            } else if (Math.random() > 0.7) {
              playSonarPing();
            }
          }
          
          store.addRiskEvent(event);
        } else if (payload.type === 'shift_update') {
          store.updateShiftSummary(payload.data);
        } else if (payload.type === 'zone_update') {
          store.updateZone(payload.data);
        } else if (payload.type === 'heartbeat') {
          store.setHeartbeat(payload.data.ts);
        }
      } catch (err) {
        console.error('Failed parsing WS message:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error encountered:', err);
      // Let onclose handle the recovery
    };

    ws.onclose = () => {
      console.warn('WebSocket connection closed.');
      store.setWebsocketStatus('OFFLINE');
      startSimulation();

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }

      // Attempt reconnect after 5 seconds
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connectWebSocket();
        }, 5000);
      }
    };
  } catch (err) {
    console.error('Failed creating WebSocket:', err);
    store.setWebsocketStatus('OFFLINE');
    startSimulation();
  }
}

/**
 * Clean up connection
 */
export function disconnectWebSocket() {
  stopSimulation();
  if (ws) {
    ws.close();
    ws = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}
