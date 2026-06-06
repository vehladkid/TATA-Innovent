import React, { useEffect, useRef } from 'react';
import { useEventStore } from '../../lib/event-store';
import { getRiskColor } from '../../lib/risk-utils';
import { Activity, Zap, Layers } from 'lucide-react';

export const LiveEventFeed: React.FC = () => {
  const recentEvents = useEventStore((state) => state.recentEvents);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll list to top when new events arrive
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [recentEvents]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const hrs = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0').slice(0, 2);
    return `${hrs}:${mins}:${secs}.${ms}`;
  };

  return (
    <div
      className="hud-panel tech-corners"
      style={{
        width: '100%',
        height: '100%',
        background: 'rgba(4, 5, 12, 0.85)',
        border: '1px solid rgba(0, 243, 255, 0.2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Panel Title */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          background: 'rgba(0, 0, 0, 0.5)',
          borderBottom: '1px solid rgba(0, 243, 255, 0.15)',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '11px',
          fontWeight: 'bold',
          letterSpacing: '1px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Activity size={12} className="glow-text-cyan" style={{ color: '#00f3ff' }} />
          <span style={{ color: '#00f3ff' }}>REAL-TIME INCIDENT STREAM</span>
        </div>
        <div
          style={{
            background: 'rgba(0, 243, 255, 0.1)',
            border: '1px solid rgba(0, 243, 255, 0.3)',
            borderRadius: '2px',
            padding: '2px 6px',
            fontSize: '9px',
            color: '#00f3ff',
          }}
        >
          LIVE FEED
        </div>
      </div>

      {/* Events Terminal Log */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          padding: '10px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {recentEvents.map((evt, idx) => {
          const theme = getRiskColor(evt.band);
          const isPredictive = evt.predictedEntryMs !== null;
          const zoneName = evt.zoneId === 'zone_press_A' ? 'PRESS MACHINE A' :
                           evt.zoneId === 'zone_forklift_lane' ? 'FORKLIFT LANE' :
                           evt.zoneId === 'zone_welding_bay' ? 'WELDING BAY C' : 'PLANT FLOOR';

          // Visual effect for fresh events
          const isFresh = idx === 0;

          return (
            <div
              key={evt.eventId}
              className={`live-feed-card ${isFresh ? 'fresh-event-glow' : ''}`}
              style={{
                background: 'rgba(10, 12, 28, 0.4)',
                borderLeft: `3px solid ${isPredictive ? '#b026ff' : theme.hex}`,
                borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '8px 10px',
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '11px',
                borderRadius: '0 4px 4px 0',
                transition: 'all 0.3s ease',
                position: 'relative',
                boxShadow: isFresh ? `0 0 10px ${theme.hex}22` : 'none',
              }}
            >
              {/* Header Telemetry Row */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '10px',
                  fontWeight: 'bold',
                }}
              >
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                  [{formatTime(evt.timestamp)}]
                </span>
                
                <span
                  style={{
                    color: isPredictive ? '#b026ff' : theme.hex,
                    textShadow: `0 0 5px ${isPredictive ? '#b026ff' : theme.hex}44`,
                  }}
                >
                  {isPredictive ? 'PREDICTIVE' : theme.name}
                </span>
              </div>

              {/* Data Row */}
              <div style={{ color: '#fff', fontSize: '11px', marginBottom: '2px' }}>
                TARGET: <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>TRACK_0{evt.trackId}</span>
              </div>
              
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '11px' }}>
                LOCATION: <span style={{ color: '#ffffff' }}>{zoneName}</span>
              </div>

              {/* Breakdown metrics summary */}
              <div
                style={{
                  marginTop: '4px',
                  display: 'flex',
                  gap: '8px',
                  fontSize: '9px',
                  color: 'rgba(255,255,255,0.5)',
                  borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
                  paddingTop: '4px',
                }}
              >
                <span>SCORE: <strong style={{ color: '#fff' }}>{evt.riskScore}</strong></span>
                {evt.breakdown.ppeViolation > 0 && <span style={{ color: '#ff003c' }}>PPE_VIOLATION</span>}
                {evt.breakdown.fallDetected > 0 && <span style={{ color: '#ff003c' }}>FALL_DET</span>}
              </div>

              {/* Predictive Entry alert inside Feed card */}
              {isPredictive && evt.predictedEntryMs && (
                <div
                  style={{
                    marginTop: '6px',
                    background: 'rgba(176, 38, 255, 0.15)',
                    border: '1px solid rgba(176, 38, 255, 0.4)',
                    color: '#e2d0ff',
                    padding: '2px 6px',
                    borderRadius: '2px',
                    fontSize: '9.5px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: "'Orbitron', sans-serif",
                    animation: 'pulse-predictive 1.5s infinite alternate',
                  }}
                >
                  <Zap size={10} style={{ color: '#b026ff' }} />
                  <span>PREDICTED ENTRY IN {(evt.predictedEntryMs / 1000).toFixed(1)}s</span>
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
              color: 'rgba(255,255,255,0.35)',
              gap: '8px',
              fontStyle: 'italic',
              fontSize: '12px',
            }}
          >
            <Layers size={20} />
            Awaiting WebSocket broadcast feed...
          </div>
        )}
      </div>

      <style>{`
        .live-feed-card:hover {
          background: rgba(20, 24, 50, 0.6) !important;
          transform: translateX(4px);
        }
        @keyframes pulse-predictive {
          0% { border-color: rgba(176, 38, 255, 0.3); }
          100% { border-color: rgba(176, 38, 255, 0.9); }
        }
      `}</style>
    </div>
  );
};
