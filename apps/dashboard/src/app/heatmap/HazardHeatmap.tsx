import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Calendar, Layers, Cpu, AlertTriangle } from 'lucide-react';

type TimeFilter = '10m' | '1h' | 'shift' | '24h' | '7d';

interface HeatSpot {
  cx: number;
  cy: number;
  radius: number;
  maxOpacity: number;
  label: string;
  incidentsTimeline: number[]; // incident intensity levels over 10 timeline steps
}

const HEAT_SPOTS: HeatSpot[] = [
  {
    cx: 220,
    cy: 300,
    radius: 135,
    maxOpacity: 0.9,
    label: 'Press Machine Area A',
    incidentsTimeline: [0.1, 0.25, 0.45, 0.75, 0.9, 0.85, 0.6, 0.4, 0.3, 0.45]
  },
  {
    cx: 680,
    cy: 330,
    radius: 145, 
    maxOpacity: 0.75,
    label: 'Forklift Crossing Lane',
    incidentsTimeline: [0.2, 0.4, 0.65, 0.55, 0.45, 0.65, 0.75, 0.55, 0.35, 0.2]
  },
  {
    cx: 380,
    cy: 730,
    radius: 120,
    maxOpacity: 0.65,
    label: 'Welding Bay C',
    incidentsTimeline: [0.05, 0.15, 0.3, 0.45, 0.6, 0.65, 0.5, 0.35, 0.2, 0.15]
  },
  {
    cx: 500,
    cy: 500,
    radius: 100,
    maxOpacity: 0.5,
    label: 'Boiler Valve Station',
    incidentsTimeline: [0.1, 0.2, 0.15, 0.25, 0.35, 0.45, 0.4, 0.25, 0.15, 0.08]
  },
  {
    cx: 480,
    cy: 280,
    radius: 130,
    maxOpacity: 0.7,
    label: 'Assembly Line Conveyor',
    incidentsTimeline: [0.2, 0.4, 0.55, 0.5, 0.35, 0.45, 0.6, 0.45, 0.25, 0.2]
  },
  {
    cx: 800,
    cy: 680,
    radius: 140,
    maxOpacity: 0.65,
    label: 'Raw Material Depot',
    incidentsTimeline: [0.15, 0.25, 0.35, 0.55, 0.7, 0.55, 0.4, 0.45, 0.35, 0.25]
  },
  {
    cx: 160,
    cy: 620,
    radius: 110,
    maxOpacity: 0.8,
    label: 'Electrical Distribution Board',
    incidentsTimeline: [0.35, 0.5, 0.65, 0.85, 0.8, 0.7, 0.55, 0.45, 0.35, 0.3]
  },
  {
    cx: 320,
    cy: 420,
    radius: 120,
    maxOpacity: 0.55,
    label: 'Hazardous Chemistry Storage',
    incidentsTimeline: [0.08, 0.15, 0.3, 0.45, 0.6, 0.5, 0.35, 0.25, 0.15, 0.08]
  }
];

// Mock trajectory coordinate lists (steps 0 to 9)
const WORKER_1_PATH = [
  { x: 120, y: 160 },
  { x: 135, y: 180 },
  { x: 150, y: 200 },
  { x: 165, y: 215 },
  { x: 185, y: 235 }, // enters restricted zone at step 4
  { x: 205, y: 255 },
  { x: 220, y: 275 },
  { x: 235, y: 290 },
  { x: 225, y: 300 },
  { x: 220, y: 295 }  // stays near Press Machine Area A
];

const WORKER_2_PATH = [
  { x: 280, y: 480 },
  { x: 340, y: 480 },
  { x: 400, y: 480 },
  { x: 460, y: 480 },
  { x: 520, y: 480 },
  { x: 580, y: 480 },
  { x: 640, y: 480 },
  { x: 700, y: 480 },
  { x: 760, y: 480 },
  { x: 820, y: 480 }  // walks along Forklift Travel Lane A
];

const WORKER_3_PATH = [
  { x: 380, y: 460 },
  { x: 380, y: 490 },
  { x: 380, y: 520 },
  { x: 380, y: 550 },
  { x: 380, y: 580 },
  { x: 380, y: 610 },
  { x: 380, y: 640 },
  { x: 380, y: 670 }, // enters Welding Zone C at step 7
  { x: 380, y: 700 },
  { x: 380, y: 720 }  // stops inside Welding Bay C
];

const WORKER_5_PATH = [
  { x: 640, y: 200 },
  { x: 640, y: 240 },
  { x: 640, y: 280 },
  { x: 640, y: 320 },
  { x: 640, y: 360 },
  { x: 640, y: 400 },
  { x: 640, y: 440 },
  { x: 640, y: 480 }, // step 7 - intersection point!
  { x: 640, y: 520 },
  { x: 640, y: 560 }
];

