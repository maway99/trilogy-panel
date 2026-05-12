import React from 'react';

export default function Disables({ state, send }) {
  const groups = state.config.executors.disables;
  const entries = Object.entries(groups);

  return (
    <div className="h-full flex flex-col gap-6">
      <section className="panel p-5">
        <div className="flex items-center justify-between">
          <div className="section-header">Fixture Disables</div>
          <div className="text-[12px] text-muted">
            Tap to inhibit a fixture group. Tap again to re-enable.
          </div>
        </div>
      </section>

      <section className="flex-1 grid grid-cols-3 grid-rows-2 gap-6">
        {entries.map(([key, exec]) => {
          const active = !!state.disables[key];
          return (
            <button
              key={key}
              onClick={() => send({ type: 'disable', target: key, active: !active })}
              className={`btn flex flex-col items-center justify-center gap-2 text-[24px] font-semibold tracking-wide ${
                active ? 'btn-disabled-active' : 'btn-default'
              }`}
              style={{ minHeight: 0, height: '100%' }}
            >
              <div className="flex items-center gap-3">
                {active && <span className="text-[28px] leading-none">⚠</span>}
                <span>{exec.label}</span>
              </div>
              <div className={`text-[12px] tracking-[0.3em] ${active ? 'text-amber' : 'text-muted'}`}>
                {active ? 'DISABLED' : 'ACTIVE'}
              </div>
              <div className="text-[10px] text-muted tracking-widest opacity-50">
                P{exec.page}.{exec.exec}
              </div>
            </button>
          );
        })}
      </section>
    </div>
  );
}
