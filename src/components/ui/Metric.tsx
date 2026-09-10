import React from 'react';
import { Tooltip } from './Tooltip';
import { MetricDot } from './MetricDot';

interface MetricProps {
  id?: string;
  label: string;
  value: string | number;
  unit?: string;
  target?: string;
  isCompliant?: boolean;
  tooltip?: string;
  statusText?: string;
  className?: string;
}

export const Metric: React.FC<MetricProps> = ({
  id,
  label,
  value,
  unit = '',
  target,
  isCompliant,
  tooltip,
  statusText,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`bg-[#17171A] border border-[#1F1F23]/60 rounded p-2.5 flex flex-col justify-between select-none ${className}`}
    >
      <div className="flex items-center justify-between text-[11px] text-[#8A8A93] mb-1">
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        {target && (
          <span className="font-mono text-[10px] text-[#5C5C66]">
            {target}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between mt-1">
        <div className="font-mono text-base font-medium text-[#EDEDED] tabular-nums">
          {value}
          {unit && <span className="text-[11px] font-normal text-[#8A8A93] ml-1">{unit}</span>}
        </div>

        {isCompliant !== undefined && (
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#8A8A93]">
            <MetricDot status={isCompliant ? 'success' : 'error'} />
            <span>{statusText || (isCompliant ? 'PASS' : 'FAIL')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
