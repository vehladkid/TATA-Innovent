import React, { useState, useEffect } from 'react';
import { useEventStore } from '../../lib/event-store';
import { getRiskColor } from '../../lib/risk-utils';
import { Eye } from 'lucide-react';

export const RiskReactor: React.FC = () => {
  const activeWorkers = useEventStore((state) => state.activeWorkers);
  const recentEvents = useEventStore((state) => state.recentEvents);

  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);

  const workers = Object.values(activeWorkers);

  // Auto-select the worker with the highest risk score if none selected
  useEffect(() => {
    if (workers.length === 0) {
      setSelectedTrackId(null);
      return;
    }

    if (selectedTrackId === null || !activeWorkers[selectedTrackId]) {
      const highestRiskWorker = workers.reduce((prev, current) =>
        (prev.riskScore > current.riskScore) ? prev : current
      );
      setSelectedTrackId(highestRiskWorker.trackId);
    }
  }, [activeWorkers, selectedTrackId]);

  // Find the current risk event corresponding to the selected worker
  const activeWorker = selectedTrackId ? activeWorkers[selectedTrackId] : null;
  const latestEventForWorker = recentEvents.find(e => e.trackId === selectedTrackId);

  // Default values if no active data
  const riskScore = activeWorker?.riskScore ?? (latestEventForWorker?.riskScore ?? 0);
  const band = activeWorker?.band ?? (latestEventForWorker?.band ?? 'safe');
  const breakdown = latestEventForWorker?.breakdown ?? {
    ppeViolation: 0,
    proximityToZone: 0,
    velocityToward: 0,
    posture: 0,
    fallDetected: 0,
  };

  const riskTheme = getRiskColor(band);

  return (
    <div
      className="hud-panel tech-corners"
      style={{
        width: '100%',
        height: '100%',
        background: 'rgba(5, 7, 20, 0.8)',
        border: '1px solid rgba(0, 243, 255, 0.25)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Selector Tabs for Workers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          Select Worker Channels:
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {workers.map((w) => {
            const wTheme = getRiskColor(w.band);
            const isSelected = selectedTrackId === w.trackId;
            return (
              <button
                key={w.trackId}
                onClick={() => setSelectedTrackId(w.trackId)}
                style={{
                  background: isSelected ? wTheme.hex : 'rgba(10, 15, 35, 0.6)',
                  color: isSelected ? '#000000' : '#ffffff',
                  border: `1px solid ${wTheme.hex}`,
                  borderRadius: '3px',
                  padding: '4px 10px',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '10px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: isSelected ? `0 0 10px ${wTheme.hex}` : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                W-00{w.trackId} ({w.riskScore})
              </button>
            );
          })}
          {workers.length === 0 && (
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
              No worker tracks detected. Waiting for stream telemetry...
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '24px',
          padding: '10px 0',
        }}
      >
        {activeWorker ? (
          <div
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '13px',
              color: '#ffffff',
              fontWeight: 'bold',
              letterSpacing: '1px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Eye size={14} style={{ color: riskTheme.hex }} />
            MONITORING: WORKER W-00{activeWorker.trackId} TELEMETRY
          </div>
        ) : (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
            Awaiting target acquisition...
          </div>
        )}

        {/* Reactor Core Visualization */}
        <div style={{ position: 'relative', width: '220px', height: '220px' }}>
          {/* External rotating ring */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              border: `2px dashed ${riskTheme.hex}`,
              borderRadius: '50%',
              opacity: 0.35,
              animation: 'reactor-spin-right 12s linear infinite',
              boxShadow: `inset 0 0 15px ${riskTheme.hex}22`,
            }}
          />

          {/* Middle rotating ring */}
          <div
            style={{
              position: 'absolute',
              top: '15px', left: '15px', right: '15px', bottom: '15px',
              border: `1px dashed ${riskTheme.hex}`,
              borderRadius: '50%',
              opacity: 0.6,
              animation: 'reactor-spin-left 8s linear infinite',
            }}
          />

          {/* Glowing background halo */}
          <div
            style={{
              position: 'absolute',
              top: '30px', left: '30px', right: '30px', bottom: '30px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${riskTheme.hex}25 0%, transparent 70%)`,
              animation: 'reactor-pulse 2s ease-in-out infinite alternate',
            }}
          />

          {/* Central Core Circle */}
          <div
            style={{
              position: 'absolute',
              top: '40px', left: '40px', right: '40px', bottom: '40px',
              borderRadius: '50%',
              background: 'rgba(5, 7, 20, 0.95)',
              border: `3px solid ${riskTheme.hex}`,
              boxShadow: `0 0 25px ${riskTheme.hex}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 3,
            }}
          >
            <span
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '44px',
                fontWeight: '900',
                color: '#ffffff',
                lineHeight: '1',
                textShadow: `0 0 8px ${riskTheme.hex}`,
              }}
            >
              {riskScore}
            </span>
            <span
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '12px',
                fontWeight: 'bold',
                color: riskTheme.hex,
                letterSpacing: '1.5px',
                marginTop: '4px',
                textShadow: `0 0 4px ${riskTheme.hex}`,
              }}
            >
              {band.toUpperCase()}
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '9px',
                color: 'rgba(255,255,255,0.4)',
                marginTop: '2px',
              }}
            >
              RISK INDEX
            </span>
          </div>
        </div>

        {/* Risk Breakdown Indicators */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '11px',
              color: 'rgba(255,255,255,0.5)',
              letterSpacing: '1px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>AI EXPLAINABLE RISK BREAKDOWN</span>
            <span>WEIGHT</span>
          </div>

          {/* PPE Violation (0 - 40) */}
          <BreakdownBar
            name="PPE COMPLIANCE"
            value={breakdown.ppeViolation}
            max={40}
            color={breakdown.ppeViolation > 0 ? '#ff003c' : '#00ff66'}
            prefix={breakdown.ppeViolation > 0 ? `+${breakdown.ppeViolation}` : 'OK'}
          />

          {/* Proximity to Zone (0 - 30) */}
          <BreakdownBar
            name="HAZARD ZONE PROXIMITY"
            value={breakdown.proximityToZone}
            max={30}
            color={breakdown.proximityToZone > 15 ? '#ffaa00' : breakdown.proximityToZone > 0 ? '#ffea00' : '#00f3ff'}
            prefix={breakdown.proximityToZone > 0 ? `+${breakdown.proximityToZone}` : 'SAFE'}
          />

          {/* Velocity Toward (0 - 20) */}
          <BreakdownBar
            name="VELOCITY VECTOR HEAD-ON"
            value={breakdown.velocityToward}
            max={20}
            color={breakdown.velocityToward > 10 ? '#ffaa00' : '#0066ff'}
            prefix={breakdown.velocityToward > 0 ? `+${breakdown.velocityToward}` : 'STATIONARY'}
          />

          {/* Posture (0 - 10) */}
          <BreakdownBar
            name="POSTURE ERGONOMICS"
            value={breakdown.posture}
            max={10}
            color={breakdown.posture > 5 ? '#ffea00' : '#00f3ff'}
            prefix={breakdown.posture > 0 ? `+${breakdown.posture}` : 'NORMAL'}
          />

          {/* Fall Detected (0 or 30) */}
          <BreakdownBar
            name="BIOMETRIC FALL SENSOR"
            value={breakdown.fallDetected}
            max={30}
            color="#ff003c"
            prefix={breakdown.fallDetected > 0 ? '💥 DETECTED (+30)' : 'NOMINAL'}
            flash={breakdown.fallDetected > 0}
          />
        </div>
      </div>

      <style>{`
        @keyframes reactor-spin-right {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes reactor-spin-left {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes reactor-pulse {
          0% { opacity: 0.3; }
          100% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
};

interface BreakdownBarProps {
  name: string;
  value: number;
  max: number;
  color: string;
  prefix: string;
  flash?: boolean;
}

const BreakdownBar: React.FC<BreakdownBarProps> = ({ name, value, max, color, prefix, flash }) => {
  const percent = Math.min(100, (value / max) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 600 }}>
        <span style={{ color: 'rgba(255,255,255,0.75)' }}>{name}</span>
        <span style={{ color, textShadow: `0 0 5px ${color}33`, animation: flash ? 'blink 0.5s infinite alternate' : 'none' }}>{prefix}</span>
      </div>
      <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: color,
            borderRadius: '3px',
            boxShadow: `0 0 8px ${color}`,
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: flash ? 'blink 0.5s infinite alternate' : 'none'
          }}
        />
      </div>
      <style>{`
        @keyframes blink {
          0% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
