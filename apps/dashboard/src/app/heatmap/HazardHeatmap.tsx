import React, { useState, useEffect, useRef } from 'react';
import { useEventStore } from '../../lib/event-store';
import { Play, Pause, Calendar, Layers } from 'lucide-react';

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
    radius: 120,
    maxOpacity: 0.85,
    label: 'Press Machine Area A',
    incidentsTimeline: [0.1, 0.2, 0.4, 0.7, 0.85, 0.8, 0.5, 0.3, 0.2, 0.4]
  },
  {
    cx: 680,
    cy: 330,
    radius: 140, maxOpacity: 0.7,
    label: 'Forklift Crossing Lane',
    incidentsTimeline: [0.2, 0.3, 0.6, 0.5, 0.4, 0.6, 0.7, 0.5, 0.3, 0.1]
  },
  {
    cx: 380,
    cy: 730,
    radius: 100,
    maxOpacity: 0.5,
    label: 'Welding Bay C',
    incidentsTimeline: [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.45, 0.3, 0.2, 0.1]
  },
  {
    cx: 500,
    cy: 500,
    radius: 90,
    maxOpacity: 0.4,
    label: 'Boiler Valve Station',
    incidentsTimeline: [0.1, 0.15, 0.1, 0.2, 0.3, 0.4, 0.35, 0.2, 0.1, 0.05]
  }
];

