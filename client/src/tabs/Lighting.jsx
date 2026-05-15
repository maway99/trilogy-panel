import React, { useState, useEffect, useRef } from 'react';

const CUE_GROUPS = [
  ['staticCues', 'slowCues', 'mainCues', 'strobingCues'],
  ['lasersSlow', 'lasersDrop'],
  ['buildups']
];

const TOP_ROW_HEIGHT = 120;
const CONFETTI_WIDTH = 240;
// How many cues are rendered per bank on the panel. Each bank can hold more
// in config; only the first VISIBLE_CUES_PER_BANK are displayed to keep the
// touch targets a comfortable size.
const VISIBLE_CUES_PER_BANK = 15;

export default function Lighting({ state, send }) {
  return (
    <div className="h-full flex flex-col gap-5">
      <div className="flex gap-5" style={{ height: TOP_ROW_HEIGHT, flex: '0 0 auto' }}>
        <section className="flex-[5] panel p-3 flex flex-col">
          <SectionHeader title="Haze" right={`${state.haze}%`} />
          <HazeSlider value={state.haze} onCommit={(v) => send({ type: 'haze', value: v })} />
        </section>

        <section className="flex-[3] panel p-3 flex flex-col">
          <SectionHeader title="Fade Time" right={`${state.fadeTime.toFixed(1)}s`} />
          <FadeTimePresets
            value={state.fadeTime}
            onChange={(v) => send({ type: 'fadeTime', value: v })}
          />
        </section>

        <section className="flex-[2] panel p-3 flex flex-col">
          <SectionHeader title="Clear" />
          <button
            onClick={() => send({ type: 'clear' })}
            className="btn flex-1 w-full text-[12px] font-semibold tracking-wider leading-tight btn-default"
          >
            CLEAR
          </button>
        </section>

        <section className="flex-[2] panel p-3 flex flex-col">
          <SectionHeader title="End of Night" />
          <button
            onClick={() => send({ type: 'endOfNight', active: !state.endOfNightActive })}
            className={`btn flex-1 w-full text-[12px] font-semibold tracking-wider leading-tight ${
              state.endOfNightActive ? 'btn-warn' : 'btn-default'
            }`}
          >
            {state.endOfNightActive ? 'EOTN ACTIVE' : 'END OF NIGHT'}
          </button>
        </section>
      </div>

      <div className="flex-1 flex gap-5 min-h-0">
        <section className="flex-1 panel p-5 flex flex-col overflow-hidden min-w-0">
          <SectionHeader title="Cue Banks" right={state.activeCue ? `Active · Cue ${state.activeCue}` : null} />
          <CueBanks
            banks={state.config.cueBanks}
            activeCue={state.activeCue}
            onSelect={(cue) => send({ type: 'cue', cueNumber: cue })}
          />
        </section>

        <section className="panel p-4 flex flex-col overflow-hidden flex-none" style={{ width: CONFETTI_WIDTH }}>
          <SectionHeader title="Confetti" />
          <Confetti
            cannons={state.config.executors.confetti}
            fired={state.confetti}
            onFire={(id) => send({ type: 'confetti', cannon: id })}
            onReset={() => send({ type: 'confettiReset' })}
          />
        </section>
      </div>
    </div>
  );
}

function SectionHeader({ title, right }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div className="section-header">{title}</div>
      {right && <div className="text-white text-[13px] tabular-nums tracking-wider">{right}</div>}
    </div>
  );
}

function HazeSlider({ value, onCommit }) {
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
        onChange={(e) => { draggingRef.current = true; setLocal(Number(e.target.value)); }}
        onMouseUp={() => { draggingRef.current = false; onCommit(local); }}
        onTouchEnd={() => { draggingRef.current = false; onCommit(local); }}
        className="w-full"
      />
    </div>
  );
}

function FadeTimePresets({ value, onChange }) {
  const presets = [0, 0.5, 2];
  return (
    <div className="flex-1 grid grid-cols-3 gap-2">
      {presets.map((p) => {
        const active = Math.abs(value - p) < 0.001;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`btn ${active ? 'btn-active' : 'btn-default'} text-[18px] font-semibold tracking-wider`}
            style={{ minHeight: 0 }}
          >
            {p === 0 ? '0s' : `${p}s`}
          </button>
        );
      })}
    </div>
  );
}

