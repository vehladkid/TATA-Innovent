import React from 'react';
import { RiskReactor } from '../../components/live/RiskReactor';
import { useEventStore } from '../../lib/event-store';
import { getRiskColor } from '../../lib/risk-utils';
import { Cpu, Activity, Info } from 'lucide-react';

interface ContributorBarProps {
  label: string;
  value: number;
  max: number;
  isActive: boolean;
}

const ContributorBar: React.FC<ContributorBarProps> = ({ label, value, max, isActive }) => {
  const percent = Math.min(100, (value / max) * 100);
  // Color system: Red for active violation, Green for nominal, desaturated gray for inactive baseline
  const isViolated = value > 0;
  const barColor = isActive ? (isViolated ? '#EF4444' : '#22C55E') : 'rgba(255, 255, 255, 0.12)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '11px', 
          fontFamily: "'Poppins', sans-serif" 
        }}
      >
        <span 
          style={{ 
            color: isActive ? '#E5E7EB' : 'rgba(255,255,255,0.4)', 
            fontWeight: isActive ? 600 : 400 
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: barColor }}>
          {isViolated ? `+${value}` : '0'}{' '}
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>/ {max}</span>
        </span>
      </div>
      <div 
        style={{ 
          height: '6px', 
          background: '#0F0F10', 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '3px', 
          overflow: 'hidden' 
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: barColor,
            borderRadius: '2px',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.4s ease',
          }}
        />
      </div>
    </div>
  );
};