export const HazardHeatmap: React.FC = () => {
  const [filter, setFilter] = useState<TimeFilter>('shift');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineStep, setTimelineStep] = useState(4); // 0 to 9 index

  const zones = useEventStore((state) => state.zones);
  const playTimerRef = useRef<any | null>(null);

  // Handle Playback animation loops
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setTimelineStep((prev) => (prev >= 9 ? 0 : prev + 1));
      }, 1000);
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

  // Adjust max heat intensities based on Selected Filter
  const getFilterMultiplier = () => {
    switch (filter) {
      case '10m': return 0.25;
      case '1h': return 0.5;
      case 'shift': return 1.0;
      case '24h': return 1.3;
      case '7d': return 1.8;
      default: return 1.0;
    }
  };

  const multiplier = getFilterMultiplier();

  // Helper formatting for timeline labels
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

  return (
    <div
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '16px',
        padding: '16px',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {/* Tactical Blueprint Stage */}
      <div
        className="hud-panel tech-corners"
        style={{
          background: 'rgba(5, 7, 24, 0.75)',
          border: '1px solid rgba(0, 243, 255, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {/* Sub Header Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderBottom: '1px solid rgba(0, 243, 255, 0.15)',
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={13} className="glow-text-cyan" style={{ color: '#00f3ff' }} />
            <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>RISK DISTRIBUTION HEATMAP (DIGITAL TWIN)</span>
          </div>
          <div style={{ color: '#ffaa00', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ffaa00', animation: 'reactor-pulse 1s infinite alternate' }} />
            <span>ACCUMULATING HISTORICAL INCIDENT DATA</span>
          </div>
        </div>

        {/* Blueprint Map Container */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 1000 1000" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <pattern id="grid-heatmap" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,102,255,0.04)" strokeWidth="1" />
              </pattern>
              
              {/* Radial Gradients representing heat spots */}
              {HEAT_SPOTS.map((spot, index) => {
                const currentIntensity = spot.incidentsTimeline[timelineStep] * multiplier;
                const opacity = Math.min(0.9, currentIntensity * spot.maxOpacity);
                
                return (
                  <radialGradient key={index} id={`heat-glow-${index}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ff003c" stopOpacity={opacity} />
                    <stop offset="25%" stopColor="#ffaa00" stopOpacity={opacity * 0.7} />
                    <stop offset="60%" stopColor="#ffea00" stopOpacity={opacity * 0.25} />
                    <stop offset="100%" stopColor="#ffea00" stopOpacity="0" />
                  </radialGradient>
                );
              })}
            </defs>

            <rect width="1000" height="1000" fill="url(#grid-heatmap)" />

            {/* Static outlines */}
            <rect x="20" y="20" width="960" height="960" fill="none" stroke="rgba(0, 243, 255, 0.1)" strokeWidth="2" strokeDasharray="5,5" />
            
            {/* Zones Boundaries */}
            {zones.map((zone) => {
              const polyPoints = zone.polygon
                .map((coord) => `${coord[0] * 1000},${coord[1] * 1000}`)
                .join(' ');

              return (
                <polygon
                  key={zone.zoneId}
                  points={polyPoints}
                  fill="none"
                  stroke="rgba(0,102,255,0.2)"
                  strokeWidth="1.5"
                  strokeDasharray="4,8"
                />
              );
            })}

            {/* Glowing heat circles */}
            {HEAT_SPOTS.map((spot, index) => (
              <circle
                key={index}
                cx={spot.cx}
                cy={spot.cy}
                r={spot.radius * (1.0 + Math.sin(timelineStep * 0.3) * 0.08)}
                fill={`url(#heat-glow-${index})`}
                style={{
                  transition: 'r 0.8s cubic-bezier(0.16, 1, 0.3, 1), fill 0.8s ease',
                }}
              />
            ))}

            {/* Grid references text */}
            <text x="35" y="55" fill="rgba(0,243,255,0.25)" fontFamily="'Orbitron', sans-serif" fontSize="12">SEC: A-1</text>
            <text x="920" y="55" fill="rgba(0,243,255,0.25)" fontFamily="'Orbitron', sans-serif" fontSize="12">SEC: B-2</text>
            <text x="35" y="960" fill="rgba(0,243,255,0.25)" fontFamily="'Orbitron', sans-serif" fontSize="12">SEC: C-3</text>
            <text x="920" y="960" fill="rgba(0,243,255,0.25)" fontFamily="'Orbitron', sans-serif" fontSize="12">SEC: D-4</text>
          </svg>
        </div>

        {/* Playback Controls Footer */}
        <div
          style={{
            padding: '16px',
            background: 'rgba(5, 7, 20, 0.9)',
            borderTop: '1px solid rgba(0, 243, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          {/* Play/Pause Button */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? 'rgba(255, 0, 60, 0.15)' : 'rgba(0, 243, 255, 0.15)',
              border: `1px solid ${isPlaying ? '#ff003c' : '#00f3ff'}`,
              color: isPlaying ? '#ff003c' : '#00f3ff',
              borderRadius: '4px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Timeline slider */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <span>TIMELINE PLAYBACK PLAYHEAD</span>
              <span style={{ color: '#00f3ff', fontWeight: 'bold' }}>
                CURRENT FRAME: {getTimelineLabel(timelineStep)}
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => {
                const isActive = step === timelineStep;
                return (
                  <button
                    key={step}
                    onClick={() => {
                      setTimelineStep(step);
                      setIsPlaying(false);
                    }}
                    style={{
                      flex: 1,
                      height: '8px',
                      background: isActive
                        ? 'linear-gradient(90deg, #ffaa00, #ff003c)'
                        : 'rgba(255, 255, 255, 0.08)',
                      border: 'none',
                      borderRadius: '1px',
                      cursor: 'pointer',
                      boxShadow: isActive ? '0 0 10px #ff003c' : 'none',
                      transition: 'all 0.2s ease',
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
        className="hud-panel tech-corners"
        style={{
          background: 'rgba(4, 5, 12, 0.85)',
          border: '1px solid rgba(0, 243, 255, 0.2)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          minHeight: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: '13px',
            color: '#00f3ff',
            fontWeight: 'bold',
            letterSpacing: '1px',
            borderBottom: '1px solid rgba(0,243,255,0.2)',
            paddingBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={15} style={{ color: '#00f3ff' }} />
          <span>TIME FILTER</span>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <FilterBtn active={filter === '10m'} onClick={() => setFilter('10m')} label="10 Minutes Overview" />
          <FilterBtn active={filter === '1h'} onClick={() => setFilter('1h')} label="1 Hour Telemetry" />
          <FilterBtn active={filter === 'shift'} onClick={() => setFilter('shift')} label="Current Morning Shift" />
          <FilterBtn active={filter === '24h'} onClick={() => setFilter('24h')} label="24 Hours Aggregate" />
          <FilterBtn active={filter === '7d'} onClick={() => setFilter('7d')} label="7 Days Cumulative Log" />
        </div>

        {/* Heatmap Legend */}
        <div
          style={{
            marginTop: '20px',
            background: 'rgba(0,0,0,0.4)',
            padding: '16px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px',
          }}
        >
          <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>
            ACCUMULATION LEGEND
          </div>

          <LegendRow color="rgba(255, 0, 60, 0.8)" level="CRITICAL DENSITY (+10 incidents)" desc="Immediate risk zone. Multiple boundary breaches and PPE failures." />
          <LegendRow color="rgba(255, 170, 0, 0.6)" level="HIGH RISK (4-9 incidents)" desc="High transit lane activity. Forklift crossing collision factors." />
          <LegendRow color="rgba(255, 234, 0, 0.35)" level="MODERATE ACTION (1-3 incidents)" desc="Occasional PPE alerts or awkward postures recorded." />
        </div>
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
        background: active ? 'rgba(0, 243, 255, 0.12)' : 'rgba(255,255,255,0.02)',
        border: active ? '1px solid #00f3ff' : '1px solid rgba(255,255,255,0.08)',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.7)',
        borderRadius: '3px',
        padding: '10px 14px',
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '10.5px',
        fontWeight: 'bold',
        textAlign: 'left',
        cursor: 'pointer',
        boxShadow: active ? '0 0 10px rgba(0, 243, 255, 0.15)' : 'none',
        transition: 'all 0.2s ease',
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
    <div style={{ display: 'flex', gap: '8px' }}>
      <div style={{ width: '12px', height: '12px', background: color, borderRadius: '2px', flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
      <div>
        <div style={{ fontWeight: 'bold', color: '#fff' }}>{level}</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', marginTop: '2px', lineHeight: '1.3' }}>{desc}</div>
      </div>
    </div>
  );
};
