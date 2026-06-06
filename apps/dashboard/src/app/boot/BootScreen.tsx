import React, { useEffect, useState } from 'react';
import { useEventStore } from '../../lib/event-store';
import { Shield, Cpu, Activity, Server, Radio, Database, CheckCircle2 } from 'lucide-react';

export const BootScreen: React.FC = () => {
  const setView = useEventStore((state) => state.setView);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [bootFinished, setBootFinished] = useState(false);

  const logsSequence = [
    { text: 'SYSTEM: Initializing Suraksha AI bootloader...', delay: 200, icon: <Cpu size={12} /> },
    { text: 'MODELS: Loading Edge YOLOv8 & MediaPipe PoseLandmarkers...', delay: 600, icon: <Server size={12} /> },
    { text: 'TRACKER: Initializing SORT multi-object tracking kernel...', delay: 1100, icon: <Activity size={12} /> },
    { text: 'WEBSOCKET: Connecting to FastAPI telemetry endpoint (port 8000)...', delay: 1700, icon: <Radio size={12} /> },
    { text: 'HAZARD: Compiling factory floor zones polygons database...', delay: 2300, icon: <Database size={12} /> },
    { text: 'PREDICTOR: Calibrating trajectory extrapolation matrix (t + 5.0s)...', delay: 2800, icon: <Shield size={12} /> },
    { text: 'DATA: Fetching active shift logs and incident thresholds...', delay: 3300, icon: <CheckCircle2 size={12} /> },
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

    // Animate progress bar (total duration ~4 seconds)
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 8) + 2;
        if (next >= 100) {
          clearInterval(interval);
          setBootFinished(true);
          playBootSound(100, true);
          return 100;
        }
        if (Math.random() > 0.4) {
          playBootSound(next, false);
        }
        return next;
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  // When boot finishes, wait 1.2s then transition to live view
  useEffect(() => {
    if (bootFinished) {
      const timer = setTimeout(() => {
        setView('LIVE');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [bootFinished, setView]);

  return (
    <div
      className="hud-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        padding: '20px',
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      <div
        className="hud-panel tech-corners shimmer-ai"
        style={{
          width: '640px',
          padding: '40px',
          background: 'rgba(5, 7, 24, 0.9)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: '0 0 50px rgba(0, 243, 255, 0.15)',
        }}
      >
        {/* Animated Cyber Shield Grid */}
        <div
          style={{
            position: 'relative',
            width: '80px',
            height: '80px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Animated concentric rings */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              border: '2px dashed #00f3ff',
              borderRadius: '50%',
              animation: 'reactor-spin-right 10s linear infinite',
              opacity: 0.6,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '75%',
              height: '75%',
              border: '1px dashed #b026ff',
              borderRadius: '50%',
              animation: 'reactor-spin-left 6s linear infinite',
              opacity: 0.4,
            }}
          />
          <Shield
            size={36}
            style={{
              color: '#00f3ff',
              filter: 'drop-shadow(0 0 10px #00f3ff)',
              zIndex: 5,
            }}
          />
        </div>

        {/* Title and tagline */}
        <h1
          style={{
            fontSize: '28px',
            fontWeight: '900',
            letterSpacing: '5px',
            color: '#ffffff',
            textShadow: '0 0 15px rgba(0, 243, 255, 0.6)',
            marginBottom: '4px',
            textAlign: 'center',
          }}
        >
          SURAKSHA AI
        </h1>
        <p
          style={{
            fontSize: '11px',
            letterSpacing: '2px',
            color: 'rgba(0, 243, 255, 0.8)',
            marginBottom: '32px',
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          PREDICTIVE SAFETY COMMAND CENTER
        </p>

        {/* Terminal Logs Window */}
        <div
          style={{
            width: '100%',
            height: '150px',
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(0, 243, 255, 0.1)',
            borderRadius: '4px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflow: 'hidden',
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.85)',
            marginBottom: '30px',
            textAlign: 'left',
          }}
        >
          {logs.map((log, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#00f3ff' }}>▸</span>
              <span>{log}</span>
            </div>
          ))}
          {!bootFinished && <span style={{ animation: 'blink 0.8s infinite', color: '#b026ff' }}>█</span>}
        </div>

        {/* System Nominal Display */}
        {bootFinished ? (
          <div
            style={{
              fontSize: '14px',
              color: '#00ff66',
              fontWeight: 'bold',
              letterSpacing: '2px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              animation: 'hud-pulse 1s ease-in-out infinite alternate',
              marginBottom: '20px',
            }}
          >
            <div>RISK ENGINE ONLINE</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>ALL SYSTEMS NOMINAL. REDIRECTING...</div>
          </div>
        ) : (
          <div style={{ height: '38px', marginBottom: '20px' }} />
        )}

        {/* Progress Bar Container */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '6px',
            }}
          >
            <span>BOOT LOAD SEQUENCE</span>
            <span>{progress}%</span>
          </div>
          
          <div
            style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(0, 243, 255, 0.2)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #00f3ff, #b026ff)',
                boxShadow: '0 0 10px #00f3ff',
                borderRadius: '4px',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
