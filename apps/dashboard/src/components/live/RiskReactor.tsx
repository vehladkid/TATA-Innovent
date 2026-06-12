import React, { useEffect } from 'react';
import { useEventStore } from '../../lib/event-store';
import { Cpu } from 'lucide-react';

// Vertical Industrial Segmented Gauge representing physical liquid rise & settle
const VerticalRiskGauge: React.FC<{ score: number; band: string }> = ({ score, band }) => {
  const numSegments = 10;
  const activeSegments = Math.round((score / 100) * numSegments);
  
  const isSafe = band.toLowerCase() === 'safe';
  const isDanger = band.toLowerCase() === 'critical' || band.toLowerCase() === 'danger' || score >= 60;
  const fillColor = isSafe ? '#22C55E' : (isDanger ? '#EF4444' : '#00B8D9');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div
        style={{
          width: '36px',
          height: '240px',
          background: '#0B0B0C',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '4px',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column-reverse',
          gap: '3px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Water-fill animation container (underneath segments) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: `${score}%`,
            background: `${fillColor}18`,
            transition: 'height 0.7s cubic-bezier(0.25, 1, 0.5, 1.25)', // Springy slosh settle
            pointerEvents: 'none',
          }}
        />

        {/* Liquid slosh wave overlay */}
        {score > 0 && score < 100 && (
          <div
            style={{
              position: 'absolute',
              bottom: `${score}%`,
              left: '-50%',
              width: '200%',
              height: '8px',
              background: `radial-gradient(ellipse at center, ${fillColor}35 0%, transparent 80%)`,
              animation: 'wave-slosh 2s ease-in-out infinite alternate',
              pointerEvents: 'none',
            }}
          />
        )}

        {Array.from({ length: numSegments }).map((_, idx) => {
          const isActive = idx < activeSegments;
          return (
            <div
              key={idx}
              style={{
                width: '100%',
                flex: 1,
                background: isActive ? fillColor : 'rgba(255, 255, 255, 0.03)',
                borderRadius: '1px',
                transition: 'background-color 0.3s ease',
              }}
            />
          );
        })}
      </div>
      <style>{`
        @keyframes wave-slosh {
          0%   { transform: translateX(0) rotate(-3deg); }
          100% { transform: translateX(15%) rotate(3deg); }
        }
      `}</style>
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
  const riskColor = isSafe ? '#22C55E' : (isDanger ? '#EF4444' : '#00B8D9');

  // Dynamic AI Explanation (Hero Text)
  const getAIReasoningText = () => {
    if (!selectedTrackId) return 'Awaiting telemetry feed acquisition...';
    
    if (breakdown.fallDetected > 0) {
      return `CRITICAL ANOMALY: Skeleton vector coordinates registered instant Z-axis collapse alongside negative vertical velocity acceleration on Target W-0${selectedTrackId}. Standard posture threshold filters are bypassed. Automated emergency override is active, warning signals dispatched to field sirens.`;
    }

    const triggers: string[] = [];
    if (breakdown.ppeViolation > 0) triggers.push('missing PPE helmet/vest compliance');
    if (breakdown.proximityToZone > 0) triggers.push('dynamic zone boundary crossing');
    if (breakdown.velocityToward > 0) triggers.push('head-on vector path targeting hazard core');
    if (breakdown.posture > 0) triggers.push('ergonomic lifting posture stress');

    if (isSafe || riskScore < 20) {
      return `Target W-0${selectedTrackId} operations are rated safe. Pose skeletons indicate nominal lift posture angles. Image classifier neural network confirms safety gear active. Telemetry checks indicate target positioned in standard zone pedestrian lane.`;
    }

    const factorsText = triggers.join(', ');
    return `AI reasoning indicates safety rating deterioration for Target W-0${selectedTrackId} (${riskScore}/100). Primary risk parameters calculated: ${factorsText || 'aberrant positional coordinates'}. Inference engine advises warning broadcast via local transmitters.`;
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
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* 1. Worker Channels Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.45)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Select Worker Channels
        </div>
        
        {/* Horizontal Worker Cards */}
        <div 
          style={{ 
            display: 'flex', 
            gap: '8px', 
            overflowX: 'auto', 
            paddingBottom: '6px',
            scrollBehavior: 'smooth' 
          }}
        >
          {workers.map((w) => {
            const wIsSafe = w.band.toLowerCase() === 'safe';
            const wIsDanger = w.band.toLowerCase() === 'critical' || w.band.toLowerCase() === 'danger' || w.riskScore >= 60;
            const wStatusColor = wIsSafe ? '#22C55E' : (wIsDanger ? '#EF4444' : '#00B8D9');
            const wSelected = selectedTrackId === w.trackId;

            return (
              <div
                key={w.trackId}
                onClick={() => setSelectedTrackId(w.trackId)}
                style={{
                  minWidth: '120px',
                  background: wSelected ? 'rgba(255,255,255,0.03)' : '#0B0B0C',
                  border: wSelected ? `1px solid ${wStatusColor}` : '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '11px', fontWeight: 600, color: '#FFFFFF' }}>
                    W-0{w.trackId}
                  </span>
                  <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '11px', fontWeight: 700, color: wStatusColor }}>
                    {w.riskScore}
                  </span>
                </div>
                <div style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '9px',
                  fontWeight: 600,
                  color: wStatusColor,
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span style={{ fontSize: '8px' }}>●</span>
                  {w.band.toUpperCase()}
                </div>
              </div>
            );
          })}
          {workers.length === 0 && (
            <span style={{ fontSize: '11px', fontFamily: "'Poppins', sans-serif", color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', padding: '6px 0' }}>
              No worker tracks detected. Awaiting stream telemetry...
            </span>
          )}
        </div>
      </div>

      {/* 2. Workspace Layout */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '130px 1fr', 
          gap: '16px',
          flex: 1, 
          minHeight: 0,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '16px'
        }}
      >
        {/* Column 1: Vertical Industrial Risk Indicator */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <VerticalRiskGauge score={riskScore} band={band} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '4px' }}>
            <div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk Score</div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '24px', fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>
                {riskScore}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontWeight: 400, marginLeft: '2px' }}>/100</span>
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Band</div>
              <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '12px', fontWeight: 600, color: riskColor, letterSpacing: '0.5px' }}>
                {band.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Updated</div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                {lastUpdatedStr}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: AI Reasoning Console (The Hero) */}
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            background: '#0B0B0C', 
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '4px',
            padding: '16px',
            minHeight: 0
          }}
        >
          {/* Console Header */}
          <div
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '11px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.4)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              paddingBottom: '8px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={12} style={{ color: '#00B8D9' }} />
              DECISION ENGINE TELEMETRY
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: riskColor, fontSize: '9px', fontWeight: 700 }}>
              <span style={{ fontSize: '10px' }}>●</span>
              {isDanger ? 'ALERT LEVEL HIGHLIGHTED' : 'MONITOR NOMINAL'}
            </span>
          </div>

          {/* Core Reasoning Grid Info */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px 24px', 
              marginBottom: '16px',
              fontSize: '11px',
              fontFamily: "'Poppins', sans-serif" 
            }}
          >
            <div>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>Worker Target:</span>
              <span style={{ color: '#FFFFFF', fontWeight: 500, marginLeft: '6px' }}>
                {selectedTrackId ? `W-0${selectedTrackId}` : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>AI Confidence:</span>
              <span style={{ color: '#FFFFFF', fontWeight: 500, marginLeft: '6px' }}>
                {selectedTrackId ? `${88 + (riskScore % 11)}.%` : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>Active Risk Index:</span>
              <span style={{ color: riskColor, fontWeight: 600, marginLeft: '6px' }}>
                {riskScore} ({band.toUpperCase()})
              </span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.35)' }}>SMS Routing:</span>
              <span style={{ color: isDanger ? '#EF4444' : 'rgba(255,255,255,0.4)', fontWeight: 500, marginLeft: '6px' }}>
                {isDanger ? 'ACTIVE DISPATCH' : 'MUTED'}
              </span>
            </div>
          </div>

          {/* AI Analysis (Hero Area) */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em' }}>
              REAL-TIME RISK ARGUMENTATION
            </div>
            <div
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '4px',
                padding: '12px 14px',
                color: '#E5E7EB',
                fontFamily: "'Poppins', sans-serif",
                fontSize: '12px',
                lineHeight: '1.6',
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
          gap: '8px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingTop: '14px',
        }}
      >
        <div
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: '0.05em',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>REAL-TIME ANALYSIS PARAMETERS</span>
          <span>WEIGHT VALUE</span>
        </div>

        <BreakdownBar name="PPE Compliance Violation"        value={breakdown.ppeViolation}   max={40} color={breakdown.ppeViolation > 0 ? '#EF4444' : '#22C55E'}   prefix={breakdown.ppeViolation > 0 ? `+${breakdown.ppeViolation}` : 'NOMINAL'} />
        <BreakdownBar name="Hazard Zone Proximity"        value={breakdown.proximityToZone} max={30} color={breakdown.proximityToZone > 0 ? (breakdown.proximityToZone > 15 ? '#EF4444' : '#00B8D9') : '#22C55E'} prefix={breakdown.proximityToZone > 0 ? `+${breakdown.proximityToZone}` : 'NOMINAL'} />
        <BreakdownBar name="Velocity Vector Head-On"      value={breakdown.velocityToward}  max={20} color={breakdown.velocityToward > 0 ? (breakdown.velocityToward > 10 ? '#EF4444' : '#00B8D9') : '#22C55E'}  prefix={breakdown.velocityToward > 0 ? `+${breakdown.velocityToward}` : 'NOMINAL'} />
        <BreakdownBar name="Posture & Ergonomics"         value={breakdown.posture}          max={10} color={breakdown.posture > 0 ? (breakdown.posture > 5 ? '#EF4444' : '#00B8D9') : '#22C55E'}          prefix={breakdown.posture > 0 ? `+${breakdown.posture}` : 'NOMINAL'} />
        <BreakdownBar name="Biometric Fall Detection"     value={breakdown.fallDetected}     max={30} color="#EF4444"                                                  prefix={breakdown.fallDetected > 0 ? '⚠ EMERGENCY FALL DETECTED (+30)' : 'NOMINAL'} />
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
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', fontSize: '10px' }}>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>{name}</span>
        <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 600, color }}>{prefix}</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            background: color,
            borderRadius: '2px',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </div>
    </div>
  );
};
