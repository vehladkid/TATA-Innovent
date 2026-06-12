import React, { useState, useEffect } from 'react';
import { useEventStore } from '../../lib/event-store';
import { TrendingUp, Shield, ShieldCheck, Wifi, UserCheck, Clock } from 'lucide-react';

// Premium counter-up animation component
const AnimatedCounter: React.FC<{
  value: number;
  duration?: number;
  isCurrency?: boolean;
}> = ({ value, duration = 800, isCurrency = false }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setCount(end);
      return;
    }

    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.max(Math.floor(duration / Math.abs(range)), 8);
    
    const timer = setInterval(() => {
      current += Math.ceil(range / (duration / stepTime));
      if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  if (isCurrency) {
    return (
      <>
        {new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0
        }).format(count)}
      </>
    );
  }

  return <>{count.toLocaleString()}</>;
};

// Premium Sparkline Component
const Sparkline: React.FC<{ color?: string }> = ({ color = '#22C55E' }) => (
  <svg 
    width="48" 
    height="12" 
    viewBox="0 0 48 12" 
    style={{ display: 'inline-block', verticalAlign: 'middle' }}
  >
    <path
      d="M 2 10 L 10 9 L 18 11 L 26 4 L 34 6 L 46 2"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ExecutiveView: React.FC = () => {
  const shiftSummary = useEventStore((state) => state.shiftSummary);
  const siteSafetyScore = useEventStore((state) => state.siteSafetyScore);
  const activeWorkers = useEventStore((state) => state.activeWorkers);
  const recentEvents = useEventStore((state) => state.recentEvents);

  const [costAvoided, setCostAvoided] = useState(240000);
  const [fillProgress, setFillProgress] = useState(0);

  // Animate Safety Fill on Mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setFillProgress(siteSafetyScore);
    }, 150);
    return () => clearTimeout(timer);
  }, [siteSafetyScore]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCostAvoided((prev) => prev + Math.floor(Math.random() * 8) + 2);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const workers = Object.values(activeWorkers);
  const compliantCount = workers.filter(w => w.helmet && w.vest).length;
  const ppeComplianceRate = workers.length > 0
    ? Math.round((compliantCount / workers.length) * 100)
    : 94;

  const safetyLabel = siteSafetyScore >= 85 ? 'SECURE' : 'ELEVATED RISK';
  const alertIncidents = recentEvents.filter(e => e.band !== 'safe');

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '34% 66%',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden',
        height: '100%',
        background: '#0D0D0D', // Matte Black background
      }}
    >
      {/* Left Column: Unified Safety Index Panel */}
      <div
        className="hud-panel"
        style={{
          background: '#161616', // Charcoal panel
          border: '1px solid rgba(255,255,255,0.045)', // Soft border visibility
          borderRadius: '6px',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes wave-move-back {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes wave-move-front {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
        `}} />

        {/* Safety Index Reservoir Visualization */}
        <div
          style={{
            width: '100%',
            flex: 1,
            background: 'linear-gradient(180deg, rgba(24, 24, 27, 0.8) 0%, rgba(14, 14, 16, 0.95) 100%)',
            border: '1px solid rgba(161, 161, 170, 0.15)', // matte silver/graphite border
            borderRadius: '8px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset 0 4px 24px rgba(0, 0, 0, 0.9), 0 4px 20px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {/* Glass glare effect for depth */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
              pointerEvents: 'none',
              zIndex: 3,
            }}
          />

          {/* Liquid Fill column */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${fillProgress}%`,
              background: 'linear-gradient(to top, #141416 0%, #2A2A2E 45%, #4C4C54 75%, #63636B 95%)',
              transition: 'height 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
              zIndex: 1,
            }}
          >
            {/* Active Cyan Fill Indicator Line (top border of liquid) */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: '#00B8D9',
                boxShadow: '0 0 8px rgba(0, 184, 217, 0.4)',
                zIndex: 4,
              }}
            />

            {/* Subtle slow waves */}
            <svg
              viewBox="0 0 120 12"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                top: '-7px',
                left: 0,
                width: '200%',
                height: '8px',
                fill: 'rgba(0, 184, 217, 0.15)',
                animation: 'wave-move-back 24s linear infinite',
                zIndex: 2,
              }}
            >
              <path d="M 0 6 Q 30 4, 60 6 T 120 6 T 180 6 T 240 6 L 240 12 L 0 12 Z" />
            </svg>
            <svg
              viewBox="0 0 120 12"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                top: '-5px',
                left: 0,
                width: '200%',
                height: '6px',
                fill: 'rgba(0, 184, 217, 0.35)',
                animation: 'wave-move-front 16s linear infinite',
                zIndex: 3,
              }}
            >
              <path d="M 0 6 Q 30 5, 60 6 T 120 6 T 180 6 T 240 6 L 240 12 L 0 12 Z" />
            </svg>
          </div>

          {/* Silver Measurement Scale ticks & labels */}
          <div
            style={{
              position: 'absolute',
              right: '16px',
              top: '24px',
              bottom: '24px',
              width: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              zIndex: 4,
              pointerEvents: 'none',
            }}
          >
            {[100, 75, 50, 25, 0].map((tick) => (
              <div
                key={tick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '9px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.3)',
                }}
              >
                <span>{tick}</span>
                <div
                  style={{
                    width: '6px',
                    height: '1px',
                    background: 'rgba(255, 255, 255, 0.2)',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Vertical scale track line */}
          <div
            style={{
              position: 'absolute',
              right: '16px',
              top: '24px',
              bottom: '24px',
              width: '1px',
              background: 'rgba(255, 255, 255, 0.08)',
              zIndex: 3,
            }}
          />

          {/* Central Score and Label Text Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 5,
              pointerEvents: 'none',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.45)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              Safety Index
            </span>
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: '96px',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1,
                letterSpacing: '-0.02em',
                margin: '8px 0',
                textShadow: '0 4px 16px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)',
              }}
            >
              {siteSafetyScore}
            </span>
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: '12px',
                fontWeight: 700,
                color: siteSafetyScore >= 85 ? '#22C55E' : '#EF4444',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textShadow: '0 2px 8px rgba(0,0,0,0.9)',
                background: 'rgba(0, 0, 0, 0.45)',
                padding: '4px 12px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: siteSafetyScore >= 85 ? '#22C55E' : '#EF4444',
                  display: 'inline-block',
                }}
              />
              {safetyLabel}
            </div>
          </div>
        </div>

        {/* Tabular Metadata Parameters */}
        <div
          style={{
            width: '100%',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {[
            { label: 'AI Confidence', value: '99.2%', color: '#E5E7EB' },
            { 
              label: 'Last Incident', 
              value: alertIncidents.length > 0 
                ? new Date(alertIncidents[0].timestamp).toLocaleTimeString() 
                : 'None (Nominal)', 
              color: alertIncidents.length > 0 ? '#EF4444' : '#22C55E' 
            },
            { label: 'Safety Trend (24h)', value: '+1.4% (Nominal)', color: '#22C55E' },
            { label: 'Current Shift', value: 'Morning Shift A', color: '#E5E7EB' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: "'Poppins', sans-serif" }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>{label}</span>
              <span style={{ color, fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: KPI Hierarchy Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>

        {/* Row 1: Largest Card — Estimated Risk Cost Avoided */}
        <div
          className="hud-panel"
          style={{
            background: '#161616',
            border: '1px solid rgba(255, 255, 255, 0.045)',
            borderRadius: '6px',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.045)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.35)';
          }}
        >
          <div>
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', fontWeight: 500, color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.06em', marginBottom: '6px', textTransform: 'uppercase' }}>
              Estimated Risk Cost Avoided
            </div>
            <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '40px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              <AnimatedCounter value={costAvoided} isCurrency={true} />
            </div>
            <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '11px', color: '#22C55E', fontWeight: 500, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>↑ 18% improvement from previous shift</span>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '50%',
              width: '52px',
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#00B8D9',
            }}
          >
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Row 2: Medium Cards — Incidents Prevented & Incidents Prevented */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <MetricBox
            title="INCIDENTS PREVENTED"
            value={<AnimatedCounter value={shiftSummary.incidentsPrevented} />}
            subtitle="AI interventions active"
            detail={
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ color: '#22C55E', fontWeight: 600 }}>+4 vs previous shift</span>
                <Sparkline />
              </div>
            }
            icon={<ShieldCheck size={20} style={{ color: '#22C55E' }} />}
            size="medium"
          />
          <MetricBox
            title="INCIDENTS PREVENTED"
            value={<AnimatedCounter value={shiftSummary.incidentsPrevented * 2 + 3} />}
            subtitle="Predictive paths averted"
            detail={
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ color: '#22C55E', fontWeight: 600 }}>+2% this week</span>
                <Sparkline />
              </div>
            }
            icon={<Shield size={20} style={{ color: '#00B8D9' }} />}
            size="medium"
          />
        </div>

        {/* Row 3: Smaller Cards — PPE Compliance, Edge AI Latency, Workers Monitored, Network Health */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', flex: 1 }}>
          <MetricBox
            title="PPE COMPLIANCE"
            value={`${ppeComplianceRate}%`}
            subtitle="Gear verified active"
            detail={
              <span style={{ color: '#22C55E', fontWeight: 600 }}>+2% this week</span>
            }
            icon={<UserCheck size={14} style={{ color: '#00B8D9' }} />}
            size="small"
          />
          <MetricBox
            title="EDGE AI LATENCY"
            value="14.2ms"
            subtitle="Camera telemetry delay"
            detail="Within threshold"
            icon={<Clock size={14} style={{ color: '#22C55E' }} />}
            size="small"
          />
          <MetricBox
            title="WORKERS MONITORED"
            value={workers.length > 0 ? workers.length : shiftSummary.activeWorkers}
            subtitle="ID tags registered"
            detail="Active trajectories"
            icon={<UserCheck size={14} style={{ color: 'rgba(255, 255, 255, 0.4)' }} />}
            size="small"
          />
          <MetricBox
            title="SYSTEM HEALTH"
            value="98.7%"
            subtitle="Secure Telemetry Link"
            detail={
              <span style={{ color: '#22C55E', fontWeight: 600 }}>● OPTIMAL</span>
            }
            icon={<Wifi size={14} style={{ color: '#22C55E' }} />}
            size="small"
          />
        </div>

      </div>
    </div>
  );
};

