import React from 'react';
import { RiskReactor } from '../../components/live/RiskReactor';
import { useEventStore } from '../../lib/event-store';
import { getRiskColor } from '../../lib/risk-utils';
import { Cpu, Terminal } from 'lucide-react';

export const RiskPanel: React.FC = () => {
  const recentEvents = useEventStore((state) => state.recentEvents);
  
  // Filter for events with significant safety alerts (non-safe)
  const alertIncidents = recentEvents.filter(e => e.band !== 'safe');

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Left Sidebar: Diagnostic Controls & Historical Alerts list */}
      <div
        className="hud-panel tech-corners"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(4, 5, 12, 0.85)',
          border: '1px solid rgba(0, 243, 255, 0.2)',
          padding: '16px',
          gap: '16px',
          minHeight: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '13px',
            color: '#00f3ff',
            fontWeight: 'bold',
            letterSpacing: '1px',
            borderBottom: '1px solid rgba(0,243,255,0.2)',
            paddingBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Terminal size={15} style={{ color: '#00f3ff' }} />
          <span>AI DIAGNOSTICS</span>
        </div>

        {/* Neural Net Diagnostics metrics */}
        <div
          style={{
            fontSize: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(0,0,0,0.4)',
            padding: '12px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Model Architecture:</span>
            <span style={{ color: '#ffffff', fontWeight: 'bold' }}>YOLOv8 + SORT tracker</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Inference Latency:</span>
            <span style={{ color: '#00ff66', fontWeight: 'bold' }}>14.2ms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Pose Keypoints:</span>
            <span style={{ color: '#00ff66', fontWeight: 'bold' }}>33 landmarks (MediaPipe)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Confidence Threshold:</span>
            <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>0.75 (Auto-Calibrated)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}>Alert Routing:</span>
            <span style={{ color: '#b026ff', fontWeight: 'bold' }}>n8n Webhook / SMS</span>
          </div>
        </div>

        {/* Historical Warning Feed */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minHeight: 0,
          }}
        >
          <div
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
              letterSpacing: '1px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: '4px',
              marginTop: '10px',
            }}
          >
            WARNING INCIDENT DIARY
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {alertIncidents.slice(0, 15).map((evt) => {
              const theme = getRiskColor(evt.band);
              const time = new Date(evt.timestamp).toLocaleTimeString();
              const zoneName = evt.zoneId === 'zone_press_A' ? 'Press A' :
                               evt.zoneId === 'zone_forklift_lane' ? 'Forklift' :
                               evt.zoneId === 'zone_welding_bay' ? 'Welding C' : 'Floor';

              return (
                <div
                  key={evt.eventId}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderLeft: `3px solid ${theme.hex}`,
                    borderRadius: '0 3px 3px 0',
                    padding: '8px 10px',
                    fontSize: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  onMouseEnter={() => {
                    // Injecting simulated trackId click to bind RiskReactor
                    const store = useEventStore.getState();
                    store.addRiskEvent(evt);
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span style={{ color: '#ffffff' }}>WORKER W-00{evt.trackId}</span>
                    <span style={{ color: theme.hex }}>{theme.name} ({evt.riskScore})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.5)' }}>
                    <span>LOC: {zoneName}</span>
                    <span>{time}</span>
                  </div>
                </div>
              );
            })}
            {alertIncidents.length === 0 && (
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', padding: '10px 0' }}>
                No hazard triggers recorded in shift database.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Core Area: The Risk Reactor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '16px', minHeight: 0 }}>
        {/* The Reactor Component */}
        <div style={{ minHeight: 0 }}>
          <RiskReactor />
        </div>

        {/* Explainable AI parameter guidelines description card */}
        <div
          className="hud-panel tech-corners"
          style={{
            background: 'rgba(4, 5, 12, 0.85)',
            border: '1px solid rgba(0, 243, 255, 0.2)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '12px',
          }}
        >
          <div
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '13px',
              color: '#00f3ff',
              fontWeight: 'bold',
              letterSpacing: '1px',
              borderBottom: '1px solid rgba(0,243,255,0.2)',
              paddingBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Cpu size={15} style={{ color: '#b026ff' }} />
            <span>AI RISK LOGIC MANUAL</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
            <ParameterDesc
              title="PPE Compliance violation (Max +40)"
              description="Evaluated frame-by-frame by edge models detecting hardhats and safety vests. Deducts up to 40 safety units for zero protection in active danger areas."
              color="#ff003c"
            />
            <ParameterDesc
              title="Hazard Zone Proximity (Max +30)"
              description="Evaluates worker coordinates mapping against dynamic vector boundaries. High scores represent immediate boundary crossings or prolonged dwell times."
              color="#ffaa00"
            />
            <ParameterDesc
              title="Velocity Vector Head-On (Max +20)"
              description="Drawn from SORT tracker velocity telemetry. Identifies workers heading directly towards critical danger cores (e.g. Press Machine, active rails) at elevated speeds."
              color="#0066ff"
            />
            <ParameterDesc
              title="Posture & Ergonomics (Max +10)"
              description="Computes joints angles (shoulder-spine-hip) using MediaPipe skeletons. Flags potential lifting strain, bending overages, or prolonged awkward postures."
              color="#b026ff"
            />
            <ParameterDesc
              title="Biometric Fall Detection (+30 Boost)"
              description="An instant binary safety override triggered by rapid negative Y-velocity vectors and skeleton vertical collapse. Immediately issues level-1 emergency command sweeps."
              color="#ff003c"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

interface ParameterDescProps {
  title: string;
  description: string;
  color: string;
}

const ParameterDesc: React.FC<ParameterDescProps> = ({ title, description, color }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
        <span style={{ color: '#ffffff' }}>{title}</span>
      </div>
      <p style={{ color: 'rgba(255, 255, 255, 0.65)', lineHeight: '1.4', paddingLeft: '12px' }}>
        {description}
      </p>
    </div>
  );
};
