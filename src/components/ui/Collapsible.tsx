import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { SpecChip } from './SpecChip';

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  badge?: React.ReactNode;
  specCode?: string;
  specDescription?: string;
  children: React.ReactNode;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onToggle,
  badge,
  specCode,
  specDescription,
  children,
  className = '',
}) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isExpanded = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;

  const handleToggle = () => {
    const next = !isExpanded;
    if (controlledIsOpen === undefined) {
      setInternalOpen(next);
    }
    onToggle?.(next);
  };

  return (
    <div className={`border-b border-[#1F1F23]/30 last:border-b-0 pb-3 mb-3 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between py-1.5 text-left text-xs font-medium text-[#EDEDED] hover:text-white transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF] rounded group select-none"
      >
        <div className="flex items-center gap-1.5">
          <ChevronRight
            className={`w-3.5 h-3.5 text-[#8A8A93] group-hover:text-[#EDEDED] transition-transform duration-120 ${
              isExpanded ? 'rotate-90 text-[#EDEDED]' : ''
            }`}
          />
          <span className="text-[13px] font-medium tracking-tight text-[#EDEDED]">{title}</span>
          {specCode && <SpecChip code={specCode} description={specDescription} />}
        </div>
        {badge && <div className="text-[11px] text-[#8A8A93]">{badge}</div>}
      </button>

      {isExpanded && (
        <div className="pt-2.5 pl-5 pr-1 space-y-3 transition-opacity duration-120 ease-out">
          {children}
        </div>
      )}
    </div>
  );
};
