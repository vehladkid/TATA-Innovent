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

  return (
    <div
      ref={containerRef}
      className="hud-panel"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        background: '#101010', // Panel palette background: charcoal
        border: '1px solid #252525', // Border palette: charcoal
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid #252525',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={12} style={{ color: '#5ACDD9' }} />
          <span style={{
            fontFamily: "var(--font-header)", // Osiris
            fontSize: '11px',
            fontWeight: 600,
            color: '#EAEAEA',
            letterSpacing: '0.05em',
          }}>
            {mode === 'hologram' ? 'FACILITY MAP — LIVE' : 'SORT TRACKER OVERVIEW'}
          </span>
        </div>
        <WorkerCount count={workersArray.length} />
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
          perspective: mode === 'hologram' ? '1200px' : 'none',
        }}
      >
        {/* Subtle blueprint grid */}
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.007) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.007) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
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
            transform: mode === 'hologram' ? 'rotateX(22deg) rotateZ(-10deg) translateY(-15px)' : 'none',
            transition: 'transform 0.5s ease',
          }}
        >
          {/* SVG Map Canvas */}
          <svg
            viewBox="0 0 1000 1000"
            className={mode === 'hologram' ? 'hologram-flicker' : ''}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              overflow: 'visible',
            }}
          >
            {/* SVG Definitions for Grids and Hatching */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="1" />
              </pattern>
              {/* Critical Breach (Peach Hatching) */}
              <pattern id="warning-hatch" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255, 90, 69, 0.18)" strokeWidth="6" />
              </pattern>
              {/* Warning/High (Yellow/Peach Hatching) */}
              <pattern id="warning-yellow" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255, 115, 96, 0.12)" strokeWidth="6" />
              </pattern>
            </defs>

            {/* Grid background */}
            <rect width="1000" height="1000" fill="url(#grid)" />

            {/* Factory Floor Outline Walls */}
            <rect x="20" y="20" width="960" height="960" fill="none" stroke="#252525" strokeWidth="1.5" strokeDasharray="5,5" />

            {/* Slate structural pillars representing machinery */}
            <g opacity="0.3">
              <rect x="200" y="480" width="80" height="80" fill="rgba(21, 21, 21, 0.6)" stroke="#252525" strokeWidth="1.5" />
              <rect x="720" y="480" width="80" height="80" fill="rgba(21, 21, 21, 0.6)" stroke="#252525" strokeWidth="1.5" />
              <circle cx="500" cy="500" r="40" fill="rgba(21, 21, 21, 0.6)" stroke="#252525" strokeWidth="1.5" />
            </g>

            {/* Safety Zones */}
            {zones.map((zone) => {
              const polyPoints = zone.polygon
                .map((coord) => `${coord[0] * 1000},${coord[1] * 1000}`)
                .join(' ');

              let strokeColor = 'rgba(0, 208, 132, 0.35)'; // Safe Green
              let fillColor = 'rgba(0, 208, 132, 0.05)';
              let hatchPattern = 'none';

              if (zone.hazardLevel === 'critical') {
                strokeColor = 'rgba(255, 90, 69, 0.65)'; // Critical Coral Peach
                fillColor = 'rgba(255, 90, 69, 0.08)';
                hatchPattern = 'url(#warning-hatch)';
              } else if (zone.hazardLevel === 'high') {
                strokeColor = 'rgba(255, 115, 96, 0.55)'; // Warning Peach
                fillColor = 'rgba(255, 115, 96, 0.06)';
                hatchPattern = 'url(#warning-yellow)';
              }

              // Compute center of polygon for text positioning
              const xs = zone.polygon.map(p => p[0]);
              const ys = zone.polygon.map(p => p[1]);
              const cx = (Math.min(...xs) + Math.max(...xs)) * 500;
              const cy = (Math.min(...ys) + Math.max(...ys)) * 500;

              return (
                <g key={zone.zoneId}>
                  {/* Glowing border underneath (very soft) */}
                  <polygon points={polyPoints} fill="none" stroke={strokeColor} strokeWidth="4" opacity="0.1" filter="blur(2px)" />
                  {/* Fill hatch pattern */}
                  <polygon points={polyPoints} fill={hatchPattern} />
                  {/* Fill background */}
                  <polygon points={polyPoints} fill={fillColor} />
                  {/* Top clean border */}
                  <polygon points={polyPoints} fill="none" stroke={strokeColor} strokeWidth="1.8" />

                  {/* Zone Label */}
                  <text
                    x={cx}
                    y={cy - 8}
                    textAnchor="middle"
                    fill={strokeColor}
                    fontFamily="var(--font-header)" // Osiris
                    fontSize="13"
                    fontWeight="600"
                    letterSpacing="1"
                    opacity="0.8"
                  >
                    {zone.name.toUpperCase()}
                  </text>
                  <text
                    x={cx}
                    y={cy + 12}
                    textAnchor="middle"
                    fill="#9A9A9A" // Secondary text
                    fontFamily="var(--font-body)"
                    fontSize="10"
                    fontWeight="500"
                    opacity="0.85"
                  >
                    {zone.requiredPPE.map(p => p.toUpperCase()).join(' · ')}
                  </text>
                </g>
              );
            })}

            {/* Workers nodes rendering */}
            {workersArray.map((worker) => {
              const wx = worker.x * 1000;
              const wy = worker.y * 1000;

              // Project trajectory (2.5 seconds ahead)
              const predictedPoints = projectTrajectory(worker.x, worker.y, worker.vx, worker.vy, 2.5, 5);
              const pathD = predictedPoints.reduce(
                (d, pt, index) => `${d} ${index === 0 ? 'M' : 'L'} ${pt[0] * 1000} ${pt[1] * 1000}`,
                `M ${wx} ${wy}`
              );

              // Colors based on current state
              let riskColor = getRiskColor(worker.band);

              if (worker.predictedEntryMs) {
                riskColor = { hex: '#3E6AE0', glow: '0 0 4px rgba(62, 106, 224, 0.3)', name: 'PREDICTIVE' };
              }

              // Trailing motion history
              const trailPoints = worker.trail.map((t) => `${t[0] * 1000},${t[1] * 1000}`).join(' ');

              return (
                <g key={worker.trackId} style={{ transition: 'all 0.1s linear' }}>
                  {/* 1. Motion Trail */}
                  {worker.trail.length > 1 && (
                    <polyline
                      points={trailPoints}
                      fill="none"
                      stroke={riskColor.hex}
                      strokeWidth="2"
                      strokeOpacity="0.28"
                      strokeDasharray="3,3"
                    />
                  )}

                  {/* 2. Projected Future Path (dotted line) */}
                  {mode === 'hologram' && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke={worker.predictedEntryMs ? '#3E6AE0' : riskColor.hex}
                      strokeWidth="1.8"
                      strokeOpacity="0.5"
                      strokeDasharray="3,5"
                    />
                  )}

                  {/* 3. Velocity vector (glowing heading vector line) */}
                  {Math.abs(worker.vx) + Math.abs(worker.vy) > 0.001 && (
                    <line
                      x1={wx}
                      y1={wy}
                      x2={wx + worker.vx * 300}
                      y2={wy + worker.vy * 300}
                      stroke={riskColor.hex}
                      strokeWidth="2.5"
                      markerEnd="url(#arrow)"
                    />
                  )}

                  {/* 4. Radar pulsing rings (very soft) */}
                  <circle
                    cx={wx}
                    cy={wy}
                    r="20"
                    fill="none"
                    stroke={riskColor.hex}
                    strokeWidth="1.2"
                    opacity="0.25"
                    style={{
                      transformOrigin: `${wx}px ${wy}px`,
                      animation: 'ping 1.6s ease-out infinite'
                    }}
                  />
                  {worker.band === 'critical' && (
                    <circle
                      cx={wx}
                      cy={wy}
                      r="34"
                      fill="none"
                      stroke="#FF5A45" // Critical Emergency Ring
                      strokeWidth="1.2"
                      opacity="0.35"
                      style={{
                        transformOrigin: `${wx}px ${wy}px`,
                        animation: 'ping 1.3s ease-out infinite',
                        animationDelay: '0.4s'
                      }}
                    />
                  )}

                  {/* 5. Center Core Worker Node with solid matte black outline for visibility */}
                  <circle
                    cx={wx}
                    cy={wy}
                    r="8.5"
                    fill={riskColor.hex}
                    stroke="#050505" // Solid black outline profile
                    strokeWidth="2.2"
                  />

                  {/* 6. Label Card Overlay */}
                  {mode === 'hologram' ? (
                    <g transform={`translate(${wx + 12}, ${wy - 12})`} style={{ pointerEvents: 'none' }}>
                      <rect
                        width="132"
                        height="52"
                        rx="3"
                        fill="rgba(13, 13, 13, 0.96)" // Matte black elevated
                        stroke="#252525"
                        strokeWidth="1.2"
                      />
                      <text
                        x="8"
                        y="15"
                        fill="#EAEAEA"
                        fontFamily="var(--font-metric)"
                        fontSize="10"
                        fontWeight="600"
                      >
                        Worker W-0{worker.trackId}
                      </text>
                      <text
                        x="8"
                        y="27"
                        fill={riskColor.hex}
                        fontFamily="var(--font-metric)"
                        fontSize="9.5"
                        fontWeight="500"
                      >
                        Score: {worker.riskScore} · {riskColor.name}
                      </text>
                      <text
                        x="8"
                        y="41"
                        fill={worker.helmet ? '#00D084' : '#FF5A45'}
                        fontFamily="var(--font-metric)"
                        fontSize="9"
                        fontWeight="500"
                      >
                        {worker.helmet ? '✔ Helmet' : '✕ Helmet'}
                      </text>
                      <text
                        x="68"
                        y="41"
                        fill={worker.vest ? '#00D084' : '#FF5A45'}
                        fontFamily="var(--font-metric)"
                        fontSize="9"
                        fontWeight="500"
                      >
                        {worker.vest ? '✔ Vest' : '✕ Vest'}
                      </text>
                      {worker.predictedEntryMs && (
                        <g transform="translate(0, -20)">
                          <rect
                            width="132"
                            height="16"
                            rx="2"
                            fill="rgba(62, 106, 224, 0.1)"
                            stroke="rgba(62, 106, 224, 0.3)"
                            strokeWidth="1"
                          />
                          <text
                            x="66"
                            y="11"
                            textAnchor="middle"
                            fill="rgba(255,255,255,0.85)"
                            fontFamily="var(--font-metric)"
                            fontSize="9"
                            fontWeight="500"
                          >
                            ⚡ Entry in {(worker.predictedEntryMs / 1000).toFixed(1)}s
                          </text>
                        </g>
                      )}
                    </g>
                  ) : (
                    <g transform={`translate(${wx + 8}, ${wy - 8})`}>
                      <rect
                        width="46"
                        height="15"
                        rx="2"
                        fill="rgba(16, 16, 16, 0.95)" // Matte black card surface
                        stroke="#252525"
                        strokeWidth="1"
                      />
                      <text
                        x="23"
                        y="11"
                        textAnchor="middle"
                        fill="#EAEAEA"
                        fontFamily="var(--font-metric)"
                        fontSize="9"
                        fontWeight="600"
                      >
                        W-0{worker.trackId}
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
                markerWidth="3"
                markerHeight="3"
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
          0%   { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(2.0); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

const WorkerCount: React.FC<{ count: number }> = ({ count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <span style={{ fontFamily: "var(--font-metric)", fontSize: '9.5px', color: '#9A9A9A', fontWeight: 500 }}>
      {count} worker{count !== 1 ? 's' : ''} tracked
    </span>
    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00D084' }} />
  </div>
);
