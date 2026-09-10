import React from 'react';
import { MetricDot, MetricStatus } from './MetricDot';

export type LockState = 'Tracking' | 'Lost' | 'Re-acquiring' | 'LOCKED' | 'SEARCHING';

interface StatusPillProps {
  status: LockState | string;
  fps?: number;
  rmse?: number;
  labelOverride?: string;
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  fps,
  rmse,
  labelOverride,
  className = '',
}) => {
  const norm = (status || '').toLowerCase();

  let dotStatus: MetricStatus = 'warning';
  let defaultLabel = 'RE-ACQUIRING';

  if (norm.includes('track') || norm.includes('lock')) {
    dotStatus = 'success';
    defaultLabel = 'TRACKING';
  } else if (norm.includes('lost') || norm.includes('fail')) {
    dotStatus = 'error';
    defaultLabel = 'LOST';
  } else {
    dotStatus = 'warning';
    defaultLabel = 'RE-ACQUIRING';
  }

  const mainLabel = labelOverride || defaultLabel;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-mono font-normal tracking-wide bg-[#111113] border border-[#1F1F23]/40 text-[#EDEDED] select-none ${className}`}
    >
      <MetricDot status={dotStatus} />
      <span className="font-medium text-[#EDEDED]">{mainLabel}</span>
      {fps !== undefined && (
        <span className="text-[#8A8A93]">
          · {fps.toFixed(0)} FPS
        </span>
      )}
      {rmse !== undefined && (
        <span className="text-[#8A8A93]">
          · RMSE {rmse.toFixed(1)} px
        </span>
      )}
    </div>
  );
};
