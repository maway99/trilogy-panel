import React, { useState, useMemo } from 'react';
import Sidebar from './components/Sidebar.jsx';
import DisconnectedOverlay from './components/DisconnectedOverlay.jsx';
import Lighting from './tabs/Lighting.jsx';
import Video from './tabs/Video.jsx';
import Disables from './tabs/Disables.jsx';
import Status from './tabs/Status.jsx';
import { useWebSocket } from './hooks/useWebSocket.js';

export default function App() {
  const [tab, setTab] = useState('lighting');
  const { state, tick, wsConnected, send } = useWebSocket();

  const ma2Disconnected = state && state.ma2 !== 'connected';
  const ma2DisconnectedAt = tick?.ma2DisconnectedAt ?? state?.ma2DisconnectedAt;
  const secondsSince = useMemo(() => {
    if (!ma2DisconnectedAt) return null;
    return Math.max(0, Math.floor((Date.now() - ma2DisconnectedAt) / 1000));
  }, [ma2DisconnectedAt, tick]);

  if (!state) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-bg text-muted">
        <div className="text-[18px] ellipsis tracking-wider">CONNECTING TO PANEL SERVER</div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen flex bg-bg overflow-hidden">
      <Sidebar active={tab} onChange={setTab} state={state} wsConnected={wsConnected} />
      <main className="flex-1 h-full p-8 overflow-hidden">
        {tab === 'lighting' && <Lighting state={state} send={send} />}
        {tab === 'video'    && <Video    state={state} send={send} />}
        {tab === 'disables' && <Disables state={state} send={send} />}
        {tab === 'status'   && <Status   state={state} tick={tick} wsConnected={wsConnected} send={send} />}
      </main>

      <DisconnectedOverlay
        visible={ma2Disconnected}
        secondsSince={secondsSince}
        title="CONSOLE OFFLINE"
        subtitle="Reconnecting"
      />

      {!wsConnected && !ma2Disconnected && (
        <DisconnectedOverlay
          visible
          title="PANEL SERVER OFFLINE"
          subtitle="Reconnecting"
        />
      )}
    </div>
  );
}
