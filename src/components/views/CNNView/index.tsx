/**
 * CNN View Component
 * Main diagnostic view visualizing the convolutional neural network classifier
 * in the FSOC coarse tracking architecture.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../../../lib/store';
import { extractCnnCandidates } from './cnnMock';
import { CameraFrameCanvas } from './CameraFrameCanvas';
import { CandidateGrid } from './CandidateGrid';
import { ModelInfoCard } from './ModelInfoCard';
import { LiveStatsCard } from './LiveStatsCard';
import { CnnLiveStats } from './types';
import { Sliders, ShieldCheck } from 'lucide-react';

export const CNNView: React.FC = () => {
  const metrics = useAppStore((state) => state.metrics);
  const spec = useAppStore((state) => state.spec);
  const cnnThreshold = useAppStore((state) => state.cnnThreshold ?? 0.5);
  const setCnnThreshold = useAppStore((state) => state.setCnnThreshold);

  // Time ticker for mock candidate animation
  const [timeSec, setTimeSec] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSec((t) => t + 0.1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Extract / simulate candidates whenever metrics or threshold change
  const { candidates, frameImageB64 } = useMemo(() => {
    return extractCnnCandidates(metrics, spec, cnnThreshold, timeSec);
  }, [metrics, spec, cnnThreshold, timeSec]);

  // Compute live statistics
  const liveStats: CnnLiveStats = useMemo(() => {
    const acceptedCount = candidates.filter((c) => c.confidence >= cnnThreshold).length;
    const rejectedCount = candidates.length - acceptedCount;
    const confs = candidates.map((c) => c.confidence);
    const avgConfidence =
      confs.length > 0 ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
    const minConfidence = confs.length > 0 ? Math.min(...confs) : 0;
    const maxConfidence = confs.length > 0 ? Math.max(...confs) : 0;

    const lockState =
      metrics.lockState ||
      (metrics.isLocked ? 'TRACK' : metrics.targetInFov ? 'ACQUIRE' : 'SEARCH');

    return {
      candidatesCount: candidates.length,
      acceptedCount,
      rejectedCount,
      avgConfidence,
      minConfidence,
      maxConfidence,
      threshold: cnnThreshold,
      lockState,
    };
  }, [candidates, cnnThreshold, metrics]);

  return (
    <div className="w-full h-full min-h-[620px] bg-[#0a0e14] rounded-xl border border-[#1f2937] p-3 flex flex-col gap-3 overflow-hidden select-none">
      {/* ── ROW 1 (approx 58-60% height): Frame Viewport & Diagnostic Cards ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[360px]">
        {/* Left (65%): Live Camera Frame with Overlaid Candidate Bounding Boxes */}
        <div className="lg:col-span-8 flex flex-col min-h-0">
          <CameraFrameCanvas
            frameImageB64={frameImageB64}
            candidates={candidates}
            threshold={cnnThreshold}
          />
        </div>

        {/* Right (35%): Stacked Model Metadata & Live Telemetry Cards */}
        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0">
          <div className="flex-1">
            <ModelInfoCard />
          </div>
          <div className="flex-1">
            <LiveStatsCard stats={liveStats} />
          </div>
        </div>
      </div>

      {/* ── ROW 2 (approx 28-30% height): Candidate 32x32 ROI Patch Grid ── */}
      <div className="h-44 min-h-[160px]">
        <CandidateGrid candidates={candidates} threshold={cnnThreshold} />
      </div>

      {/* ── ROW 3 (approx 10-12% height): Decision Threshold Control Strip ── */}
      <div className="bg-[#0e121a] border border-[#1f2937] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        {/* Slider Controls */}
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="flex items-center gap-2 text-xs font-mono text-[#ededed]">
            <Sliders className="w-4 h-4 text-[#06b6d4]" />
            <span className="font-semibold uppercase tracking-wider">Classification Cutoff:</span>
          </div>

          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={cnnThreshold}
            onChange={(e) => setCnnThreshold(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-[#1f2937] rounded-lg appearance-none cursor-pointer accent-[#06b6d4]"
          />

          <div className="px-2 py-0.5 rounded bg-[#16202e] border border-[#06b6d4]/40 font-mono text-xs font-bold text-[#06b6d4]">
            {cnnThreshold.toFixed(2)}
          </div>
        </div>

        {/* Legend & Verification Badge */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3FB950]" />
            <span className="text-[#EDEDED]">Accepted Beacon</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#F85149]" />
            <span className="text-[#8A8A93]">Rejected Clutter</span>
          </div>

          <div className="h-3 w-px bg-[#1f2937] hidden sm:block" />

          <div className="flex items-center gap-1 text-[11px] text-[#3FB950] font-medium hidden sm:flex">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Robust to Solar Glint &amp; Cloud Edge</span>
          </div>
        </div>
      </div>
    </div>
  );
};
