import React from 'react';
import { Tooltip } from './Tooltip';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  id?: string;
  label: string;
  value: string;
  options: (string | Option)[];
  onChange: (val: string) => void;
  tooltip?: string;
  disabled?: boolean;
  phase2?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  value,
  options,
  onChange,
  tooltip,
  disabled = false,
  phase2 = false,
}) => {
  return (
    <div id={id} className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[#8A8A93]">
        <div className="flex items-center gap-1">
          <span>{label}</span>
          {tooltip && <Tooltip content={tooltip} phase2={phase2} />}
        </div>
      </div>
      <select
        value={value}
        disabled={disabled || phase2}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0E0E10] border border-[#1F1F23] rounded-md px-3 py-1.5 text-xs text-[#EDEDED] font-mono focus:border-[#5B8DEF] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {options.map((opt) => {
          const isObj = typeof opt === 'object';
          const optValue = isObj ? opt.value : opt;
          const optLabel = isObj ? opt.label : opt;
          const optDisabled = isObj ? opt.disabled : false;
          return (
            <option
              key={optValue}
              value={optValue}
              disabled={optDisabled}
              className="bg-[#111113] text-[#EDEDED]"
            >
              {optLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
};
