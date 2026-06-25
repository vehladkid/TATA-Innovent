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
  const isViolated = value > 0;
  const barColor = isActive ? (isViolated ? '#FF5A45' : '#00D084') : '#1A1A1A';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '10px', 
          fontFamily: "var(--font-metric)" 
        }}
      >
        <span 
          style={{ 
            color: isActive ? '#D8D8D8' : '#D8D8D8', 
            fontFamily: "var(--font-metric)", 
            fontWeight: isActive ? 600 : 400 
          }}
        >
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-metric)", fontWeight: 700, color: barColor }}>
          {isViolated ? `+${value}` : '0'}{' '}
          <span style={{ fontSize: '8px', color: '#D8D8D8', fontWeight: 400 }}>/ {max}</span>
        </span>
      </div>
      <div 
        style={{ 
          height: '4px', 
          background: '#000000', 
          border: '1px solid rgba(255, 255, 255, 0.01)',
          borderRadius: '2px', 
          overflow: 'hidden' 
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: barColor,
            borderRadius: '1px',
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
        gridTemplateColumns: '280px 1fr',
        gap: '12px',
        padding: '12px',
        overflow: 'hidden',
        height: '100%',
        background: '#000000', // Pure Black
      }}
    >
      {/* Left Sidebar: Diagnostics & Incident Diary */}
      <div
        className="hud-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: '#101010', // Panel background: charcoal
          border: '1px solid #252525', // Border: charcoal
          padding: '14px',
          gap: '14px',
          minHeight: 0,
        }}
      >
        {/* AI Diagnostics header */}
        <div
          style={{
            fontFamily: "var(--font-body)", // Sora
            fontSize: '11px',
            fontWeight: 600,
            color: '#EAEAEA',
            letterSpacing: '0.06em',
            borderBottom: '1px solid #252525',
            paddingBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Cpu size={13} style={{ color: '#5ACDD9' }} />
          AI ENGINE DIAGNOSTICS
        </div>

        {/* Diagnostic metrics */}
        <div
          style={{
            fontSize: '10.5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: '#050505', // Terminal inner dark
            padding: '10px 12px',
            borderRadius: '2px',
            border: '1px solid #252525',
          }}
        >
          {[
            { label: 'Architecture', value: 'YOLOv8 + SORT Tracking', color: '#EAEAEA' },
            { label: 'Inference Delay',  value: '14.2ms',                color: '#5ACDD9' },
            { label: 'Skeletons Check',     value: '33 Keypoints (Active)', color: '#5ACDD9' },
            { label: 'Confidence Threshold', value: '0.75 Target', color: '#5ACDD9' },
            { label: 'Action Alerts',      value: 'n8n Dispatcher Active',    color: '#EAEAEA' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ fontFamily: "var(--font-metric)", color: '#9A9A9A', fontWeight: 400 }}>{label}:</span>
              <span style={{ fontFamily: "var(--font-metric)", color, fontWeight: 600, textAlign: 'right', fontSize: '10px' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Incident diary */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-body)", // Sora
              fontSize: '10px',
              fontWeight: 600,
              color: '#EAEAEA',
              letterSpacing: '0.07em',
              borderBottom: '1px solid #252525',
              paddingBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Activity size={11} />
            WARNING INCIDENT DIARY
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {alertIncidents.slice(0, 15).map((evt) => {
              const theme = getRiskColor(evt.band);
              const accentColor = evt.band === 'critical' ? '#FF5A45' : (evt.band === 'danger' ? '#FF5A45' : (evt.band === 'caution' ? '#FF7360' : '#00D084'));
              const time = new Date(evt.timestamp).toLocaleTimeString();
              const zoneName =
                evt.zoneId === 'zone_press_A'       ? 'Press A' :
                evt.zoneId === 'zone_forklift_lane' ? 'Forklift' :
                evt.zoneId === 'zone_welding_bay'   ? 'Welding C' : 'Floor';

              return (
                <div
                  key={evt.eventId}
                  style={{
                    background: '#050505',
                    border: '1px solid #252525',
                    borderLeft: `2.5px solid ${accentColor}`,
                    borderRadius: '0 2px 2px 0',
                    padding: '6px 8px',
                    fontSize: '9.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1px',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#151515'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#050505'; }}
                  onClick={() => {
                    const store = useEventStore.getState();
                    store.setSelectedTrackId(evt.trackId);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: "var(--font-metric)", fontWeight: 600, color: '#EAEAEA' }}>W-0{evt.trackId}</span>
                    <span style={{ fontFamily: "var(--font-metric)", fontWeight: 600, color: accentColor }}>{theme.name.toUpperCase()} ({evt.riskScore})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "var(--font-metric)", color: '#9A9A9A', opacity: 0.85 }}>
                    <span>{zoneName}</span>
                    <span>{time}</span>
                  </div>
                </div>
              );
            })}
            {alertIncidents.length === 0 && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: '11px', color: '#9A9A9A', fontStyle: 'italic', padding: '10px 0', opacity: 0.6 }}>
                No hazard triggers recorded in shift database.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main area: Risk Reactor & Contributor list */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '12px', minHeight: 0 }}>
        {/* Center: The Reactor Console */}
        <div style={{ minHeight: 0 }}>
          <RiskReactor />
        </div>

        {/* Right: Contributor Panel */}
        <div
          className="hud-panel"
          style={{
            background: '#101010', // Panel background: charcoal
            border: '1px solid #252525', // Border: charcoal
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-body)", // Sora SemiBold
              fontSize: '11px',
              fontWeight: 600,
              color: '#EAEAEA',
              letterSpacing: '0.06em',
              borderBottom: '1px solid #252525',
              paddingBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '4px',
            }}
          >
            <Cpu size={13} style={{ color: '#5ACDD9' }} />
            RISK CONTRIBUTOR EXPLORER
          </div>

          {selectedTrackId ? (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div 
                style={{ 
                  fontFamily: "var(--font-body)", 
                  fontSize: '9.5px', 
                  color: '#9A9A9A', 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Info size={11} style={{ color: '#5ACDD9' }} />
                Showing dynamic weights for Target W-0{selectedTrackId}
              </div>
              
              <ContributorBar label="PPE Compliance Check" value={breakdown.ppeViolation} max={40} isActive={true} />
              <ContributorBar label="Hazard Zone Proximity" value={breakdown.proximityToZone} max={30} isActive={true} />
              <ContributorBar label="Velocity Vector Analysis" value={breakdown.velocityToward} max={20} isActive={true} />
              <ContributorBar label="Posture & Ergonomics" value={breakdown.posture} max={10} isActive={true} />
              <ContributorBar label="Biometric Fall Override" value={breakdown.fallDetected} max={30} isActive={breakdown.fallDetected > 0} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div 
                style={{ 
                  fontFamily: "var(--font-body)", 
                  fontSize: '9.5px', 
                  color: '#9A9A9A', 
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Info size={11} style={{ color: '#EAEAEA' }} />
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
              background: '#050505', // Inner console background
              border: '1px solid #252525',
              borderRadius: '2px',
              padding: '10px 12px',
              fontSize: '10px',
              fontFamily: "var(--font-body)",
              color: '#9A9A9A',
              lineHeight: '1.4'
            }}
          >
            <div style={{ fontWeight: 600, color: '#EAEAEA', marginBottom: '3px', fontFamily: "var(--font-body)" }}>
              Decision Core Legend
            </div>
            Values represent raw safety penalties mapped dynamically. Active metrics highlight in <span style={{ color: '#FF5A45', fontWeight: 600 }}>Critical (Coral)</span> and caution indicators render in <span style={{ color: '#FF7360', fontWeight: 600 }}>Warning (Peach)</span>, while safe parameters display in <span style={{ color: '#00D084', fontWeight: 600 }}>Safe (Green)</span>.
          </div>

        </div>
      </div>
    </div>
  );
};
