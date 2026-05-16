import React, { useState, useEffect, useRef } from 'react';

export default function Video({ state, send }) {
  const offline = state.resolume !== 'connected';
  const sources = state.config.videoSources;

  return (
    <div className="h-full grid grid-cols-12 grid-rows-12 gap-6 relative">
      <section className="col-span-12 row-span-7 panel p-6 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="section-header">Video Source</div>
          <div className="text-[11px] text-muted tracking-wider">
            RESOLUME · {state.config.resolume.ip}:{state.config.resolume.port}
          </div>
        </div>
        <div className="flex-1 grid grid-cols-3 gap-4">
          {Object.entries(sources).map(([id, src]) => {
            const isActive = state.djSource === id;
            return (
              <button
                key={id}
                disabled={offline}
                onClick={() => send({ type: 'djSource', source: id })}
                className={`btn ${isActive ? 'btn-active' : 'btn-default'} text-[18px] font-semibold tracking-wide flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed`}
                style={{ minHeight: '100%' }}
              >
                {src.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="col-span-12 row-span-5 panel p-6 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="section-header">Brightness</div>
          <div className="text-white text-[14px] tabular-nums">{state.brightness}%</div>
        </div>
        <BrightnessSlider
          disabled={offline}
          value={state.brightness}
          onCommit={(v) => send({ type: 'brightness', value: v })}
        />
      </section>

      {offline && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="panel px-8 py-6 text-center pointer-events-auto" style={{ backgroundColor: 'rgba(17,17,17,0.95)' }}>
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="status-dot bg-bad" />
              <div className="text-white text-[22px] font-semibold tracking-[0.18em]">RESOLUME OFFLINE</div>
            </div>
            <div className="text-muted text-[14px]">Video controls disabled. Other tabs unaffected.</div>
            <div className="text-muted text-[12px] mt-2">Configured: {state.config.resolume.ip}:{state.config.resolume.port}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrightnessSlider({ value, onCommit, disabled }) {
  const [local, setLocal] = useState(value);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!draggingRef.current) setLocal(value);
  }, [value]);

  return (
    <div className="flex-1 flex flex-col justify-center">
      <input
        type="range"
        min="0"
        max="100"
        value={local}
        disabled={disabled}
        onChange={(e) => { draggingRef.current = true; setLocal(Number(e.target.value)); }}
        onMouseUp={() => { draggingRef.current = false; onCommit(local); }}
        onTouchEnd={() => { draggingRef.current = false; onCommit(local); }}
        className="w-full disabled:opacity-30"
      />
      <div className="flex justify-between text-[11px] text-muted mt-1 tracking-widest">
        <span>0</span><span>50</span><span>100</span>
      </div>
    </div>
  );
}
