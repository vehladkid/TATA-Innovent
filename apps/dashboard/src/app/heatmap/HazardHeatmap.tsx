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
        className="hud-panel"
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '9px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Layers size={12} style={{ color: '#00B8D9' }} />
            <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}>
              HAZARD DENSITY MAP
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} />
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>Accumulating incident data</span>
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
            <rect x="20" y="20" width="960" height="960" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeDasharray="6,6" />
            
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

            {/* Grid reference labels */}
            <text x="35" y="55" fill="rgba(255,255,255,0.1)" fontFamily="'Poppins', sans-serif" fontSize="11">A-1</text>
            <text x="920" y="55" fill="rgba(255,255,255,0.1)" fontFamily="'Poppins', sans-serif" fontSize="11">B-2</text>
            <text x="35" y="960" fill="rgba(255,255,255,0.1)" fontFamily="'Poppins', sans-serif" fontSize="11">C-3</text>
            <text x="920" y="960" fill="rgba(255,255,255,0.1)" fontFamily="'Poppins', sans-serif" fontSize="11">D-4</text>
          </svg>
        </div>

        {/* Playback Controls Footer */}
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              background: isPlaying ? 'rgba(239,68,68,0.12)' : 'rgba(0,184,217,0.1)',
              border: `1px solid ${isPlaying ? 'rgba(239,68,68,0.4)' : 'rgba(0,184,217,0.3)'}`,
              color: isPlaying ? '#EF4444' : '#00B8D9',
              borderRadius: '4px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0,
            }}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          </button>

          {/* Timeline scrubber */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', fontWeight: 500, color: 'rgba(255,255,255,0.3)' }}>
              {getTimelineLabel(timelineStep)}
            </span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => {
                const isActive = step === timelineStep;
                return (
                  <button
                    key={step}
                    onClick={() => { setTimelineStep(step); setIsPlaying(false); }}
                    style={{
                      flex: 1,
                      height: '6px',
                      background: isActive ? '#00B8D9' : 'rgba(255,255,255,0.07)',
                      border: 'none',
                      borderRadius: '2px',
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
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          minHeight: 0,
        }}
      >
        <div
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '11px',
            fontWeight: 600,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.06em',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            paddingBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={13} style={{ color: '#00B8D9' }} />
          TIME FILTER
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <FilterBtn active={filter === '10m'} onClick={() => setFilter('10m')} label="10 Minutes Overview" />
          <FilterBtn active={filter === '1h'} onClick={() => setFilter('1h')} label="1 Hour Telemetry" />
          <FilterBtn active={filter === 'shift'} onClick={() => setFilter('shift')} label="Current Morning Shift" />
          <FilterBtn active={filter === '24h'} onClick={() => setFilter('24h')} label="24 Hours Aggregate" />
          <FilterBtn active={filter === '7d'} onClick={() => setFilter('7d')} label="7 Days Cumulative Log" />
        </div>

        {/* Legend */}
        <div
          style={{
            background: 'rgba(255,255,255,0.02)',
            padding: '14px',
            borderRadius: '4px',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em' }}>
            DENSITY LEGEND
          </div>
          <LegendRow color="rgba(239,68,68,0.75)"   level="CRITICAL (+10 incidents)"       desc="Immediate risk zone. Multiple PPE failures and boundary breaches." />
          <LegendRow color="rgba(245,158,11,0.6)"  level="HIGH RISK (4-9 incidents)"       desc="High activity. Forklift crossing and collision factors." />
          <LegendRow color="rgba(245,235,0,0.3)"   level="MODERATE (1-3 incidents)"        desc="Occasional PPE alerts or awkward postures recorded." />
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
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #00B8D9' : '2px solid transparent',
        borderTop: '2px solid transparent',
        color: active ? '#ffffff' : 'rgba(255,255,255,0.5)',
        padding: '8px 0',
        fontFamily: "'Poppins', sans-serif",
        fontSize: '11px',
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        width: '100%',
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
      <div style={{ width: '10px', height: '10px', background: color, borderRadius: '2px', flexShrink: 0, marginTop: '2px' }} />
      <div>
        <div style={{ fontFamily: "'Sora', sans-serif", fontSize: '10.5px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{level}</div>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', lineHeight: '1.4' }}>{desc}</div>
      </div>
    </div>
  );
};
