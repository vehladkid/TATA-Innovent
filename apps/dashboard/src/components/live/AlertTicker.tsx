import React, { useEffect, useState } from 'react';
import { useEventStore } from '../../lib/event-store';
import { AlertOctagon, TrendingUp, AlertTriangle, ShieldCheck } from 'lucide-react';

export const AlertTicker: React.FC = () => {
  const recentEvents = useEventStore((state) => state.recentEvents);
  const [tickerItems, setTickerItems] = useState<string[]>([
    'SYSTEM INITIALIZED: Predictive Safety Command Center Active',
    'SORT Tracker online: monitoring 6 plant floor channels',
    'Edge AI network nominal: PPE violations detection active',
    'Hazard zones calibrated: Press Machine A, Forklift Lane, Welding Bay C'
  ]);

  useEffect(() => {
    if (recentEvents.length === 0) return;

    // Convert the latest 5 events into readable ticker alert strings
    const newAlerts = recentEvents.slice(0, 8).map((evt) => {
      const workerLabel = `Worker W-00${evt.trackId}`;
      const zoneName = evt.zoneId === 'zone_press_A' ? 'Press Machine A' :
        evt.zoneId === 'zone_forklift_lane' ? 'Forklift Transit Lane' :
          evt.zoneId === 'zone_welding_bay' ? 'Welding Bay C' : 'Hazard Area';

      if (evt.band === 'critical') {
        if (evt.breakdown.fallDetected > 0) {
          return `🚨 CRITICAL: Fall detected for ${workerLabel}! Dispatching emergency response!`;
        }
        return `🚨 CRITICAL: ${workerLabel} is in restricted ${zoneName} without required PPE!`;
      }

      if (evt.predictedEntryMs) {
        return `⚡ PREDICTIVE AI: ${workerLabel} path intersects ${zoneName} in ${(evt.predictedEntryMs / 1000).toFixed(1)}s!`;
      }

      if (evt.band === 'danger') {
        return `⚠️ DANGER: High risk score (${evt.riskScore}) for ${workerLabel} approaching ${zoneName}!`;
      }

      if (evt.band === 'caution') {
        const violations = [];
        if (evt.breakdown.ppeViolation > 0) violations.push('missing PPE');
        if (evt.breakdown.posture > 5) violations.push('unsafe posture');
        return `⚡ CAUTION: ${workerLabel} showing ${violations.join(' & ')} near ${zoneName}.`;
      }

      return `✔ SAFE: ${workerLabel} is compliant. Position tracked in nominal zone.`;
    });

    // Merge and keep unique, readable items
    setTickerItems((prev) => {
      const combined = [...newAlerts, ...prev];
      return Array.from(new Set(combined)).slice(0, 10);
    });
  }, [recentEvents]);

  // Determine if there is any active critical event in the last 6 seconds
  const hasRecentCritical = recentEvents.slice(0, 3).some(
    (e) => e.band === 'critical' && Date.now() - e.timestamp < 6000
  );

  return (
    <div
      className={`alert-ticker-container ${hasRecentCritical ? 'ticker-critical' : ''}`}
      style={{
        width: '100%',
        height: '32px',
        background: hasRecentCritical ? 'rgba(255, 0, 60, 0.25)' : 'rgba(7, 8, 20, 0.8)',
        borderBottom: hasRecentCritical ? '1px solid #ff003c' : '1px solid rgba(0, 243, 255, 0.25)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 50,
        boxShadow: hasRecentCritical ? '0 0 15px rgba(255, 0, 60, 0.3)' : 'none',
        transition: 'all 0.3s ease'
      }}
    >
      <div
        style={{
          background: hasRecentCritical ? '#ff003c' : 'rgba(0, 102, 255, 0.3)',
          color: '#fff',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '11px',
          fontWeight: 'bold',
          padding: '0 12px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          borderRight: '1px solid rgba(0, 243, 255, 0.3)',
          zIndex: 2,
          textShadow: '0 0 5px rgba(255,255,255,0.6)',
          whiteSpace: 'nowrap'
        }}
      >
        {hasRecentCritical ? (
          <AlertOctagon size={14} className="critical-flash-active" style={{ color: '#fff' }} />
        ) : (
          <TrendingUp size={14} style={{ color: '#00f3ff' }} />
        )}
        <span>ALERT TICKER</span>
      </div>

      <div
        className="ticker-scroller"
        style={{
          display: 'flex',
          whiteSpace: 'nowrap',
          willChange: 'transform',
          animation: 'ticker-animation 45s linear infinite',
          paddingLeft: '20px'
        }}
      >
        {tickerItems.map((item, index) => {
          let color = '#fff';
          if (item.includes('CRITICAL')) color = '#ff003c';
          else if (item.includes('PREDICTIVE') || item.includes('⚡')) color = '#b026ff';
          else if (item.includes('DANGER') || item.includes('⚠️')) color = '#ffaa00';
          else if (item.includes('SAFE') || item.includes('✔')) color = '#00ff66';

          return (
            <span
              key={index}
              style={{
                marginRight: '60px',
                fontSize: '12px',
                fontWeight: 500,
                color,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textShadow: color !== '#fff' ? `0 0 5px ${color}44` : 'none'
              }}
            >
              {item.includes('CRITICAL') && <AlertOctagon size={12} />}
              {item.includes('PREDICTIVE') && <TrendingUp size={12} />}
              {item.includes('DANGER') && <AlertTriangle size={12} />}
              {item.includes('SAFE') && <ShieldCheck size={12} />}
              {item}
            </span>
          );
        })}
      </div>

      <style>{`
        @keyframes ticker-animation {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-scroller:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
