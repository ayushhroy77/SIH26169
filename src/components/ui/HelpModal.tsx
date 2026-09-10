import React from 'react';
import { useAppStore } from '../../lib/store';
import { X, CheckCircle2, BookOpen, Layers } from 'lucide-react';

export const HelpModal: React.FC = () => {
  const helpModalOpen = useAppStore((state) => state.helpModalOpen);
  const setHelpModalOpen = useAppStore((state) => state.setHelpModalOpen);

  if (!helpModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-[#111113] border border-[#1F1F23] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#1F1F23] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#5B8DEF]" />
            <h2 className="text-sm font-semibold text-[#EDEDED]">
              FSOC Coarse Tracking System — Technical Guide & Spec
            </h2>
          </div>
          <button
            onClick={() => setHelpModalOpen(false)}
            className="p-1 rounded text-[#8A8A93] hover:text-[#EDEDED] hover:bg-[#1F1F23] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs text-[#8A8A93] leading-relaxed">
          <div>
            <h3 className="text-xs font-semibold text-[#EDEDED] uppercase tracking-wider mb-1.5 text-[#5B8DEF]">
              1. Project Objective (ISRO / SIH 2024)
            </h3>
            <p>
              Autonomous virtual camera tracking system for Pointing, Acquisition, and Tracking (PAT Stage 1)
              of Mobile Free Space Optical Communication terminals. This software testbed replaces expensive
              gimbals and laboratory optical benches to systematically evaluate coarse optical alignment.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#EDEDED] uppercase tracking-wider mb-1.5 text-[#3FB950]">
              2. Mandatory Performance Verification Criteria
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2 bg-[#0E0E10] border border-[#1F1F23] rounded">
                <span className="text-[#EDEDED] font-semibold">16. Acquisition Time:</span> ≤ 2.0 seconds
              </div>
              <div className="p-2 bg-[#0E0E10] border border-[#1F1F23] rounded">
                <span className="text-[#EDEDED] font-semibold">17. Tracking Error:</span> ≤ 10.0 pixels
              </div>
              <div className="p-2 bg-[#0E0E10] border border-[#1F1F23] rounded">
                <span className="text-[#EDEDED] font-semibold">18. Target Loss Rate:</span> &lt; 5.0%
              </div>
              <div className="p-2 bg-[#0E0E10] border border-[#1F1F23] rounded">
                <span className="text-[#EDEDED] font-semibold">19. Re-acquisition:</span> ≤ 1.0 seconds
              </div>
              <div className="p-2 bg-[#0E0E10] border border-[#1F1F23] rounded">
                <span className="text-[#EDEDED] font-semibold">20. Frame Rate:</span> ≥ 20 FPS (30 Hz nominal)
              </div>
              <div className="p-2 bg-[#0E0E10] border border-[#1F1F23] rounded">
                <span className="text-[#EDEDED] font-semibold">PTZ Slew Speed:</span> 5°/s to 10°/s
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-[#EDEDED] uppercase tracking-wider mb-1.5">
              3. Interactive Controls & Testing
            </h3>
            <p>
              • Click anywhere inside the <strong>2000×2000 Virtual Scene</strong> to instantaneously relocate the beacon to test re-acquisition time.
              <br />
              • Use <strong>Disturbances</strong> to introduce Fog, Rain, Haze, or high camera jitter to verify closed-loop servo stability.
              <br />
              • Run <strong>Benchmark-1</strong> or <strong>Benchmark-2</strong> to execute automated evaluations with live log outputs.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1F1F23] bg-[#0E0E10] flex justify-end">
          <button
            onClick={() => setHelpModalOpen(false)}
            className="px-4 py-1.5 bg-[#5B8DEF] hover:bg-[#4A7BD9] text-white rounded text-xs font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