const FORKLIFT_PATH = [
  { x: 360, y: 480 },
  { x: 400, y: 480 },
  { x: 440, y: 480 },
  { x: 480, y: 480 },
  { x: 520, y: 480 },
  { x: 560, y: 480 },
  { x: 600, y: 480 },
  { x: 640, y: 480 }, // step 7 - intersection point!
  { x: 680, y: 480 },
  { x: 720, y: 480 }
];

export const HazardHeatmap: React.FC = () => {
  const [filter, setFilter] = useState<TimeFilter>('shift');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineStep, setTimelineStep] = useState(4); // 0 to 9 index

  const playTimerRef = useRef<any | null>(null);

  // Handle Playback animation loops
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setTimelineStep((prev) => (prev >= 9 ? 0 : prev + 1));
      }, 1200);
    } else {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying]);

  const multiplier = filter === '10m' ? 0.3 : (filter === '1h' ? 0.6 : (filter === 'shift' ? 1.0 : (filter === '24h' ? 1.4 : 1.8)));

  const getTimelineLabel = (step: number) => {
    const timeLabels = {
      '10m': ['-10m', '-9m', '-8m', '-7m', '-6m', '-5m', '-4m', '-3m', '-2m', 'NOW'],
      '1h': ['-60m', '-50m', '-40m', '-30m', '-20m', '-15m', '-10m', '-5m', '-2m', 'NOW'],
      'shift': ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', 'NOW (16:30)'],
      '24h': ['-24h', '-20h', '-16h', '-12h', '-8h', '-6h', '-4h', '-2h', '-1h', 'NOW'],
      '7d': ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'TODAY']
    };
    return timeLabels[filter][step] || '';
  };

  // Helper arrays for current worker trajectories
  const w1Current = WORKER_1_PATH[timelineStep];
  const w2Current = WORKER_2_PATH[timelineStep];
  const w3Current = WORKER_3_PATH[timelineStep];
  const w5Current = WORKER_5_PATH[timelineStep];
  const f1Current = FORKLIFT_PATH[timelineStep];

  const w1Trail = WORKER_1_PATH.slice(0, timelineStep + 1);
  const w2Trail = WORKER_2_PATH.slice(0, timelineStep + 1);
  const w3Trail = WORKER_3_PATH.slice(0, timelineStep + 1);
  const w5Trail = WORKER_5_PATH.slice(0, timelineStep + 1);
  const f1Trail = FORKLIFT_PATH.slice(0, timelineStep + 1);

  const w1Forecast = timelineStep < 9 ? WORKER_1_PATH.slice(timelineStep, Math.min(10, timelineStep + 4)) : [];
  const w2Forecast = timelineStep < 9 ? WORKER_2_PATH.slice(timelineStep, Math.min(10, timelineStep + 4)) : [];
  const w3Forecast = timelineStep < 9 ? WORKER_3_PATH.slice(timelineStep, Math.min(10, timelineStep + 4)) : [];
  const w5Forecast = timelineStep < 9 ? WORKER_5_PATH.slice(timelineStep, Math.min(10, timelineStep + 4)) : [];
  const f1Forecast = timelineStep < 9 ? FORKLIFT_PATH.slice(timelineStep, Math.min(10, timelineStep + 4)) : [];

  // Dynamic telemetry calculations based on Timeline Step
  const activeZonesCount = timelineStep < 4 ? 1 : (timelineStep < 7 ? 2 : 3);
  const riskGrowthRate = (3.4 + timelineStep * 1.63).toFixed(1);
  const avgDuration = (12.5 + timelineStep * 3.3).toFixed(1);
  const breachProbability = timelineStep < 3 ? '18%' : (timelineStep === 3 ? '82%' : '100% BREACH');

  // Executive KPI Strip Values (Dynamically scaled)
  const activeHazardsVal = Math.round(2 + (timelineStep / 9) * 4);
  const criticalZonesVal = Math.round(0 + (timelineStep / 9) * 2);
  const predictedBreachesVal = Math.round(1 + (timelineStep / 9) * 3);
  const avgExposureVal = `${Math.round(12 + (timelineStep / 9) * 13)}s`;
  const riskTrendVal = `+${Math.round(3 + (timelineStep / 9) * 15)}%`;

  // Dynamic values for Top Hazard Areas
  const pressMachineRisk = Math.round(75 + (timelineStep / 9) * 17);
  const forkliftLaneRisk = Math.round(60 + (timelineStep / 9) * 18);
  const weldingZoneRisk = Math.round(50 + (timelineStep / 9) * 16);
  const loadingBayRisk = Math.round(30 + (timelineStep / 9) * 13);

  // Collision Warning parameters (Timeline steps 3 to 7)
  const isApproachingCollision = timelineStep >= 3 && timelineStep <= 7;
  const collisionRisk = timelineStep === 3 ? '42%' : timelineStep === 4 ? '61%' : timelineStep === 5 ? '78%' : timelineStep === 6 ? '94%' : '100% BREACH';
  const collisionEta = timelineStep === 3 ? '4.8s' : timelineStep === 4 ? '3.6s' : timelineStep === 5 ? '2.4s' : timelineStep === 6 ? '1.2s' : '0.0s';

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 310px',
        gap: '12px',
        padding: '12px',
        overflow: 'hidden',
        height: '100%',
        background: 'var(--color-bg-deep)',
      }}
    >
      {/* Tactical Blueprint Stage */}
      <div
        className="hud-panel"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid var(--border-color)',
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={12} style={{ color: 'var(--color-nominal)' }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: '11px', fontWeight: 600, color: 'var(--color-silver)', letterSpacing: '0.05em' }}>
              HAZARD DENSITY ANALYTICS & TRAJECTORY FORECAST
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="active-indicator-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-nominal)' }} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: '9.5px', fontWeight: 500, color: 'var(--color-neutral)', opacity: 0.85 }}>Real-time Risk Contours Active</span>
          </div>
        </div>

        {/* Executive KPI Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '8px',
            padding: '8px 12px',
            background: '#000000',
            borderBottom: '1px solid var(--border-color)',
            zIndex: 4,
          }}
        >
          <KpiCard label="ACTIVE HAZARDS" value={activeHazardsVal.toString()} color="#FF9100" />
          <KpiCard label="CRITICAL ZONES" value={criticalZonesVal.toString()} color="#FF5A45" />
          <KpiCard label="PREDICTED BREACHES" value={predictedBreachesVal.toString()} color="#FF5A45" />
          <KpiCard label="AVG EXPOSURE" value={avgExposureVal} color="var(--color-silver)" />
          <KpiCard label="RISK TREND" value={riskTrendVal} color="#FF5A45" />
        </div>

        {/* Blueprint Map Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#000000' }}>
          
          {/* Floating Anomaly Analytics Overlay */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'var(--color-bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '2px',
              padding: '10px 12px',
              backdropFilter: 'blur(10px)',
              width: '230px',
              zIndex: 10,
              pointerEvents: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ fontFamily: "var(--font-header)", fontSize: '9px', fontWeight: 600, color: '#FF5A45', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Cpu size={10} style={{ color: '#FF5A45' }} />
              FLOATING AI ANALYTICS LAYER
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "var(--font-metric)", fontSize: '9.5px', color: 'var(--color-neutral)' }}>
              <span>Active Risk Zones:</span>
              <span style={{ fontWeight: 600, color: '#FF5A45' }}>{activeZonesCount} Zones</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "var(--font-metric)", fontSize: '9.5px', color: 'var(--color-neutral)' }}>
              <span>Highest Density Area:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-silver)' }}>Press Machine A</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "var(--font-metric)", fontSize: '9.5px', color: 'var(--color-neutral)' }}>
              <span>Risk Growth Rate:</span>
              <span style={{ fontWeight: 600, color: '#FF5A45' }}>+{riskGrowthRate}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "var(--font-metric)", fontSize: '9.5px', color: 'var(--color-neutral)' }}>
              <span>Average Exposure:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-silver)' }}>{avgDuration}s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "var(--font-metric)", fontSize: '9.5px', color: 'var(--color-neutral)' }}>
              <span>Breach Anomaly Prob:</span>
              <span style={{ fontWeight: 700, color: timelineStep >= 3 ? '#FF5A45' : 'var(--color-nominal)' }}>{breachProbability}</span>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <svg viewBox="0 0 1000 1000" className="hologram-flicker" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <pattern id="grid-heatmap" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.012)" strokeWidth="1" />
              </pattern>
              
              <pattern id="warning-hatch" width="20" height="20" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255, 90, 69, 0.15)" strokeWidth="6" />
              </pattern>
              
              {/* Heatmap analytical blur with smooth gradient merging */}
              <filter id="heatmap-blur-filter" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="34" result="blur" />
              </filter>
            </defs>

            {/* Grid overlay */}
            <rect width="1000" height="1000" fill="url(#grid-heatmap)" />

            {/* Outer bounds border */}
            <rect x="20" y="20" width="960" height="960" fill="none" stroke="var(--border-color)" strokeWidth="1.2" strokeDasharray="3,5" />
            
            {/* Facility Context Overlay Geometry */}
            {/* 1. Pedestrian Corridors */}
            <line x1="80" y1="150" x2="920" y2="150" stroke="rgba(216, 216, 216, 0.08)" strokeWidth="14" strokeDasharray="2,5" />
            <line x1="500" y1="150" x2="500" y2="920" stroke="rgba(216, 216, 216, 0.08)" strokeWidth="14" strokeDasharray="2,5" />
            <text x="512" y="180" fill="rgba(216,216,216,0.3)" fontFamily="var(--font-label)" fontSize="9" fontWeight="600">PEDESTRIAN WALKWAY B</text>

            {/* 2. Forklift travel lane */}
            <line x1="80" y1="480" x2="920" y2="480" stroke="rgba(62, 106, 224, 0.2)" strokeWidth="16" strokeDasharray="10,12" />
            <text x="90" y="472" fill="rgba(62, 106, 224, 0.5)" fontFamily="var(--font-label)" fontSize="9" fontWeight="600">FORKLIFT TRAVEL LANE A</text>

            {/* 3. Welding Bay C */}
            <rect x="300" y="660" width="160" height="130" fill="none" stroke="rgba(255, 90, 69, 0.25)" strokeWidth="1.2" strokeDasharray="4,4" />
            <rect x="300" y="660" width="160" height="130" fill="url(#warning-hatch)" opacity="0.3" />
            <text x="310" y="680" fill="#FF5A45" fontFamily="var(--font-header)" fontSize="10" fontWeight="600">WELDING ZONE C</text>

            {/* 4. Loading Dock B */}
            <rect x="700" y="600" width="200" height="150" fill="none" stroke="rgba(62, 106, 224, 0.2)" strokeWidth="1.2" />
            <rect x="700" y="600" width="200" height="150" fill="rgba(62, 106, 224, 0.01)" />
            <text x="710" y="620" fill="rgba(62, 106, 224, 0.5)" fontFamily="var(--font-header)" fontSize="10" fontWeight="600">LOADING BAY B</text>

            {/* 5. Restricted Zone Press Machine A */}
            <rect x="150" y="240" width="150" height="130" fill="none" stroke="rgba(255, 90, 69, 0.3)" strokeWidth="1.2" />
            <rect x="150" y="240" width="150" height="130" fill="url(#warning-hatch)" opacity="0.5" />
            <text x="160" y="256" fill="#FF5A45" fontFamily="var(--font-header)" fontSize="9" fontWeight="600">RESTRICTED ZONE: PRESS A</text>

            {/* Weather Radar Style Multilayered Heatmap Blended Layer */}
            <g filter="url(#heatmap-blur-filter)">
              {HEAT_SPOTS.map((spot, index) => {
                const intensity = spot.incidentsTimeline[timelineStep] * multiplier;
                const radius = spot.radius * (0.8 + intensity * 0.45);
                
                const isCritical = intensity >= 0.75;
                const isHigh = intensity >= 0.5;
                const isModerate = intensity >= 0.25;

                return (
                  <g key={`heatspot-${index}`}>
                    {/* Safe (Green) Outer Limit */}
                    <circle
                      cx={spot.cx}
                      cy={spot.cy}
                      r={radius}
                      fill="#00D084"
                      opacity={Math.min(0.85, intensity * spot.maxOpacity * 0.3)}
                      style={{ transition: 'r 0.6s ease' }}
                    />
                    {/* Moderate (Peach) Tier */}
                    {isModerate && (
                      <circle
                        cx={spot.cx}
                        cy={spot.cy}
                        r={radius * 0.75}
                        fill="#FF7360"
                        opacity={Math.min(0.85, intensity * spot.maxOpacity * 0.55)}
                        style={{ transition: 'r 0.6s ease' }}
                      />
                    )}
                    {/* High (Orange) Tier */}
                    {isHigh && (
                      <circle
                        cx={spot.cx}
                        cy={spot.cy}
                        r={radius * 0.5}
                        fill="#FF9100"
                        opacity={Math.min(0.85, intensity * spot.maxOpacity * 0.75)}
                        style={{ transition: 'r 0.6s ease' }}
                      />
                    )}
                    {/* Critical (Peach Coral) Core */}
                    {isCritical && (
                      <circle
                        cx={spot.cx}
                        cy={spot.cy}
                        r={radius * 0.25}
                        fill="#FF5A45"
                        opacity={Math.min(0.95, intensity * spot.maxOpacity * 0.95)}
                        style={{ transition: 'r 0.6s ease' }}
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Unblurred Precision Weather Contours & Sensor Labels */}
            {HEAT_SPOTS.map((spot, index) => {
              const intensity = spot.incidentsTimeline[timelineStep] * multiplier;
              const radius = spot.radius * (0.8 + intensity * 0.45);
              
              const isCritical = intensity >= 0.75;
              const isHigh = intensity >= 0.5;
              const isModerate = intensity >= 0.25;

              return (
                <g key={`contour-${index}`} style={{ transition: 'all 0.6s ease' }}>
                  {/* Outer Limit Boundary (Green dashed) */}
                  <circle
                    cx={spot.cx}
                    cy={spot.cy}
                    r={radius}
                    fill="none"
                    stroke="#00D084"
                    strokeWidth="0.8"
                    strokeDasharray="4, 6"
                    opacity="0.3"
                  />
                  {/* Moderate Boundary (Peach dashed) */}
                  {isModerate && (
                    <circle
                      cx={spot.cx}
                      cy={spot.cy}
                      r={radius * 0.75}
                      fill="none"
                      stroke="#FF7360"
                      strokeWidth="0.6"
                      strokeDasharray="2, 4"
                      opacity="0.45"
                    />
                  )}
                  {/* High Boundary (Orange solid) */}
                  {isHigh && (
                    <circle
                      cx={spot.cx}
                      cy={spot.cy}
                      r={radius * 0.5}
                      fill="none"
                      stroke="#FF9100"
                      strokeWidth="0.8"
                      opacity="0.6"
                    />
                  )}
                  {/* Critical Core Boundary (Peach Coral solid) */}
                  {isCritical && (
                    <circle
                      cx={spot.cx}
                      cy={spot.cy}
                      r={radius * 0.25}
                      fill="none"
                      stroke="#FF5A45"
                      strokeWidth="1.2"
                      strokeDasharray="1, 2"
                      opacity="0.85"
                    />
                  )}
                  
                  {/* Contour Level Tag at 45 degree angle limit */}
                  <text
                    x={spot.cx + radius * 0.707}
                    y={spot.cy - radius * 0.707}
                    fill={isCritical ? '#FF5A45' : (isHigh ? '#FF9100' : (isModerate ? '#FF7360' : '#00D084'))}
                    fontFamily="var(--font-label)"
                    fontSize="7"
                    fontWeight="600"
                    opacity="0.65"
                  >
                    {isCritical ? 'CRIT' : (isHigh ? 'HIGH' : (isModerate ? 'MOD' : 'SAFE'))} ({(intensity * 100).toFixed(0)}%)
                  </text>
                </g>
              );
            })}

            {/* Dynamic visual particles in high risk spots */}
            {timelineStep >= 3 && (
              <g opacity="0.85">
                <circle cx="210" cy="290" r="1.5" fill="#FF5A45" className="pulse-p-1" />
                <circle cx="230" cy="310" r="1.8" fill="#FF5A45" className="pulse-p-2" />
                <circle cx="225" cy="280" r="1.2" fill="#FF5A45" className="pulse-p-3" />
                <circle cx="170" cy="610" r="1.5" fill="#FF5A45" className="pulse-p-1" />
                <circle cx="160" cy="630" r="1.2" fill="#FF5A45" className="pulse-p-3" />
              </g>
            )}

            {/* Precision sensor crosshair dots */}
            {HEAT_SPOTS.map((spot, index) => (
              <g key={`pin-${index}`}>
                <circle cx={spot.cx} cy={spot.cy} r="2" fill="var(--color-neutral)" opacity="0.6" />
                <circle cx={spot.cx} cy={spot.cy} r="6" fill="none" stroke="var(--color-neutral)" strokeWidth="0.5" opacity="0.3" />
              </g>
            ))}

            {/* Worker Trajectory Overlays */}
            {/* Worker W-01: Breaches Press Machine A Restricted Area */}
            <g>
              {w1Trail.length > 1 && (
                <polyline
                  points={w1Trail.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={timelineStep >= 4 ? '#FF5A45' : '#5ACDD9'}
                  strokeWidth="2.2"
                  strokeOpacity="0.4"
                />
              )}
              {w1Forecast.length > 1 && (
                <polyline
                  points={w1Forecast.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3E6AE0"
                  strokeWidth="1.8"
                  strokeDasharray="3,4"
                  strokeOpacity="0.7"
                />
              )}
              <circle cx={w1Current.x} cy={w1Current.y} r="6.5" fill={timelineStep >= 4 ? '#FF5A45' : '#5ACDD9'} stroke="#000000" strokeWidth="1.8" />
              <text x={w1Current.x + 9} y={w1Current.y + 3} fill="var(--color-silver)" fontFamily="var(--font-metric)" fontSize="9.5" fontWeight="700">W-01</text>
            </g>

            {/* Worker W-02: Walking nominal corridor travel lane */}
            <g>
              {w2Trail.length > 1 && (
                <polyline
                  points={w2Trail.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3E6AE0"
                  strokeWidth="2.2"
                  strokeOpacity="0.4"
                />
              )}
              {w2Forecast.length > 1 && (
                <polyline
                  points={w2Forecast.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3E6AE0"
                  strokeWidth="1.8"
                  strokeDasharray="3,4"
                  strokeOpacity="0.7"
                />
              )}
              <circle cx={w2Current.x} cy={w2Current.y} r="6.5" fill="#3E6AE0" stroke="#000000" strokeWidth="1.8" />
              <text x={w2Current.x + 9} y={w2Current.y + 3} fill="var(--color-silver)" fontFamily="var(--font-metric)" fontSize="9.5" fontWeight="700">W-02</text>
            </g>

            {/* Worker W-03: Breaches Welding Zone C */}
            <g>
              {w3Trail.length > 1 && (
                <polyline
                  points={w3Trail.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={timelineStep >= 7 ? '#FF5A45' : '#5ACDD9'}
                  strokeWidth="2.2"
                  strokeOpacity="0.4"
                />
              )}
              {w3Forecast.length > 1 && (
                <polyline
                  points={w3Forecast.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3E6AE0"
                  strokeWidth="1.8"
                  strokeDasharray="3,4"
                  strokeOpacity="0.7"
                />
              )}
              <circle cx={w3Current.x} cy={w3Current.y} r="6.5" fill={timelineStep >= 7 ? '#FF5A45' : '#5ACDD9'} stroke="#000000" strokeWidth="1.8" />
              <text x={w3Current.x + 9} y={w3Current.y + 3} fill="var(--color-silver)" fontFamily="var(--font-metric)" fontSize="9.5" fontWeight="700">W-03</text>
            </g>

            {/* Worker W-05 Trajectory Pathway */}
            <g>
              {w5Trail.length > 1 && (
                <polyline
                  points={w5Trail.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={isApproachingCollision ? '#FF5A45' : '#5ACDD9'}
                  strokeWidth="2.2"
                  strokeOpacity="0.4"
                />
              )}
              {w5Forecast.length > 1 && (
                <polyline
                  points={w5Forecast.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#FF9100"
                  strokeWidth="1.8"
                  strokeDasharray="3,4"
                  strokeOpacity="0.7"
                />
              )}
              <circle cx={w5Current.x} cy={w5Current.y} r="6.5" fill={isApproachingCollision ? '#FF5A45' : '#5ACDD9'} stroke="#000000" strokeWidth="1.8" />
              <text x={w5Current.x + 9} y={w5Current.y + 3} fill="var(--color-silver)" fontFamily="var(--font-metric)" fontSize="9.5" fontWeight="700">W-05</text>
            </g>

            {/* Forklift F-01 Bounding Diamond Pathway */}
            <g>
              {f1Trail.length > 1 && (
                <polyline
                  points={f1Trail.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3E6AE0"
                  strokeWidth="2.2"
                  strokeOpacity="0.4"
                />
              )}
              {f1Forecast.length > 1 && (
                <polyline
                  points={f1Forecast.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#3E6AE0"
                  strokeWidth="1.8"
                  strokeDasharray="3,4"
                  strokeOpacity="0.7"
                />
              )}
              {/* Diamond-shaped vehicle boundary box */}
              <rect
                x={f1Current.x - 7}
                y={f1Current.y - 7}
                width="14"
                height="14"
                fill="#FF7360"
                stroke="#000000"
                strokeWidth="1.8"
                transform={`rotate(45, ${f1Current.x}, ${f1Current.y})`}
              />
              <text x={f1Current.x + 10} y={f1Current.y + 3} fill="var(--color-silver)" fontFamily="var(--font-metric)" fontSize="9.5" fontWeight="700">F-01</text>
            </g>

            {/* Trajectory Collision Risk Alert (Timeline steps 3 to 7) */}
            {isApproachingCollision && (
              <g>
                {/* Target Reticle at Intersection Point */}
                <circle cx="640" cy="480" r="18" fill="none" stroke="#FF5A45" strokeWidth="1.5" strokeDasharray="3, 2" className="pulse-p-2" />
                <circle cx="640" cy="480" r="6" fill="none" stroke="#FF5A45" strokeWidth="1.2" />
                <line x1="620" y1="480" x2="660" y2="480" stroke="#FF5A45" strokeWidth="0.8" />
                <line x1="640" y1="460" x2="640" y2="500" stroke="#FF5A45" strokeWidth="0.8" />
                
                {/* Dotted lines connecting entities to intersection point */}
                <line x1={w5Current.x} y1={w5Current.y} x2="640" y2="480" stroke="#FF5A45" strokeWidth="1" strokeDasharray="2, 2" opacity="0.6" />
                <line x1={f1Current.x} y1={f1Current.y} x2="640" y2="480" stroke="#FF5A45" strokeWidth="1" strokeDasharray="2, 2" opacity="0.6" />
                
                {/* Text indicator overlay near collision center */}
                <g transform="translate(660, 442)">
                  <rect x="0" y="0" width="135" height="38" fill="rgba(0, 0, 0, 0.85)" stroke="#FF5A45" strokeWidth="1.2" rx="2" />
                  <text x="8" y="12" fill="#FF5A45" fontFamily="var(--font-header)" fontSize="8" fontWeight="700">⚠ TRAJECTORY RISK ALERT</text>
                  <text x="8" y="22" fill="var(--color-silver)" fontFamily="var(--font-metric)" fontSize="7.5" fontWeight="600">Collision Risk: {collisionRisk}</text>
                  <text x="8" y="31" fill="var(--color-silver)" fontFamily="var(--font-metric)" fontSize="7.5" fontWeight="600">ETA: {collisionEta}</text>
                </g>
              </g>
            )}

            {/* Welding Zone Entry Warning */}
            {timelineStep >= 6 && (
              <g>
                <circle cx="380" cy="670" r="14" fill="none" stroke="#FF5A45" strokeWidth="1.5" className="pulse-p-2" />
                <circle cx="380" cy="670" r="3" fill="#FF5A45" />
                <text x="390" y="662" fill="#FF5A45" fontFamily="var(--font-metric)" fontSize="8" fontWeight="700">⚠ WELDING ENTRY BREACH</text>
              </g>
            )}

            {/* Grid coordinate system annotations */}
            <text x="35" y="55" fill="rgba(255,255,255,0.06)" fontFamily="var(--font-body)" fontSize="10">GRID A-01</text>
            <text x="910" y="55" fill="rgba(255,255,255,0.06)" fontFamily="var(--font-body)" fontSize="10">GRID B-08</text>
            <text x="35" y="960" fill="rgba(255,255,255,0.06)" fontFamily="var(--font-body)" fontSize="10">GRID C-04</text>
            <text x="910" y="960" fill="rgba(255,255,255,0.06)" fontFamily="var(--font-body)" fontSize="10">GRID D-12</text>
          </svg>
        </div>

        {/* Interactive Playback Scrubber Control */}
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--color-bg-card)'
          }}
        >
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: 'var(--color-accent-dim)',
              border: '1px solid var(--border-color)',
              color: 'var(--color-accent)',
              borderRadius: '2px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>

          {/* Slider */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: '10px', fontWeight: 600, color: 'var(--color-silver)' }}>
                PLAYBACK STEPS: {getTimelineLabel(timelineStep)}
              </span>
              <span style={{ fontFamily: "var(--font-label)", fontSize: '9px', color: 'var(--color-accent)', fontWeight: 600, letterSpacing: '0.05em' }}>
                {isPlaying ? '▶ STREAM REPLAY ACTIVE' : '■ FEED PAUSED'}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '3px' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => {
                const isActive = step === timelineStep;
                return (
                  <button
                    key={step}
                    onClick={() => { setTimelineStep(step); setIsPlaying(false); }}
                    style={{
                      flex: 1,
                      height: '5px',
                      background: isActive ? 'var(--color-accent)' : 'var(--color-bg-deep)',
                      border: 'none',
                      borderRadius: '1px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls Panel */}
      <div
        className="hud-panel"
        style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--border-color)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          minHeight: 0,
        }}
      >
        {/* Executive summary block */}
        <div
          style={{
            background: 'var(--color-danger-dim)',
            border: '1px solid var(--color-critical)',
            padding: '12px 14px',
            borderRadius: '2px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontFamily: "var(--font-header)", fontSize: '10px', fontWeight: 600, color: '#FF5A45', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={11} style={{ color: '#FF5A45' }} />
            AI ANOMALY SUMMARIZATION
          </div>
          <div style={{ fontFamily: "var(--font-body)", fontSize: '10.5px', color: 'var(--color-silver)', lineHeight: 1.45 }}>
            Highest risk concentration detected near Press Machine A. Risk density increased 18% over previous shift. Predicted PPE violation probability: 82%.
          </div>
        </div>

        {/* Top Hazard Areas (High Density Widget) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              fontFamily: "var(--font-header)",
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-silver)',
              letterSpacing: '0.06em',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={12} style={{ color: '#FF7360' }} />
            TOP HAZARD AREAS
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <HazardAreaRow label="Press Machine A" risk={pressMachineRisk} color="#FF5A45" />
            <HazardAreaRow label="Forklift Lane B" risk={forkliftLaneRisk} color="#FF9100" />
            <HazardAreaRow label="Welding Zone C" risk={weldingZoneRisk} color="#FF7360" />
            <HazardAreaRow label="Loading Bay B" risk={loadingBayRisk} color="#00D084" />
          </div>
        </div>

        {/* Compact Time Range Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              fontFamily: "var(--font-header)",
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--color-silver)',
              letterSpacing: '0.06em',
              borderBottom: '1px solid var(--border-color)',
              paddingBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Calendar size={12} style={{ color: 'var(--color-nominal)' }} />
            TIME RANGE SELECTION
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <FilterBtn active={filter === '10m'} onClick={() => setFilter('10m')} label="10 Minutes Overview" />
            <FilterBtn active={filter === '1h'} onClick={() => setFilter('1h')} label="1 Hour Real-time Feed" />
            <FilterBtn active={filter === 'shift'} onClick={() => setFilter('shift')} label="Morning Shift Cumulative" />
            <FilterBtn active={filter === '24h'} onClick={() => setFilter('24h')} label="24 Hours Aggregate" />
            <FilterBtn active={filter === '7d'} onClick={() => setFilter('7d')} label="7 Days Cumulative Log" />
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            background: '#000000',
            padding: '10px 12px',
            borderRadius: '2px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: 'auto'
          }}
        >
          <div style={{ fontFamily: "var(--font-header)", fontSize: '9.5px', fontWeight: 600, color: 'var(--color-silver)', letterSpacing: '0.06em' }}>
            OPERATIONAL DENSITY LEGEND
          </div>
          <LegendRow color="#FF5A45" level="CRITICAL DENSITY (Coral)" desc="Extreme risk zones with active collision pathways." />
          <LegendRow color="#FF9100" level="HIGH HAZARD (Orange)" desc="Press machine entry limits or high velocity machinery." />
          <LegendRow color="#FF7360" level="MODERATE HAZARD (Peach)" desc="Caution areas: walkways or forklift travel lanes." />
          <LegendRow color="#00D084" level="NOMINAL DENSITY (Green)" desc="Compliant worker zones and baseline routes." />
        </div>
      </div>
      
      <style>{`
        @keyframes pulse-particle {
          0% { opacity: 0.2; r: 1px; }
          50% { opacity: 0.8; r: 2.2px; }
          100% { opacity: 0.2; r: 1px; }
        }
        .pulse-p-1 { animation: pulse-particle 2s infinite ease-in-out; }
        .pulse-p-2 { animation: pulse-particle 2.8s infinite ease-in-out; }
        .pulse-p-3 { animation: pulse-particle 1.8s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, color }) => {
  return (
    <div
      style={{
        background: 'var(--color-bg-deep)',
        border: '1px solid var(--border-color)',
        padding: '5px 8px',
        borderRadius: '2px',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      }}
    >
      <span style={{ fontFamily: 'var(--font-label)', fontSize: '8px', color: 'var(--color-neutral)', opacity: 0.65, letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-metric)', fontSize: '15px', fontWeight: 600, color }}>
        {value}
      </span>
    </div>
  );
};

interface HazardAreaRowProps {
  label: string;
  risk: number;
  color: string;
}

const HazardAreaRow: React.FC<HazardAreaRowProps> = ({ label, risk, color }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--color-silver)' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-metric)', fontSize: '10.5px', fontWeight: 600, color }}>
          Risk {risk}
        </span>
      </div>
      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{ width: `${risk}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

interface FilterBtnProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

const FilterBtn: React.FC<FilterBtnProps> = ({ active, onClick, label }) => {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'var(--color-bg-elevated)' : 'transparent',
        border: 'none',
        borderLeft: active ? '2.5px solid var(--color-nominal)' : '2.5px solid transparent',
        color: active ? 'var(--color-silver)' : 'var(--color-neutral)',
        padding: '6px 12px',
        fontFamily: "var(--font-body)",
        fontSize: '10.5px',
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        width: '100%',
        borderRadius: '0 2px 2px 0'
      }}
    >
      {label}
    </button>
  );
};

interface LegendRowProps {
  color: string;
  level: string;
  desc: string;
}

const LegendRow: React.FC<LegendRowProps> = ({ color, level, desc }) => {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
      <div style={{ width: '8px', height: '8px', background: color, borderRadius: '1px', flexShrink: 0, marginTop: '3px' }} />
      <div>
        <div style={{ fontFamily: "var(--font-header)", fontSize: '10px', fontWeight: 600, color: '#F2F5F8' }}>{level}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: '9.5px', color: '#D8D8D8', opacity: 0.85, marginTop: '2px', lineHeight: '1.4' }}>{desc}</div>
      </div>
    </div>
  );
};
