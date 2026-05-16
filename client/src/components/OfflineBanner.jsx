import React from 'react';

/** Non-blocking status stripe; does not cover the sidebar or block touches beneath. */
export default function OfflineBanner({ visible, secondsSince, title, subtitle }) {
  if (!visible) return null;
  return (
    <div
      role="status"
      className="shrink-0 w-full flex items-center gap-4 px-8 py-3 border-b border-bad/35 bg-black/88 text-white z-30"
    >
      <span
        className="status-dot shrink-0 pulse-red bg-bad rounded-full inline-block"
        style={{ width: 22, height: 22 }}
        aria-hidden
      />
      <div className="min-w-0 flex flex-wrap items-baseline gap-x-4 gap-y-1 flex-1">
        <span className="text-[16px] font-semibold tracking-[0.14em]">{title}</span>
        <span className="text-[15px] text-muted ellipsis tracking-wide">{subtitle}</span>
        {typeof secondsSince === 'number' && (
          <span className="text-[13px] text-muted whitespace-nowrap sm:ml-auto">{secondsSince}s offline</span>
        )}
      </div>
    </div>
  );
}
