// alertEngine.ts — on-device Hindi voice + vibration alerts (Owner: Dhruv, deliverable #6)
//
// When the Risk Engine returns a high-risk RiskEvent, this plays a pre-cached
// Hindi WAV/MP3 and vibrates the phone — target < 100ms event-to-sound.
//
//   handleRiskEvent(event) ─▶ selectAlert ─▶ playHindiAlert + vibratePhone
//
// Key behaviours (per build doc):
//   • Audio is pre-loaded into Audio objects at startup — never fetched on demand.
//   • Web Speech API is the fallback when a clip isn't loaded / fails to play.
//   • Debounced per trackId: no repeat alert for the same track within 3s.
//   • Only fires for 'danger' / 'critical' bands.
//
// NOTE: RiskEvent.breakdown carries weights, not the specific missing PPE item
// (helmet vs vest). We pick the most urgent applicable clip from the breakdown.

import type { RiskEvent, RiskBand } from '@suraksha/shared/contracts';

// ============================================================
// Alert catalogue — maps to files in public/audio/hi/
// ============================================================

export type AlertType =
  | 'fall'
  | 'ppe'
  | 'zone_approach'
  | 'zone_inside'
  | 'slow_down'
  | 'all_clear';

type AlertSpec = {
  file: string;   // filename under AUDIO_BASE
  hindi: string;  // Web Speech fallback text
};

const AUDIO_BASE = '/audio/hi/';

const ALERTS: Record<AlertType, AlertSpec> = {
  fall:          { file: 'fall_detected.mp3',   hindi: 'व्यक्ति गिर गया' },
  ppe:           { file: 'helmet_required.mp3',  hindi: 'सुरक्षा उपकरण पहनें' },
  zone_approach: { file: 'step_back_danger.mp3', hindi: 'खतरनाक क्षेत्र से दूर रहें' },
  zone_inside:   { file: 'restricted_area.mp3',  hindi: 'प्रतिबंधित क्षेत्र, बाहर निकलें' },
  slow_down:     { file: 'slow_down.mp3',        hindi: 'धीरे चलें' },
  all_clear:     { file: 'all_clear.mp3',        hindi: 'सब ठीक है' },
};

// ============================================================
// Tunables
// ============================================================

/** Don't replay any alert for the same track within this window. */
const DEBOUNCE_MS = 3000;

/** Vibration patterns (ms on/off). */
const VIBRATION: Record<'danger' | 'critical', number[]> = {
  danger: [200, 100, 200],
  critical: [500, 100, 500, 100, 500],
};

// ============================================================
// State
// ============================================================

const _audioCache = new Map<AlertType, HTMLAudioElement>();
const _lastAlertByTrack = new Map<number, number>(); // trackId → last fired ms
let _enabled = true;
let _preloaded = false;

// ============================================================
// Setup
// ============================================================

/**
 * Pre-load every alert clip into an Audio object. Call once at app start,
 * ideally from a user-gesture handler so autoplay is unblocked on mobile.
 */
export function preloadAlerts(): void {
  if (_preloaded) return;
  for (const type of Object.keys(ALERTS) as AlertType[]) {
    const audio = new Audio(AUDIO_BASE + ALERTS[type].file);
    audio.preload = 'auto';
    audio.load();
    _audioCache.set(type, audio);
  }
  _preloaded = true;
}

/** Globally mute/unmute alerts (e.g. supervisor toggle). */
export function setAlertsEnabled(enabled: boolean): void {
  _enabled = enabled;
}

/** Clear per-track debounce history (between demo scenarios). */
export function resetAlertState(): void {
  _lastAlertByTrack.clear();
}

// ============================================================
// Main entry point
// ============================================================

/**
 * Decide and fire an alert for a RiskEvent. No-op for safe/caution bands,
 * when disabled, or when the track was alerted within DEBOUNCE_MS.
 * Returns the AlertType fired, or null.
 */
export function handleRiskEvent(event: RiskEvent): AlertType | null {
  if (!_enabled) return null;
  if (event.band !== 'danger' && event.band !== 'critical') return null;

  const now = event.timestamp;
  const last = _lastAlertByTrack.get(event.trackId);
  if (last !== undefined && now - last < DEBOUNCE_MS) return null;
  _lastAlertByTrack.set(event.trackId, now);

  const type = selectAlert(event);
  playHindiAlert(type);
  vibratePhone(event.band);
  return type;
}

/**
 * Pick the most urgent clip for an event from its risk breakdown.
 * Priority: fall > inside zone > approaching zone > moving fast > PPE.
 */
export function selectAlert(event: RiskEvent): AlertType {
  const b = event.breakdown;
  if (b.fallDetected > 0) return 'fall';
  // zoneId set with no predicted entry time → already inside the zone.
  if (event.zoneId && event.predictedEntryMs === null && b.proximityToZone > 0) {
    return 'zone_inside';
  }
  if (event.predictedEntryMs !== null) return 'zone_approach';
  if (b.velocityToward > 0 && b.velocityToward >= b.ppeViolation) return 'slow_down';
  if (b.ppeViolation > 0) return 'ppe';
  return 'zone_approach';
}

// ============================================================
// Output primitives
// ============================================================

/** Play a pre-cached clip; fall back to Web Speech if unavailable. */
export function playHindiAlert(type: AlertType): void {
  const audio = _audioCache.get(type);
  if (audio) {
    audio.currentTime = 0;
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => speakHindi(ALERTS[type].hindi));
    }
    return;
  }
  speakHindi(ALERTS[type].hindi);
}

/** Web Speech API fallback. */
function speakHindi(text: string): void {
  if (typeof speechSynthesis === 'undefined') return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'hi-IN';
  speechSynthesis.cancel(); // pre-empt any queued speech for immediacy
  speechSynthesis.speak(u);
}

/** Vibrate per band. Silently ignored where the Vibration API is absent. */
export function vibratePhone(band: RiskBand): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  if (band === 'critical') navigator.vibrate(VIBRATION.critical);
  else if (band === 'danger') navigator.vibrate(VIBRATION.danger);
}
