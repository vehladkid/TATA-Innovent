import React, { useEffect, useState } from 'react';
import { useEventStore } from '../../lib/event-store';
import { AlertCircle, Zap, ShieldAlert, Truck, Flame } from 'lucide-react';

interface TimelineMarker {
  id: string;
  timeRemainingSec: number;
  label: string;
  workerId: number;
  type: 'zone_entry' | 'ppe' | 'forklift' | 'collision';
  severity: 'critical' | 'danger' | 'caution';
}

export const ThreatTimeline: React.FC = () => {
  const activeWorkers = useEventStore((state) => state.activeWorkers);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);

  useEffect(() => {
    // Generate/update timeline markers based on active worker telemetry
    const newMarkers: TimelineMarker[] = [];
    const workers = Object.values(activeWorkers);

    workers.forEach((w) => {
      // 1. Predicted entry marker
      if (w.predictedEntryMs && w.predictedEntryMs > 0) {
        const timeSec = w.predictedEntryMs / 1000;
        let type: 'zone_entry' | 'collision' = 'zone_entry';
        let label = `W-00${w.trackId} Press Zone A Entry`;
        
        if (w.zoneId === 'zone_forklift_lane') {
          type = 'collision';
          label = `W-00${w.trackId} Forklift Collision Risk`;
        } else if (w.zoneId === 'zone_welding_bay') {
          label = `W-00${w.trackId} Welding Flash Exposure`;
        }

        newMarkers.push({
          id: `${w.trackId}-entry-${w.timestamp}`,
          timeRemainingSec: timeSec,
          label,
          workerId: w.trackId,
          type,
          severity: w.band === 'critical' ? 'critical' : 'danger',
        });
      }

      // 2. PPE Violations
      if (!w.helmet || !w.vest) {
        const timeSec = 2.0 + (w.trackId % 3); // Simulated future time marker
        const parts = [];
        if (!w.helmet) parts.push('No Helmet');
        if (!w.vest) parts.push('No Vest');

        newMarkers.push({
          id: `${w.trackId}-ppe`,
          timeRemainingSec: timeSec,
          label: `W-00${w.trackId} PPE Check: ${parts.join('/')}`,
          workerId: w.trackId,
          type: 'ppe',
          severity: 'caution',
        });
      }

      // 3. High velocity crossings
      const speed = Math.sqrt(w.vx * w.vx + w.vy * w.vy);
      if (speed > 0.05 && w.band !== 'safe') {
        newMarkers.push({
          id: `${w.trackId}-speed`,
          timeRemainingSec: 3.8,
          label: `W-00${w.trackId} Rapid Speed Warning`,
          workerId: w.trackId,
          type: 'forklift',
          severity: 'caution',
        });
      }
    });

    // Merge markers and deduplicate by workerId + type
    setMarkers((prev) => {
      const merged = [...newMarkers];
      
      // Let existing markers tick down, only add new ones if they don't exist
      prev.forEach((old) => {
        const isStillValid = old.timeRemainingSec > 0.05;
        const existsInNew = newMarkers.some(n => n.workerId === old.workerId && n.type === old.type);
        if (isStillValid && !existsInNew) {
          // Keep the old ticking down marker
          merged.push({
            ...old,
            timeRemainingSec: old.timeRemainingSec - 0.1 // tick down
          });
        }
      });

      // Filter duplicates prioritizing newer ones
      const unique: Record<string, TimelineMarker> = {};
      merged.forEach(m => {
        const key = `${m.workerId}-${m.type}`;
        if (!unique[key] || m.timeRemainingSec < unique[key].timeRemainingSec) {
          unique[key] = m;
        }
      });

      return Object.values(unique)
        .filter(m => m.timeRemainingSec > 0 && m.timeRemainingSec <= 5.0)
        .sort((a, b) => a.timeRemainingSec - b.timeRemainingSec);
    });
  }, [activeWorkers]);

  // Tick down timeline markers smoothly every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      setMarkers((prev) =>
        prev
          .map((m) => ({
            ...m,
            timeRemainingSec: Math.max(0, m.timeRemainingSec - 0.1),
          }))
          .filter((m) => m.timeRemainingSec > 0)
      );
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="hud-panel tech-corners"
      style={{
        width: '100%',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: 'rgba(5, 7, 18, 0.85)',
        border: '1px solid rgba(0, 243, 255, 0.2)',
      }}
    >
      {/* Title block */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '11px',
          letterSpacing: '1px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={13} className="glow-text-purple" style={{ color: '#b026ff' }} />
          <span style={{ color: '#b026ff', fontWeight: 'bold' }}>TEMPORAL THREAT TIMELINE (NEXT 5.0s PREDICTIONS)</span>
        </div>
        <div style={{ color: '#00f3ff', opacity: 0.8 }}>PREDICTIVE MODE: ACTIVE</div>
      </div>

      {/* The Timeline Track */}
      <div
        style={{
          position: 'relative',
          height: '60px',
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(0, 102, 255, 0.15)',
          borderRadius: '4px',
          margin: '10px 0 5px 0',
        }}
      >
        {/* Timeline grid scale ticks */}
        {[0, 1, 2, 3, 4, 5].map((tick) => (
          <div
            key={tick}
            style={{
              position: 'absolute',
              left: `${(tick / 5) * 100}%`,
              bottom: 0,
              top: 0,
              width: '1px',
              borderLeft: tick === 0 ? '2px solid #ff003c' : '1px dashed rgba(255, 255, 255, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '9px',
                color: tick === 0 ? '#ff003c' : 'rgba(255, 255, 255, 0.4)',
                transform: 'translateY(16px)',
                fontWeight: 'bold',
              }}
            >
              {tick === 0 ? 'NOW' : `+${tick}s`}
            </span>
          </div>
        ))}

        {/* Hazard timeline slider nodes */}
        {markers.map((marker) => {
          const positionPercent = (marker.timeRemainingSec / 5.0) * 100;
          
          let icon = <AlertCircle size={10} />;
          let color = '#ffaa00';
          let glow = '0 0 8px #ffaa00';
          
          if (marker.severity === 'critical') {
            color = '#ff003c';
            glow = '0 0 15px #ff003c';
            icon = <ShieldAlert size={10} className="critical-flash-active" />;
          } else if (marker.type === 'zone_entry') {
            color = '#b026ff';
            glow = '0 0 12px #b026ff';
            icon = <Flame size={10} />;
          } else if (marker.type === 'collision') {
            color = '#ff4400';
            glow = '0 0 12px #ff4400';
            icon = <Truck size={10} />;
          }

          return (
            <div
              key={marker.id}
              style={{
                position: 'absolute',
                left: `${positionPercent}%`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                zIndex: 10,
                transition: 'left 0.1s linear',
              }}
            >
              {/* Connector line */}
              <div
                style={{
                  width: '1px',
                  height: '14px',
                  background: color,
                  marginBottom: '2px',
                  boxShadow: `0 0 4px ${color}`,
                }}
              />

              {/* Pulsing indicator node */}
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#040510',
                  border: `2px solid ${color}`,
                  boxShadow: glow,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                }}
              >
                {icon}
              </div>

              {/* Float-up card label */}
              <div
                style={{
                  position: 'absolute',
                  top: '-36px',
                  background: 'rgba(5, 7, 20, 0.95)',
                  border: `1px solid ${color}`,
                  boxShadow: `inset 0 0 5px ${color}33`,
                  borderRadius: '2px',
                  padding: '2px 6px',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '9px',
                  fontWeight: 'bold',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ color }}>{marker.timeRemainingSec.toFixed(1)}s</span>
                <span>→</span>
                <span>{marker.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Spacer to balance scale offsets */}
      <div style={{ height: '8px' }} />
    </div>
  );
};
