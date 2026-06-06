import React from 'react';
import { AlertTicker } from '../../components/live/AlertTicker';
import { SortTrackerMap } from '../../components/live/SortTrackerMap';
import { LiveEventFeed } from '../../components/live/LiveEventFeed';
import { ThreatTimeline } from '../../components/live/ThreatTimeline';
import { useEventStore } from '../../lib/event-store';
import { ShieldAlert } from 'lucide-react';

export const LiveOps: React.FC = () => {
  const recentEvents = useEventStore((state) => state.recentEvents);
  
  // Check if a critical event arrived in the last 4 seconds
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
      {/* Fullscreen Alert flashing overlay for critical status */}
      {isCriticalActive && (
        <div className="fullscreen-alert-overlay" />
      )}

      {/* Top Banner Ticker */}
      <AlertTicker />

      {/* Grid Layout Operations Room */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '22% 56% 22%',
          gridTemplateRows: 'calc(100% - 130px) 130px',
          gap: '12px',
          padding: '12px',
          overflow: 'hidden',
        }}
      >
        {/* LEFT PANEL: SORT Tracker Overview Map */}
        <div style={{ minHeight: 0 }}>
          <SortTrackerMap mode="minimap" />
        </div>

        {/* CENTER PANEL: Digital Twin Hologram Stage */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            minHeight: 0,
          }}
        >
          {/* Main Map hologram */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <SortTrackerMap mode="hologram" />
          </div>

          {/* Critical Popup HUD Warning Overlay */}
          {isCriticalActive && (
            <div
              className="hud-panel critical-flash-active"
              style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '420px',
                background: 'rgba(12, 2, 4, 0.95)',
                border: '2px solid #ff003c',
                padding: '12px 18px',
                borderRadius: '4px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                boxShadow: '0 10px 30px rgba(255, 0, 60, 0.5)',
              }}
            >
              <div
                style={{
                  background: '#ff003c',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <ShieldAlert size={20} className="critical-flash-active" />
              </div>
              <div style={{ fontFamily: "'Orbitron', sans-serif" }}>
                <div style={{ color: '#ff003c', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  CRITICAL INCIDENT DETECTED
                </div>
                <div style={{ color: '#ffffff', fontSize: '11px', marginTop: '2px' }}>
                  Track ID 0{latestEvent.trackId} has breached restricted zone {latestEvent.zoneId}!
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Live Log Ticker Feed */}
        <div style={{ minHeight: 0 }}>
          <LiveEventFeed />
        </div>

        {/* BOTTOM PANEL: Temporal Predictions Timeline (full width beneath maps/feed) */}
        <div style={{ gridColumn: '1 / span 3', minHeight: 0 }}>
          <ThreatTimeline />
        </div>
      </div>
    </div>
  );
};
