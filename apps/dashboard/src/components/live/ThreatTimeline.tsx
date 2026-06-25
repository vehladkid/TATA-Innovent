import React, { useEffect, useState } from 'react';
import { useEventStore } from '../../lib/event-store';
import { AlertCircle, ShieldAlert, Zap, Truck, Flame } from 'lucide-react';

interface TimelineMarker {
  id: string;
  timeRemainingSec: number;
  label: string;
  workerId: number;
  type: 'zone_entry' | 'ppe' | 'forklift' | 'collision';
  severity: 'critical' | 'danger' | 'caution';
  confidence: number;
}

export const ThreatTimeline: React.FC = () => {
  const activeWorkers = useEventStore((state) => state.activeWorkers);
  const [markers, setMarkers] = useState<TimelineMarker[]>([]);

  useEffect(() => {
    const newMarkers: TimelineMarker[] = [];
    const workers = Object.values(activeWorkers);

    workers.forEach((w) => {
      const baseConfidence = 90 + (w.trackId % 10);

      // 1. Predicted entry marker
      if (w.predictedEntryMs && w.predictedEntryMs > 0) {
        const timeSec = w.predictedEntryMs / 1000;
        let type: 'zone_entry' | 'collision' = 'zone_entry';
        let label = `W-0${w.trackId} Zone Breach`;
        
        if (w.zoneId === 'zone_forklift_lane') {
          type = 'collision';
          label = `W-0${w.trackId} Vehicle Proximity`;
        } else if (w.zoneId === 'zone_welding_bay') {
          label = `W-0${w.trackId} Flash Hazard`;
        }

        newMarkers.push({
          id: `${w.trackId}-entry-${w.timestamp}`,
          timeRemainingSec: timeSec,
          label,
          workerId: w.trackId,
          type,
          severity: w.band === 'critical' ? 'critical' : 'danger',
          confidence: baseConfidence,
        });
      }

      // 2. PPE checks predicted anomaly
      if (!w.helmet || !w.vest) {
        const timeSec = 2.4 + (w.trackId % 3) * 0.7; 
        const parts = [];
        if (!w.helmet) parts.push('No Helmet');
        if (!w.vest) parts.push('No Vest');

        newMarkers.push({
          id: `${w.trackId}-ppe`,
          timeRemainingSec: timeSec,
          label: `W-0${w.trackId} PPE Check`,
          workerId: w.trackId,
          type: 'ppe',
          severity: 'caution',
          confidence: baseConfidence - 5,
        });
      }

      // 3. Movement velocity vector projections
      const speed = Math.sqrt(w.vx * w.vx + w.vy * w.vy);
      if (speed > 0.05 && w.band !== 'safe') {
        newMarkers.push({
          id: `${w.trackId}-speed`,
          timeRemainingSec: 3.4,
          label: `W-0${w.trackId} Velocity Alert`,
          workerId: w.trackId,
          type: 'forklift',
          severity: 'caution',
          confidence: baseConfidence - 2,
        });
      }
    });

    setMarkers((prev) => {
      const merged = [...newMarkers];
      
      prev.forEach((old) => {
        const isStillValid = old.timeRemainingSec > 0.05;
        const existsInNew = newMarkers.some(n => n.workerId === old.workerId && n.type === old.type);
        if (isStillValid && !existsInNew) {
          merged.push({
            ...old,
            timeRemainingSec: old.timeRemainingSec - 0.1
          });
        }
      });

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
        height: '100%',
        padding: '6px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#101010', // Panel base surface: charcoal
        border: '1px solid #252525',
      }}
    >
      <style>{`
        @keyframes rail-flow {
          0% { background-position: 0px 0; }
          100% { background-position: 24px 0; }
        }
        .prediction-rail-track-v2 {
          background-image: repeating-linear-gradient(90deg, transparent, transparent 8px, #252525 8px, #252525 14px);
          background-size: 24px 1.5px;
          animation: rail-flow 2s linear infinite;
        }
      `}</style>

      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Zap size={10} style={{ color: '#5ACDD9' }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: '10px', fontWeight: 600, color: '#EAEAEA', letterSpacing: '0.05em' }}>
            PREDICTIVE EVENT RAIL
          </span>
        </div>
        <span style={{ fontFamily: "var(--font-label)", fontSize: '9px', fontWeight: 600, color: '#5ACDD9', opacity: 0.8 }}>
          CALIBRATED RESOLUTION FEED
        </span>
      </div>

      {/* Low-profile single-track prediction lane */}
      <div
        style={{
          position: 'relative',
          height: '18px', // Thinner height
          margin: '10px 8px 4px 8px',
          background: 'transparent',
        }}
      >
        {/* Core Single Rail track */}
        <div
          className="prediction-rail-track-v2"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            height: '1.5px',
          }}
        />

        {/* Timeline increments */}
        {[0, 1, 2, 3, 4, 5].map((tick) => (
          <div
            key={tick}
            style={{
              position: 'absolute',
              left: `${(tick / 5) * 100}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              borderLeft: tick === 0 ? '1.5px solid #FF5A45' : '1px dashed #252525',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-metric)", // IBM Plex Mono
                fontSize: '8px',
                fontWeight: 600,
                color: tick === 0 ? '#FF5A45' : 'rgba(255,255,255,0.22)',
                transform: 'translateY(14px)',
              }}
            >
              {tick === 0 ? 'NOW' : `+${tick}s`}
            </span>
          </div>
        ))}

        {/* Dynamic Nodes (Small, no glows or pings) */}
        {markers.map((marker) => {
          const positionPercent = (marker.timeRemainingSec / 5.0) * 100;
          
          let icon = <AlertCircle size={6} />;
          let color = '#FF7360'; // Warning Peach default

          if (marker.severity === 'critical') {
            color = '#FF5A45'; // Critical Coral Peach
            icon = <ShieldAlert size={6} />;
          } else if (marker.type === 'zone_entry') {
            color = '#5ACDD9'; // Nominal Turquoise
            icon = <Flame size={6} />;
          } else if (marker.type === 'collision') {
            color = '#FF5A45'; // Critical Coral Peach
            icon = <Truck size={6} />;
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
                zIndex: 10,
                transition: 'left 0.1s linear',
              }}
            >
              {/* Minimal Dot (No pings or glows) */}
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#050505', // Solid black core
                  border: `1.5px solid ${color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                }}
              >
                {icon}
              </div>

              {/* Minimal label card above the node (Bierika labels) */}
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  background: '#050505',
                  border: `1px solid #252525`,
                  borderRadius: '1px',
                  padding: '1px 4px',
                  whiteSpace: 'nowrap',
                  fontFamily: "var(--font-metric)", // IBM Plex Mono
                  fontSize: '8px',
                  color: '#EAEAEA',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  pointerEvents: 'none',
                }}
              >
                <span style={{ color, fontWeight: 700 }}>{marker.timeRemainingSec.toFixed(1)}s</span>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                <span>{marker.label}</span>
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                <span style={{ color: '#5ACDD9' }}>{marker.confidence}%</span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div style={{ height: '4px' }} />
    </div>
  );
};
