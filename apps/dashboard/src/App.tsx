import { useEffect } from 'react';
import { useEventStore } from './lib/event-store';
import { connectWebSocket, disconnectWebSocket } from './lib/websocket';
import { BootScreen } from './app/boot/BootScreen';
import { CommandOverlay } from './components/live/CommandOverlay';
import { LiveOps } from './app/live-ops/LiveOps';
import { RiskPanel } from './app/risk-panel/RiskPanel';
import { HazardHeatmap } from './app/heatmap/HazardHeatmap';
import { ExecutiveView } from './app/executive-view/ExecutiveView';
import { LandingPage } from './app/landing/LandingPage';
import { CopilotPanel } from './components/copilot/CopilotPanel'; // samarth/dev: LLM Safety Copilot

function App() {
  const activeView = useEventStore((state) => state.activeView);
  const tickWorkerPositions = useEventStore((state) => state.tickWorkerPositions);

  // 1. Establish WebSocket Stream connection to FastAPI server or start fallback simulator
  useEffect(() => {
    connectWebSocket();
    return () => {
      disconnectWebSocket();
    };
  }, []);

  // 2. Physics engine ticker to smoothly move tracker nodes on coordinates
  useEffect(() => {
    const interval = setInterval(() => {
      tickWorkerPositions();
    }, 50); // ~20 ticks/sec for sub-pixel smooth sliding

    return () => clearInterval(interval);
  }, [tickWorkerPositions]);

  // If Landing Page view, render fullscreen landing
  if (activeView === 'LANDING') {
    return <LandingPage />;
  }

  // If in Boot Screen mode, render fullscreen overlay
  if (activeView === 'BOOT') {
    return <BootScreen />;
  }

  // Render the core command center
  return (
    <div className="hud-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {/* Main command navbar header */}
      <CommandOverlay />

      {/* Primary operations console stage */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {activeView === 'LIVE' && <LiveOps />}
        {activeView === 'RISK' && <RiskPanel />}
        {activeView === 'HEATMAP' && <HazardHeatmap />}
        {activeView === 'EXECUTIVE' && <ExecutiveView />}
      </div>

      {/* samarth/dev: floating LLM Safety Copilot (self-contained) */}
      <CopilotPanel />
    </div>
  );
}

export default App;
