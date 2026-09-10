import React from 'react';
import { Tooltip } from './Tooltip';

interface CardProps {
  id?: string;
  title?: string;
  subtitle?: string;
  specCode?: string;
  specDescription?: string;
  tooltip?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  id,
  title,
  subtitle,
  specCode,
  specDescription,
  tooltip,
  action,
  children,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`rounded-lg bg-[#111113] border border-[#1F1F23]/40 p-3.5 text-[#EDEDED] relative select-none ${className}`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {title && (
              <h3 className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A8A93]">
                {title}
              </h3>
            )}
            {subtitle && (
              <span className="text-[11px] font-normal text-[#5C5C66]">
                {subtitle}
              </span>
            )}
            {tooltip && <Tooltip content={tooltip} />}
          </div>
          {action && <div className="text-xs">{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
