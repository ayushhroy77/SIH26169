import React from 'react';

export type MetricStatus = 'success' | 'warning' | 'error' | 'neutral';

interface MetricDotProps {
  status: MetricStatus;
  className?: string;
  tooltip?: string;
}

export const MetricDot: React.FC<MetricDotProps> = ({ status, className = '', tooltip }) => {
  const colorMap: Record<MetricStatus, string> = {
    success: 'bg-[#3FB950]',
    warning: 'bg-[#D29922]',
    error: 'bg-[#F85149]',
    neutral: 'bg-[#5C5C66]',
  };

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${colorMap[status] || colorMap.neutral} ${className}`}
      title={tooltip}
      aria-hidden="true"
    />
  );
};
