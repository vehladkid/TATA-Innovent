import React, { useRef } from 'react';
import { useEventStore } from '../../lib/event-store';
import { getRiskColor, projectTrajectory } from '../../lib/risk-utils';
import { Cpu } from 'lucide-react';

interface SortTrackerMapProps {
  mode: 'minimap' | 'hologram';
}

export const SortTrackerMap: React.FC<SortTrackerMapProps> = ({ mode }) => {
  const activeWorkers = useEventStore((state) => state.activeWorkers);
  const zones = useEventStore((state) => state.zones);
  const containerRef = useRef<HTMLDivElement>(null);

  const workersArray = Object.values(activeWorkers);

  // Render SVG content representing factory blueprint
  return (
    <div
      ref={containerRef}
      className={`hud-panel tech-corners ${mode === 'hologram' ? 'shimmer-ai' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: mode === 'hologram' ? 'rgba(6, 8, 24, 0.7)' : 'rgba(4, 5, 12, 0.8)',
        border: mode === 'hologram' ? '1px solid rgba(0, 102, 255, 0.35)' : '1px solid rgba(0, 243, 255, 0.2)',
        boxShadow: mode === 'hologram' ? 'inset 0 0 25px rgba(0, 102, 255, 0.15)' : 'none',
      }}
    >
      {/* HUD Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderBottom: '1px solid rgba(0, 243, 255, 0.15)',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '11px',
          letterSpacing: '1px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={12} className="glow-text-cyan" style={{ color: '#00f3ff' }} />
          <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>
            {mode === 'hologram' ? 'LIVE COMMAND CENTER (3D HOLOGRAM)' : 'SORT TRACKER TELEMETRY'}
          </span>
        </div>
        <div style={{ color: 'rgba(255, 255, 255, 0.5)', display: 'flex', gap: '8px' }}>
          <span>SCALE: 1:50</span>
          <span>FPS: 60.00</span>
        </div>
      </div>

      {/* Blueprint Area */}
      <div
        className={mode === 'hologram' ? 'tactical-hologram-stage' : ''}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px',
          perspective: mode === 'hologram' ? '1000px' : 'none',
        }}
      >
        {/* Radar Sweep Effect */}
        <div
          style={{
            position: 'absolute',
            width: '180%',
            height: '180%',
            top: '-40%',
            left: '-40%',
            background: 'conic-gradient(from 0deg, rgba(0, 243, 255, 0.05) 0deg, transparent 90deg, transparent 360deg)',
            pointerEvents: 'none',
            zIndex: 1,
            borderRadius: '50%',
            animation: 'radar-sweep 8s linear infinite',
          }}
        />

        {/* Diagonal Scanning Grid Lines */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            pointerEvents: 'none',
          }}
        />

        {/* 3D Holographic View Rotator Wrapper */}
        <div
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transformStyle: 'preserve-3d',
            transform: mode === 'hologram' ? 'rotateX(24deg) rotateZ(-12deg) translateY(-20px)' : 'none',
            transition: 'transform 0.5s ease',
          }}
        >
          {/* SVG Map Canvas */}
          <svg
            viewBox="0 0 1000 1000"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              overflow: 'visible',
            }}
          >
            {/* SVG Definitions for Grids and Filters */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,102,255,0.08)" strokeWidth="1" />
              </pattern>
              <pattern id="warning-hatch" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255, 0, 60, 0.25)" strokeWidth="8" />
              </pattern>
              <pattern id="warning-yellow" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255, 170, 0, 0.15)" strokeWidth="8" />
              </pattern>
              <radialGradient id="radial-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00f3ff" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#00f3ff" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Grid background */}
            <rect width="1000" height="1000" fill="url(#grid)" />

            {/* Factory Floor Outline Walls */}
            <rect x="20" y="20" width="960" height="960" fill="none" stroke="rgba(0, 243, 255, 0.2)" strokeWidth="2" strokeDasharray="5,5" />

            {/* Static structural pillars representing plants */}
            <g opacity="0.4">
              <rect x="200" y="480" width="80" height="80" fill="rgba(10, 25, 60, 0.6)" stroke="#0066ff" strokeWidth="1.5" />
              <rect x="720" y="480" width="80" height="80" fill="rgba(10, 25, 60, 0.6)" stroke="#0066ff" strokeWidth="1.5" />
              <circle cx="500" cy="500" r="40" fill="rgba(10, 25, 60, 0.6)" stroke="#0066ff" strokeWidth="1.5" />
            </g>

            {/* Danger Safety Zones */}
            {zones.map((zone) => {
              const polyPoints = zone.polygon
                .map((coord) => `${coord[0] * 1000},${coord[1] * 1000}`)
                .join(' ');

              let strokeColor = 'rgba(0, 243, 255, 0.4)';
              let fillColor = 'rgba(0, 102, 255, 0.05)';
              let hatchPattern = 'none';

              if (zone.hazardLevel === 'critical') {
                strokeColor = 'rgba(255, 0, 60, 0.7)';
                fillColor = 'rgba(255, 0, 60, 0.05)';
                hatchPattern = 'url(#warning-hatch)';
              } else if (zone.hazardLevel === 'high') {
                strokeColor = 'rgba(255, 170, 0, 0.6)';
                fillColor = 'rgba(255, 170, 0, 0.05)';
                hatchPattern = 'url(#warning-yellow)';
              }

              // Compute center of polygon for text positioning
              const xs = zone.polygon.map(p => p[0]);
              const ys = zone.polygon.map(p => p[1]);
              const cx = (Math.min(...xs) + Math.max(...xs)) * 500;
              const cy = (Math.min(...ys) + Math.max(...ys)) * 500;

              return (
                <g key={zone.zoneId}>
                  {/* Glowing border underneath */}
                  <polygon points={polyPoints} fill="none" stroke={strokeColor} strokeWidth="6" opacity="0.3" filter="blur(4px)" />
                  {/* Fill hatch pattern */}
                  <polygon points={polyPoints} fill={hatchPattern} />
                  {/* Fill background */}
                  <polygon points={polyPoints} fill={fillColor} />
                  {/* Top clean border */}
                  <polygon points={polyPoints} fill="none" stroke={strokeColor} strokeWidth="2.5" />

                  {/* Zone Label */}
                  <text
                    x={cx}
                    y={cy - 10}
                    textAnchor="middle"
                    fill={strokeColor}
                    fontFamily="'Orbitron', sans-serif"
                    fontSize="16"
                    fontWeight="bold"
                    letterSpacing="1"
                    opacity="0.9"
                    style={{ textShadow: `0 0 6px ${strokeColor}` }}
                  >
                    {zone.name.toUpperCase()}
                  </text>
                  <text
                    x={cx}
                    y={cy + 12}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.6)"
                    fontFamily="'Inter', sans-serif"
                    fontSize="11"
                    fontWeight="500"
                  >
                    REQ: {zone.requiredPPE.map(p => p.toUpperCase()).join(' + ')}
                  </text>
                </g>
              );
            })}

            {/* Workers nodes rendering */}
            {workersArray.map((worker) => {
              const wx = worker.x * 1000;
              const wy = worker.y * 1000;

              // Project trajectory (3 seconds ahead)
              const predictedPoints = projectTrajectory(worker.x, worker.y, worker.vx, worker.vy, 2.5, 5);
              const pathD = predictedPoints.reduce(
                (d, pt, index) => `${d} ${index === 0 ? 'M' : 'L'} ${pt[0] * 1000} ${pt[1] * 1000}`,
                `M ${wx} ${wy}`
              );

              // Colors based on current state
              let riskColor = getRiskColor(worker.band);

              if (worker.predictedEntryMs) {
                // Purple predictive theme
                riskColor = { hex: '#b026ff', glow: '0 0 15px #b026ff', name: 'PREDICTIVE THREAT' };
              }

              // Trailing motion history
              const trailPoints = worker.trail.map((t) => `${t[0] * 1000},${t[1] * 1000}`).join(' ');

              return (
                <g key={worker.trackId} style={{ transition: 'all 0.1s linear' }}>
                  {/* 1. Motion Trail (drawn as polyline) */}
                  {worker.trail.length > 1 && (
                    <polyline
                      points={trailPoints}
                      fill="none"
                      stroke={riskColor.hex}
                      strokeWidth="2.5"
                      strokeOpacity="0.35"
                      strokeDasharray="4,4"
                    />
                  )}

                  {/* 2. Projected Future Path (dotted line with pointer arrow) */}
                  {mode === 'hologram' && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={worker.predictedEntryMs ? '#b026ff' : riskColor.hex}
                      strokeWidth="2"
                      strokeOpacity="0.6"
                      strokeDasharray="3,6"
                    />
                  )}

                  {/* 3. Velocity vector (glowing pointer line representing heading) */}
                  {Math.abs(worker.vx) + Math.abs(worker.vy) > 0.001 && (
                    <line
                      x1={wx}
                      y1={wy}
                      x2={wx + worker.vx * 350}
                      y2={wy + worker.vy * 350}
                      stroke={riskColor.hex}
                      strokeWidth="3"
                      markerEnd="url(#arrow)"
                    />
                  )}

                  {/* 4. Radar pulsing rings */}
                  <circle
                    cx={wx}
                    cy={wy}
                    r="24"
                    fill="none"
                    stroke={riskColor.hex}
                    strokeWidth="1.5"
                    opacity="0.3"
                    style={{
                      transformOrigin: `${wx}px ${wy}px`,
                      animation: 'ping 1.5s ease-out infinite'
                    }}
                  />
                  {worker.band === 'critical' && (
                    <circle
                      cx={wx}
                      cy={wy}
                      r="40"
                      fill="none"
                      stroke="#ff003c"
                      strokeWidth="1"
                      opacity="0.5"
                      style={{
                        transformOrigin: `${wx}px ${wy}px`,
                        animation: 'ping 1.2s ease-out infinite',
                        animationDelay: '0.4s'
                      }}
                    />
                  )}

                  {/* 5. Center Core Worker Node */}
                  <circle
                    cx={wx}
                    cy={wy}
                    r="10"
                    fill={riskColor.hex}
                    stroke="#ffffff"
                    strokeWidth="2"
                    style={{ filter: `drop-shadow(${riskColor.glow})` }}
                  />

                  {/* 6. Label Card Overlay */}
                  {mode === 'hologram' ? (
                    // Comprehensive HUD details card for central view
                    <g transform={`translate(${wx + 15}, ${wy - 15})`} style={{ pointerEvents: 'none' }}>
                      <rect
                        width="150"
                        height="64"
                        rx="4"
                        fill="rgba(5, 7, 20, 0.9)"
                        stroke={riskColor.hex}
                        strokeWidth="1.5"
                        style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}
                      />
                      {/* Corner decorative indicators */}
                      <line x1="0" y1="0" x2="8" y2="0" stroke={riskColor.hex} strokeWidth="2" />
                      <line x1="0" y1="0" x2="0" y2="8" stroke={riskColor.hex} strokeWidth="2" />

                      {/* Content text */}
                      <text
                        x="10"
                        y="18"
                        fill="#ffffff"
                        fontFamily="'Orbitron', sans-serif"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        WORKER W-00{worker.trackId}
                      </text>
                      <text
                        x="10"
                        y="34"
                        fill={riskColor.hex}
                        fontFamily="'Orbitron', sans-serif"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        SCORE: {worker.riskScore} | {riskColor.name}
                      </text>

                      {/* PPE details */}
                      <text
                        x="10"
                        y="50"
                        fill={worker.helmet ? '#00ff66' : '#ff003c'}
                        fontFamily="'Inter', sans-serif"
                        fontSize="9.5"
                        fontWeight="600"
                      >
                        {worker.helmet ? '✔ HELMET' : '❌ NO HELMET'}
                      </text>
                      <text
                        x="76"
                        y="50"
                        fill={worker.vest ? '#00ff66' : '#ff003c'}
                        fontFamily="'Inter', sans-serif"
                        fontSize="9.5"
                        fontWeight="600"
                      >
                        {worker.vest ? '✔ VEST' : '❌ NO VEST'}
                      </text>

                      {/* Predictive Purple Countdown Badge */}
                      {worker.predictedEntryMs && (
                        <g transform="translate(0, -25)">
                          <rect
                            width="150"
                            height="20"
                            rx="3"
                            fill="rgba(176, 38, 255, 0.25)"
                            stroke="#b026ff"
                            strokeWidth="1"
                          />
                          <text
                            x="75"
                            y="14"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontFamily="'Orbitron', sans-serif"
                            fontSize="9.5"
                            fontWeight="bold"
                            style={{ fill: '#ffffff', textShadow: '0 0 5px #b026ff' }}
                          >
                            ⚡ ENTRY IN {(worker.predictedEntryMs / 1000).toFixed(1)}s
                          </text>
                        </g>
                      )}
                    </g>
                  ) : (
                    // Minimal radar identifier for left side panel
                    <g transform={`translate(${wx + 10}, ${wy - 10})`}>
                      <rect
                        width="54"
                        height="18"
                        rx="2"
                        fill="rgba(0,0,0,0.8)"
                        stroke={riskColor.hex}
                        strokeWidth="1"
                      />
                      <text
                        x="27"
                        y="13"
                        textAnchor="middle"
                        fill="#fff"
                        fontFamily="'Orbitron', sans-serif"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        W-00{worker.trackId}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Markers */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
              </marker>
            </defs>
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes ping {
          0% {
            transform: scale(0.3);
            opacity: 1;
          }
          100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
