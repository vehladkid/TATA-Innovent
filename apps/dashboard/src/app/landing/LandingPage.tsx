import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Shield,
  ShieldCheck,
  Zap,
  Video,
  EyeOff,
  Smartphone,
  BarChart3,
  Radio,
  ChevronDown,
} from 'lucide-react';
import { useEventStore } from '../../lib/event-store';

// ─────────────────────────────────────────────
// Inline styles (no Tailwind — pure CSS-in-JSX)
// so they don't collide with any global HUD CSS
// ─────────────────────────────────────────────

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,400&display=swap');

  .lp-root {
    font-family: 'Inter', sans-serif;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .lp-root *, .lp-root *::before, .lp-root *::after {
    box-sizing: border-box;
  }

  /* ── Keyframes ── */
  @keyframes lp-bounce {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(10px); }
  }
  @keyframes lp-pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes lp-fade-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-slide-in-right {
    from { opacity: 0; transform: translateX(30px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  .lp-fade-up   { animation: lp-fade-up 0.7s ease both; }
  .lp-fade-up-2 { animation: lp-fade-up 0.7s 0.15s ease both; }
  .lp-fade-up-3 { animation: lp-fade-up 0.7s 0.3s ease both; }

  .lp-scroll-chevron { animation: lp-bounce 2s ease-in-out infinite; }
  .lp-pulse-radio    { animation: lp-pulse-dot 1.4s ease-in-out infinite; }

  /* ── Nav button ── */
  .lp-cta-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #ea580c;
    color: #ffffff;
    font-weight: 700;
    font-size: 14px;
    padding: 10px 20px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(234, 88, 12, 0.35);
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    text-decoration: none;
  }
  .lp-cta-btn:hover {
    background: #f97316;
    transform: translateY(-1px);
    box-shadow: 0 12px 32px rgba(234, 88, 12, 0.45);
  }
  .lp-cta-btn .lp-arrow {
    transition: transform 0.2s;
  }
  .lp-cta-btn:hover .lp-arrow {
    transform: translateX(3px);
  }

  /* ── Ghost button ── */
  .lp-ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255,255,255,0.10);
    color: #ffffff;
    font-weight: 600;
    font-size: 14px;
    padding: 10px 20px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.20);
    cursor: pointer;
    backdrop-filter: blur(8px);
    text-decoration: none;
    transition: background 0.2s;
  }
  .lp-ghost-btn:hover {
    background: rgba(255,255,255,0.18);
  }

  /* ── Deploy white btn ── */
  .lp-deploy-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #fff;
    color: #111;
    font-weight: 700;
    font-size: 15px;
    padding: 13px 30px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    text-decoration: none;
    transition: background 0.15s, transform 0.15s;
  }
  .lp-deploy-btn:hover {
    background: #f5f5f5;
    transform: translateY(-1px);
  }

  /* ── Card hover ── */
  .lp-card-hover {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .lp-card-hover:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important;
  }

  /* ── Orange highlighted card border ── */
  .lp-orange-card {
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .lp-orange-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(234, 88, 12, 0.18) !important;
  }

  /* ── Scrollbar for landing section ── */
  .lp-root::-webkit-scrollbar { width: 5px; }
  .lp-root::-webkit-scrollbar-track { background: #f1f1f1; }
  .lp-root::-webkit-scrollbar-thumb { background: #e2e2e2; border-radius: 4px; }

  /* ── Infinite marquee ── */
  @keyframes lp-marquee {
    0%   { transform: translateX(-50%); }
    100% { transform: translateX(0); }
  }
  .lp-marquee-track {
    animation: lp-marquee 32s linear infinite;
    will-change: transform;
  }

  /* ── VS Badge ── */
  .lp-vs-badge {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #38bdf8, #0ea5e9);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4);
    border: 4px solid #fafafa;
    z-index: 10;
  }
  @media (max-width: 768px) {
    .lp-vs-badge {
      display: none;
    }
  }

  /* ── Section 5 Sticky Scroll ── */
  .lp-steps-container {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 48px;
    align-items: flex-start;
  }
  .lp-step-graphic-container {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
    transition: opacity 0.4s ease-out, transform 0.4s ease-out;
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .lp-step-graphic-container.active {
    opacity: 1;
    transform: scale(1) translateY(0);
    position: relative;
    pointer-events: auto;
  }
  .lp-sticky-graphic-col {
    position: sticky;
    top: 150px;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  @media (max-width: 900px) {
    .lp-steps-container {
      grid-template-columns: 1fr;
      gap: 32px;
    }
    .lp-sticky-graphic-col {
      display: none;
    }
  }

  @keyframes lp-rec-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.1; }
  }
  .lp-rec-blink {
    animation: lp-rec-blink 1.2s infinite;
  }

  @keyframes lp-laser-sweep {
    0%, 100% { transform: translateY(0); opacity: 0.3; }
    50% { transform: translateY(114px); opacity: 0.9; }
  }
  .lp-laser {
    animation: lp-laser-sweep 3s ease-in-out infinite;
    filter: drop-shadow(0 0 3px rgba(34,197,94,0.8));
  }
`;

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export const LandingPage: React.FC = () => {
  const setView = useEventStore((state) => state.setView);
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const tiltX = (y - 0.5) * 20; 
    const tiltY = (0.5 - x) * 20;
    setTilt({ x: tiltX, y: tiltY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Inject fonts/keyframes once
  useEffect(() => {
    const id = 'lp-global-styles';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = fonts;
      document.head.appendChild(tag);
    }
  }, []);

  // Track active step scrolling in Section 5
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute('data-step-index'));
            if (!isNaN(index)) {
              setActiveStep(index);
            }
          }
        });
      },
      {
        root: rootRef.current,
        rootMargin: '-30% 0px -45% 0px',
        threshold: 0.1,
      }
    );

    stepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleGoToDashboard = () => setView('BOOT');

  // ── Section data ──────────────────────────────
  const features = [
    {
      icon: <Video size={22} color="#ea580c" />,
      title: 'Heinrich Pyramid Tracking',
      desc: 'Logs split-second near-miss instances (like minor boundary entries) that normally vanish without structural records.',
    },
    {
      icon: <EyeOff size={22} color="#ea580c" />,
      title: 'Immutable Edge Privacy',
      desc: 'Faces are automatically blurred directly inside the local browser stream before any data packets are synchronized or logged.',
    },
    {
      icon: <BarChart3 size={22} color="#ea580c" />,
      title: 'Cost-of-Risk Analytics',
      desc: 'Translates real-time hazard preventions directly into financial metrics to verify absolute corporate safety ROI.',
    },
    {
      icon: <Zap size={22} color="#ea580c" />,
      title: 'Zero-Latency Edge Inference',
      desc: 'All model inference runs locally inside the browser — sub-50ms reaction cycles with no cloud round-trip overhead.',
    },
    {
      icon: <Radio size={22} color="#ea580c" />,
      title: 'Multi-Lingual Voice Alerts',
      desc: 'Delivers spoken warnings in Hindi, Marathi, Tamil and English natively using the Web Speech API — no external TTS.',
    },
    {
      icon: <ShieldCheck size={22} color="#ea580c" />,
      title: 'Predictive Zone Breach',
      desc: 'Trajectory extrapolation flags workers heading toward hazardous zones up to 5 seconds before physical entry.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Position & Mount',
      desc: 'Mount any active smartphone, tablet, or web-enabled camera directly facing a high-risk operational zone.',
    },
    {
      num: '02',
      title: 'Execute URL Launch',
      desc: 'Open the dedicated browser target link. The terminal immediately turns the system camera into an active vision interface.',
    },
    {
      num: '03',
      title: 'Audio Intervention',
      desc: 'The terminal delivers direct speaker warnings natively in local languages if personnel breach physical parameters.',
    },
    {
      num: '04',
      title: 'Centralized Metric Sync',
      desc: 'Critical telemetry logs synchronize effortlessly to centralized supervisor dashboards and real-time messaging layers.',
    },
  ];

  const renderStepGraphic = (stepIdx: number) => {
    const borderCol = '#ebebeb';
    
    switch (stepIdx) {
      case 0: // Position & Mount (3D Perspective Smartphone Mockup)
        return (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            borderRadius: '16px',
            border: `1px solid ${borderCol}`,
            overflow: 'hidden',
            perspective: '1200px',
          }}>
            {/* Grid background */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #e5e5e5 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.7 }} />
            
            {/* 3D Perspective Smartphone Chassis Wrapper */}
            <div
              style={{
                position: 'relative',
                width: '210px',
                height: '340px',
                transformStyle: 'preserve-3d',
                transform: `rotateX(${22 + tilt.x}deg) rotateY(${-14 + tilt.y}deg) rotateZ(4deg)`,
                transition: 'transform 0.7s cubic-bezier(0.1, 0.8, 0.2, 1)',
              }}
            >
              {/* Hardware Rim Block (offset Z: -8px) */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '28px',
                background: '#0a0f1d',
                border: '8px solid #0a0f1d',
                transform: 'translateZ(-8px)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                pointerEvents: 'none',
              }} />

              {/* Main Phone Screen Frame (Z: 0px) */}
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '28px',
                border: '8px solid #1e293b',
                background: '#0f172a',
                transformStyle: 'preserve-3d',
                transform: 'translateZ(0px)',
                overflow: 'hidden',
              }}>
                {/* Top notch detail */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%) translateZ(30px)',
                  width: '56px',
                  height: '14px',
                  background: '#1e293b',
                  borderRadius: '0 0 8px 8px',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ width: '20px', height: '2px', background: '#475569', borderRadius: '1px' }} />
                </div>

                {/* 3D Component Stack Layer Container */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  transformStyle: 'preserve-3d',
                }}>
                  {/* Layer 1: Deep Workspace Background (Z: 0px) */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    transform: 'translateZ(0px)',
                    background: '#0f172a',
                    pointerEvents: 'none',
                  }}>
                    <svg viewBox="0 0 194 324" style={{ width: '100%', height: '100%', display: 'block' }}>
                      {/* Background walls/ceiling */}
                      <rect x="0" y="0" width="194" height="150" fill="#1e293b" />
                      {/* Floor */}
                      <rect x="0" y="150" width="194" height="174" fill="#0f172a" />
                      {/* Floor grid perspective lines */}
                      <path d="M 0,324 L 70,150 M 45,324 L 85,150 M 97,324 L 97,150 M 149,324 L 109,150 M 194,324 L 124,150" stroke="#334155" strokeWidth="1.5" opacity="0.6" />
                      {/* Ceiling rafter rails */}
                      <path d="M 0,34 L 194,34" stroke="#475569" strokeWidth="3" opacity="0.4" />
                      <line x1="50" y1="0" x2="50" y2="34" stroke="#475569" strokeWidth="1" opacity="0.4" />
                      <line x1="140" y1="0" x2="140" y2="34" stroke="#475569" strokeWidth="1" opacity="0.4" />
                      {/* Horizon lines */}
                      <line x1="0" y1="150" x2="194" y2="150" stroke="#475569" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.3" />
                    </svg>
                  </div>

                  {/* Layer 2: Extruded Machinery Volumes & Worker Silhouette (Z: 12px) */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    transform: 'translateZ(12px)',
                    transformStyle: 'preserve-3d',
                    pointerEvents: 'none',
                  }}>
                    <svg viewBox="0 0 194 324" style={{ width: '100%', height: '100%', display: 'block' }}>
                      {/* Extruded Left Cabinet (3D Block) */}
                      {/* Side face (dark gray side) */}
                      <path d="M 40,150 L 55,135 L 55,225 L 40,240 Z" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
                      {/* Top face (light gray top) */}
                      <path d="M 10,150 L 25,135 L 55,135 L 40,150 Z" fill="#94a3b8" stroke="#334155" strokeWidth="0.5" />
                      {/* Front face (medium gray front) */}
                      <rect x="10" y="150" width="30" height="90" fill="#475569" stroke="#334155" strokeWidth="0.5" />
                      {/* Cabinet details */}
                      <line x1="15" y1="160" x2="35" y2="160" stroke="#334155" strokeWidth="2" />
                      <line x1="15" y1="170" x2="35" y2="170" stroke="#334155" strokeWidth="2" />
                      <line x1="15" y1="180" x2="35" y2="180" stroke="#334155" strokeWidth="2" />

                      {/* Extruded Right Generator (3D Block) */}
                      {/* Side face (dark gray side) */}
                      <path d="M 145,170 L 135,160 L 135,235 L 145,245 Z" fill="#334155" stroke="#475569" strokeWidth="0.5" />
                      {/* Top face (light gray top) */}
                      <path d="M 145,170 L 135,160 L 173,160 L 183,170 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="0.5" />
                      {/* Front face (medium gray front) */}
                      <rect x="145" y="170" width="38" height="75" rx="2" fill="#64748b" stroke="#475569" strokeWidth="0.5" />
                      {/* Generator controls */}
                      <circle cx="154" cy="182" r="3" fill="#ef4444" />
                      <circle cx="164" cy="182" r="3" fill="#eab308" />
                      <line x1="151" y1="195" x2="177" y2="195" stroke="#475569" strokeWidth="2" />

                      {/* Worker Silhouette */}
                      {/* Head */}
                      <circle cx="97" cy="126" r="7.5" fill="#0f172a" />
                      {/* Yellow Safety Helmet */}
                      <path d="M 88,122 C 88,112 106,112 106,122 Z" fill="#eab308" />
                      <line x1="86" y1="122" x2="108" y2="122" stroke="#eab308" strokeWidth="2" strokeLinecap="round" />
                      {/* Torso */}
                      <path d="M 82,137 L 112,137 L 107,175 L 87,175 Z" fill="#0f172a" />
                      {/* Orange Vest Overlay */}
                      <path d="M 83,137 L 111,137 L 106,166 L 88,166 Z" fill="#f97316" />
                      <line x1="92" y1="137" x2="92" y2="166" stroke="#e2e8f0" strokeWidth="1.5" />
                      <line x1="102" y1="137" x2="102" y2="166" stroke="#e2e8f0" strokeWidth="1.5" />
                      <line x1="86" y1="152" x2="108" y2="152" stroke="#e2e8f0" strokeWidth="1.5" />
                      {/* Legs */}
                      <path d="M 87,175 L 89,215 L 95,215 L 96,186 L 98,186 L 99,215 L 105,215 L 107,175 Z" fill="#0f172a" />
                      {/* Boots */}
                      <rect x="86" y="213" width="9" height="4" rx="1" fill="#0f172a" />
                      <rect x="99" y="213" width="9" height="4" rx="1" fill="#0f172a" />
                    </svg>
                  </div>

                  {/* Layer 3: Elevated Safety HUD & Wireframe (Z: 28px) */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    transform: 'translateZ(28px)',
                    transformStyle: 'preserve-3d',
                    filter: 'drop-shadow(0 8px 16px rgba(34,197,94,0.25)) drop-shadow(0 4px 10px rgba(0,0,0,0.15))',
                    pointerEvents: 'none',
                  }}>
                    <svg viewBox="0 0 194 324" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
                      {/* Bounding Box Around Worker */}
                      <rect x="76" y="104" width="42" height="116" stroke="#22c55e" strokeWidth="2" fill="none" rx="4" />
                      {/* Bounding Box Monospace Compliance Label */}
                      <text x="97" y="98" fill="#22c55e" fontSize="7.5" fontWeight="bold" fontFamily="monospace" textAnchor="middle">[Helmet: 99% Compliance]</text>

                      {/* Active Matrix Scanning Laser */}
                      <line x1="76" y1="105" x2="118" y2="105" stroke="#22c55e" strokeWidth="2" className="lp-laser" />

                      {/* Corner Target Brackets */}
                      <path d="M 14 26 L 14 14 L 26 14" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.85" />
                      <path d="M 168 14 L 180 14 L 180 26" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.85" />
                      <path d="M 14 298 L 14 310 L 26 310" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.85" />
                      <path d="M 168 310 L 180 310 L 180 298" stroke="#ffffff" strokeWidth="1.5" fill="none" opacity="0.85" />
                      
                      {/* Exposure UI Slider */}
                      <line x1="180" y1="100" x2="180" y2="200" stroke="#ffffff" strokeWidth="1" opacity="0.4" />
                      <rect x="178" y="142" width="5" height="10" rx="1" fill="#ffffff" opacity="0.9" />
                      <line x1="176" y1="147" x2="184" y2="147" stroke="#ffffff" strokeWidth="1" opacity="0.6" />

                      {/* Center autofocus crosshair */}
                      <circle cx="97" cy="150" r="14" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 2" fill="none" opacity="0.4" />
                      
                      {/* Blinking Telemetry Dot REC Indicator */}
                      <circle cx="28" cy="24" r="3.5" fill="#ef4444" className="lp-rec-blink" />
                      <text x="36" y="27" fill="#ffffff" fontSize="8" fontWeight="bold" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" opacity="0.9">REC</text>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 1: // Execute URL Launch
        return (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: '16px', border: `1px solid ${borderCol}`, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #e5e5e5 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.7 }} />
            
            <div style={{ position: 'relative', width: '90%', height: '85%', background: '#fff', borderRadius: '12px', border: '1px solid #dcdcdc', boxShadow: '0 8px 24px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: '#f5f5f7', borderBottom: '1px solid #e5e5e7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
                </div>
                <div style={{ flex: 1, height: '18px', background: '#fff', borderRadius: '4px', border: '1px solid #e0e0e0', fontSize: '9px', color: '#737373', display: 'flex', alignItems: 'center', paddingLeft: '8px', fontWeight: 500, fontFamily: 'monospace' }}>
                  https://suraksha.ai/terminal
                </div>
              </div>
              
              <div style={{ flex: 1, padding: '12px', background: '#ffffff', display: 'flex', gap: '10px', overflow: 'hidden' }}>
                <div style={{ flex: 1.4, background: '#111', borderRadius: '6px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'linear-gradient(135deg, #ea580c 0%, #1e1b4b 100%)' }} />
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.15)', padding: '3px 8px', borderRadius: '99px', border: '1px solid #22c55e', zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22c55e' }} />
                    Live Edge Stream
                  </span>
                  
                  <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '8px', color: '#a3a3a3', zIndex: 2, fontFamily: 'monospace' }}>
                    Inference: 31ms • WASM Active
                  </div>
                </div>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '6px 8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Edge Status</span>
                    <span style={{ fontSize: '10px', color: '#1e293b', fontWeight: 700 }}>Ready / 0 Violations</span>
                  </div>
                  <div style={{ flex: 1, padding: '6px 8px', background: '#0f172a', borderRadius: '6px', fontFamily: 'monospace', fontSize: '8px', color: '#38bdf8', overflowY: 'hidden', lineHeight: 1.4 }}>
                    <div style={{ color: '#64748b' }}>// Console Output</div>
                    <div>[WebAssembly] Engine OK</div>
                    <div>[Model] Loaded PPE_v8</div>
                    <div style={{ color: '#22c55e' }}>[Edge] Executing Loop...</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 2: // Audio Intervention
        return (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: '16px', border: `1px solid ${borderCol}`, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #e5e5e5 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.7 }} />
            
            <div style={{ position: 'relative', width: '80%', height: '80%', background: '#fff', borderRadius: '16px', border: '2px solid #ef4444', boxShadow: '0 0 20px rgba(239, 68, 68, 0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: '14px', padding: '24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', border: '2px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(239, 68, 68, 0.2)' }}>
                <Radio size={28} color="#ef4444" className="lp-pulse-radio" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#ef4444', background: '#fef2f2', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fca5a5', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Zone Violation
                </span>
                <h4 style={{ margin: '8px 0 2px 0', fontSize: '15px', fontWeight: 800, color: '#111' }}>
                  Audio Intervention Active
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>
                  Direct voice warnings speaking natively
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', marginTop: '6px' }}>
                <div style={{ alignSelf: 'flex-start', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '6px 10px', borderRadius: '12px 12px 12px 0', fontSize: '10.5px', color: '#1e293b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔊</span>
                  <span><strong>चेतावनी:</strong> कृपया खतरे वाले क्षेत्र से पीछे हटें!</span>
                </div>
                <div style={{ alignSelf: 'flex-end', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '6px 10px', borderRadius: '12px 12px 0 12px', fontSize: '10.5px', color: '#1d4ed8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔊</span>
                  <span><strong>Warning:</strong> Step back from zone A1!</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 3: // Centralized Metric Sync
        return (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: '16px', border: `1px solid ${borderCol}`, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, #e5e5e5 1px, transparent 1px)', backgroundSize: '16px 16px', opacity: 0.7 }} />
            
            <div style={{ position: 'relative', width: '85%', height: '80%', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>Supervisor Command Hub</span>
                <span style={{ fontSize: '8px', fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: '10px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#16a34a' }} />
                  Metrics Synced
                </span>
              </div>
              
              <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#ea580c' }}>142</div>
                    <div style={{ fontSize: '7.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Safe Interventions</div>
                  </div>
                  <div style={{ padding: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a' }}>100%</div>
                    <div style={{ fontSize: '7.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>PPE Compliance</div>
                  </div>
                </div>
                
                <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                  <div style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 700, marginBottom: '2px', textTransform: 'uppercase' }}>Real-time Audit Sync</div>
                  
                  <div style={{ padding: '4px 6px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px' }}>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>Zone A1 Breach Resolved</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '8px' }}>14:24:02 • SYNCED</span>
                  </div>
                  
                  <div style={{ padding: '4px 6px', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px' }}>
                    <span style={{ color: '#1e293b', fontWeight: 600 }}>PPE Compliance Log Sync</span>
                    <span style={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '8px' }}>14:21:40 • SYNCED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Inject styles */}
      <div
        id="lp-root"
        ref={rootRef}
        className="lp-root"
        style={{
          position: 'fixed',
          inset: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: '#ffffff',
          fontFamily: "'Inter', sans-serif",
          color: '#171717',
          zIndex: 9999,
        }}
      >
        {/* ══════════════════════════════════════
            SECTION 1 — HERO (PPE DETECTION BG)
        ══════════════════════════════════════ */}
        <section
          style={{
            position: 'relative',
            minHeight: '100vh',
            width: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: '#0d1117',
          }}
        >
          {/* ── Background image with dark overlay ── */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <img
              src="/ppe_hero_v2.png"
              alt="PPE Detection AI"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center center',
                opacity: 0.85,
              }}
            />
            {/* Left-heavy gradient so text stays readable */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(105deg, rgba(5,8,20,0.92) 0%, rgba(5,8,20,0.78) 38%, rgba(5,8,20,0.30) 70%, rgba(5,8,20,0.10) 100%)',
              }}
            />
            {/* Bottom fade */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '220px',
                background: 'linear-gradient(to bottom, transparent, rgba(5,8,20,0.95))',
              }}
            />
          </div>

          {/* ── TOP NAV BAR ── */}
          <nav
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 100,
              width: '100%',
              background: 'rgba(10,14,30,0.82)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              style={{
                maxWidth: '1280px',
                margin: '0 auto',
                padding: '0 40px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: 'linear-gradient(135deg, #ea580c, #f97316)',
                    padding: '7px',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(234,88,12,0.55)',
                  }}
                >
                  <Shield size={20} color="#fff" strokeWidth={2.5} />
                </div>
                <span
                  style={{
                    fontWeight: 900,
                    fontSize: '17px',
                    color: '#fff',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase',
                  }}
                >
                  Suraksha <span style={{ color: '#f97316' }}>AI</span>
                </span>
              </div>

              {/* Center nav links */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '32px',
                }}
              >
                {['Home', 'About', 'Industries', 'Products', 'Blogs'].map((link) => (
                  <span
                    key={link}
                    style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: link === 'Products' ? '#38bdf8' : 'rgba(255,255,255,0.80)',
                      cursor: 'pointer',
                      letterSpacing: '0.2px',
                      transition: 'color 0.2s',
                      textDecoration: link === 'Products' ? 'underline' : 'none',
                      textUnderlineOffset: '3px',
                    }}
                  >
                    {link}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <button
                id="lp-go-to-dashboard-btn"
                className="lp-cta-btn"
                onClick={handleGoToDashboard}
                style={{
                  background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                  boxShadow: '0 4px 20px rgba(56,189,248,0.35)',
                  borderRadius: '999px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '0.3px',
                }}
              >
                + Get in Touch
              </button>
            </div>
          </nav>

          {/* ── HERO CONTENT (left-aligned, bottom half) ── */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              flex: 1,
              display: 'flex',
              alignItems: 'flex-end',
              maxWidth: '1280px',
              width: '100%',
              margin: '0 auto',
              padding: '0 40px 80px',
            }}
          >
            <div
              className="lp-fade-up"
              style={{
                maxWidth: '560px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '20px',
              }}
            >
              {/* Eyebrow label */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(56,189,248,0.12)',
                  border: '1px solid rgba(56,189,248,0.30)',
                  borderRadius: '6px',
                  padding: '5px 14px',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                <Radio size={11} className="lp-pulse-radio" />
                AI-driven Safety Monitoring
              </div>

              {/* Main headline */}
              <h1
                style={{
                  fontSize: 'clamp(34px, 5vw, 58px)',
                  fontWeight: 900,
                  lineHeight: 1.05,
                  margin: 0,
                  letterSpacing: '-0.5px',
                }}
              >
                <span
                  style={{
                    background: 'linear-gradient(135deg, #38bdf8 0%, #22d3ee 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  PPE Detection
                </span>
                <br />
                <span style={{ color: '#ffffff' }}>AI-driven Safety Monitoring</span>
              </h1>

              {/* Subheadline */}
              <p
                className="lp-fade-up-2"
                style={{
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '15px',
                  lineHeight: 1.75,
                  margin: 0,
                  fontWeight: 400,
                  maxWidth: '480px',
                }}
              >
                Automatically detect helmets, vests, masks, and other personal protective
                equipment in real-time to ensure workplace safety. Enhance compliance and
                reduce workplace accidents using our AI-powered monitoring system.
              </p>

              {/* Stat chips */}
              <div
                className="lp-fade-up-2"
                style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}
              >
                {[
                  { val: '300+', label: 'Incidents Prevented' },
                  { val: '<50ms', label: 'Edge Inference' },
                  { val: '₹0', label: 'Deployment Cost' },
                ].map((s) => (
                  <div
                    key={s.label}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      borderRadius: '10px',
                      padding: '10px 18px',
                      backdropFilter: 'blur(8px)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: '18px', color: '#38bdf8' }}>{s.val}</div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA buttons */}
              <div
                className="lp-fade-up-3"
                style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}
              >
                <button
                  id="lp-deploy-instantly-btn"
                  onClick={handleGoToDashboard}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '15px',
                    padding: '13px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 8px 28px rgba(56,189,248,0.38)',
                    transition: 'transform 0.15s, box-shadow 0.2s',
                  }}
                >
                  Request Demo
                </button>
                <a
                  href="#how-it-works"
                  id="lp-explore-architecture-link"
                  className="lp-ghost-btn"
                >
                  Explore Architecture
                </a>
              </div>
            </div>
          </div>

          {/* ── SCROLL CHEVRON ── */}
          <div
            className="lp-scroll-chevron"
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '50%',
              transform: 'translateX(50%)',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: 'rgba(255,255,255,0.38)',
              cursor: 'pointer',
            }}
            onClick={() => rootRef.current?.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' })}
          >
            <span
              style={{
                fontSize: '8px',
                fontWeight: 700,
                letterSpacing: '2.5px',
                textTransform: 'uppercase',
                marginBottom: '5px',
              }}
            >
              Scroll to discover
            </span>
            <ChevronDown size={18} />
          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 2 — TRUST MATRIX (PARTNERS)
        ══════════════════════════════════════ */}
        <section
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #f0f0f0',
            padding: '44px 0 36px',
          }}
        >
          {/* Title Container */}
          <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 40px', textAlign: 'center' }}>
            {/* Heading */}
            <p style={{ fontSize: '13px', color: '#a3a3a3', marginBottom: '28px', fontWeight: 400 }}>
              Trusted by <strong style={{ color: '#555', fontWeight: 700 }}>Industry Leaders</strong> across the world
            </p>
          </div>

          {/* ── Infinite Marquee ── */}
          {(() => {
            const marqueeItems = [
              {
                name: 'Henkel',
                weight: 700,
                size: '17px',
                spacing: '0.5px',
                serif: true,
                bordered: true,
                logo: (
                  <svg width="34" height="18" viewBox="0 0 34 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', flexShrink: 0 }}>
                    <ellipse cx="17" cy="9" rx="16" ry="8" fill="#E1001A" />
                    <text x="17" y="11.5" fill="#FFFFFF" fontSize="6.5" fontWeight="bold" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">Henkel</text>
                  </svg>
                )
              },
              {
                name: 'Mondelēz',
                weight: 800,
                size: '16px',
                spacing: '-0.3px',
                serif: false,
                italic: true,
                color: '#4F2683'
              },
              {
                name: 'Godrej',
                weight: 700,
                size: '17px',
                spacing: '0.3px',
                serif: true,
                italic: true,
                color: '#E4002B'
              },
              {
                name: 'TEREX',
                weight: 900,
                size: '18px',
                spacing: '2.5px',
                serif: false,
                logo: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', flexShrink: 0 }}>
                    <rect width="24" height="24" rx="4" fill="#E1001A" />
                    <path d="M6 18h3.2L11 6H8.2L6 18zM10.8 18h3.2L15.5 6H12.3L10.8 18zM15.6 18H18.8l-2-12H13.6l2 12z" fill="#FFFFFF" transform="scale(0.85) translate(2, 2)" />
                  </svg>
                )
              },
              {
                name: 'hexion',
                weight: 700,
                size: '15px',
                spacing: '0.5px',
                serif: false,
                color: '#00833E'
              },
              {
                name: 'INDORAMA',
                weight: 800,
                size: '15px',
                spacing: '2px',
                serif: false,
                logo: (
                  <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', flexShrink: 0 }}>
                    <path d="M6.5 13.5a4.5 4.5 0 1 1 0-9c2.5 0 5.5 9 8 9a4.5 4.5 0 1 0 0-9c-2.5 0-5.5 9-8 9z" stroke="#005A9C" strokeWidth="2.5" />
                  </svg>
                )
              },
              {
                name: 'adani',
                weight: 900,
                size: '19px',
                spacing: '0.5px',
                serif: false,
                color: '#005CA9'
              },
              {
                name: 'Premier Energies',
                weight: 600,
                size: '14px',
                spacing: '0.3px',
                serif: false,
                color: '#0D5C75'
              },
              {
                name: 'Gilmours',
                weight: 700,
                size: '16px',
                spacing: '0.3px',
                serif: true,
                logo: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', flexShrink: 0 }}>
                    <rect width="24" height="24" rx="4" fill="#D22630" />
                    <text x="12" y="17" fill="#FFFFFF" fontSize="15" fontWeight="900" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">G</text>
                  </svg>
                )
              },
              {
                name: 'IBIDEN',
                weight: 800,
                size: '16px',
                spacing: '2px',
                serif: false,
                color: '#1C355E'
              },
              {
                name: 'ESBAAR',
                weight: 700,
                size: '15px',
                spacing: '1.5px',
                serif: false,
                color: '#E05B26'
              },
              {
                name: 'SightWatch',
                weight: 700,
                size: '15px',
                spacing: '0.5px',
                serif: false,
                color: '#00AEEF'
              },
              {
                name: 'GreenSignal',
                weight: 700,
                size: '15px',
                spacing: '0.3px',
                serif: false,
                color: '#00A859'
              },
              {
                name: 'hindware',
                weight: 700,
                size: '17px',
                spacing: '0.5px',
                serif: true,
                logo: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', flexShrink: 0 }}>
                    <rect width="24" height="24" rx="4" fill="#D22630" />
                    <text x="12" y="17.5" fill="#FFFFFF" fontSize="16" fontWeight="bold" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">h</text>
                  </svg>
                )
              },
              {
                name: 'TATA Steel',
                weight: 900,
                size: '15px',
                spacing: '1.5px',
                serif: false,
                logo: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" fill="#005A9C" />
                    <path d="M12 17.5V10c-1.2-1.2-2.5-1.5-4-1.5M12 10c1.2-1.2 2.5-1.5 4-1.5" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                )
              },
              {
                name: 'Larsen & Toubro',
                weight: 700,
                size: '13px',
                spacing: '0.3px',
                serif: false,
                logo: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '10px', flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" fill="#00549F" />
                    <text x="12" y="15" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">L&T</text>
                  </svg>
                )
              },
            ];
            // Duplicate list so translateX(-50%) creates a seamless loop
            const doubled = [...marqueeItems, ...marqueeItems];
            return (
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  marginBottom: '28px',
                  padding: '4px 0',
                  width: '100%',
                }}
              >
                {/* Left fade mask */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '140px', zIndex: 2,
                  background: 'linear-gradient(to right, #ffffff 40%, transparent 100%)',
                  pointerEvents: 'none',
                }} />
                {/* Right fade mask */}
                <div style={{
                  position: 'absolute', right: 0, top: 0, bottom: 0, width: '140px', zIndex: 2,
                  background: 'linear-gradient(to left, #ffffff 40%, transparent 100%)',
                  pointerEvents: 'none',
                }} />

                {/* Scrolling track */}
                <div
                  className="lp-marquee-track"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: 'max-content',
                    gap: '0',
                  }}
                >
                  {doubled.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        color: c.color || '#3a3a3a',
                        opacity: 0.85,
                        whiteSpace: 'nowrap',
                        fontFamily: c.serif ? 'Georgia, serif' : "'Inter', sans-serif",
                        fontWeight: c.weight,
                        fontSize: `calc(${c.size} + 7px)`,
                        letterSpacing: c.spacing,
                        fontStyle: (c as any).italic ? 'italic' : 'normal',
                        padding: (c as any).bordered ? '2px 10px' : '0',
                        border: (c as any).bordered ? '1.5px solid #bbb' : 'none',
                        borderRadius: (c as any).bordered ? '4px' : '0',
                        marginRight: '22px',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {/* Decorative separator dot before each item */}
                      <span style={{
                        display: 'inline-block',
                        width: '4px', height: '4px',
                        borderRadius: '50%',
                        background: '#d4d4d4',
                        marginRight: '22px',
                        flexShrink: 0,
                      }} />
                      {c.logo && (
                        <span style={{ display: 'inline-flex', transform: 'scale(1.3)', transformOrigin: 'left center', marginRight: '6px', flexShrink: 0 }}>
                          {c.logo}
                        </span>
                      )}
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}


        </section>

        {/* ══════════════════════════════════════
            SECTION 3 — COMPARISON (BEFORE/AFTER)
        ══════════════════════════════════════ */}
        <section style={{ background: '#fafafa', padding: '96px 40px', position: 'relative' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Heading */}
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 64px' }}>
              <h2
                style={{
                  fontSize: 'clamp(26px, 3.5vw, 42px)',
                  fontWeight: 900,
                  letterSpacing: '-0.5px',
                  color: '#111',
                  margin: 0,
                }}
              >
                Why Traditional Safety Systems Fail MSMEs
              </h2>
              <p style={{ color: '#737373', marginTop: '16px', fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                Compare the operational difference between manual reactive legacy workflows and Suraksha AI edge ecosystem.
              </p>
            </div>

            {/* Relative Wrapper for Grid + VS Badge */}
            <div style={{ position: 'relative', maxWidth: '960px', margin: '0 auto' }}>
              {/* VS Divider Badge (Visible on Desktop) */}
              <div className="lp-vs-badge">vs</div>

              {/* Two-column grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '32px',
                }}
              >
                {/* Left — Without This */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fee2e2',
                    borderRadius: '20px',
                    padding: '36px',
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Header */}
                  <div style={{ marginBottom: '28px' }}>
                    <span style={{
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1px solid #fee2e2',
                      display: 'inline-block',
                      marginBottom: '16px'
                    }}>
                      Without This
                    </span>
                    <h3 style={{ fontWeight: 800, fontSize: '22px', color: '#111', margin: '0 0 8px 0' }}>
                      Reactive Safety Management
                    </h3>
                    <p style={{ color: '#737373', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                      Manual processes, lagging indicators, and constant uncertainty.
                    </p>
                  </div>

                  {/* Bullet Points */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {[
                      'Manual spot-checks cover less than 5% of the floor',
                      'Incidents discovered only after someone is hurt',
                      'Near-misses go unreported and untracked',
                      'Compliance gaps found only during OSHA audits',
                      'Siloed data across spreadsheets and paper forms'
                    ].map((text, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid #fee2e2', flexShrink: 0
                        }}>
                          <span style={{ color: '#dc2626', fontSize: '10px', fontWeight: 'bold' }}>✕</span>
                        </div>
                        <span style={{ fontSize: '14.5px', lineHeight: 1.4, color: '#404040', fontWeight: 500 }}>
                          {text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right — With This */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '2px solid #ea580c',
                    borderRadius: '20px',
                    padding: '36px',
                    boxShadow: '0 8px 30px rgba(234,88,12,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Header */}
                  <div style={{ marginBottom: '28px' }}>
                    <span style={{
                      background: '#f0fdf4',
                      color: '#16a34a',
                      fontSize: '11px',
                      fontWeight: 800,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: '1px solid #bbf7d0',
                      display: 'inline-block',
                      marginBottom: '16px'
                    }}>
                      With This
                    </span>
                    <h3 style={{ fontWeight: 800, fontSize: '22px', color: '#111', margin: '0 0 8px 0' }}>
                      Proactive Safety Intelligence
                    </h3>
                    <p style={{ color: '#737373', fontSize: '14px', margin: 0, lineHeight: 1.5 }}>
                      AI-powered monitoring, leading indicators, and total visibility.
                    </p>
                  </div>

                  {/* Bullet Points */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    {[
                      '24/7 AI monitoring of every camera, every zone',
                      'Hazards flagged in real-time before injuries occur',
                      'Automatic near-miss capture and trending',
                      'Continuous compliance monitoring with instant alerts',
                      'Unified dashboard across all sites and safety events'
                    ].map((text, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid #bbf7d0', flexShrink: 0
                        }}>
                          <span style={{ color: '#16a34a', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                        </div>
                        <span style={{ fontSize: '14.5px', lineHeight: 1.4, color: '#404040', fontWeight: 500 }}>
                          {text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 4 — INTELLIGENT MATRIX (BENTO)
        ══════════════════════════════════════ */}
        <section
          style={{
            background: '#ffffff',
            padding: '96px 40px',
            borderTop: '1px solid #f0f0f0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 64px' }}>
              <h2
                style={{
                  fontSize: 'clamp(26px, 3.5vw, 42px)',
                  fontWeight: 900,
                  letterSpacing: '-0.5px',
                  color: '#111',
                  margin: 0,
                }}
              >
                Engineered Capabilities,{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #ea580c, #fbbf24)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Edge Deployment
                </span>
              </h2>
            </div>

            {/* 3-col bento grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="lp-card-hover"
                  style={{
                    background: '#fafafa',
                    border: '1px solid #ebebeb',
                    borderRadius: '16px',
                    padding: '28px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    // First cell spans 2 columns on wider screens
                    ...(i === 0 ? { gridColumn: 'span 1' } : {}),
                  }}
                >
                  <div style={{ marginBottom: '14px' }}>{f.icon}</div>
                  <h4
                    style={{
                      fontWeight: 700,
                      fontSize: '16px',
                      color: '#111',
                      marginBottom: '10px',
                      marginTop: 0,
                    }}
                  >
                    {f.title}
                  </h4>
                  <p style={{ color: '#737373', fontSize: '13.5px', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 5 — WORKFLOW (4 STEPS)
        ══════════════════════════════════════ */}
        <section id="how-it-works" style={{ background: '#fafafa', padding: '96px 40px' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 72px' }}>
              <h2
                style={{
                  fontSize: 'clamp(26px, 3.5vw, 42px)',
                  fontWeight: 900,
                  letterSpacing: '-0.5px',
                  color: '#111',
                  margin: 0,
                }}
              >
                Five Minutes To Full Site Deployment
              </h2>
              <p style={{ color: '#737373', marginTop: '16px', fontSize: '16px', lineHeight: 1.6, fontWeight: 400 }}>
                From unboxing to active monitoring — every step is deliberately simple.
              </p>
            </div>

            {/* Side-by-side sticky scroll layout */}
            <div className="lp-steps-container">
              {/* Left Side: Steps list scrolling */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {steps.map((s, idx) => (
                  <div
                    key={s.num}
                    ref={(el) => { stepRefs.current[idx] = el; }}
                    data-step-index={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '40px 32px',
                      background: activeStep === idx ? '#ffffff' : 'transparent',
                      border: activeStep === idx ? '1px solid #ebebeb' : '1px solid transparent',
                      borderRadius: '16px',
                      boxShadow: activeStep === idx ? '0 4px 20px rgba(0,0,0,0.02)' : 'none',
                      transition: 'background 0.3s, border 0.3s, box-shadow 0.3s',
                      minHeight: '220px',
                    }}
                  >
                    {/* Large number token */}
                    <span
                      style={{
                        fontSize: '44px',
                        fontWeight: 900,
                        color: activeStep === idx ? '#ea580c' : '#ebebeb',
                        lineHeight: 1,
                        marginBottom: '16px',
                        userSelect: 'none',
                        transition: 'color 0.3s',
                      }}
                    >
                      {s.num}
                    </span>
                    <h4
                      style={{
                        fontWeight: 700,
                        fontSize: '18px',
                        color: '#111',
                        margin: '0 0 12px 0',
                      }}
                    >
                      {s.title}
                    </h4>
                    <p style={{ color: '#737373', fontSize: '14px', lineHeight: 1.7, margin: 0 }}>
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Right Side: Sticky graphics preview */}
              <div
                className="lp-sticky-graphic-col"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <div style={{ position: 'relative', width: '100%', height: '380px' }}>
                  {[0, 1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className={`lp-step-graphic-container ${activeStep === idx ? 'active' : ''}`}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                    >
                      {renderStepGraphic(idx)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            SECTION 6 — QR DEPLOY CTA
        ══════════════════════════════════════ */}
        <section
          id="demo"
          style={{
            background: '#ffffff',
            padding: '96px 40px',
            borderTop: '1px solid #f0f0f0',
          }}
        >
          <div style={{ maxWidth: '960px', margin: '0 auto' }}>
            <div
              style={{
                background: '#fafafa',
                border: '1px solid #e5e5e5',
                borderRadius: '28px',
                padding: 'clamp(32px, 5vw, 56px)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '48px',
              }}
            >
              {/* Text block */}
              <div style={{ flex: '1 1 300px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    color: '#ea580c',
                    fontWeight: 700,
                    fontSize: '11px',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    marginBottom: '18px',
                  }}
                >
                  <Smartphone size={13} />
                  Zero-Friction Trial Integration
                </div>
                <h3
                  style={{
                    fontWeight: 900,
                    fontSize: 'clamp(22px, 3vw, 34px)',
                    letterSpacing: '-0.5px',
                    color: '#111',
                    margin: '0 0 16px 0',
                  }}
                >
                  Launch Suraksha AI Ecosystem Instantly
                </h3>
                <p style={{ color: '#737373', fontSize: '14px', lineHeight: 1.75, margin: '0 0 28px 0', maxWidth: '420px' }}>
                  Scan the sandbox matrix routing node using any mobile device to convert your physical phone hardware
                  into a configured zone monitoring node immediately.
                </p>
                <button
                  id="lp-launch-dashboard-btn"
                  className="lp-cta-btn"
                  onClick={handleGoToDashboard}
                  style={{ fontSize: '15px', padding: '13px 28px' }}
                >
                  Launch Dashboard
                  <ArrowRight size={17} className="lp-arrow" />
                </button>
              </div>

              {/* QR card */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  width: '220px',
                  height: '220px',
                  flexShrink: 0,
                }}
              >
                {/* SVG QR mock */}
                <svg
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ width: '150px', height: '150px' }}
                >
                  {/* Top-left finder */}
                  <rect x="5" y="5" width="28" height="28" rx="3" fill="#1a1a1a" />
                  <rect x="10" y="10" width="18" height="18" rx="1.5" fill="#fafafa" />
                  <rect x="14" y="14" width="10" height="10" rx="1" fill="#ea580c" />
                  {/* Top-right finder */}
                  <rect x="67" y="5" width="28" height="28" rx="3" fill="#1a1a1a" />
                  <rect x="72" y="10" width="18" height="18" rx="1.5" fill="#fafafa" />
                  <rect x="76" y="14" width="10" height="10" rx="1" fill="#ea580c" />
                  {/* Bottom-left finder */}
                  <rect x="5" y="67" width="28" height="28" rx="3" fill="#1a1a1a" />
                  <rect x="10" y="72" width="18" height="18" rx="1.5" fill="#fafafa" />
                  <rect x="14" y="76" width="10" height="10" rx="1" fill="#ea580c" />
                  {/* Data dots (simulated) */}
                  {[40, 44, 48, 52, 56, 60, 64].flatMap((x) =>
                    [5, 9, 13, 17, 21, 25].map((y) =>
                      Math.random() > 0.4
                        ? <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" rx="0.5" fill="#1a1a1a" />
                        : null
                    )
                  )}
                  {[5, 9, 13, 17, 21, 25, 29, 33, 37, 41].flatMap((x) =>
                    [40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92].map((y) =>
                      Math.random() > 0.45
                        ? <rect key={`data-${x}-${y}`} x={x} y={y} width="3" height="3" rx="0.5" fill="#1a1a1a" />
                        : null
                    )
                  )}
                  {[44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92].flatMap((x) =>
                    [40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 88, 92].map((y) =>
                      Math.random() > 0.48
                        ? <rect key={`data2-${x}-${y}`} x={x} y={y} width="3" height="3" rx="0.5" fill="#1a1a1a" />
                        : null
                    )
                  )}
                </svg>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: '#a3a3a3',
                  }}
                >
                  Scan To Deploy Zone
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════
            FOOTER
        ══════════════════════════════════════ */}
        <footer
          style={{
            background: '#fafafa',
            borderTop: '1px solid #f0f0f0',
            padding: '32px 40px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                background: '#ea580c',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
              }}
            >
              <Shield size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <span
              style={{
                fontWeight: 800,
                fontSize: '14px',
                color: '#1a1a1a',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              Suraksha <span style={{ color: '#ea580c' }}>AI</span>
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#a3a3a3', margin: 0, fontWeight: 500 }}>
            &copy; {new Date().getFullYear()} Suraksha AI. All Rights Reserved.&nbsp;
            Pure Browser Edge Architecture.
          </p>
        </footer>
      </div>
    </>
  );
};
