import React, { useState, useEffect } from 'react';
import { useEventStore } from '../../lib/event-store';
import { Shield, Radio, Volume2, VolumeX, BarChart2, Map, ShieldAlert } from 'lucide-react';

export const CommandOverlay: React.FC = () => {
  const activeView = useEventStore((state) => state.activeView);
  const setView = useEventStore((state) => state.setView);
  const websocketStatus = useEventStore((state) => state.websocketStatus);
  const soundMuted = useEventStore((state) => state.soundMuted);
  const toggleSound = useEventStore((state) => state.toggleSound);
  const siteSafetyScore = useEventStore((state) => state.siteSafetyScore);

  const [timeStr, setTimeStr] = useState('');

  // Clock telemetry
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const formatNumber = (n: number) => String(n).padStart(2, '0');

      const yr = d.getFullYear();
      const mo = formatNumber(d.getMonth() + 1);
      const dy = formatNumber(d.getDate());
      const hr = formatNumber(d.getHours());
      const mn = formatNumber(d.getMinutes());
      const sc = formatNumber(d.getSeconds());

      setTimeStr(`${yr}-${mo}-${dy} | T-SYS: ${hr}:${mn}:${sc}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Web socket indicator styles
  const wsColors = {
    CONNECTED: { color: '#00ff66', glow: '0 0 10px #00ff66', text: 'CONNECTED' },
    RECONNECTING: { color: '#ffaa00', glow: '0 0 10px #ffaa00', text: 'RECONNECTING' },
    OFFLINE: { color: '#ff003c', glow: '0 0 12px #ff003c', text: 'OFFLINE' }
  };

  const wsStyle = wsColors[websocketStatus] || wsColors.OFFLINE;

  return (
    <div
      style={{
        width: '100%',
        background: 'rgba(5, 7, 20, 0.95)',
        borderBottom: '1px solid rgba(0, 243, 255, 0.3)',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 4px 25px rgba(0, 0, 0, 0.7)',
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      {/* Brand & Tagline */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        onClick={() => setView('BOOT')}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #00f3ff 0%, #b026ff 100%)',
            padding: '6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 243, 255, 0.4)',
          }}
        >
          <Shield size={20} style={{ color: '#030307' }} />
        </div>
        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 900,
              letterSpacing: '2px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textShadow: '0 0 10px rgba(0, 243, 255, 0.5)',
            }}
          >
            SURAKSHA AI <span style={{ fontSize: '9px', background: 'rgba(176, 38, 255, 0.25)', border: '1px solid #b026ff', color: '#e2d0ff', padding: '1px 4px', borderRadius: '2px', letterSpacing: '0' }}>PROTOTYPE v2.6</span>
          </div>
          <div
            style={{
              fontSize: '9px',
              color: 'rgba(0, 243, 255, 0.75)',
              letterSpacing: '1px',
              fontWeight: 500,
            }}
          >
            PREDICTIVE SAFETY COMMAND CENTER
          </div>
        </div>
      </div>

      {/* Futuristic Menu Navigation Tabs */}
      {activeView !== 'BOOT' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <NavButton
            active={activeView === 'LIVE'}
            onClick={() => setView('LIVE')}
            icon={<Radio size={13} />}
            label="LIVE OPERATIONS"
          />
          <NavButton
            active={activeView === 'RISK'}
            onClick={() => setView('RISK')}
            icon={<ShieldAlert size={13} />}
            label="AI RISK REACTOR"
          />
          <NavButton
            active={activeView === 'HEATMAP'}
            onClick={() => setView('HEATMAP')}
            icon={<Map size={13} />}
            label="HAZARD HEATMAP"
          />
          <NavButton
            active={activeView === 'EXECUTIVE'}
            onClick={() => setView('EXECUTIVE')}
            icon={<BarChart2 size={13} />}
            label="EXECUTIVE WAR ROOM"
          />
        </div>
      )}

      {/* Telemetry and Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Site Safety Quick Telemetry */}
        {activeView !== 'BOOT' && (
          <div
            style={{
              background: 'rgba(0, 255, 102, 0.05)',
              border: '1px solid rgba(0, 255, 102, 0.2)',
              borderRadius: '4px',
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '9px', color: 'rgba(0,255,102,0.6)' }}>SAFETY SCORE:</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#00ff66', textShadow: '0 0 5px rgba(0,255,102,0.4)' }}>
              {siteSafetyScore}/100
            </span>
          </div>
        )}

        {/* WebSocket Signal Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: wsStyle.color,
              boxShadow: wsStyle.glow,
              animation: websocketStatus === 'RECONNECTING' ? 'ws-blink 0.5s infinite alternate' : 'none',
            }}
          />
          <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.7)', fontWeight: 'bold' }}>
            EDGE:{' '}
            <span style={{ color: wsStyle.color, textShadow: `0 0 5px ${wsStyle.color}44` }}>
              {wsStyle.text}
            </span>
          </div>
        </div>

        {/* System Time and Date */}
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.4)',
            letterSpacing: '0.5px',
            fontFamily: "'Courier New', Courier, monospace",
          }}
        >
          {timeStr}
        </div>

        {/* Audio Mute controller */}
        <button
          onClick={toggleSound}
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: soundMuted ? '#ff003c' : '#00f3ff',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title={soundMuted ? 'Unmute tactical alarms' : 'Mute tactical alarms'}
        >
          {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      <style>{`
        @keyframes ws-blink {
          0% { opacity: 0.3; }
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

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(0, 243, 255, 0.12)' : 'transparent',
        border: active ? '1px solid #00f3ff' : '1px solid transparent',
        color: active ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
        boxShadow: active ? '0 0 10px rgba(0, 243, 255, 0.2)' : 'none',
        borderRadius: '4px',
        padding: '6px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '11px',
        fontWeight: 'bold',
        letterSpacing: '1px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <span style={{ color: active ? '#00f3ff' : 'inherit' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
};
