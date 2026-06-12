import React from 'react';
import { AlertTicker } from '../../components/live/AlertTicker';
import { SortTrackerMap } from '../../components/live/SortTrackerMap';
import { LiveEventFeed } from '../../components/live/LiveEventFeed';
import { ThreatTimeline } from '../../components/live/ThreatTimeline';
import { useEventStore } from '../../lib/event-store';
import { ShieldAlert } from 'lucide-react';

export const LiveOps: React.FC = () => {
  const recentEvents = useEventStore((state) => state.recentEvents);

  const latestEvent = recentEvents[0];
  const isCriticalActive = latestEvent &&
                           latestEvent.band === 'critical' &&
                           (Date.now() - latestEvent.timestamp < 4000);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        height: '100%',
      }}
    >
      {/* Top Banner Ticker */}
      <AlertTicker />

      {/* Grid Layout */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '22% 56% 22%',
          gridTemplateRows: 'calc(100% - 130px) 130px',
          gap: '10px',
          padding: '10px',
          overflow: 'hidden',
        }}
      >
        {/* LEFT PANEL: SORT Tracker minimap */}
        <div style={{ minHeight: 0 }}>
          <SortTrackerMap mode="minimap" />
        </div>

        {/* CENTER PANEL: Main hologram stage */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: 0,
          }}
        >
          <div style={{ flex: 1, minHeight: 0 }}>
            <SortTrackerMap mode="hologram" />
          </div>

          {/* Critical incident popup */}
          {isCriticalActive && (
            <div
              className="hud-panel critical-flash-active"
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '400px',
                background: 'rgba(10,2,2,0.97)',
                border: '2px solid #EF4444',
                padding: '12px 16px',
                borderRadius: '6px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  background: '#EF4444',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={17} />
              </div>
              <div>
                <div style={{ fontFamily: "'Sora', sans-serif", color: '#EF4444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.05em' }}>
                  CRITICAL INCIDENT DETECTED
                </div>
                <div style={{ fontFamily: "'Poppins', sans-serif", color: 'rgba(255,255,255,0.75)', fontSize: '11px', marginTop: '3px' }}>
                  Track ID 0{latestEvent.trackId} has breached restricted zone {latestEvent.zoneId}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Live event feed */}
        <div style={{ minHeight: 0 }}>
          <LiveEventFeed />
        </div>

        {/* BOTTOM PANEL: Threat timeline */}
        <div style={{ gridColumn: '1 / span 3', minHeight: 0 }}>
          <ThreatTimeline />
        </div>
      </div>
    </div>
  );
};
