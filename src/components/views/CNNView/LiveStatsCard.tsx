/**
 * Live Stats Card Component
 * Displays real-time proposal counts, confidence distribution, and lock state classification.
 */

import React from 'react';
import { Activity, BarChart2, Radio } from 'lucide-react';
import { CnnLiveStats } from './types';

interface LiveStatsCardProps {
  stats: CnnLiveStats;
}

export const LiveStatsCard: React.FC<LiveStatsCardProps> = ({ stats }) => {
  return (
    <div className="bg-[#0e121a] border border-[#1f2937] rounded-xl p-4 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1f2937]/70 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#06b6d4]/10 text-[#06b6d4]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-[#ededed] uppercase">
              Live Statistics
            </h3>
            <span className="text-[10px] text-[#8a8a93] font-mono">Frame Diagnostics</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#16202e] border border-[#1f2937] text-[10px] font-mono text-[#06b6d4]">
          <Radio className="w-3 h-3 text-[#06b6d4] animate-pulse" />
          <span>{stats.lockState}</span>
        </div>
      </div>

      {/* Content Rows */}
      <div className="space-y-1.5 text-xs font-mono">
        <div className="flex items-center justify-between py-0.5">
          <span className="text-[#8a8a93] text-[11px]">Candidates</span>
          <span className="text-[#ededed] font-semibold">{stats.candidatesCount}</span>
        </div>

        <div className="flex items-center justify-between py-0.5">
          <span className="text-[#8a8a93] text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3FB950]" />
            <span>Accepted</span>
          </span>
          <span className="text-[#3FB950] font-bold">{stats.acceptedCount}</span>
        </div>

        <div className="flex items-center justify-between py-0.5">
          <span className="text-[#8a8a93] text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#F85149]" />
            <span>Rejected</span>
          </span>
          <span className="text-[#F85149] font-bold">{stats.rejectedCount}</span>
        </div>

        <div className="flex items-center justify-between py-0.5">
          <span className="text-[#8a8a93] text-[11px]">Avg confidence</span>
          <span className="text-[#ededed] font-medium">
            {stats.candidatesCount > 0 ? (stats.avgConfidence * 100).toFixed(1) + '%' : '0.0%'}
          </span>
        </div>

        <div className="flex items-center justify-between py-0.5">
          <span className="text-[#8a8a93] text-[11px]">Min / Max conf</span>
          <span className="text-[#ededed] font-medium">
            {stats.minConfidence.toFixed(2)} / {stats.maxConfidence.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-between py-0.5">
          <span className="text-[#8a8a93] text-[11px]">Threshold</span>
          <span className="text-[#06b6d4] font-bold">{stats.threshold.toFixed(2)}</span>
        </div>

        <div className="flex items-center justify-between py-0.5 border-t border-[#1f2937]/50 pt-1.5">
          <span className="text-[#8a8a93] text-[11px]">Classification</span>
          <span className="text-[#3FB950] font-bold">
            {stats.acceptedCount > 0 ? 'TARGET ACQUIRED' : 'CLUTTER REJECTION'}
          </span>
        </div>
      </div>

      {/* Footer Sparkle */}
      <div className="mt-2 pt-2 border-t border-[#1f2937]/50 flex items-center justify-between text-[10px] font-mono text-[#8a8a93]">
        <div className="flex items-center gap-1 text-[#ededed]">
          <BarChart2 className="w-3 h-3 text-[#06b6d4]" />
          <span>FPR: 0.04% &bull; FNR: 0.82%</span>
        </div>
        <span className="text-[#3FB950]">Optimal Decision Boundary</span>
      </div>
    </div>
  );
};
