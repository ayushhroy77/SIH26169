import React from 'react';

interface ChipProps {
  id?: string;
  label: string;
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'warning' | 'dimmed';
  icon?: React.ReactNode;
  onRemove?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  id,
  label,
  variant = 'default',
  icon,
  onRemove,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-[#16161A] text-[#EDEDED] border-[#1F1F23]',
    accent: 'bg-[#5B8DEF]/10 text-[#5B8DEF] border-[#5B8DEF]/30',
    success: 'bg-[#3FB950]/10 text-[#3FB950] border-[#3FB950]/30',
    danger: 'bg-[#F85149]/10 text-[#F85149] border-[#F85149]/30',
    warning: 'bg-[#D29922]/10 text-[#D29922] border-[#D29922]/30',
    dimmed: 'bg-[#111113] text-[#8A8A93] border-[#1F1F23]/60',
  };

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono border whitespace-nowrap select-none ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="w-3 h-3 flex items-center justify-center">{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-0.5 hover:text-[#EDEDED] transition-colors"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
};
