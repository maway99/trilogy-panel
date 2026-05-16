import React, { useState, useEffect } from 'react';

function formatUptime(ms) {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function formatRelative(ts) {
  if (!ts) return '—';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

export default function Status({ state, tick, wsConnected, send }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const ma2Connected = state.ma2 === 'connected';
  const resolumeConnected = state.resolume === 'connected';
  const uptimeMs = tick?.uptimeMs ?? state.uptimeMs ?? 0;
  const ma2Off = tick?.ma2DisconnectedAt ?? state.ma2DisconnectedAt;

  return (
    <div className="h-full grid grid-cols-12 grid-rows-12 gap-6">
      <Card className="col-span-4 row-span-4">
        <SectionHeader title="grandMA2" />
        <div className="flex items-center gap-3 mb-3">
          <span className={`status-dot ${ma2Connected ? 'bg-ok' : 'bg-bad pulse-red'}`} />
          <span className="text-white text-[18px] font-semibold">
            {ma2Connected ? 'Connected' : 'Reconnecting'}
            {!ma2Connected && <span className="ellipsis" />}
          </span>
        </div>
        <Row label="Address" value={`${state.config.ma2.ip}:${state.config.ma2.port}`} />
        {ma2Connected
          ? <Row label="Last command" value={formatRelative(state.ma2LastCommandAt)} />
          : <Row label="Offline for" value={ma2Off ? `${Math.floor((Date.now() - ma2Off) / 1000)}s` : '—'} />
        }
      </Card>

      <Card className="col-span-4 row-span-4">
        <SectionHeader title="Resolume" />
        <div className="flex items-center gap-3 mb-3">
          <span className={`status-dot ${resolumeConnected ? 'bg-ok' : 'bg-bad'}`} />
          <span className="text-white text-[18px] font-semibold">
            {resolumeConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
        <Row label="Address" value={`${state.config.resolume.ip}:${state.config.resolume.port}`} />
        <Row label="Last poll" value={formatRelative(state.resolumeLastPollAt)} />
        <Row label="Last status" value={state.resolumeLastStatus ?? '—'} />
      </Card>

      <Card className="col-span-4 row-span-4">
        <SectionHeader title="Network / Panel" />
        <div className="flex items-center gap-3 mb-3">
          <span className={`status-dot ${wsConnected ? 'bg-info' : 'bg-bad'}`} />
          <span className="text-white text-[18px] font-semibold">
            {wsConnected ? 'Panel WebSocket OK' : 'Panel disconnected'}
          </span>
        </div>
        <Row label="Host" value={typeof window !== 'undefined' ? window.location.host : '—'} />
        <Row label="Server uptime" value={formatUptime(uptimeMs)} />
      </Card>

      <Card className="col-span-8 row-span-5">
        <SectionHeader title="Diagnostics" />
        <Row label="Last MA2 command" value={state.ma2LastCommand ?? '—'} mono />
        <Row label="Last MA2 response" value={(state.ma2LastResponse ?? '—').slice(0, 120)} mono />
        <Row label="Last Resolume HTTP" value={state.resolumeLastStatus ?? '—'} />
        <Row label="Active cue" value={state.activeCue ?? '—'} />
        <Row label="Active disables" value={
          Object.entries(state.disables).filter(([, v]) => v).map(([k]) => k).join(', ') || 'none'
        } />
      </Card>

      <Card className="col-span-4 row-span-5">
        <SectionHeader title="Manual Actions" />
        <div className="flex flex-col gap-3 flex-1">
          <button
            onClick={() => send({ type: 'forceReconnectMa2' })}
            className="btn btn-default text-[13px] tracking-wider"
            style={{ minHeight: 48 }}
          >
            FORCE RECONNECT MA2
          </button>
          <button
            onClick={() => send({ type: 'forceReconnectResolume' })}
            className="btn btn-default text-[13px] tracking-wider"
            style={{ minHeight: 48 }}
          >
            FORCE RECONNECT RESOLUME
          </button>
          <RawCommandField send={send} />
        </div>
      </Card>

      <Card className="col-span-12 row-span-3">
        <SectionHeader title="System Info" />
        <div className="grid grid-cols-4 gap-6">
          <Row label="MA2 host" value={`${state.config.ma2.ip}:${state.config.ma2.port}`} />
          <Row label="Resolume host" value={`${state.config.resolume.ip}:${state.config.resolume.port}`} />
          <Row label="Cue stack" value={`P${state.config.cueStack.page}.${state.config.cueStack.exec}`} />
          <Row label="Default fade" value={`${state.config.defaults.fadeTime.toFixed(1)}s`} />
        </div>
      </Card>
    </div>
  );
}

function Card({ className = '', children }) {
  return <section className={`panel p-5 flex flex-col ${className}`}>{children}</section>;
}

function SectionHeader({ title }) {
  return <div className="section-header mb-4">{title}</div>;
}

function RawCommandField({ send }) {
  const [cmd, setCmd] = useState('');
  const submit = () => {
    if (!cmd.trim()) return;
    send({ type: 'rawMa2', command: cmd });
    setCmd('');
  };
  return (
    <div className="mt-auto pt-3 border-t border-border/40">
      <div className="section-header mb-2">Send Raw MA2 Command</div>
      <div className="flex gap-2">
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          placeholder="Goto Cue 1 Exec 1.1"
          className="flex-1 bg-btn border border-border/70 rounded-ui px-3 py-2 text-white text-[13px] font-mono focus:outline-none focus:border-white/50"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button
          onClick={submit}
          className="btn btn-default text-[12px] tracking-wider px-4"
          style={{ minHeight: 0 }}
        >
          SEND
        </button>
      </div>
      <div className="text-muted text-[10px] mt-1 tracking-wider">
        Sent through the same telnet pathway as buttons.
      </div>
    </div>
  );
}

function Row({ label, value, mono = false }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-border/30 last:border-0">
      <div className="text-muted text-[12px] tracking-wider uppercase">{label}</div>
      <div
        className={`text-white text-[14px] ${mono ? 'font-mono text-[12px]' : ''} text-right ml-4 tabular-nums`}
        title={String(value)}
      >
        {String(value)}
      </div>
    </div>
  );
}
