import React, { useEffect, useRef } from 'react';
import { useEventStore } from '../../lib/event-store';
import { getRiskColor } from '../../lib/risk-utils';
import { Activity, Zap, Layers } from 'lucide-react';

// Vigil Edge - Incident Stream Console
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
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
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
          padding: '9px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={12} style={{ color: '#00B8D9' }} />
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.05em',
          }}>
            INCIDENT STREAM
          </span>
        </div>
        <div
          style={{
            background: 'rgba(0,184,217,0.08)',
            border: '1px solid rgba(0,184,217,0.2)',
            borderRadius: '3px',
            padding: '2px 7px',
            fontFamily: "'Poppins', sans-serif",
            fontSize: '9px',
            fontWeight: 500,
            color: '#00B8D9',
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
          padding: '8px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {recentEvents.map((evt, idx) => {
          const theme = getRiskColor(evt.band);
          const isPredictive = evt.predictedEntryMs !== null;
          const zoneName =
            evt.zoneId === 'zone_press_A'       ? 'Press A' :
            evt.zoneId === 'zone_forklift_lane' ? 'Forklift Lane' :
            evt.zoneId === 'zone_welding_bay'   ? 'Welding Bay C' : 'Plant Floor';

          // Color mappings to new token system
          const accentColor =
            isPredictive       ? '#8B5CF6' :
            evt.band === 'critical' ? '#EF4444' :
            evt.band === 'danger'   ? '#F59E0B' :
            evt.band === 'caution'  ? '#F59E0B' : '#22C55E';

          const isFresh = idx === 0;

          return (
            <div
              key={evt.eventId}
              className="live-feed-card"
              style={{
                background: isFresh ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.018)',
                borderLeft: `2px solid ${accentColor}`,
                borderRight: '1px solid rgba(255,255,255,0.04)',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                padding: '8px 10px',
                borderRadius: '0 4px 4px 0',
                transition: 'background 0.2s ease',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '9.5px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.3)',
                }}>
                  {formatTime(evt.timestamp)}
                </span>
                <span style={{
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '9.5px',
                  fontWeight: 600,
                  color: accentColor,
                }}>
                  {isPredictive ? 'PREDICTIVE' : theme.name}
                </span>
              </div>

              {/* Data */}
              <div style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: '11px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '2px',
              }}>
                W-00{evt.trackId}
                <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 400, color: 'rgba(255,255,255,0.45)', fontSize: '10px', marginLeft: '6px' }}>
                  {zoneName}
                </span>
              </div>

              {/* Score row */}
              <div style={{
                display: 'flex',
                gap: '8px',
                fontFamily: "'Poppins', sans-serif",
                fontSize: '9px',
                color: 'rgba(255,255,255,0.35)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                paddingTop: '4px',
                marginTop: '4px',
              }}>
                <span>Score: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{evt.riskScore}</strong></span>
                {evt.breakdown.ppeViolation > 0 && <span style={{ color: '#EF4444' }}>PPE VIOLATION</span>}
                {evt.breakdown.fallDetected > 0 && <span style={{ color: '#EF4444' }}>FALL DET.</span>}
              </div>

              {/* Predictive countdown */}
              {isPredictive && evt.predictedEntryMs && (
                <div
                  style={{
                    marginTop: '6px',
                    background: 'rgba(139,92,246,0.12)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: 'rgba(200,185,255,0.9)',
                    padding: '3px 7px',
                    borderRadius: '3px',
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '9.5px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    animation: 'pulse-predictive 1.5s infinite alternate',
                  }}
                >
                  <Zap size={10} style={{ color: '#8B5CF6' }} />
                  Entry predicted in {(evt.predictedEntryMs / 1000).toFixed(1)}s
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
              color: 'rgba(255,255,255,0.2)',
              gap: '10px',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '12px',
            }}
          >
            <Layers size={18} />
            Awaiting event stream...
          </div>
        )}
      </div>

      <style>{`
        .live-feed-card:hover {
          background: rgba(255,255,255,0.04) !important;
        }
      `}</style>
    </div>
  );
};
