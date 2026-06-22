import React, { useEffect, useState } from 'react';
import { useEventStore } from '../../lib/event-store';
import { VigilEdgeLogo } from '../../components/VigilEdgeLogo';

const ParticleBackground: React.FC = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    
    // Very sparse, low-opacity executive particles
    const particles: Array<{ x: number; y: number; vx: number; vy: number; r: number; alpha: number }> = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: -Math.random() * 0.12 - 0.04, // extremely slow upward drift
        r: Math.random() * 1.0 + 0.5,
        alpha: Math.random() * 0.07 + 0.02 // barely visible
      });
    }
    
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(90, 205, 217, ${p.alpha})`; // Turquoise dust
        ctx.fill();
        
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10 || p.x > width + 10) {
          p.x = Math.random() * width;
        }
      });
      animationId = requestAnimationFrame(draw);
    };
    
    draw();
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
};

export const BootScreen: React.FC = () => {
  const setView = useEventStore((state) => state.setView);
  
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [bootFinished, setBootFinished] = useState(false);

  // Real industrial edge booting sequence logs
  const logsSequence = [
    { text: 'LOADING SAFETY MODELS ..... ACTIVE', delay: 400 },
    { text: 'SYNCHRONIZING EDGE NODES .. CONNECTED', delay: 1000 },
    { text: 'CALIBRATING SORT TRACKER .. COMPLETE', delay: 1600 },
    { text: 'BUILDING RISK GRAPH ...... ACTIVE', delay: 2200 },
    { text: 'EDGE ENGINE ............. CALIBRATED', delay: 2800 },
    { text: 'PREDICTIVE PIPELINES ... READY', delay: 3400 },
  ];

  // Synthesize booting sound (low volume chime)
  const playBootSound = (percentage: number, finished: boolean) => {
    try {
      // @ts-ignore
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (finished) {
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3);
        
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.3);

        gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      } else {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110 + percentage * 2.2, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0.01, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      // Audio blocked or unsupported
    }
  };

  useEffect(() => {
    logsSequence.forEach((log) => {
      setTimeout(() => {
        setLogs((prev) => [...prev, log.text]);
      }, log.delay);
    });

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 8) + 4;
        if (next >= 100) {
          clearInterval(interval);
          setBootFinished(true);
          playBootSound(100, true);
          return 100;
        }
        if (Math.random() > 0.5) {
          playBootSound(next, false);
        }
        return next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bootFinished) {
      const timer = setTimeout(() => {
        setView('LIVE');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [bootFinished, setView]);

  const totalSegments = 24;
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
        backgroundColor: '#050505', // Charcoal deep app background
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle particle canvas */}
      <ParticleBackground />

      <div
        style={{
          width: '520px',
          padding: '40px 48px',
          background: '#101010', // Charcoal card background
          border: '1px solid #252525', // Border color
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxShadow: 'none',
          zIndex: 1,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Startup sequence dynamic overlays */}
        {progress >= 25 && progress < 55 && <div className="turquoise-scan-line" />}
        {progress >= 55 && progress < 80 && <div className="predictive-blue-pulse" />}
        {progress >= 80 && progress < 95 && <div className="calibration-peachy-flash" />}

        {/* Brand logo & Equinox fonts */}
        <div 
          className="logo-reveal-container" 
          style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
        >
          <VigilEdgeLogo size={80} progress={progress} showText={false} />
          <h1
            style={{
              fontFamily: "var(--font-logo)",
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-silver)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginTop: '16px',
              marginBottom: '2px',
              textAlign: 'center',
              lineHeight: 1.2
            }}
          >
            VIGIL EDGE
          </h1>
          <div
            style={{
              fontFamily: 'var(--font-header)',
              fontSize: '9px',
              fontWeight: 600,
              color: 'var(--color-neutral)',
              letterSpacing: '0.1em',
              textAlign: 'center',
              textTransform: 'uppercase'
            }}
          >
            PREDICTIVE INDUSTRIAL SAFETY OS
          </div>
        </div>

        {/* Terminal Logs Window (IBM Plex Mono font) */}
        <div
          style={{
            width: '100%',
            height: '115px',
            background: '#050505', // Terminal inner
            border: '1px solid #252525',
            borderRadius: '2px',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            overflow: 'hidden',
            fontFamily: "var(--font-metric)", // IBM Plex Mono Font
            fontSize: '11px',
            color: '#EAEAEA',
            marginBottom: '16px',
            textAlign: 'left',
          }}
        >
          {logs.map((log, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                animation: 'log-fade-in 0.3s ease-out forwards',
              }}
            >
              <span style={{ color: '#5ACDD9', opacity: 0.85 }}>▸</span>
              <span style={{ fontWeight: 400, opacity: 0.85 }}>{log}</span>
            </div>
          ))}
          {!bootFinished && <span className="boot-terminal-cursor">█</span>}
        </div>

        {/* Status display */}
        {bootFinished ? (
          <div
            style={{
              fontFamily: "var(--font-metric)", // IBM Plex Mono
              fontSize: '11px',
              fontWeight: 500,
              color: '#EAEAEA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              height: '18px',
              marginBottom: '16px',
              letterSpacing: '0.05em',
            }}
          >
            <span style={{ color: '#3DD9FF', animation: 'boot-dot-pulse 1s infinite alternate', fontSize: '12px' }}>●</span>
            Risk Engine Online
          </div>
        ) : (
          <div style={{ height: '18px', marginBottom: '16px' }} />
        )}

        {/* Progress Bar Container */}
        <div style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontFamily: "var(--font-metric)", // IBM Plex Mono
              fontSize: '10px',
              color: '#9A9A9A',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontWeight: 400, letterSpacing: '0.05em' }}>RUNTIME INITIALIZATION</span>
            <span style={{ fontFamily: "var(--font-metric)", fontWeight: 700, color: '#EAEAEA' }}>{progress}%</span>
          </div>
          
          {/* Segmented Progress Bar */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              gap: '2px',
              background: '#050505',
              border: '1px solid #252525',
              borderRadius: '2px',
              padding: '2px',
            }}
          >
            {Array.from({ length: totalSegments }).map((_, i) => {
              const isActive = i < activeSegments;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: '4px',
                    background: isActive ? '#3DD9FF' : '#1A1A1A',
                    borderRadius: '1px',
                    transition: 'background-color 0.1s ease',
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
          color: #5ACDD9;
          animation: boot-cursor-blink 0.8s infinite;
        }
        @keyframes boot-dot-pulse {
          0% { opacity: 0.35; }
          100% { opacity: 1; }
        }
        @keyframes logo-reveal {
          0% {
            opacity: 0;
            transform: scale(0.92) rotate(-3deg);
            filter: blur(5px);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
            filter: blur(0px);
          }
        }
        .logo-reveal-container {
          animation: logo-reveal 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes scan-line-anim {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .turquoise-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #5ACDD9, transparent);
          box-shadow: 0 0 8px rgba(90, 205, 217, 0.6), 0 0 15px rgba(90, 205, 217, 0.3);
          animation: scan-line-anim 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          pointer-events: none;
          z-index: 10;
        }
        @keyframes predictive-blue-pulse-anim {
          0% {
            border-color: rgba(62, 106, 224, 0.2);
            box-shadow: inset 0 0 8px rgba(62, 106, 224, 0.05);
          }
          100% {
            border-color: rgba(62, 106, 224, 0.85);
            box-shadow: inset 0 0 20px rgba(62, 106, 224, 0.2);
          }
        }
        .predictive-blue-pulse {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(62, 106, 224, 0.5);
          border-radius: 2px;
          animation: predictive-blue-pulse-anim 0.8s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 5;
        }
        @keyframes calibration-peachy-flash-anim {
          0% {
            border-color: rgba(255, 115, 96, 0.25);
            background: rgba(255, 115, 96, 0.01);
            box-shadow: inset 0 0 10px rgba(255, 115, 96, 0.04);
          }
          100% {
            border-color: rgba(255, 115, 96, 0.9);
            background: rgba(255, 115, 96, 0.03);
            box-shadow: inset 0 0 30px rgba(255, 115, 96, 0.25);
          }
        }
        .calibration-peachy-flash {
          position: absolute;
          inset: 0;
          border: 1.5px solid rgba(255, 115, 96, 0.7);
          border-radius: 2px;
          animation: calibration-peachy-flash-anim 0.25s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: 6;
        }
        @keyframes log-fade-in {
          0% {
            opacity: 0;
            transform: translateX(-6px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
