// riskStub.ts — DEMO ONLY stand-in for Tejvir's Risk Engine.
//
// The real risk score is computed by the backend (apps/backend/app/services/
// risk_engine.py). This local approximation exists only so the PWA demo can
// drive voice/vibration alerts end-to-end without the backend running.
// Do NOT ship this — replace with the real RiskEvent stream over WebSocket.

import type { EnrichedPerson } from '../lib/hmiEngine';
import type { RiskEvent, RiskBand } from '@suraksha/shared/contracts';

function bandOf(score: number): RiskBand {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'danger';
  if (score >= 25) return 'caution';
  return 'safe';
}

/** Approximate a RiskEvent from one enriched person (demo weighting). */
export function scoreEnriched(p: EnrichedPerson, timestamp: number): RiskEvent {
  const ppeViolation = (p.ppe.helmet ? 0 : 20) + (p.ppe.vest ? 0 : 20);
  const proximityToZone = p.zoneStatus.inside ? 30 : p.trajectory.willEnterZone ? 15 : 0;
  const velocityToward = p.trajectory.willEnterZone ? Math.min(20, Math.round(p.speed * 120)) : 0;
  const posture = p.posture.fallen ? 10 : 0;
  const fallDetected = p.posture.fallen ? 30 : 0;
  const riskScore = Math.min(
    100,
    ppeViolation + proximityToZone + velocityToward + posture + fallDetected,
  );

  return {
    eventId: crypto.randomUUID(),
    trackId: p.trackId,
    riskScore,
    band: bandOf(riskScore),
    breakdown: { ppeViolation, proximityToZone, velocityToward, posture, fallDetected },
    predictedEntryMs: p.trajectory.msToEntry,
    zoneId: p.zoneStatus.zoneId ?? p.trajectory.predictedZoneId,
    timestamp,
  };
}
