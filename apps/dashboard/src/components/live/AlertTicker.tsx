import React, { useEffect, useState } from 'react';
import { useEventStore } from '../../lib/event-store';
import { AlertOctagon, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AlertTicker: React.FC = () => {
  const recentEvents = useEventStore((state) => state.recentEvents);
  const [tickerItems, setTickerItems] = useState<string[]>([
    'SYSTEM INITIALIZED — Predictive Safety Command Center active and monitoring',
    'SORT Tracker online — 6 plant floor channels calibrated',
    'Edge AI network nominal — PPE violation detection running',
    'Hazard zones calibrated — Press Machine A · Forklift Lane · Welding Bay C',
  ]);

  useEffect(() => {
    if (recentEvents.length === 0) return;

    const newAlerts = recentEvents.slice(0, 8).map((evt) => {
      const workerLabel = `Worker W-0${evt.trackId}`;
      const zoneName =
        evt.zoneId === 'zone_press_A'       ? 'Press Machine A' :
        evt.zoneId === 'zone_forklift_lane' ? 'Forklift Transit Lane' :
        evt.zoneId === 'zone_welding_bay'   ? 'Welding Bay C' : 'Hazard Area';

      if (evt.band === 'critical') {
        if (evt.breakdown.fallDetected > 0) return `CRITICAL — Fall detected for ${workerLabel}. Emergency responders dispatched.`;
        return `CRITICAL — ${workerLabel} entered restricted ${zoneName} without required PPE.`;
      }
      if (evt.predictedEntryMs) {
        return `PREDICTIVE — ${workerLabel} trajectory intersects ${zoneName} in ${(evt.predictedEntryMs / 1000).toFixed(1)}s.`;
      }
      if (evt.band === 'danger') {
        return `DANGER — Risk score ${evt.riskScore} · ${workerLabel} approaching ${zoneName}.`;
      }
      if (evt.band === 'caution') {
        const violations: string[] = [];
        if (evt.breakdown.ppeViolation > 0) violations.push('missing PPE');
        if (evt.breakdown.posture > 5) violations.push('unsafe posture');
        return `CAUTION — ${workerLabel}: ${violations.join(' & ')} near ${zoneName}.`;
      }
      return `NOMINAL — ${workerLabel} compliant. Position nominal.`;
    });

    setTickerItems((prev) => {
      const combined = [...newAlerts, ...prev];
      return Array.from(new Set(combined)).slice(0, 12);
    });
  }, [recentEvents]);

  const hasRecentCritical = recentEvents.slice(0, 3).some(
    (e) => e.band === 'critical' && Date.now() - e.timestamp < 6000
  );

  return (
    <div
      className="alert-ticker-container"
      style={{
        width: '100%',
        height: '30px',
        background: hasRecentCritical ? 'rgba(255, 92, 92, 0.08)' : 'rgba(13, 13, 13, 0.4)',
        borderBottom: hasRecentCritical ? '1px solid rgba(255, 92, 92, 0.35)' : '1px solid #252525',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 50,
        flexShrink: 0,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Label badge */}
      <div
        style={{
          background: hasRecentCritical ? '#FF5C5C' : 'rgba(61, 217, 255, 0.12)', // Red override or nominal cyan
          color: hasRecentCritical ? '#000000' : '#3DD9FF', // High contrast text or primary cyan
          fontFamily: "var(--font-header)", // Osiris
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.06em',
          padding: '0 12px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          borderRight: '1px solid #252525',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {hasRecentCritical
          ? <AlertOctagon size={12} className="critical-flash-active" />
          : <Activity size={12} />
        }
        LIVE BROADCAST
      </div>

      {/* Scrolling items */}
      <div
        className="ticker-scroller"
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: 'ticker-animation 45s linear infinite',
          paddingLeft: '24px',
        }}
      >
        {tickerItems.map((item, index) => {
          let color = '#EAEAEA'; // Default text
          if (item.startsWith('CRITICAL'))  color = '#FF5C5C'; // Red
          else if (item.startsWith('PREDICTIVE')) color = '#3DD9FF'; // Nominal Cyan
          else if (item.startsWith('DANGER'))     color = '#FF5C5C'; // Red
          else if (item.startsWith('CAUTION'))    color = '#FFC857'; // Yellow
          else if (item.startsWith('NOMINAL'))    color = '#00D084'; // Safe Green

          return (
            <span
              key={index}
              style={{
                marginRight: '72px',
                fontFamily: "var(--font-metric)", // IBM Plex Mono
                fontSize: '11px',
                fontWeight: 500,
                color,
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
              }}
            >
              {item.startsWith('CRITICAL')   && <AlertOctagon size={11} />}
              {item.startsWith('PREDICTIVE') && <Activity size={11} />}
              {item.startsWith('DANGER')     && <AlertTriangle size={11} />}
              {item.startsWith('NOMINAL')    && <ShieldCheck size={11} />}
              {item}
            </span>
          );
        })}
      </div>

      <style>{`
        @keyframes ticker-animation {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroller:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
};