interface MetricBoxProps {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  detail?: React.ReactNode;
  icon: React.ReactNode;
  size: 'medium' | 'small';
  flash?: boolean;
}

const MetricBox: React.FC<MetricBoxProps> = ({ title, value, subtitle, detail, icon, size, flash }) => {
  const isSmall = size === 'small';

  return (
    <div
      className={`hud-panel ${flash ? 'critical-flash-active' : ''}`}
      style={{
        background: '#161616',
        border: '1px solid rgba(255, 255, 255, 0.045)',
        borderRadius: '6px',
        padding: isSmall ? '14px 16px' : '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.45)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.045)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.35)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isSmall ? '2px' : '4px' }}>
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: isSmall ? '8.5px' : '10px', fontWeight: 500, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
            {title}
          </span>
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: isSmall ? '20px' : '28px', fontWeight: 700, color: '#ffffff', lineHeight: 1.1 }}>
            {value}
          </span>
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '4px',
            width: isSmall ? '26px' : '36px',
            height: isSmall ? '26px' : '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      
      {/* Subtitle and Dynamic details below the values */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: isSmall ? '6px' : '12px' }}>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: isSmall ? '8.5px' : '10px', fontWeight: 400, color: 'rgba(255, 255, 255, 0.28)' }}>
          {subtitle}
        </div>
        {detail && (
          <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: isSmall ? '8.5px' : '10px', fontWeight: 400, color: 'rgba(255, 255, 255, 0.45)' }}>
            {detail}
          </div>
        )}
      </div>
    </div>
  );
};
