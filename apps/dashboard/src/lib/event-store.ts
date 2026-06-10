import { create } from 'zustand';
import type { RiskEvent, Zone, CopilotContext } from './contracts';

export interface VisualWorker {
  trackId: number;
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  vx: number; // velocity x
  vy: number; // velocity y
  riskScore: number;
  band: 'safe' | 'caution' | 'danger' | 'critical';
  predictedEntryMs: number | null;
  zoneId: string | null;
  helmet: boolean;
  vest: boolean;
  trail: [number, number][]; // Recent coordinates for motion trail
  timestamp: number;
}

export interface EventState {
  websocketStatus: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE';
  recentEvents: RiskEvent[];
  activeWorkers: Record<number, VisualWorker>;
  zones: Zone[];
  shiftSummary: CopilotContext['shiftSummary'];
  siteSafetyScore: number;
  activeView: 'LANDING' | 'BOOT' | 'LIVE' | 'RISK' | 'HEATMAP' | 'EXECUTIVE';
  soundMuted: boolean;
  alertVolume: number;
  lastHeartbeat: number;

  // Actions
  setWebsocketStatus: (status: 'CONNECTED' | 'RECONNECTING' | 'OFFLINE') => void;
  addRiskEvent: (event: RiskEvent) => void;
  updateShiftSummary: (summary: CopilotContext['shiftSummary']) => void;
  updateZone: (zone: Zone) => void;
  setView: (view: 'LANDING' | 'BOOT' | 'LIVE' | 'RISK' | 'HEATMAP' | 'EXECUTIVE') => void;
  toggleSound: () => void;
  setAlertVolume: (vol: number) => void;
  setHeartbeat: (ts: number) => void;
  tickWorkerPositions: () => void; // Called in animation frame or timer
}

// Initial mockup zones
const INITIAL_ZONES: Zone[] = [
  {
    zoneId: 'zone_press_A',
    name: 'Press Machine A',
    polygon: [[0.1, 0.15], [0.35, 0.15], [0.35, 0.45], [0.1, 0.45]],
    hazardLevel: 'critical',
    requiredPPE: ['helmet', 'vest'],
  },
  {
    zoneId: 'zone_forklift_lane',
    name: 'Forklift Transit Lane',
    polygon: [[0.45, 0.25], [0.9, 0.25], [0.9, 0.42], [0.45, 0.42]],
    hazardLevel: 'high',
    requiredPPE: ['helmet', 'vest'],
  },
  {
    zoneId: 'zone_welding_bay',
    name: 'Welding Bay C',
    polygon: [[0.2, 0.58], [0.55, 0.58], [0.55, 0.88], [0.2, 0.88]],
    hazardLevel: 'medium',
    requiredPPE: ['helmet'],
  },
];

const INITIAL_SHIFT: CopilotContext['shiftSummary'] = {
  shiftId: 'shift_2026_06_06_morning',
  startedAt: Date.now() - 3600 * 1000,
  incidentsPrevented: 12,
  criticalCount: 2,
  activeWorkers: 15,
};

