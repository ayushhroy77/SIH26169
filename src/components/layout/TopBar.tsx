import React from 'react';
import { useAppStore } from '../../lib/store';
import { StatusPill } from '../ui/StatusPill';
import { ModeSwitcher } from '../panels/InputMode/ModeSwitcher';
import { SpecChip } from '../ui/SpecChip';
import { Radio, HelpCircle, Play, Pause, RotateCcw } from 'lucide-react';

export const TopBar: React.FC = () => {
  const isRunning = useAppStore((state) => state.isRunning);
  const setIsRunning = useAppStore((state) => state.setIsRunning);
  const triggerReset = useAppStore((state) => state.triggerReset);
  const setHelpModalOpen = useAppStore((state) => state.setHelpModalOpen);
  const metrics = useAppStore((state) => state.metrics);
  const benchmarkMetrics = useAppStore((state) => state.benchmarkMetrics);
  const inputMode = useAppStore((state) => state.inputMode);

  const isVideo = inputMode === 'Video Ingestion';
  const currentFps = isVideo ? benchmarkMetrics.fpsMeasured : metrics.fps;
  const currentRmse = isVideo ? benchmarkMetrics.rmsePx : metrics.trackingErrorPx;
  const currentLock = isVideo ? (benchmarkMetrics.locked ? 'Tracking' : 'Re-acquiring') : metrics.lockStatus;

  return (
    <header
      id="app-topbar"
      className="h-14 shrink-0 bg-[#0E0E10] border-b border-[#1F1F23]/40 px-4 flex items-center justify-between z-20 select-none"
    >
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-7 h-7 rounded bg-[#17171A] border border-[#1F1F23]/40 text-[#5B8DEF]">
          <Radio className="w-4 h-4" strokeWidth={1.5} />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium tracking-tight text-[#EDEDED]">
            FSOC Coarse Alignment
          </span>
          <SpecChip code="SIH-2024" description="AI-Based Virtual Camera Tracking System for Mobile FSOC Terminals (ISRO)" />
        </div>

        <div className="h-4 w-px bg-[#1F1F23]/40 mx-1 hidden sm:block" />

        {/* Center-left: Mode Switcher */}
        <ModeSwitcher />
      </div>

      {/* Right: Controls, Global Status Pill & Help */}
      <div className="flex items-center gap-2.5">
        {/* Play/Pause Minimal Action */}
        <button
          type="button"
          onClick={() => setIsRunning(!isRunning)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF] ${
            isRunning
              ? 'bg-[#17171A] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]/60'
              : 'bg-[#5B8DEF] hover:bg-[#4A7BD9] text-white'
          }`}
          title={isRunning ? 'Pause Tracking Loop' : 'Run Tracking Loop'}
        >
          {isRunning ? (
            <>
              <Pause className="w-3 h-3" strokeWidth={1.5} />
              <span className="hidden md:inline text-[11px]">PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3" strokeWidth={1.5} />
              <span className="hidden md:inline text-[11px]">RUN</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={triggerReset}
          className="p-1.5 rounded bg-[#17171A] hover:bg-[#1F1F23] text-[#8A8A93] hover:text-[#EDEDED] border border-[#1F1F23]/60 transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF]"
          title="Reset Simulation & Tracking Telemetry"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <div className="h-4 w-px bg-[#1F1F23]/40 mx-0.5 hidden sm:block" />

        {/* Global Status Pill: 6px colored dot + short label: TRACKING · 24 FPS · RMSE 6.4 px */}
        <StatusPill
          status={currentLock}
          fps={currentFps}
          rmse={currentRmse}
        />

        {/* In-App User Guide / Documentation */}
        <button
          type="button"
          onClick={() => setHelpModalOpen(true)}
          className="p-1.5 rounded bg-[#17171A] hover:bg-[#1F1F23] text-[#8A8A93] hover:text-[#EDEDED] border border-[#1F1F23]/60 transition-colors duration-120 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF]"
          title="System Architecture & SIH Criteria Manual"
        >
          <HelpCircle className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
