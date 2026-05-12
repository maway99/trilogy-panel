import React from 'react';

export default function DisconnectedOverlay({ visible, secondsSince, title, subtitle }) {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(10,10,10,0.95)' }}
      onClickCapture={(e) => { e.stopPropagation(); e.preventDefault(); }}
    >
      <div className="flex flex-col items-center gap-6">
        <span className="status-dot pulse-red bg-bad" style={{ width: 24, height: 24 }} />
        <div className="text-white text-[44px] font-semibold tracking-[0.18em]">{title}</div>
        <div className="text-muted text-[20px] ellipsis tracking-wide">{subtitle}</div>
        {typeof secondsSince === 'number' && (
          <div className="text-muted text-[14px] mt-2">{secondsSince}s offline</div>
        )}
      </div>
    </div>
  );
}
