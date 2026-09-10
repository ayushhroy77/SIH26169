import React, { useState } from 'react';

interface SpecChipProps {
  code: string; // e.g., "SIH-01", "SIH-7–12", "SIH-21–25"
  description?: string;
  className?: string;
}

export const SpecChip: React.FC<SpecChipProps> = ({ code, description, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="inline-flex items-center text-[10px] font-mono font-normal tracking-tight px-1.5 py-0.5 rounded bg-[#17171A] text-[#8A8A93] border border-[#1F1F23]/60 cursor-help select-none transition-colors duration-120 hover:text-[#EDEDED] hover:border-[#5B8DEF]/40">
        {code}
      </span>

      {showTooltip && description && (
        <div
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-50 px-2.5 py-1.5 text-[11px] leading-snug font-normal text-[#EDEDED] bg-[#17171A] border border-[#1F1F23] rounded shadow-lg max-w-[240px] w-max pointer-events-none transition-opacity duration-120"
        >
          {description}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#17171A]" />
        </div>
      )}
    </div>
  );
};
