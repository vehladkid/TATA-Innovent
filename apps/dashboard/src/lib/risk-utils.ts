// Utility definitions for risk operations and audio pings

let audioCtx: AudioContext | null = null;

// Initialize audio context lazily on user interaction
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    // @ts-ignore
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a high-tech sonar beep/ping
 */
export function playSonarPing() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    console.warn('Audio play blocked or unsupported', e);
  }
}

/**
 * Play an intense alarm sweep for CRITICAL incidents
 */
export function playAlarmSweep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(220, ctx.currentTime);
    osc1.frequency.linearRampToValueAtTime(440, ctx.currentTime + 0.2);
    osc1.frequency.linearRampToValueAtTime(220, ctx.currentTime + 0.4);

    osc2.frequency.setValueAtTime(224, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(444, ctx.currentTime + 0.2);
    osc2.frequency.linearRampToValueAtTime(224, ctx.currentTime + 0.4);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('Audio play blocked or unsupported', e);
  }
}

/**
 * Play a low warning tone for DANGER level events
 */
export function playDangerWarning() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);

    gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn('Audio play blocked or unsupported', e);
  }
}

/**
 * Project the worker path. Returns an array of coordinates representing future positions.
 */
export function projectTrajectory(
  x: number,
  y: number,
  vx: number,
  vy: number,
  seconds: number = 3,
  steps: number = 6
): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const t = (seconds / steps) * i;
    const px = Math.max(0.02, Math.min(0.98, x + vx * t * 1.5));
    const py = Math.max(0.02, Math.min(0.98, y + vy * t * 1.5));
    points.push([px, py]);
  }
  return points;
}

/**
 * Checks if a point is inside a polygon (Ray-casting algorithm)
 */
export function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Simple calculation to estimate distance between two coordinates
 */
export function getDistance(p1: [number, number], p2: [number, number]): number {
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2));
}

/**
 * Returns Color theme based on Risk Band
 */
export function getRiskColor(band: string | undefined): {
  hex: string;
  glow: string;
  name: string;
} {
  switch (band) {
    case 'critical':
      return { hex: '#FF5C5C', glow: '0 2px 4px rgba(0, 0, 0, 0.5)', name: 'CRITICAL' };
    case 'danger':
      return { hex: '#FF5C5C', glow: '0 2px 4px rgba(0, 0, 0, 0.5)', name: 'DANGER' };
    case 'caution':
      return { hex: '#FFC857', glow: '0 1px 3px rgba(0, 0, 0, 0.4)', name: 'CAUTION' };
    case 'safe':
    default:
      return { hex: '#00D084', glow: '0 1px 2px rgba(0, 0, 0, 0.3)', name: 'SAFE' };
  }
}
