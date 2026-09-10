import React from 'react';

interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string | number> {
  id?: string;
  options: SegmentedControlOption<T>[] | T[];
  value: T;
  onChange: (val: T) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export function SegmentedControl<T extends string | number>({
  id,
  options,
  value,
  onChange,
  disabled = false,
  size = 'md',
}: SegmentedControlProps<T>) {
  const normalizedOptions: SegmentedControlOption<T>[] = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return opt as SegmentedControlOption<T>;
    }
    return { value: opt as T, label: String(opt) };
  });

  return (
    <div
      id={id}
      className={`inline-flex p-0.5 bg-[#0E0E10] border border-[#1F1F23] rounded-lg ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      }`}
    >
      {normalizedOptions.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 font-medium transition-all rounded-md whitespace-nowrap ${
              size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
            } ${
              isActive
                ? 'bg-[#1F1F23] text-[#EDEDED] shadow-sm'
                : 'text-[#8A8A93] hover:text-[#EDEDED] hover:bg-[#16161A]'
            } ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {opt.icon && <span className="w-3.5 h-3.5 flex items-center justify-center">{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
