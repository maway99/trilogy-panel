import React, { useState, useEffect } from 'react';

const TABS = [
  { id: 'lighting', label: 'Lighting' },
  { id: 'video',    label: 'Video' },
];

export default function Sidebar({ active, onChange, state }) {
  const ma2Connected = state?.ma2 === 'connected';
  const resolumeConnected = state?.resolume === 'connected';

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
            </button>
          );
        })}
      </nav>

      <div className="mt-6 space-y-2 text-[12px]">
        <StatusRow label="MA2" connected={ma2Connected} pulse={!ma2Connected} active={active === 'status'} onClick={() => onChange(active === 'status' ? 'lighting' : 'status')} />
        <StatusRow label="RESOLUME" connected={resolumeConnected} active={active === 'status'} onClick={() => onChange(active === 'status' ? 'lighting' : 'status')} />
      </div>

      <Clock />
    </aside>
  );
}

function Clock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setTime(new Date());
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ss = String(time.getSeconds()).padStart(2, '0');

  return (
    <div className="mt-6 text-center tabular-nums tracking-widest text-white select-none pb-1">
      <span className="text-[28px] font-semibold">{hh}:{mm}</span>
      <span className="text-[18px] text-muted ml-1">{ss}</span>
    </div>
  );
}

function StatusRow({ label, connected, pulse, active, onClick }) {
  const color = connected ? 'bg-ok' : 'bg-bad';
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 w-full rounded px-1 py-0.5 -mx-1 transition-colors ${active ? 'bg-white/5' : 'hover:bg-white/5'}`}
    >
      <span className={`status-dot ${color} ${pulse ? 'pulse-red' : ''}`} />
      <span className="text-muted tracking-[0.15em]">{label}</span>
    </button>
  );
}
