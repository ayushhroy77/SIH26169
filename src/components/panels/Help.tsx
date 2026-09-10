import React from 'react';
import { Card } from '../ui/Card';
import { BookOpen, Crosshair, Terminal, Layers, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const Help: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Deliverable D: In-App User Manual */}
      <Card
        title="Deliverable D: In-App User Manual"
        subtitle="Operation & GUI Guide"
        tooltip="Official user guide for operating the FSOC Coarse Alignment Virtual Tracking System"
      >
        <div className="space-y-3 text-xs leading-relaxed text-[#EDEDED]">
          <div className="p-3 bg-[#0E0E10] border border-[#1F1F23] rounded-md space-y-2">
            <h4 className="font-semibold text-xs text-[#5B8DEF] flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> 1. Quick Start & Operation
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 text-[#8A8A93]">
              <li>
                <strong className="text-[#EDEDED]">Run / Pause Simulation:</strong> Use the top bar Play/Pause button or the quick switcher to toggle real-time simulation at 30 Hz.
              </li>
              <li>
                <strong className="text-[#EDEDED]">Target Motion:</strong> Select motion patterns (Straight Line, Circular, Figure-of-8, Random, Spiral, Sinusoidal) in the Simulation Setup or top bar.
              </li>
              <li>
                <strong className="text-[#EDEDED]">Interactive Beacon Relocation:</strong> Click anywhere on the 2000×2000 Virtual Scene canvas to immediately teleport the optical beacon spot and test dynamic re-acquisition.
              </li>
              <li>
                <strong className="text-[#EDEDED]">Disturbance Testing:</strong> Inject Salt & Pepper / Gaussian noise, atmospheric Fog/Haze/Rain, or platform vibrations to benchmark tracker robustness.
              </li>
              <li>
                <strong className="text-[#EDEDED]">Export Evaluation Logs:</strong> Navigate to "Reports & Logs" to generate and download SIH JSON/CSV performance logs.
              </li>
            </ol>
          </div>

          <div className="p-3 bg-[#0E0E10] border border-[#1F1F23] rounded-md space-y-2">
            <h4 className="font-semibold text-xs text-[#3FB950] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 2. ISRO Specification Compliance Contract
            </h4>
            <ul className="space-y-1 text-[#8A8A93] font-mono text-[11px]">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
                <span>Screen Size: 2000×2000 px minimum (Honored)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
                <span>Camera: Monochrome default | 640×480 | FOV 4°×3° | 30 Hz (Honored)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
                <span>Target: Beacon Spot | Square 10×10 default | 4+ Motions (Honored)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
                <span>PTZ Limits: 5–10°/s pan & tilt max speed (Enforced)</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#3FB950]" />
                <span>Live KPIs: Acquisition ≤ 2s | Error ≤ 10px | Loss &lt; 5% | FPS ≥ 20 (Tracked)</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Technical Architecture & Mathematics */}
      <Card
        title="Technical Architecture & Math Formulation"
        tooltip="Mathematical formulation of coordinate projections, centroiding, and closed-loop servo control"
      >
        <div className="space-y-2.5 text-xs text-[#8A8A93] leading-relaxed">
          <p>
            <strong className="text-[#EDEDED]">1. Stage-1 Coarse Pointing, Acquisition & Tracking (PAT):</strong> In Mobile Free Space Optical Communication, wide-beam coarse alignment guides the high-precision Fast Steering Mirror (FSM, Stage 2) into coupling range.
          </p>
          <div className="p-2.5 bg-[#0A0A0B] rounded border border-[#1A1A20] font-mono text-[10px] text-[#EDEDED] space-y-1">
            <div className="text-[#5B8DEF]"># Centroid Calculation (Center of Mass):</div>
            <div>X_c = Σ(x · I(x, y)) / Σ(I(x, y))</div>
            <div>Y_c = Σ(y · I(x, y)) / Σ(I(x, y))</div>
            <div className="text-[#5B8DEF] mt-1"># Tracking Error Relative to Boresight (320, 240):</div>
            <div>e_x = X_c - X_boresight,  e_y = Y_c - Y_boresight</div>
            <div>Error_px = √(e_x² + e_y²)</div>
            <div className="text-[#5B8DEF] mt-1"># Proportional Slew Control:</div>
            <div>V_pan = clamp(K_p · e_x + K_d · Δe_x, -V_max, V_max)</div>
          </div>
          <p className="text-[11px] text-[#6B6B75]">
            Angular resolution: 4° FOV over 640 horizontal pixels yields 160 px/deg, translating 1 pixel to ~22.5 arcseconds.
          </p>
        </div>
      </Card>
    </div>
  );
};