export const RiskPanel: React.FC = () => {
  const recentEvents = useEventStore((state) => state.recentEvents);
  const selectedTrackId = useEventStore((state) => state.selectedTrackId);

  const alertIncidents = recentEvents.filter(e => e.band !== 'safe');

  // Selected worker's data
  const latestEventForWorker = recentEvents.find(e => e.trackId === selectedTrackId);
  const breakdown = latestEventForWorker?.breakdown ?? {
    ppeViolation: 0,
    proximityToZone: 0,
    velocityToward: 0,
    posture: 0,
    fallDetected: 0,
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gap: '12px',
        padding: '12px',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Left Sidebar: Diagnostics + Incident Diary */}
      <div
        className="hud-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '16px',
          gap: '16px',
          minHeight: 0,
        }}
      >
        {/* AI Diagnostics header */}
        <div
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            letterSpacing: '0.06em',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Cpu size={13} style={{ color: '#00B8D9' }} />
          AI ENGINE DIAGNOSTICS
        </div>

        {/* Diagnostic metrics */}
        <div
          style={{
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(255,255,255,0.01)',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {[
            { label: 'Architecture', value: 'YOLOv8 + SORT Tracking', color: '#fff' },
            { label: 'Inference Delay',  value: '14.2ms',                color: '#22C55E' },
            { label: 'Skeletons Check',     value: '33 Keypoints (Active)', color: '#22C55E' },
            { label: 'Trigger Level', value: '0.75 Confidence', color: '#00B8D9' },
            { label: 'Action Alerts',      value: 'n8n Warning Dispatch',     color: '#E5E7EB' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>{label}:</span>
              <span style={{ fontFamily: "'Sora', sans-serif", color, fontWeight: 600, textAlign: 'right', fontSize: '10.5px' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Incident diary */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
          <div
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '10px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.07em',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              paddingBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <Activity size={11} />
            WARNING INCIDENT DIARY
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {alertIncidents.slice(0, 15).map((evt) => {
              const theme = getRiskColor(evt.band);
              const accentColor = evt.band === 'critical' || evt.band === 'danger' ? '#EF4444' : '#00B8D9';
              const time = new Date(evt.timestamp).toLocaleTimeString();
              const zoneName =
                evt.zoneId === 'zone_press_A'       ? 'Press A' :
                evt.zoneId === 'zone_forklift_lane' ? 'Forklift' :
                evt.zoneId === 'zone_welding_bay'   ? 'Welding C' : 'Floor';

              return (
                <div
                  key={evt.eventId}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: `2px solid ${accentColor}`,
                    borderRadius: '0 3px 3px 0',
                    padding: '7px 10px',
                    fontSize: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onClick={() => {
                    const store = useEventStore.getState();
                    store.setSelectedTrackId(evt.trackId);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, color: '#fff' }}>W-0{evt.trackId}</span>
                    <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, color: accentColor }}>{theme.name.toUpperCase()} ({evt.riskScore})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Poppins', sans-serif", color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>
                    <span>{zoneName}</span>
                    <span>{time}</span>
                  </div>
                </div>
              );
            })}
            {alertIncidents.length === 0 && (
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', padding: '10px 0' }}>
                No hazard triggers recorded in shift database.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main area: Risk Reactor + Weighted Contributor Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '12px', minHeight: 0 }}>
        {/* Center: The Reactor Console */}
        <div style={{ minHeight: 0 }}>
          <RiskReactor />
        </div>

        {/* Right: Risk Contributor Panel */}
        <div
          className="hud-panel"
          style={{
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: '0.06em',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              paddingBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            <Cpu size={13} style={{ color: '#00B8D9' }} />
            RISK CONTRIBUTOR EXPLORER
          </div>

          {selectedTrackId ? (
            // Display active telemetry weights for selected target
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div 
                style={{ 
                  fontFamily: "'Poppins', sans-serif", 
                  fontSize: '10px', 
                  color: 'rgba(255,255,255,0.4)', 
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Info size={11} style={{ color: '#00B8D9' }} />
                Showing dynamic weights for Target W-0{selectedTrackId}
              </div>
              
              <ContributorBar label="PPE Compliance Check" value={breakdown.ppeViolation} max={40} isActive={true} />
              <ContributorBar label="Hazard Zone Proximity" value={breakdown.proximityToZone} max={30} isActive={true} />
              <ContributorBar label="Velocity Vector Analysis" value={breakdown.velocityToward} max={20} isActive={true} />
              <ContributorBar label="Posture & Ergonomics" value={breakdown.posture} max={10} isActive={true} />
              <ContributorBar label="Biometric Fall Override" value={breakdown.fallDetected} max={30} isActive={breakdown.fallDetected > 0} />
            </div>
          ) : (
            // Display standard static engine weights (baseline guide)
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div 
                style={{ 
                  fontFamily: "'Poppins', sans-serif", 
                  fontSize: '10px', 
                  color: 'rgba(255,255,255,0.4)', 
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Info size={11} style={{ color: '#8E8E93' }} />
                Baseline System Rule Weights
              </div>
              
              <ContributorBar label="PPE Compliance Check" value={40} max={40} isActive={false} />
              <ContributorBar label="Hazard Zone Proximity" value={30} max={30} isActive={false} />
              <ContributorBar label="Velocity Vector Analysis" value={20} max={20} isActive={false} />
              <ContributorBar label="Posture & Ergonomics" value={10} max={10} isActive={false} />
              <ContributorBar label="Biometric Fall Override" value={30} max={30} isActive={false} />
            </div>
          )}

          {/* Core Legend Details */}
          <div
            style={{
              marginTop: 'auto',
              background: '#0B0B0C',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '4px',
              padding: '12px',
              fontSize: '10.5px',
              fontFamily: "'Poppins', sans-serif",
              color: 'rgba(255,255,255,0.45)',
              lineHeight: '1.5'
            }}
          >
            <div style={{ fontWeight: 600, color: '#E5E7EB', marginBottom: '4px', fontFamily: "'Sora', sans-serif" }}>
              Decision Core Legend
            </div>
            Values represent raw safety penalties mapped dynamically. Active metrics highlight in <span style={{ color: '#EF4444', fontWeight: 600 }}>Red (Danger)</span> and nominal metrics render in <span style={{ color: '#22C55E', fontWeight: 600 }}>Green (Safe)</span>.
          </div>

        </div>
      </div>
    </div>
  );
};
