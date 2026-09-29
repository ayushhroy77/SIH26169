/**
 * Candidate Patch Component
 * Renders an enlarged 32x32 grayscale candidate patch with confidence bar and classification status.
 */

import React from 'react';
import { CnnCandidate } from './types';

interface CandidatePatchProps {
  candidate: CnnCandidate;
  threshold: number;
}

export const CandidatePatch: React.FC<CandidatePatchProps> = ({ candidate, threshold }) => {
  const isAccepted = candidate.confidence >= threshold;
  const statusColor = isAccepted ? '#3FB950' : '#F85149';
  const statusBg = isAccepted ? 'bg-[#3FB950]/15' : 'bg-[#F85149]/15';
  const statusBorder = isAccepted ? 'border-[#3FB950]' : 'border-[#F85149]';
  const statusText = isAccepted ? 'text-[#3FB950]' : 'text-[#F85149]';
  const label = isAccepted ? 'BEACON' : 'CLUTTER';

  return (
    <div
      className={`flex flex-col items-center p-2 rounded-lg bg-[#0e121a] border-2 transition-all duration-150 flex-shrink-0 ${statusBorder}`}
      style={{ width: '116px' }}
    >
      {/* Top Tag & ID */}
      <div className="flex items-center justify-between w-full mb-1 text-[10px] font-mono">
        <span className="text-[#8a8a93]">ID #{candidate.id}</span>
        <span className={`px-1 py-0.2 rounded font-bold text-[9px] ${statusBg} ${statusText}`}>
          {label}
        </span>
      </div>

      {/* 32x32 Patch Display in a 80x80 viewing window */}
      <div className="w-20 h-20 bg-black rounded border border-[#1f2937] overflow-hidden flex items-center justify-center shadow-inner">
        <img
          src={candidate.patchDataUrl}
          alt={`Patch #${candidate.id}`}
          className="w-full h-full object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Confidence Bar */}
      <div className="w-full mt-2 bg-[#1f2937] h-1.5 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-150 rounded-full"
          style={{
            width: `${Math.round(candidate.confidence * 100)}%`,
            backgroundColor: statusColor,
          }}
        />
      </div>

      {/* Confidence Value & Coordinates */}
      <div className="flex items-center justify-between w-full mt-1.5 text-[11px] font-mono">
        <span className="text-[#8a8a93] text-[9px]">({candidate.x}, {candidate.y})</span>
        <span className={`font-semibold ${statusText}`}>
          {(candidate.confidence * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};
