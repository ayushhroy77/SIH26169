import React from 'react';
import { Tooltip } from './Tooltip';

interface SliderProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  tooltip?: string;
  disabled?: boolean;
  disabledReason?: string;
  phase2?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  tooltip,
  disabled = false,
  disabledReason,
  phase2 = false,
}) => {
  const isDisabled = disabled || phase2;

  return (
    <div
      id={id}
      className={`space-y-1 select-none ${isDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      title={isDisabled && disabledReason ? disabledReason : undefined}
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[#8A8A93]">
          <span className="text-xs text-[#8A8A93] font-normal">{label}</span>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        <div className="font-mono text-[13px] text-[#EDEDED] font-normal tabular-nums">
          {Number.isInteger(value) ? value : value.toFixed(2)}
          {unit && <span className="text-[#8A8A93] ml-1 text-xs">{unit}</span>}
        </div>
      </div>

      <div className="pt-1 pb-0.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={isDisabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1 bg-[#1F1F23] rounded-full appearance-none cursor-pointer accent-[#5B8DEF] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111113] disabled:cursor-not-allowed transition-all duration-120"
        />
      </div>

      <div className="flex justify-between text-[10px] text-[#5C5C66] font-mono leading-none">
        <span>{min}{unit ? ` ${unit}` : ''}</span>
        <span>{max}{unit ? ` ${unit}` : ''}</span>
      </div>
    </div>
  );
};
