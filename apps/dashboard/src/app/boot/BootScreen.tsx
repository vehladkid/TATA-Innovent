import React, { useEffect, useState } from 'react';
import { useEventStore } from '../../lib/event-store';
import { VigilEdgeLogo } from '../../components/VigilEdgeLogo';

export const BootScreen: React.FC = () => {
  const setView = useEventStore((state) => state.setView);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [bootFinished, setBootFinished] = useState(false);

  // Cleaner enterprise-grade log sequence (no duplicate entries or visual clutter)
  const logsSequence = [
    { text: 'SYSTEM — Initializing Vigil Edge Runtime', delay: 400 },
    { text: 'MODEL — Loading YOLOv8 Inference Engine', delay: 1200 },
    { text: 'TRACKER — Registering SORT Tracking Layer', delay: 2000 },
    { text: 'EDGE — Connecting Telemetry Pipeline', delay: 2800 },
    { text: 'AI — Risk Engine Synchronization Complete', delay: 3500 },
  ];

  // Synthesize booting sound
  const playBootSound = (percentage: number, finished: boolean) => {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (finished) {
        // High-tech chime sound when loaded
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3); // C6
        
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc2.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.3); // E6

        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      } else {
        // Modulated sine wave drone that climbs in pitch
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110 + percentage * 2.2, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0.02, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      // Audio blocked by browser policy, fail silently
    }
  };

  useEffect(() => {
    // Print terminal logs sequentially
    logsSequence.forEach((log) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, log.text]);
      }, log.delay);
    });

    // Animate progress bar (total duration ~3.6 seconds to match the logs)
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 6) + 2;
        if (next >= 100) {
          clearInterval(interval);
          setBootFinished(true);
          playBootSound(100, true);
          return 100;
        }
        if (Math.random() > 0.45) {
          playBootSound(next, false);
        }
        return next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  // When boot finishes, wait 1.5s then transition to live view
  useEffect(() => {
    if (bootFinished) {
      const timer = setTimeout(() => {
        setView('LIVE');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [bootFinished, setView]);

  // Segmented progress parameters (20 segments total)
  const totalSegments = 20;
  const activeSegments = Math.floor((progress / 100) * totalSegments);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        padding: '20px',
        backgroundColor: '#050505',
      }}
    >
      <div
        style={{
          width: '560px',
          padding: '40px',
          background: '#0F0F10', // Surface color
          border: '1px solid rgba(255, 255, 255, 0.08)', // Thin border
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)', // Depth shadow
        }}
      >
        {/* Unified brand mark logo containing the animated title & subtitle */}
        <div style={{ marginBottom: '32px' }}>
          <VigilEdgeLogo size={115} progress={progress} showText={true} />
        </div>

        {/* Terminal Logs Window - reduced height by ~30% for improved visual hierarchy */}
        <div
          style={{
            width: '100%',
            height: '100px',
            background: '#161616', // Elevated Surface
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '4px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            overflow: 'hidden',
            fontFamily: "'Poppins', sans-serif", // Poppins Regular (Body)
            fontSize: '11px',
            color: '#E5E7EB',
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          {logs.map((log, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#00B8D9' }}>▸</span>
              <span style={{ fontWeight: 400 }}>{log}</span>
            </div>
          ))}
          {!bootFinished && <span className="boot-terminal-cursor">█</span>}
        </div>

        {/* System Nominal Display - Replaced big green headline with subtle operational status */}
        {bootFinished ? (
          <div
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: '11px',
              fontWeight: 500, // Poppins Medium
              color: '#E5E7EB', // Silver Text
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '17px',
              marginBottom: '20px',
              letterSpacing: '0.5px',
            }}
          >
            <span style={{ color: '#22C55E', animation: 'boot-dot-pulse 1.2s infinite alternate', fontSize: '12px' }}>●</span>
            Risk Engine Online
          </div>
        ) : (
          <div style={{ height: '17px', marginBottom: '20px' }} />
        )}

        {/* Progress Bar Container */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: "'Poppins', sans-serif",
              fontSize: '10px',
              color: '#9CA3AF', // Secondary Text
              marginBottom: '6px',
            }}
          >
            <span style={{ fontWeight: 300, letterSpacing: '0.5px' }}>RUNTIME INITIALIZATION</span> {/* Poppins Light */}
            <span style={{ fontFamily: "'Sora', sans-serif", fontWeight: 700, color: '#E5E7EB' }}>{progress}%</span> {/* Sora Bold */}
          </div>
          
          {/* Industrial Segmented Progress Bar */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              gap: '3px',
              background: '#111111', // Matte charcoal track
              border: '1px solid rgba(255, 255, 255, 0.08)', // Thin silver border
              borderRadius: '4px',
              padding: '3px',
            }}
          >
            {Array.from({ length: totalSegments }).map((_, i) => {
              const isActive = i < activeSegments;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '6px',
                    background: isActive ? '#00B8D9' : '#161616', // Cyan progress or elevated surface
                    borderRadius: '1px',
                    transition: 'background-color 0.15s ease',
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes boot-cursor-blink {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }
        .boot-terminal-cursor {
          color: #00B8D9;
          animation: boot-cursor-blink 0.8s infinite;
        }
        @keyframes boot-dot-pulse {
          0% { opacity: 0.35; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
