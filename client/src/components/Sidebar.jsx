import React from 'react';

const TABS = [
  { id: 'lighting', label: 'Lighting' },
  { id: 'video',    label: 'Video' },
  { id: 'disables', label: 'Disables' },
  { id: 'status',   label: 'Status' }
];

export default function Sidebar({ active, onChange, state, wsConnected }) {
  const ma2Connected = state?.ma2 === 'connected';
  const resolumeConnected = state?.resolume === 'connected';
  const disableCount = state?.disables ? Object.values(state.disables).filter(Boolean).length : 0;

  return (
    <aside className="w-[200px] h-full flex flex-col bg-bg border-r border-border/40 px-5 py-6">
      <div className="mb-10 flex flex-col items-center">
        <img
          src="/logo.png"
          alt="Trilogy"
          className="w-[140px] h-auto select-none pointer-events-none"
          draggable={false}
        />
        <div className="text-muted text-[10px] tracking-[0.3em] mt-2">CONTROL</div>
      </div>

      <nav className="flex flex-col gap-2 flex-1">
        {TABS.map(t => {
          const isActive = active === t.id;
          const showBadge = t.id === 'disables' && disableCount > 0;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative h-14 px-4 rounded-ui text-left text-[15px] font-medium transition-colors ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-btn text-white border border-border/70 hover:border-white/20'
              }`}
            >
              {t.label}
              {showBadge && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber text-white text-[11px] font-semibold rounded-full w-6 h-6 flex items-center justify-center">
                  {disableCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 text-[12px]">
        <StatusRow label="MA2" connected={ma2Connected} pulse={!ma2Connected} />
        <StatusRow label="RESOLUME" connected={resolumeConnected} />
        <StatusRow label="PANEL" connected={wsConnected} info />
      </div>
    </aside>
  );
}

function StatusRow({ label, connected, pulse, info }) {
  const color = info ? 'bg-info' : connected ? 'bg-ok' : 'bg-bad';
  return (
    <div className="flex items-center gap-2">
      <span className={`status-dot ${color} ${pulse ? 'pulse-red' : ''}`} />
      <span className="text-muted tracking-[0.15em]">{label}</span>
    </div>
  );
}