function CueBanks({ banks, activeCue, onSelect }) {
  return (
    <div className="flex-1 flex items-stretch min-h-0">
      {CUE_GROUPS.map((keys, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <GroupDivider />}
          <div
            className="flex gap-3 min-h-0 min-w-0"
            style={{ flex: keys.length }}
          >
            {keys.map((key) => {
              const bank = banks[key];
              if (!bank) return null;
              return (
                <BankColumn
                  key={key}
                  bankKey={key}
                  bank={bank}
                  activeCue={activeCue}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function GroupDivider() {
  return (
    <div className="flex items-stretch px-5 self-stretch flex-none" aria-hidden="true">
      <div className="w-px bg-border self-stretch" />
    </div>
  );
}

function BankColumn({ bankKey, bank, activeCue, onSelect }) {
  const isStrobe = bankKey === 'strobingCues';
  const filtered = bank.cues.filter((c) => c.label !== `Cue ${c.cue}`);
  const visible = filtered.slice(0, VISIBLE_CUES_PER_BANK);
  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0">
      <div className="section-header mb-2 text-center truncate">{bank.label}</div>
      <div
        className="grid gap-1 flex-1 min-h-0"
        style={{ gridTemplateRows: `repeat(${VISIBLE_CUES_PER_BANK}, minmax(0, 1fr))` }}
      >
        {visible.map((c) => {
          const isActive = activeCue === c.cue;
          return (
            <button
              key={c.cue}
              onClick={() => onSelect(c.cue)}
              className={`btn relative text-[13px] font-medium overflow-hidden flex items-center justify-center px-2 ${
                isActive
                  ? `btn-active ${isStrobe ? 'border-2 border-amber' : ''}`
                  : 'btn-default'
              }`}
              style={{ minHeight: 0 }}
            >
              <span className="absolute top-1 right-1.5 text-[9px] leading-none tabular-nums opacity-50">
                {c.cue}
              </span>
              <span className="truncate">{c.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Confetti({ cannons, fired, onFire, onReset }) {
  const [pulseId, setPulseId] = useState(null);
  const handleFire = (id) => {
    setPulseId(id);
    setTimeout(() => setPulseId(null), 400);
    onFire(id);
  };

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      <div className="flex-1 flex flex-col gap-3 min-h-0">
        {cannons.map((c) => (
          <CannonButton
            key={c.id}
            cannon={c}
            fired={fired[c.id]}
            pulsing={pulseId === c.id}
            onFire={() => handleFire(c.id)}
          />
        ))}
      </div>
      <button
        onClick={onReset}
        className="btn btn-default text-[11px] tracking-[0.3em] text-muted"
        style={{ minHeight: 48 }}
        title="Clear fired indicators (panel-only — no MA2 command)"
      >
        RESET
      </button>
    </div>
  );
}

function CannonButton({ cannon, fired, pulsing, onFire }) {
  let containerClass;
  if (pulsing) {
    containerClass = 'bg-white text-black border-white scale-[0.98]';
  } else if (fired) {
    containerClass = 'bg-[#1f1f1f] text-white border-white';
  } else {
    containerClass = 'bg-btn text-white border-white/30 hover:border-white/70';
  }

  return (
    <button
      onClick={onFire}
      className={`btn relative overflow-hidden flex-1 flex items-center justify-between px-5 font-semibold tracking-[0.18em] transition-all border-2 ${containerClass}`}
      style={{ minHeight: 0 }}
    >
      {fired && !pulsing && (
        <span className="absolute left-0 top-0 bottom-0 w-[5px] bg-white" />
      )}
      <div className="flex flex-col items-start">
        <span className={`text-[10px] tracking-[0.4em] ${
          pulsing ? 'text-black/60' : fired ? 'text-white' : 'text-muted'
        }`}>
          {fired ? 'FIRED' : 'FIRE'}
        </span>
        <span className="text-[20px] mt-1 tracking-[0.15em]">{cannon.label.toUpperCase()}</span>
      </div>
      {fired && !pulsing && (
        <span className="text-[11px] tracking-[0.3em] text-white">●</span>
      )}
    </button>
  );
}
