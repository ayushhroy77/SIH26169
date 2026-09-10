import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface StepperInputProps {
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
}

export const StepperInput: React.FC<StepperInputProps> = ({
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
}) => {
  const handleDecrement = () => {
    if (disabled || value <= min) return;
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    if (disabled || value >= max) return;
    onChange(Math.min(max, value + step));
  };

  return (
    <div id={id} className="flex items-center justify-between py-1 select-none">
      <div className="flex items-center gap-1.5 text-xs text-[#8A8A93]">
        <span>{label}</span>
        {tooltip && <Tooltip content={tooltip} />}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || value <= min}
          onClick={handleDecrement}
          className="w-6 h-6 flex items-center justify-center rounded bg-[#17171A] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]/60 disabled:opacity-30 transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF]"
          aria-label="Decrement"
        >
          <Minus className="w-3 h-3" strokeWidth={1.5} />
        </button>

        <span className="w-8 text-center font-mono text-xs text-[#EDEDED] tabular-nums">
          {value}{unit ? ` ${unit}` : ''}
        </span>

        <button
          type="button"
          disabled={disabled || value >= max}
          onClick={handleIncrement}
          className="w-6 h-6 flex items-center justify-center rounded bg-[#17171A] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]/60 disabled:opacity-30 transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF]"
          aria-label="Increment"
        >
          <Plus className="w-3 h-3" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
