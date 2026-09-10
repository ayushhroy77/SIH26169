import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  phase2?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, phase2 = false }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1">
      <button
        type="button"
        className="text-[#8A8A93] hover:text-[#EDEDED] transition-colors duration-150 p-0.5 rounded focus:outline-none"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
        aria-label="Info"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <div className="absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 z-50 w-56 p-2 text-xs font-normal leading-relaxed rounded-md bg-[#16161A] text-[#EDEDED] border border-[#26262C] shadow-lg pointer-events-none">
          {phase2 && (
            <span className="inline-block px-1.5 py-0.5 mb-1 text-[10px] font-mono uppercase font-semibold text-[#D29922] bg-[#D29922]/15 border border-[#D29922]/30 rounded">
              Phase 2 Feature
            </span>
          )}
          <p>{content}</p>
        </div>
      )}
    </div>
  );
};
