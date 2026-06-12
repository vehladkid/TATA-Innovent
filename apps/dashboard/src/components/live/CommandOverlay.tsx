import React, { useState, useEffect } from 'react';
import { useEventStore } from '../../lib/event-store';
import { Radio, Volume2, VolumeX, BarChart2, Map, ShieldAlert } from 'lucide-react';
import { VigilEdgeLogo } from '../VigilEdgeLogo';

export const CommandOverlay: React.FC = () => {
  const activeView = useEventStore((state) => state.activeView);
  const setView = useEventStore((state) => state.setView);
  const soundMuted = useEventStore((state) => state.soundMuted);
  const toggleSound = useEventStore((state) => state.toggleSound);
  const siteSafetyScore = useEventStore((state) => state.siteSafetyScore);

  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      setTimeStr(`${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} IST`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);



  return (
    <div
      style={{
        width: '100%',
        background: '#0D0D0D',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        padding: '0 20px',
        height: '52px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
        onClick={() => setView('BOOT')}
      >
        <VigilEdgeLogo size={35} />
        <div>
          <div
            style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            VIGIL EDGE
          </div>
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: '9px',
              fontWeight: 500,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.08em',
              marginTop: '2px',
            }}
          >
            PREDICTIVE INDUSTRIAL SAFETY OS
          </div>
        </div>
      </div>

      {/* Navigation */}
      {activeView !== 'BOOT' && (
        <div style={{ display: 'flex', gap: '4px' }}>
          <NavButton active={activeView === 'LIVE'}      onClick={() => setView('LIVE')}      icon={<Radio size={13} />}       label="Live Ops"       />
          <NavButton active={activeView === 'RISK'}      onClick={() => setView('RISK')}      icon={<ShieldAlert size={13} />} label="Risk Reactor"   />
          <NavButton active={activeView === 'HEATMAP'}   onClick={() => setView('HEATMAP')}   icon={<Map size={13} />}         label="Hazard Heatmap" />
          <NavButton active={activeView === 'EXECUTIVE'} onClick={() => setView('EXECUTIVE')} icon={<BarChart2 size={13} />}   label="Executive View" />
        </div>
      )}

      {/* Right telemetry strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        {/* Safety score */}
        {activeView !== 'BOOT' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              padding: '4px 0',
            }}
          >
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.05em' }}>
              SAFETY INDEX
            </span>
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
              {siteSafetyScore}
            </span>
          </div>
        )}

        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#22C55E',
            }}
          />
          <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500, letterSpacing: '0.05em' }}>
            SYSTEM STATUS: <span style={{ color: '#22C55E', fontWeight: 600 }}>ONLINE</span>
          </span>
        </div>

        {/* Clock - secondary and smaller */}
        <span
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: '9.5px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.22)',
            letterSpacing: '0.04em',
          }}
        >
          {timeStr}
        </span>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '4px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: soundMuted ? '#EF4444' : 'rgba(255,255,255,0.35)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={soundMuted ? 'Unmute alarms' : 'Mute alarms'}
        >
          {soundMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </div>

      <style>{`
        @keyframes ws-blink {
          0%   { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? 'rgba(0, 184, 217, 0.08)' : 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #00B8D9' : '2px solid transparent',
      borderTop: '2px solid transparent',
      color: active ? '#ffffff' : 'rgba(255,255,255,0.45)',
      borderRadius: 0,
      padding: '0 14px',
      height: '52px',
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      fontFamily: "'Poppins', sans-serif",
      fontSize: '12px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={(e) => {
      if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.75)';
    }}
    onMouseLeave={(e) => {
      if (!active) (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.45)';
    }}
  >
    <span style={{ color: active ? '#00B8D9' : 'inherit' }}>{icon}</span>
    <span>{label}</span>
  </button>
);
