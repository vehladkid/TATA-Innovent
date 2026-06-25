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
        background: '#000000', // Pure Black
      }}
    >
      {/* Top Banner Ticker */}
      <AlertTicker />

      {/* Grid Layout (Map Hero: 16% | 68% | 16%) */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '16% 68% 16%',
          gridTemplateRows: 'calc(100% - 90px) 90px', // Thinner timeline height
          gap: '12px',
          padding: '12px',
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
            gap: '12px',
            minHeight: 0,
          }}
        >
          {/* AI Predictive Risk Resolution HUD Panel */}
          <div
            style={{
              position: 'absolute',
              top: '52px',
              left: '16px',
              width: '290px',
              background: 'rgba(13, 13, 13, 0.94)',
              border: '1px solid #FF5A45', // Peachy / coral warning border
              borderLeft: '4px solid #FF5A45',
              borderRadius: '2px',
              padding: '12px 14px',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(255, 90, 69, 0.15)', paddingBottom: '6px', marginBottom: '4px' }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#FF5A45',
                display: 'inline-block',
              }} />
              <span style={{ fontFamily: "var(--font-body)", fontSize: '10px', fontWeight: 700, color: '#FF5A45', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                AI PREDICTIVE RESOLUTION ENGINE
              </span>
            </div>

            {/* Warning details */}
            <div style={{ fontFamily: "var(--font-metric)", fontSize: '11px', color: '#EAEAEA' }}>
              <div style={{ color: '#FF5A45', fontWeight: 700, marginBottom: '2px' }}>
                ⚠ PREDICTED FORKLIFT COLLISION
              </div>
              <div style={{ color: '#9A9A9A', fontSize: '10px' }}>
                Conflict: <span style={{ color: '#EAEAEA', fontWeight: 600 }}>Worker W-05 ⇆ Forklift F-01</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                <span>ETA: <strong style={{ color: '#FF7360' }}>14 Seconds</strong></span>
                <span>Confidence: <strong style={{ color: '#FF7360' }}>87%</strong></span>
              </div>
            </div>

            {/* Recommendation details */}
            <div style={{ 
              marginTop: '4px', 
              padding: '6px 8px', 
              background: 'rgba(0, 208, 132, 0.04)', 
              border: '1px solid rgba(0, 208, 132, 0.15)', 
              borderRadius: '1px',
              fontFamily: "var(--font-body)",
              fontSize: '10px',
              color: '#D8D8D8'
            }}>
              <div style={{ color: '#00D084', fontWeight: 700, fontSize: '9.5px', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '2px' }}>
                Recommended Action
              </div>
              <div>Reroute Worker W-05 through Walkway B</div>
              <div style={{ color: '#00D084', fontWeight: 600, fontSize: '9px', marginTop: '2px' }}>
                Expected Risk Mitigation: -41%
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <SortTrackerMap mode="hologram" />
          </div>

          {/* Critical incident popup (uses Critical Red warning state) */}
          {isCriticalActive && (
            <div
              className="hud-panel critical-flash-active"
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '380px',
                background: 'rgba(16, 16, 16, 0.95)',
                border: '1px solid #FF5A45', // Critical Coral Peach warning border
                padding: '10px 14px',
                borderRadius: '4px',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  background: '#FF5A45', // Critical Coral Peach circle
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000000', // high contrast text
                  flexShrink: 0,
                }}
              >
                <ShieldAlert size={13} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-header)", color: '#FF5A45', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em' }}>
                  CRITICAL ZONE INTRA-BREACH
                </div>
                <div style={{ fontFamily: "var(--font-body)", color: '#EAEAEA', fontSize: '10.5px', marginTop: '2px' }}>
                  Target W-0{latestEvent.trackId} has breached restricted zone {latestEvent.zoneId === 'zone_press_A' ? 'Press Machine A' : latestEvent.zoneId}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Live event feed */}
        <div style={{ minHeight: 0 }}>
          <LiveEventFeed />
        </div>

        {/* BOTTOM PANEL: Threat timeline (Redesigned as Predictive Event Rail) */}
        <div style={{ gridColumn: '1 / span 3', minHeight: 0 }}>
          <ThreatTimeline />
        </div>
      </div>
    </div>
  );
};