export const useEventStore = create<EventState>((set) => ({
  websocketStatus: 'OFFLINE',
  recentEvents: [],
  activeWorkers: {},
  zones: INITIAL_ZONES,
  shiftSummary: INITIAL_SHIFT,
  siteSafetyScore: 88,
  activeView: 'LANDING',
  soundMuted: false,
  alertVolume: 0.2,
  lastHeartbeat: Date.now(),

  setWebsocketStatus: (status) => set({ websocketStatus: status }),

  addRiskEvent: (event) => {
    set((state) => {
      // Add event to list, capped at 100
      const updatedEvents = [event, ...state.recentEvents].slice(0, 100);

      // Determine helmet/vest presence based on breakdown score
      // PPE violation has max 40 points in breakdown contracts
      const hasPpeViolation = event.breakdown.ppeViolation > 0;
      let helmet = true;
      let vest = true;
      if (hasPpeViolation) {
        if (event.breakdown.ppeViolation > 20) {
          helmet = false;
          vest = false;
        } else if (Math.random() > 0.5) {
          helmet = false;
        } else {
          vest = false;
        }
      }

      // Check if we already track this worker. If not, initialize a position
      const trackId = event.trackId;
      const existingWorker = state.activeWorkers[trackId];
      
      let x = existingWorker?.x ?? (0.15 + Math.random() * 0.7);
      let y = existingWorker?.y ?? (0.15 + Math.random() * 0.7);
      
      // If event points to a specific zone, guide worker close to it
      if (event.zoneId) {
        const zone = state.zones.find(z => z.zoneId === event.zoneId);
        if (zone && zone.polygon.length > 0) {
          // Move towards center of zone
          const zx = zone.polygon.reduce((sum, pt) => sum + pt[0], 0) / zone.polygon.length;
          const zy = zone.polygon.reduce((sum, pt) => sum + pt[1], 0) / zone.polygon.length;
          // Interpolate position a bit closer
          if (!existingWorker) {
            x = zx + (Math.random() - 0.5) * 0.1;
            y = zy + (Math.random() - 0.5) * 0.1;
          }
        }
      }

      // Generate random velocities inside [-0.04, 0.04] normalized coords per sec
      const vx = existingWorker?.vx ?? ((Math.random() - 0.5) * 0.06);
      const vy = existingWorker?.vy ?? ((Math.random() - 0.5) * 0.06);
      const trail = existingWorker?.trail ?? [];
      const updatedTrail = [...trail, [x, y] as [number, number]].slice(-12);

      const updatedWorker: VisualWorker = {
        trackId,
        x,
        y,
        vx,
        vy,
        riskScore: event.riskScore,
        band: event.band,
        predictedEntryMs: event.predictedEntryMs,
        zoneId: event.zoneId,
        helmet,
        vest,
        trail: updatedTrail,
        timestamp: event.timestamp,
      };

      const updatedWorkers = {
        ...state.activeWorkers,
        [trackId]: updatedWorker,
      };

      // Recalculate site safety score dynamically based on average of current active workers
      const workers = Object.values(updatedWorkers);
      const avgScore = workers.length > 0
        ? Math.round(100 - workers.reduce((sum, w) => sum + w.riskScore, 0) / workers.length * 0.6)
        : 95;

      return {
        recentEvents: updatedEvents,
        activeWorkers: updatedWorkers,
        siteSafetyScore: Math.max(10, Math.min(100, avgScore)),
      };
    });
  },

  updateShiftSummary: (summary) => set({ shiftSummary: summary }),

  updateZone: (zone) =>
    set((state) => ({
      zones: state.zones.map((z) => (z.zoneId === zone.zoneId ? zone : z)),
    })),

  setView: (view) => set({ activeView: view }),

  toggleSound: () => set((state) => ({ soundMuted: !state.soundMuted })),

  setAlertVolume: (vol) => set({ alertVolume: vol }),

  setHeartbeat: (ts) => set({ lastHeartbeat: ts }),

  tickWorkerPositions: () => {
    set((state) => {
      const updatedWorkers = { ...state.activeWorkers };
      let changed = false;

      Object.keys(updatedWorkers).forEach((idStr) => {
        const id = Number(idStr);
        const w = updatedWorkers[id];
        
        // Remove worker if they haven't been updated for 15 seconds
        if (Date.now() - w.timestamp > 15000) {
          delete updatedWorkers[id];
          changed = true;
          return;
        }

        // Apply velocity update (running at ~20-30 ticks per sec)
        // Adjust for delta time
        let nx = w.x + w.vx * 0.05;
        let ny = w.y + w.vy * 0.05;
        let nvx = w.vx;
        let nvy = w.vy;

        // Bounce off bounds
        if (nx < 0.05 || nx > 0.95) {
          nvx = -nvx;
          nx = Math.max(0.05, Math.min(0.95, nx));
        }
        if (ny < 0.05 || ny > 0.95) {
          nvy = -nvy;
          ny = Math.max(0.05, Math.min(0.95, ny));
        }

        // Occassionally add tiny random noise to motion
        if (Math.random() < 0.05) {
          nvx += (Math.random() - 0.5) * 0.01;
          nvy += (Math.random() - 0.5) * 0.01;
          // Clamp speed
          const speed = Math.sqrt(nvx * nvx + nvy * nvy);
          if (speed > 0.08) {
            nvx = (nvx / speed) * 0.08;
            nvy = (nvy / speed) * 0.08;
          }
        }

        // Save position trail
        const trail = [...w.trail, [nx, ny] as [number, number]].slice(-12);

        updatedWorkers[id] = {
          ...w,
          x: nx,
          y: ny,
          vx: nvx,
          vy: nvy,
          trail,
        };
        changed = true;
      });

      if (changed) {
        return { activeWorkers: updatedWorkers };
      }
      return {};
    });
  },
}));
