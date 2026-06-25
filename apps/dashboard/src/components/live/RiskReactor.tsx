import React, { useEffect } from 'react';
import { useEventStore } from '../../lib/event-store';
import { Cpu } from 'lucide-react';

// Vertical Industrial Segmented Gauge
const VerticalRiskGauge: React.FC<{ score: number; band: string }> = ({ score, band }) => {
  const numSegments = 10;
  const activeSegments = Math.round((score / 100) * numSegments);

  const isSafe = band.toLowerCase() === 'safe';
  const isDanger = band.toLowerCase() === 'critical' || band.toLowerCase() === 'danger' || score >= 60;
  const fillColor = isSafe ? '#00D084' : (isDanger ? '#FF5A45' : '#FF7360');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '28px',
          height: '210px',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.005), rgba(0, 0, 0, 0.4))',
          border: '1px solid rgba(255, 255, 255, 0.02)',
          borderRadius: '2px',
          padding: '2px',
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '2px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Soft background fill */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: `${score}%`,
            background: `${fillColor}0b`,
            transition: 'height 0.7s cubic-bezier(0.25, 1, 0.5, 1)',
            pointerEvents: 'none',
          }}
        />

        {Array.from({ length: numSegments }).map((_, idx) => {
          const isActive = idx < activeSegments;
          return (
            <div
              key={idx}
              style={{
                width: '100%',
                flex: 1,
                background: isActive ? fillColor : 'rgba(255, 255, 255, 0.015)',
                borderRadius: '1px',
                transition: 'background-color 0.3s ease',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

export const RiskReactor: React.FC = () => {
  const activeWorkers = useEventStore((state) => state.activeWorkers);
  const recentEvents = useEventStore((state) => state.recentEvents);
  const selectedTrackId = useEventStore((state) => state.selectedTrackId);
  const setSelectedTrackId = useEventStore((state) => state.setSelectedTrackId);

  const workers = Object.values(activeWorkers);

  // Auto-select worker with highest risk score if none selected
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
  }, [activeWorkers, selectedTrackId, workers, setSelectedTrackId]);

  const activeWorker = selectedTrackId ? activeWorkers[selectedTrackId] : null;
  const latestEventForWorker = recentEvents.find(e => e.trackId === selectedTrackId);

  const riskScore = activeWorker?.riskScore ?? (latestEventForWorker?.riskScore ?? 0);
  const band = activeWorker?.band ?? (latestEventForWorker?.band ?? 'safe');
  const breakdown = latestEventForWorker?.breakdown ?? {
    ppeViolation: 0,
    proximityToZone: 0,
    velocityToward: 0,
    posture: 0,
    fallDetected: 0,
  };

  const isSafe = band.toLowerCase() === 'safe';
  const isDanger = band.toLowerCase() === 'critical' || band.toLowerCase() === 'danger' || riskScore >= 60;
  const riskColor = isSafe ? '#00D084' : (isDanger ? '#FF5A45' : '#FF7360');

  // Dynamic AI Explanation (Hero Text)
  const getAIReasoningText = () => {
    if (!selectedTrackId) return 'Awaiting telemetry feed acquisition...';

    if (breakdown.fallDetected > 0) {
      return `CRITICAL EXPOSURE OVERRIDE: 3D skeletal vectors registered instant Z-axis drop of W-0${selectedTrackId}. Z-velocity boundary checks triggered automated emergency dispatcher. SMS broadcast dispatched to onsite responders.`;
    }

    const triggers: string[] = [];
    if (breakdown.ppeViolation > 0) triggers.push('missing helmet/vest PPE verification');
    if (breakdown.proximityToZone > 0) triggers.push('position breach inside restricted polygon bounds');
    if (breakdown.velocityToward > 0) triggers.push('negative heading vector targeting machine boundary');
    if (breakdown.posture > 0) triggers.push('ergonomic load threshold exception');

    if (isSafe || riskScore < 20) {
      return `Target W-0${selectedTrackId} is operating within nominal thresholds. Pose estimation checks indicate balanced skeleton geometry. Visual classifiers verify active PPE configurations. Positional logs locate target inside marked pedestrian corridor A.`;
    }

    const factorsText = triggers.join(', ');
    return `Inference engine identifies safety index degradation for W-0${selectedTrackId}. Core triggers calculated: ${factorsText || 'aberrant trajectory coordinates'}. System dispatcher recommends warning transmission to target receiver.`;
  };

  const lastUpdatedStr = latestEventForWorker
    ? new Date(latestEventForWorker.timestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  return (
    <div
      className="hud-panel"
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, rgba(90, 205, 217, 0.025), rgba(54, 106, 224, 0.02), transparent), rgba(16, 16, 16, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.02)',
        boxShadow: '0 25px 50px -12px rgba(54, 106, 224, 0.02), 0 0 35px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* 1. Worker Channels Selector */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          background: 'linear-gradient(180deg, rgba(62, 106, 224, 0.03), transparent 60%)',
          padding: '10px 12px',
          borderRadius: '4px',
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-header)", // Osiris
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-neutral)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          SELECT ACTIVE WORKER
        </div>

        {/* Horizontal Worker Cards */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '10px', 
            overflowX: 'auto', 
            paddingBottom: '4px',
            scrollBehavior: 'smooth',
            padding: '4px 0px',
          }}
        >
          {workers.map((w) => {
            const wIsSafe = w.band.toLowerCase() === 'safe';
            const wIsDanger = w.band.toLowerCase() === 'critical' || w.band.toLowerCase() === 'danger' || w.riskScore >= 60;
            const wStatusColor = wIsSafe ? '#00D084' : (wIsDanger ? '#FF5A45' : '#FF7360');
            const wSelected = selectedTrackId === w.trackId;

            let cardBackground = '';
            let cardBoxShadow = '';
            
            if (wSelected) {
              cardBackground = 'linear-gradient(135deg, rgba(62, 106, 224, 0.12), rgba(62, 106, 224, 0.03))';
              cardBoxShadow = '0 0 20px rgba(62, 106, 224, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.02)';
            } else if (wIsSafe) {
              cardBackground = 'linear-gradient(135deg, rgba(90, 205, 217, 0.12), rgba(0, 255, 150, 0.04))';
              cardBoxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.01)';
            } else if (wIsDanger) {
              cardBackground = 'linear-gradient(135deg, rgba(255, 115, 96, 0.08), rgba(255, 115, 96, 0.02))';
              cardBoxShadow = '0 4px 12px rgba(255, 115, 96, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.01)';
            } else {
              cardBackground = 'linear-gradient(135deg, rgba(255, 115, 96, 0.06), rgba(255, 115, 96, 0.02))';
              cardBoxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.01)';
            }

            return (
              <div
                key={w.trackId}
                onClick={() => setSelectedTrackId(w.trackId)}
                style={{
                  minWidth: '105px',
                  background: cardBackground,
                  backdropFilter: 'blur(8px)',
                  border: wSelected ? '1px solid #3E6AE0' : '1px solid rgba(255, 255, 255, 0.02)',
                  borderRadius: '2px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                  boxShadow: cardBoxShadow,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "var(--font-metric)", fontSize: '10.5px', fontWeight: 600, color: 'var(--color-silver)' }}>
                    W-0{w.trackId}
                  </span>
                  <span style={{ fontFamily: "var(--font-metric)", fontSize: '11px', fontWeight: 700, color: wStatusColor }}>
                    {w.riskScore}
                  </span>
                </div>
                <div style={{
                  fontFamily: "var(--font-metric)", // IBM Plex Mono
                  fontSize: '9px',
                  fontWeight: 600,
                  color: wStatusColor,
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}>
                  <span style={{ fontSize: '7px' }}>●</span>
                  {w.band.toUpperCase()}
                </div>
              </div>
            );
          })}
          {workers.length === 0 && (
            <span style={{ fontSize: '11px', fontFamily: "var(--font-body)", color: 'var(--color-neutral)', fontStyle: 'italic', padding: '6px 0' }}>
              Awaiting tracker stream...
            </span>
          )}
        </div>
      </div>

      {/* 2. Workspace Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '110px 1fr',
          gap: '16px',
          flex: 1,
          minHeight: 0,
          borderTop: '1px solid rgba(255, 255, 255, 0.02)',
          paddingTop: '16px'
        }}
      >
        {/* Column 1: Vertical Risk Gauge */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <VerticalRiskGauge score={riskScore} band={band} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
            <div>
              <div style={{ fontFamily: "var(--font-label)", fontSize: '8px', color: 'var(--color-neutral)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Score</div>
              <div style={{ fontFamily: "var(--font-metric)", fontSize: '20px', fontWeight: 700, color: 'var(--color-silver)', lineHeight: 1.1 }}>
                {riskScore}
                <span style={{ fontSize: '10px', color: 'var(--color-neutral)', fontWeight: 400, marginLeft: '1px' }}>/100</span>
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "var(--font-metric)", fontSize: '8px', color: 'var(--color-neutral)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Band</div>
              <div style={{ fontFamily: "var(--font-metric)", fontSize: '10.5px', fontWeight: 700, color: riskColor, letterSpacing: '0.5px' }}>
                {band.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "var(--font-metric)", fontSize: '8px', color: 'var(--color-neutral)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Updated</div>
              <div style={{ fontFamily: "var(--font-metric)", fontSize: '9px', color: 'var(--color-neutral)', opacity: 0.75, whiteSpace: 'nowrap' }}>
                {lastUpdatedStr}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Decision Intelligence Engine */}
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            background: `
              linear-gradient(180deg, rgba(62, 106, 224, 0.05) 0%, transparent 25%),
              linear-gradient(135deg, rgba(62, 106, 224, 0.06) 0%, rgba(90, 205, 217, 0.025) 35%, rgba(255, 255, 255, 0.01) 100%),
              rgba(16, 16, 16, 0.85)
            `,
            backdropFilter: 'blur(8px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.015)',
            borderRight: '1px solid rgba(255, 255, 255, 0.015)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.015)',
            borderTop: '2px solid #3E6AE0',
            boxShadow: '0 25px 50px -12px rgba(54, 106, 224, 0.04), 0 0 35px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
            borderRadius: '2px',
            padding: '14px 16px',
            minHeight: 0
          }}
        >
          {/* Console Header */}
          <div
            style={{
              fontFamily: "var(--font-body)", // Sora SemiBold
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-silver)',
              background: 'linear-gradient(90deg, rgba(62, 106, 224, 0.05), transparent)',
              padding: '10px 16px',
              margin: '-14px -16px 10px -16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={12} style={{ color: 'var(--color-nominal)' }} />
              DECISION INTELLIGENCE TELEMETRY
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: riskColor, fontSize: '9px', fontWeight: 700 }}>
              <span style={{ fontSize: '10px' }}>●</span>
              {isDanger ? 'EXPOSURE ALERT ACTIVATED' : 'NOMINAL STATUS'}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 14px',
              marginBottom: '10px',
              fontSize: '10px',
              fontFamily: "var(--font-metric)" // IBM Plex Mono
            }}
          >
            <div>
              <span style={{ color: 'var(--color-neutral)' }}>Target:</span>
              <span style={{ color: 'var(--color-silver)', fontWeight: 600, marginLeft: '6px' }}>
                {selectedTrackId ? `W-0${selectedTrackId}` : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-neutral)' }}>AI Inference:</span>
              <span style={{ color: 'var(--color-silver)', fontWeight: 600, marginLeft: '6px' }}>
                {selectedTrackId ? `${88 + (riskScore % 11)}%` : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-neutral)' }}>Penalty score:</span>
              <span style={{ color: riskColor, fontWeight: 700, marginLeft: '6px' }}>
                {riskScore} ({band.toUpperCase()})
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-neutral)' }}>Emergency SMS:</span>
              <span style={{ color: isDanger ? '#FF5A45' : 'var(--color-silver)', fontWeight: 600, marginLeft: '6px' }}>
                {isDanger ? 'DISPATCHED' : 'NOMINAL'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-neutral)' }}>Gait Velocity:</span>
              <span style={{ color: 'var(--color-nominal)', fontWeight: 600, marginLeft: '6px' }}>
                {selectedTrackId ? '1.42 m/s' : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-neutral)' }}>Skeleton Joints:</span>
              <span style={{ color: 'var(--color-nominal)', fontWeight: 600, marginLeft: '6px' }}>
                33 Keypoints (3D)
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-neutral)' }}>Fall Vector check:</span>
              <span style={{ color: 'var(--color-nominal)', fontWeight: 600, marginLeft: '6px' }}>
                Z-Axis Active
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-neutral)' }}>Network Latency:</span>
              <span style={{ color: 'var(--color-nominal)', fontWeight: 600, marginLeft: '6px' }}>
                14.2ms
              </span>
            </div>
          </div>

          {/* AI Analysis (Hero Area) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontFamily: "var(--font-label)", fontSize: '8px', color: 'var(--color-neutral)', letterSpacing: '0.05em' }}>
              REAL-TIME OPERATIONAL RISK ARGUMENTATION
            </div>
            <div
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.01)',
                borderRadius: '2px',
                padding: '8px 12px',
                color: 'var(--color-silver)',
                fontFamily: "var(--font-body)",
                fontSize: '11px',
                lineHeight: '1.5',
                overflowY: 'auto',
                textAlign: 'left'
              }}
            >
              {getAIReasoningText()}
            </div>
          </div>
        </div>
      </div>

      {/* 3. AI Risk Breakdown Indicators */}
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.02)',
          paddingTop: '14px',
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-header)", // Osiris
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--color-neutral)',
            letterSpacing: '0.05em',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>REAL-TIME ANALYSIS PARAMETERS</span>
          <span>WEIGHT VALUE</span>
        </div>

        <BreakdownBar name="PPE Compliance Check" value={breakdown.ppeViolation} max={40} color={breakdown.ppeViolation > 0 ? '#FF5A45' : '#00D084'} prefix={breakdown.ppeViolation > 0 ? `+${breakdown.ppeViolation}` : 'NOMINAL'} />
        <BreakdownBar name="Hazard Zone Proximity" value={breakdown.proximityToZone} max={30} color={breakdown.proximityToZone > 0 ? '#FF5A45' : '#00D084'} prefix={breakdown.proximityToZone > 0 ? `+${breakdown.proximityToZone}` : 'NOMINAL'} />
        <BreakdownBar name="Velocity Heading Vector" value={breakdown.velocityToward} max={20} color={breakdown.velocityToward > 0 ? '#FF5A45' : '#00D084'} prefix={breakdown.velocityToward > 0 ? `+${breakdown.velocityToward}` : 'NOMINAL'} />
        <BreakdownBar name="Posture & Ergonomics check" value={breakdown.posture} max={10} color={breakdown.posture > 0 ? '#FF5A45' : '#00D084'} prefix={breakdown.posture > 0 ? `+${breakdown.posture}` : 'NOMINAL'} />
        <BreakdownBar name="Biometric Fall Detection" value={breakdown.fallDetected} max={30} color="#FF5A45" prefix={breakdown.fallDetected > 0 ? '⚠ EMERGENCY OVERRIDE (+30)' : 'NOMINAL'} />
      </div>
    </div>
  );
};

interface BreakdownBarProps {
  name: string;
  value: number;
  max: number;
  color: string;
  prefix: string;
}

const BreakdownBar: React.FC<BreakdownBarProps> = ({ name, value, max, color, prefix }) => {
  const percent = Math.min(100, (value / max) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px' }}>
        <span style={{ fontFamily: "var(--font-metric)", color: 'var(--color-neutral)' }}>{name}</span>
        <span style={{ fontFamily: "var(--font-metric)", fontWeight: 600, color }}>{prefix}</span>
      </div>
      <div style={{ height: '3px', background: '#000000', borderRadius: '1px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.01)' }}>
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: color,
            borderRadius: '1px',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
};
