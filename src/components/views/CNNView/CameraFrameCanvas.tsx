/**
 * Camera Frame Canvas Component
 * Displays the 640x480 live optical sensor frame with real-time candidate classification overlays.
 */

import React from 'react';
import { CnnCandidate } from './types';
import { Camera, Crosshair, Sliders } from 'lucide-react';

interface CameraFrameCanvasProps {
  frameImageB64: string;
  candidates: CnnCandidate[];
  threshold: number;
}

export const CameraFrameCanvas: React.FC<CameraFrameCanvasProps> = ({
  frameImageB64,
  candidates,
  threshold,
}) => {
  return (
    <div className="relative w-full h-full min-h-[340px] bg-[#0a0e14] border border-[#1f2937] rounded-xl overflow-hidden flex flex-col shadow-xl">
      {/* Top Header Strip */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0e121a]/90 border-b border-[#1f2937] z-20">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#06b6d4]" />
          <span className="text-xs font-mono font-semibold text-[#ededed] uppercase">
            Optical Sensor Viewport (640 &times; 480)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#16202e] border border-[#06b6d4]/40 text-[#06b6d4]">
            LIVE CLASSIFICATION
          </span>
        </div>

        {/* Current Threshold Corner Chip */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#16202e] border border-[#06b6d4]/40 text-xs font-mono">
          <Sliders className="w-3.5 h-3.5 text-[#06b6d4]" />
          <span className="text-[#8a8a93]">CNN Threshold:</span>
          <strong className="text-[#06b6d4]">{threshold.toFixed(2)}</strong>
        </div>
      </div>

      {/* 640x480 Aspect-Ratio Viewport Container */}
      <div className="relative flex-1 w-full bg-black flex items-center justify-center overflow-hidden">
        <div className="relative w-full h-full max-w-[640px] max-h-[480px] aspect-[4/3] flex items-center justify-center">
          {/* Base Frame Image */}
          {frameImageB64 ? (
            <img
              src={frameImageB64}
              alt="Optical Camera Frame"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-xs font-mono text-[#8a8a93]">
              Awaiting video frame stream...
            </div>
          )}

          {/* Optical Center Boresight Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <Crosshair className="w-8 h-8 text-[#06b6d4]/30" strokeWidth={1} />
          </div>

          {/* Candidate Bounding Boxes Overlaid at 640x480 Coords */}
          {candidates.map((cand) => {
            const isAccepted = cand.confidence >= threshold;
            const borderColor = isAccepted ? '#3FB950' : '#F85149';
            const labelBg = isAccepted ? 'bg-[#3FB950]' : 'bg-[#F85149]';
            const labelText = isAccepted ? 'text-[#0a0e14]' : 'text-white';
            const tag = isAccepted ? 'BEACON' : 'CLUTTER';

            // Coordinates in percentage relative to 640x480 frame
            const leftPct = ((cand.x - 16) / 640) * 100;
            const topPct = ((cand.y - 16) / 480) * 100;
            const widthPct = (32 / 640) * 100;
            const heightPct = (32 / 480) * 100;

            return (
              <div
                key={cand.id}
                className="absolute pointer-events-none transition-all duration-100"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                {/* 2px Solid Bounding Box */}
                <div
                  className="w-full h-full rounded-sm"
                  style={{
                    border: `2px solid ${borderColor}`,
                    boxShadow: isAccepted ? '0 0 8px rgba(63, 185, 80, 0.4)' : undefined,
                  }}
                />

                {/* Classification Label Above Box */}
                <div
                  className={`absolute -top-5 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded text-[9px] font-mono font-bold whitespace-nowrap shadow-md ${labelBg} ${labelText}`}
                >
                  {tag} {cand.confidence.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Info Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e121a]/90 border-t border-[#1f2937] text-[10px] font-mono text-[#8a8a93]">
        <div className="flex items-center gap-2">
          <span>Resolution: 640 &times; 480 Mono</span>
          <span>&bull;</span>
          <span>ROI Patch: 32 &times; 32 px</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#3FB950]" />
            <span className="text-[#EDEDED]">Accepted (&ge; {threshold.toFixed(2)})</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#F85149]" />
            <span className="text-[#EDEDED]">Rejected (&lt; {threshold.toFixed(2)})</span>
          </span>
        </div>
      </div>
    </div>
  );
};
