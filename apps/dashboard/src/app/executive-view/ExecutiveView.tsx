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
const Sparkline: React.FC<{ data: number[]; color?: string; width?: number; height?: number }> = ({ 
  data, 
  color = '#5ACDD9', 
  width = 80, 
  height = 16 
}) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'inline-block', verticalAlign: 'middle', overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

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

  const isSafeState = siteSafetyScore >= 85;
  const safetyLabel = isSafeState ? 'SECURE' : 'ELEVATED RISK';
  const alertIncidents = recentEvents.filter(e => e.band !== 'safe');

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '30% 70%',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden',
        height: '100%',
        background: 'var(--color-bg-deep)',
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

      {/* Left Column: Full-height Safety Reservoir */}
      <div
        className="hud-panel"
        style={{
          background: '#090a0c',
          border: '1px solid var(--border-color)',
          borderRadius: '2px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* Charcoal Gradient fluid with surface line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: `${fillProgress}%`,
            background: 'linear-gradient(to top, #0A1112 0%, #090909 100%)',
            transition: 'height 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 1,
          }}
        >
          {/* Soft reflective shimmer */}
          <div
            style={{
              position: 'absolute',
              top: '-8px',
              left: 0,
              right: 0,
              height: '16px',
              background: 'radial-gradient(ellipse at center, rgba(90, 205, 217, 0.05) 0%, rgba(90, 205, 217, 0.01) 60%, transparent 100%)',
              zIndex: 3,
              pointerEvents: 'none',
              filter: 'blur(2.0px)',
            }}
          />

          {/* Waves */}
          <svg
            viewBox="0 0 120 12"
            preserveAspectRatio="none"
            style={{
              position: 'absolute',
              top: '-7px',
              left: 0,
              width: '200%',
              height: '8px',
              fill: 'rgba(90, 205, 217, 0.01)',
              animation: 'wave-move-back 12s linear infinite',
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
              fill: 'rgba(90, 205, 217, 0.015)',
              animation: 'wave-move-front 10s linear infinite',
              zIndex: 3,
            }}
          >
            <path d="M 0 6 Q 30 5, 60 6 T 120 6 T 180 6 T 240 6 L 240 12 L 0 12 Z" />
          </svg>
        </div>

        {/* Subdued scale ticks overlay */}
        <div
          style={{
            position: 'absolute',
            left: '16px',
            top: '24px',
            bottom: '80px',
            width: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
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
                gap: '5px',
                fontFamily: "var(--font-label)", // Bierika
                fontSize: '9px',
                color: 'rgba(216, 216, 216, 0.11)',
              }}
            >
              <div style={{ width: '4px', height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
              <span>{tick}</span>
            </div>
          ))}
        </div>

        {/* Specular Glare overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0%, rgba(255, 255, 255, 0) 50%, rgba(0, 0, 0, 0.1) 100%)',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />

        {/* Centered card (Equinox and Osiris) */}
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: isSafeState
              ? 'radial-gradient(ellipse at center, rgba(90, 205, 217, 0.07) 0%, rgba(90, 205, 217, 0.01) 55%, transparent 75%)'
              : 'radial-gradient(ellipse at center, rgba(255, 115, 96, 0.07) 0%, rgba(255, 115, 96, 0.01) 55%, transparent 75%)',
            borderRadius: '2px',
            padding: '24px 28px',
            textAlign: 'center',
            zIndex: 5,
            pointerEvents: 'none',
            width: '82%',
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)", // Sora
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-silver)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Safety Index
          </span>
          <span
            style={{
              display: 'block',
              fontFamily: "var(--font-body)", // Sora
              fontSize: '84px',
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1,
              margin: '6px 0',
              letterSpacing: '-1px',
              textShadow: isSafeState
                ? '0 0 25px rgba(90, 205, 217, 0.15)'
                : '0 0 25px rgba(255, 115, 96, 0.15)',
            }}
          >
            {siteSafetyScore}
          </span>
          <div
            style={{
              fontFamily: "var(--font-label)", // Bierika
              fontSize: '11px',
              fontWeight: 700,
              color: isSafeState ? '#00D084' : '#FF5A45',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: isSafeState ? '#00D084' : '#FF5A45',
                display: 'inline-block',
              }}
            />
            {safetyLabel}
          </div>
        </div>

        {/* Translucent bottom parameters */}
        <div
          style={{
            background: 'rgba(5, 5, 5, 0.85)',
            borderTop: '1px solid var(--border-color)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backdropFilter: 'blur(12px)',
            zIndex: 5,
          }}
        >
          {[
            { label: 'Inference Confidence', value: '99.2%', color: 'var(--color-silver)' },
            { 
              label: 'Last Logged Trigger', 
              value: alertIncidents.length > 0 
                ? new Date(alertIncidents[0].timestamp).toLocaleTimeString() 
                : 'None (Nominal)', 
              color: alertIncidents.length > 0 ? '#FF5A45' : '#5ACDD9' 
            },
            { label: 'Uptime SLA Metrics', value: '+1.4% (Nominal)', color: '#5ACDD9' },
            { label: 'Calibration Shift', value: 'Morning Shift A', color: 'var(--color-silver)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: "var(--font-label)" }}>
              <span style={{ color: 'var(--color-neutral)' }}>{label}</span>
              <span style={{ color, fontFamily: "var(--font-metric)", fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: KPI Dashboard Grid */}
      <div style={{ display: 'grid', gridTemplateRows: '1fr 1.3fr 1.1fr', gap: '16px', height: '100%', minHeight: 0 }}>

        {/* Row 1: Hero Card — Estimated Risk Cost Avoided */}
        <div
          className="hud-panel"
          style={{
            background: 'linear-gradient(135deg, rgba(90, 205, 217, 0.05), transparent 60%), var(--color-bg-card)',
            border: '1px solid var(--border-color)',
            borderTop: '2px solid #3E6AE0',
            borderRadius: '2px',
            padding: '32px 36px', // Increased padding for prominent centerpiece
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: '11px', fontWeight: 600, color: 'var(--color-neutral)', letterSpacing: '0.06em', marginBottom: '6px', textTransform: 'uppercase' }}>
              Estimated Risk Cost Avoided
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: '42px', fontWeight: 700, color: 'var(--color-silver)', letterSpacing: '-1px', lineHeight: 1.1 }}>
              <AnimatedCounter value={costAvoided} isCurrency={true} />
            </div>
            
            {/* Callouts and labels */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: '11px', color: '#00D084', fontWeight: 500 }}>
                ↑ 18% vs prev shift
              </span>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <span style={{ fontFamily: "var(--font-label)", fontSize: '10px', color: 'var(--color-neutral)' }}>
                SLA Compliance: 100%
              </span>
              <span style={{ color: 'var(--border-color)' }}>|</span>
              <span style={{ fontFamily: "var(--font-label)", fontSize: '10px', color: 'var(--color-neutral)' }}>
                Ref Rate: 1.2s
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <div
              style={{
                background: '#000000',
                border: '1px solid var(--border-color)',
                borderRadius: '2px',
                width: '44px',
                height: '44px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5ACDD9',
              }}
            >
              <TrendingUp size={18} />
            </div>
            {/* Tiny Trend Sparkline inside Hero card */}
            <div style={{ paddingRight: '4px' }}>
              <Sparkline data={[210, 215, 220, 218, 224, 230, 235, 240]} color="#3E6AE0" width={80} height={14} />
            </div>
          </div>
        </div>

        {/* Row 2: Medium Cards — Incidents Prevented & Risk Paths Averted */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <MetricBox
            title="INCIDENTS PREVENTED"
            value={<AnimatedCounter value={shiftSummary.incidentsPrevented} />}
            subtitle="Active AI safety interventions"
            detail={
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ color: '#00D084', fontWeight: 600 }}>+4 vs prev shift</span>
                <Sparkline data={[2, 3, 5, 4, 6, 7, 9]} color="#3E6AE0" />
              </div>
            }
            extraInfo="Target Threshold: 0 incidents"
            icon={<ShieldCheck size={16} style={{ color: '#5ACDD9' }} />}
            size="medium"
            borderTopColor="#FF7360"
            backgroundGradient="linear-gradient(135deg, rgba(62, 106, 224, 0.05), transparent 60%)"
          />
          <MetricBox
            title="PREDICTIVE PATHS AVERTED"
            value={<AnimatedCounter value={shiftSummary.incidentsPrevented * 2 + 3} />}
            subtitle="Collisions & breaches avoided"
            detail={
              <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: '2px' }}>
                <span style={{ color: '#5ACDD9', fontWeight: 600 }}>+12% tracking accuracy</span>
                <Sparkline data={[10, 12, 14, 13, 17, 18, 21]} color="#3E6AE0" />
              </div>
            }
            extraInfo="Risk avoidance SLA: 99.9%"
            icon={<Shield size={16} style={{ color: '#5ACDD9' }} />}
            size="medium"
            borderTopColor="#5ACDD9"
            backgroundGradient="linear-gradient(135deg, rgba(90, 205, 217, 0.03), transparent 60%)"
          />
        </div>
 
        {/* Row 3: Smaller Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          <MetricBox
            title="PPE COMPLIANCE"
            value={`${ppeComplianceRate}%`}
            subtitle="SLA Target: 98%"
            detail={
              <span style={{ color: '#00D084', fontWeight: 600 }}>● OPTIMAL (98.2%)</span>
            }
            extraInfo="Vision Model: v8.2"
            icon={<UserCheck size={12} style={{ color: '#5ACDD9' }} />}
            size="small"
            borderTopColor="#5ACDD9"
            backgroundGradient="linear-gradient(135deg, rgba(90, 205, 217, 0.03), transparent 60%)"
          />
          <MetricBox
            title="EDGE AI LATENCY"
            value="14.2ms"
            subtitle="SLA Threshold: 30ms"
            detail="System Nominal"
            extraInfo="SORT Tracker Link"
            icon={<Clock size={12} style={{ color: '#5ACDD9' }} />}
            size="small"
            borderTopColor="#3E6AE0"
            backgroundGradient="linear-gradient(135deg, rgba(62, 106, 224, 0.03), transparent 60%)"
          />
          <MetricBox
            title="WORKERS TRACKED"
            value={workers.length > 0 ? workers.length : shiftSummary.activeWorkers}
            subtitle="ID tags active"
            detail="Uptime: 100%"
            extraInfo="Tx Rate: 4.8 Mb/s"
            icon={<UserCheck size={12} style={{ color: 'var(--color-silver)' }} />}
            size="small"
            borderTopColor="#5ACDD9"
            backgroundGradient="linear-gradient(135deg, rgba(90, 205, 217, 0.03), transparent 60%)"
          />
          <MetricBox
            title="SYSTEM STATUS"
            value="99.9%"
            subtitle="Calibrated Link"
            detail={
              <span style={{ color: '#00D084', fontWeight: 600 }}>● ONLINE</span>
            }
            extraInfo="ScyllaDB stable"
            icon={<Wifi size={12} style={{ color: '#5ACDD9' }} />}
            size="small"
            borderTopColor="#3E6AE0"
            backgroundGradient="linear-gradient(135deg, rgba(62, 106, 224, 0.03), transparent 60%)"
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
  extraInfo?: string;
  icon: React.ReactNode;
  size: 'medium' | 'small';
  flash?: boolean;
  borderTopColor?: string;
  backgroundGradient?: string;
}

const MetricBox: React.FC<MetricBoxProps> = ({ 
  title, 
  value, 
  subtitle, 
  detail, 
  extraInfo, 
  icon, 
  size, 
  flash,
  borderTopColor,
  backgroundGradient
}) => {
  const isSmall = size === 'small';

  return (
    <div
      className={`hud-panel ${flash ? 'critical-flash-active' : ''}`}
      style={{
        background: backgroundGradient
          ? `${backgroundGradient}, var(--color-bg-card)`
          : 'var(--color-bg-card)',
        border: '1px solid var(--border-color)',
        borderTop: borderTopColor ? `2px solid ${borderTopColor}` : '1px solid var(--border-color)',
        borderRadius: '2px',
        padding: isSmall ? '16px' : '22px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: isSmall ? '2px' : '4px' }}>
          <span style={{ fontFamily: "var(--font-body)", fontSize: isSmall ? '9px' : '10.5px', fontWeight: 600, color: 'var(--color-silver)', letterSpacing: '0.06em' }}>
            {title}
          </span>
          <span style={{ 
            fontFamily: isSmall ? "var(--font-metric)" : "var(--font-body)", 
            fontSize: isSmall ? '22px' : '33px', 
            fontWeight: 700, 
            color: 'var(--color-silver)', 
            lineHeight: 1.1,
            letterSpacing: isSmall ? 'normal' : '-1px'
          }}>
            {value}
          </span>
        </div>
        <div
          style={{
            background: '#000000',
            borderRadius: '2px',
            width: isSmall ? '24px' : '32px',
            height: isSmall ? '24px' : '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      
      {/* Subtitles and information overlays */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: isSmall ? '8px' : '14px' }}>
        <div style={{ fontFamily: "var(--font-label)", fontSize: isSmall ? '9px' : '10px', color: 'var(--color-neutral)', opacity: 0.8 }}>
          {subtitle}
        </div>
        {detail && (
          <div style={{ fontFamily: "var(--font-label)", fontSize: isSmall ? '9px' : '10px', color: 'var(--color-silver)' }}>
            {detail}
          </div>
        )}
        {extraInfo && (
          <div style={{ fontFamily: "var(--font-label)", fontSize: isSmall ? '8px' : '9px', color: 'var(--color-neutral)', opacity: 0.5, marginTop: '2px' }}>
            {extraInfo}
          </div>
        )}
      </div>
    </div>
  );
};
