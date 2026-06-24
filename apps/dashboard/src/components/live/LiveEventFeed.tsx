import React, { useEffect, useRef } from 'react';
import { useEventStore } from '../../lib/event-store';
import { getRiskColor } from '../../lib/risk-utils';
import { Activity, Zap, Layers } from 'lucide-react';

export const LiveEventFeed: React.FC = () => {
  const recentEvents = useEventStore((state) => state.recentEvents);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [recentEvents]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0').slice(0, 2);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${ms}`;
  };

  return (
    <div
      className="hud-panel"
      style={{
        width: '100%',
        height: '100%',
        background: '#101010', // Panel palette background: charcoal
        border: '1px solid #252525', // Border palette: charcoal
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #252525',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={12} style={{ color: '#5ACDD9' }} />
          <span style={{
            fontFamily: "var(--font-body)", // Sora
            fontSize: '11px',
            fontWeight: 600,
            color: '#EAEAEA',
            letterSpacing: '0.06em',
          }}>
            INCIDENT STREAM
          </span>
        </div>
        <div
          style={{
            background: 'rgba(90, 205, 217, 0.08)',
            border: '1px solid rgba(90, 205, 217, 0.16)',
            borderRadius: '2px',
            padding: '1px 5px',
            fontFamily: "var(--font-metric)",
            fontSize: '9px',
            fontWeight: 600,
            color: '#5ACDD9',
          }}
        >
          LIVE
        </div>
      </div>

      {/* Events list */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '4px 6px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {recentEvents.map((evt, idx) => {
          const theme = getRiskColor(evt.band);
          const isPredictive = evt.predictedEntryMs !== null;
          const zoneName =
            evt.zoneId === 'zone_press_A'       ? 'Press A' :
            evt.zoneId === 'zone_forklift_lane' ? 'Forklift' :
            evt.zoneId === 'zone_welding_bay'   ? 'Welding C' : 'Floor';

          // Color mappings mapping to Warning/Critical status colors
          const accentColor =
            isPredictive            ? '#5ACDD9' : // Nominal Turquoise
            evt.band === 'critical' ? '#FF5A45' : // Critical Coral Peach
            evt.band === 'danger'   ? '#FF5A45' : // Critical Coral Peach
            evt.band === 'caution'  ? '#FF7360' : '#00D084'; // Warning Peach or Safe Green

          const isFresh = idx === 0;

          return (
            <div
              key={evt.eventId}
              className="live-feed-card"
              style={{
                background: isFresh ? 'rgba(90, 205, 217, 0.03)' : 'transparent',
                borderBottom: '1px solid #252525',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                transition: 'background 0.2s ease',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontFamily: "var(--font-metric)",
                  fontSize: '9px',
                  fontWeight: 400,
                  color: '#9A9A9A',
                  opacity: 0.85
                }}>
                  {formatTime(evt.timestamp)}
                </span>
                <span style={{
                  fontFamily: "var(--font-metric)",
                  fontSize: '9px',
                  fontWeight: 700,
                  color: accentColor,
                }}>
                  {isPredictive ? 'PREDICTED' : theme.name.toUpperCase()}
                </span>
              </div>

              {/* Worker detail */}
              <div style={{
                fontFamily: "var(--font-metric)",
                fontSize: '10px',
                fontWeight: 600,
                color: '#EAEAEA', // Primary text
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>W-0{evt.trackId}</span>
                <span style={{ fontWeight: 400, color: '#9A9A9A', fontSize: '9px' }}>
                  {zoneName}
                </span>
              </div>

              {/* Status and scores */}
              <div style={{
                display: 'flex',
                gap: '8px',
                fontFamily: "var(--font-metric)",
                fontSize: '9px',
                color: '#9A9A9A',
                opacity: 0.85
              }}>
                <span>Score: <strong style={{ color: '#EAEAEA' }}>{evt.riskScore}</strong></span>
                {evt.breakdown.ppeViolation > 0 && <span style={{ color: '#FF7360' }}>PPE ANOMALY</span>}
                {evt.breakdown.fallDetected > 0 && <span style={{ color: '#FF5A45', fontWeight: 600 }}>EMERGENCY FALL</span>}
              </div>

              {/* Predictive warning badge */}
              {isPredictive && evt.predictedEntryMs && (
                <div
                  style={{
                    marginTop: '3px',
                    background: 'rgba(90, 205, 217, 0.05)', // Nominal Turquoise dim
                    border: '1px solid rgba(90, 205, 217, 0.15)', // Nominal border
                    color: '#EAEAEA',
                    padding: '2px 5px',
                    borderRadius: '2px',
                    fontFamily: "var(--font-metric)",
                    fontSize: '9px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Zap size={9} style={{ color: '#5ACDD9' }} />
                  Boundary crossover: {(evt.predictedEntryMs / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          );
        })}

        {recentEvents.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#D8D8D8',
              opacity: 0.35,
              gap: '8px',
              fontFamily: "var(--font-body)",
              fontSize: '11px',
              padding: '20px 0'
            }}
          >
            <Layers size={14} />
            Awaiting telemetry data...
          </div>
        )}
      </div>

      <style>{`
        .live-feed-card:hover {
          background: rgba(255, 255, 255, 0.01) !important;
        }
      `}</style>
    </div>
  );
};
