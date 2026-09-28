import React from 'react';

const RISK_CONFIG = {
  low: {
    label: 'Low Risk',
    bg: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  moderate: {
    label: 'Moderate Risk',
    bg: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  high: {
    label: 'High Risk',
    bg: 'bg-orange-950/40 text-orange-300 border-orange-500/30',
    dot: 'bg-orange-400',
  },
  very_high: {
    label: 'Severe Risk',
    bg: 'bg-rose-950/50 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-900/30',
    dot: 'bg-rose-400 animate-ping',
  },
};

export default function RiskBadge({ level = 'low', showDot = true, size = 'sm' }) {
  const config = RISK_CONFIG[level?.toLowerCase()] || RISK_CONFIG.low;
  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-semibold rounded-full border ${config.bg} ${sizeClasses}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      <span>{config.label}</span>
    </span>
  );
}
