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
      className="hud-panel"
      style={{
        width: '100%',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Title block */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={12} style={{ color: '#8B5CF6' }} />
          <span style={{ fontFamily: "'Sora', sans-serif", fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}>
            PREDICTIVE TIMELINE — NEXT 5s
          </span>
        </div>
        <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: '10px', fontWeight: 500, color: '#22C55E' }}>PREDICTIVE: ACTIVE</span>
      </div>

      {/* The Timeline Track */}
      <div
        style={{
          position: 'relative',
          height: '56px',
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '4px',
          margin: '4px 0',
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
              borderLeft: tick === 0 ? '2px solid #EF4444' : '1px dashed rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '9px',
                fontWeight: 500,
                color: tick === 0 ? '#EF4444' : 'rgba(255,255,255,0.3)',
                transform: 'translateY(16px)',
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
          let color = '#F59E0B';
          let shadowStr = '0 0 4px rgba(245,158,11,0.5)';

          if (marker.severity === 'critical') {
            color = '#EF4444';
            shadowStr = '0 0 6px rgba(239,68,68,0.6)';
            icon = <ShieldAlert size={10} className="critical-flash-active" />;
          } else if (marker.type === 'zone_entry') {
            color = '#8B5CF6';
            shadowStr = '0 0 5px rgba(139,92,246,0.5)';
            icon = <Flame size={10} />;
          } else if (marker.type === 'collision') {
            color = '#EF4444';
            shadowStr = '0 0 5px rgba(239,68,68,0.5)';
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
                  height: '12px',
                  background: color,
                  marginBottom: '2px',
                  opacity: 0.6,
                }}
              />

              {/* Marker node */}
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#1A1A1A',
                  border: `1.5px solid ${color}`,
                  boxShadow: shadowStr,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                }}
              >
                {icon}
              </div>

              {/* Float-up label card */}
              <div
                style={{
                  position: 'absolute',
                  top: '-34px',
                  background: 'rgba(18,18,18,0.97)',
                  border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: '3px',
                  padding: '2px 7px',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '9px',
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.75)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ color, fontWeight: 600 }}>{marker.timeRemainingSec.toFixed(1)}s</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
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
