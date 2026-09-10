import React from 'react';
import { Tooltip } from './Tooltip';

interface ToggleProps {
  id?: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
  disabled?: boolean;
  phase2?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  id,
  label,
  checked,
  onChange,
  tooltip,
  disabled = false,
  phase2 = false,
}) => {
  return (
    <div id={id} className="flex items-center justify-between py-1">
      <div className="flex items-center gap-1 text-xs text-[#8A8A93]">
        <span>{label}</span>
        {tooltip && <Tooltip content={tooltip} phase2={phase2} />}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled || phase2}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ease-in-out focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? 'bg-[#5B8DEF]' : 'bg-[#1F1F23]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-150 ease-in-out ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
