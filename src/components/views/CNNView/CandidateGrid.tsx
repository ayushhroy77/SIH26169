/**
 * Candidate Grid Component
 * Horizontal scrollable row displaying all candidate 32x32 patches ranked by confidence.
 */

import React from 'react';
import { CnnCandidate } from './types';
import { CandidatePatch } from './CandidatePatch';
import { Layers, CheckCircle2, XCircle } from 'lucide-react';

interface CandidateGridProps {
  candidates: CnnCandidate[];
  threshold: number;
}

export const CandidateGrid: React.FC<CandidateGridProps> = ({ candidates, threshold }) => {
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const acceptedCount = sorted.filter((c) => c.confidence >= threshold).length;
  const rejectedCount = sorted.length - acceptedCount;

  return (
    <div className="flex flex-col h-full bg-[#0e121a] border border-[#1f2937] rounded-xl p-3 shadow-lg">
      {/* Title & Status Summary Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1f2937]/70 mb-2">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#06b6d4]" />
          <span className="text-xs font-semibold tracking-wide text-[#ededed] uppercase font-mono">
            Candidate Patches — What the CNN Sees
          </span>
          <span className="text-[11px] font-mono text-[#8a8a93]">
            (32 &times; 32 Grayscale ROI)
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#3FB950]">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">{acceptedCount} Accepted</span>
          </div>
          <span className="text-[#1f2937]">|</span>
          <div className="flex items-center gap-1.5 text-[#F85149]">
            <XCircle className="w-3.5 h-3.5" />
            <span className="text-[11px] font-medium">{rejectedCount} Rejected</span>
          </div>
          <span className="text-[#1f2937]">|</span>
          <span className="text-[11px] text-[#8a8a93]">Total: {sorted.length}</span>
        </div>
      </div>

      {/* Horizontal Scrollable Row of Candidates */}
      <div className="flex-1 flex items-center gap-3 overflow-x-auto py-1 pr-2 min-h-0 custom-scrollbar">
        {sorted.length > 0 ? (
          sorted.map((candidate) => (
            <CandidatePatch
              key={candidate.id}
              candidate={candidate}
              threshold={threshold}
            />
          ))
        ) : (
          <div className="flex items-center justify-center w-full text-xs font-mono text-[#8a8a93] italic py-6">
            No candidate proposals in current frame
          </div>
        )}
      </div>
    </div>
  );
};
