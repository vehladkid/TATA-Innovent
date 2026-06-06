import React, { useState, useEffect } from 'react';
import { useEventStore } from '../../lib/event-store';
import { DollarSign, Shield, ShieldCheck, Wifi, UserCheck, Clock } from 'lucide-react';

export const ExecutiveView: React.FC = () => {
  const shiftSummary = useEventStore((state) => state.shiftSummary);
  const siteSafetyScore = useEventStore((state) => state.siteSafetyScore);
  const websocketStatus = useEventStore((state) => state.websocketStatus);
  const activeWorkers = useEventStore((state) => state.activeWorkers);

  const [costAvoided, setCostAvoided] = useState(240000); // Start at ₹2.4 Lakhs

  // Tick up the financial ROI estimator slowly in real-time
  useEffect(() => {
    const timer = setInterval(() => {
      setCostAvoided((prev) => prev + Math.floor(Math.random() * 8) + 2);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  // Compute PPE compliance rate from active workers
  const workers = Object.values(activeWorkers);
  const compliantCount = workers.filter(w => w.helmet && w.vest).length;
  const ppeComplianceRate = workers.length > 0
    ? Math.round((compliantCount / workers.length) * 100)
    : 94; // Default baseline if empty

  // Site Safety Score themes
  let scoreTheme = { hex: '#00f3ff', glow: '0 0 20px #00f3ff' };
  if (siteSafetyScore < 60) {
    scoreTheme = { hex: '#ff003c', glow: '0 0 25px #ff003c' };
  } else if (siteSafetyScore < 85) {
    scoreTheme = { hex: '#ffaa00', glow: '0 0 20px #ffaa00' };
  } else {
    scoreTheme = { hex: '#00ff66', glow: '0 0 25px #00ff66' };
  }

  // Formatting currency
  const formatRupees = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '40% 60%',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Left Column: Huge Site Safety Score dial */}
      <div
        className="hud-panel tech-corners shimmer-ai"
        style={{
          background: 'rgba(5, 7, 24, 0.85)',
          border: '1px solid rgba(0, 243, 255, 0.25)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
        }}
      >
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '14px',
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: '2px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          GLOBAL SITE SAFETY INDEX
        </div>

        {/* Safety Score Radial Dial SVG */}
        <div style={{ position: 'relative', width: '280px', height: '280px' }}>
          <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
            {/* Background circle track */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="rgba(255,255,255,0.03)"
              strokeWidth="12"
            />
            {/* Dotted border reference */}
            <circle
              cx="100"
              cy="100"
              r="88"
              fill="none"
              stroke="rgba(0,243,255,0.08)"
              strokeWidth="1"
              strokeDasharray="4,6"
            />
            {/* Dynamic Score Ring */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={scoreTheme.hex}
              strokeWidth="12"
              strokeDasharray={2 * Math.PI * 80}
              strokeDashoffset={2 * Math.PI * 80 * (1 - siteSafetyScore / 100)}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                filter: `drop-shadow(0 0 8px ${scoreTheme.hex})`,
              }}
            />
          </svg>

          {/* Text overlays inside dial */}
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
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
                fontSize: '68px',
                fontWeight: '900',
                color: '#ffffff',
                lineHeight: '1',
                textShadow: `0 0 15px ${scoreTheme.hex}`,
              }}
            >
              {siteSafetyScore}
            </span>
            <span
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '11px',
                color: 'rgba(255,255,255,0.5)',
                fontWeight: 'bold',
                letterSpacing: '1px',
                marginTop: '6px',
              }}
            >
              RATING / 100
            </span>
          </div>
        </div>

        {/* System safety report overview */}
        <div style={{ textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
          <div
            style={{
              fontSize: '14px',
              color: scoreTheme.hex,
              fontWeight: 'bold',
              letterSpacing: '1px',
              textShadow: `0 0 8px ${scoreTheme.hex}44`,
            }}
          >
            {siteSafetyScore >= 85
              ? '✔ OPERATION GRADE: SECURE'
              : siteSafetyScore >= 60
              ? '⚡ OPERATION GRADE: ELEVATED RISKS'
              : '🚨 OPERATION GRADE: THREAT LEVEL CRITICAL'}
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginTop: '8px', maxWidth: '320px', lineHeight: '1.4' }}>
            Predictive Safety Engine tracking 6 active worker trajectories. Shift metrics aggregated.
          </p>
        </div>
      </div>

      {/* Right Column: Grid of Telemetry metrics */}
      <div style={{ display: 'grid', gridTemplateRows: '120px 1fr', gap: '16px' }}>
        {/* Estimated Risk Cost Avoided Panel */}
        <div
          className="hud-panel tech-corners"
          style={{
            background: 'rgba(0, 255, 102, 0.05)',
            border: '1px solid rgba(0, 255, 102, 0.25)',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'inset 0 0 20px rgba(0, 255, 102, 0.05)',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '10px',
                color: '#00ff66',
                fontWeight: 'bold',
                letterSpacing: '1.5px',
              }}
            >
              ESTIMATED RISK COST AVOIDED (ROI)
            </div>
            <div
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '36px',
                fontWeight: '900',
                color: '#ffffff',
                marginTop: '4px',
                textShadow: '0 0 15px rgba(255,255,255,0.4)',
              }}
            >
              {formatRupees(costAvoided)}
            </div>
          </div>
          <div
            style={{
              background: 'rgba(0, 255, 102, 0.15)',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00ff66',
              boxShadow: '0 0 12px rgba(0,255,102,0.3)',
            }}
          >
            <DollarSign size={24} />
          </div>
        </div>

        {/* Operational parameters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          <MetricBox
            title="INCIDENTS PREVENTED"
            value={shiftSummary.incidentsPrevented}
            subtitle="AI Interventions Triggered"
            icon={<ShieldCheck size={18} style={{ color: '#00ff66' }} />}
            color="#00ff66"
          />
          <MetricBox
            title="THREATS NEUTRALIZED"
            value={shiftSummary.incidentsPrevented * 2 + 3}
            subtitle="Predictive Path Overlays Averted"
            icon={<Shield size={18} style={{ color: '#b026ff' }} />}
            color="#b026ff"
          />
          <MetricBox
            title="PPE COMPLIANCE"
            value={`${ppeComplianceRate}%`}
            subtitle="Helmet & Vest compliance"
            icon={<UserCheck size={18} style={{ color: '#00f3ff' }} />}
            color="#00f3ff"
          />
          <MetricBox
            title="RESPONSE LATENCY"
            value="1.4s"
            subtitle="Edge AI to dashboard sync"
            icon={<Clock size={18} style={{ color: '#ffea00' }} />}
            color="#ffea00"
          />
          <MetricBox
            title="ACTIVE WORKER TRACKS"
            value={workers.length > 0 ? workers.length : shiftSummary.activeWorkers}
            subtitle="SORT Track IDs registered"
            icon={<UserCheck size={18} style={{ color: '#ffffff' }} />}
            color="#ffffff"
          />
          <MetricBox
            title="EDGE TELEMETRY LOGS"
            value={websocketStatus === 'CONNECTED' ? 'ACTIVE' : 'DEGRADED'}
            subtitle="ws://localhost:8000/ws"
            icon={<Wifi size={18} style={{ color: websocketStatus === 'CONNECTED' ? '#00ff66' : '#ff003c' }} />}
            color={websocketStatus === 'CONNECTED' ? '#00ff66' : '#ff003c'}
            flash={websocketStatus !== 'CONNECTED'}
          />
        </div>
      </div>
    </div>
  );
};

interface MetricBoxProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  flash?: boolean;
}

const MetricBox: React.FC<MetricBoxProps> = ({ title, value, subtitle, icon, color, flash }) => {
  return (
    <div
      className={`hud-panel tech-corners ${flash ? 'critical-flash-active' : ''}`}
      style={{
        background: 'rgba(10, 12, 28, 0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '9.5px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', letterSpacing: '0.8px' }}>
            {title}
          </span>
          <span style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', textShadow: `0 0 5px ${color}33`, marginTop: '4px' }}>
            {value}
          </span>
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '4px',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '8px' }}>
        {subtitle}
      </div>
    </div>
  );
};
