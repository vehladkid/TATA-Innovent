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
        background: '#0D0D0D', // Matte-black secondary surface
        borderBottom: '1px solid #252525', // Border color
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
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        onClick={() => setView('BOOT')}
      >
        <VigilEdgeLogo size={36} staticMode={true} />
        <div>
          <div
            style={{
              fontFamily: "var(--font-logo)",
              fontSize: '17.5px',
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--color-silver)',
              lineHeight: 1.05,
            }}
          >
            VIGIL EDGE
          </div>
          <div
            style={{
              fontFamily: "var(--font-header)",
              fontSize: '8px',
              fontWeight: 600,
              color: 'var(--color-neutral)',
              letterSpacing: '0.1em',
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
            <span style={{ fontFamily: "var(--font-label)", fontSize: '10px', color: '#9A9A9A', fontWeight: 500, letterSpacing: '0.05em' }}>
              SAFETY INDEX
            </span>
            <span style={{ fontFamily: "var(--font-metric)", fontSize: '14px', fontWeight: 700, color: '#EAEAEA' }}>
              {siteSafetyScore}
            </span>
          </div>
        )}

        {/* System status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            className="active-indicator-pulse"
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#3DD9FF', // Nominal Cyan
            }}
          />
          <span style={{ fontFamily: "var(--font-label)", fontSize: '9.5px', color: '#9A9A9A', fontWeight: 500, letterSpacing: '0.05em' }}>
            SYSTEM: <span style={{ color: '#3DD9FF', fontWeight: 600 }}>ONLINE</span>
          </span>
        </div>

        {/* Clock - secondary and smaller */}
        <span
          style={{
            fontFamily: "var(--font-body)",
            fontSize: '9.5px',
            fontWeight: 400,
            color: '#9A9A9A',
            opacity: 0.8,
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
            border: '1px solid #252525',
            borderRadius: '3px',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: soundMuted ? '#FF5C5C' : '#9A9A9A', // Critical red for mute warning
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={soundMuted ? 'Unmute alarms' : 'Mute alarms'}
        >
          {soundMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
        </button>
      </div>
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
      background: active ? '#101010' : 'transparent',
      border: 'none',
      borderBottom: active ? '2px solid #3DD9FF' : '2px solid transparent',
      borderTop: '2px solid transparent',
      color: active ? '#EAEAEA' : '#9A9A9A',
      borderRadius: 0,
      padding: '0 14px',
      height: '52px',
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      fontFamily: "var(--font-header)", // Osiris
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '-0.03em',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      whiteSpace: 'nowrap',
      boxShadow: active ? '0 1px 6px rgba(61, 217, 255, 0.15)' : 'none',
    }}
    onMouseEnter={(e) => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.color = '#EAEAEA';
        (e.currentTarget as HTMLButtonElement).style.background = '#151515';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.color = '#9A9A9A';
        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
      }
    }}
  >
    <span style={{ color: active ? '#3DD9FF' : '#9A9A9A' }}>{icon}</span>
    <span>{label}</span>
  </button>
);
