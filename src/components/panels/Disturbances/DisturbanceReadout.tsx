import React from 'react';
import { useAppStore } from '../../../lib/store';
import { SpecChip } from '../../ui/SpecChip';
import { Radio, Activity, Cloud, Compass } from 'lucide-react';

export const DisturbanceReadout: React.FC = () => {
  const spec = useAppStore((state) => state.spec);

  const noiseParts: string[] = [];
  if (spec.noiseSaltPepperEnabled) {
    noiseParts.push(`S&P ${spec.noiseSaltPepperDensity}%`);
  }
  if (spec.noiseGaussianEnabled) {
    noiseParts.push(`Gauss σ=${spec.noiseGaussianStdDev}px`);
  }
  if (spec.noisePoissonEnabled) {
    noiseParts.push(`Poisson λ=${spec.noisePoissonScale}`);
  }
  const noiseStr = noiseParts.length > 0 ? noiseParts.join(' | ') : 'Disabled';

  return (
    <div className="bg-[#111113] border border-[#1F1F23]/40 rounded-lg p-3 space-y-2.5 select-none">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[#8A8A93] uppercase tracking-[0.08em]">
          Active Disturbance Vector
        </span>
        <SpecChip code="SIH-21..25" description="Channel impairments: noise, mechanical jitter, atmospheric absorption, platform motion" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2 p-2 bg-[#17171A] rounded border border-[#1F1F23]/40">
          <Radio className="w-3.5 h-3.5 text-[#8A8A93] shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <div className="text-[10px] text-[#8A8A93]">Focal Plane Noise</div>
            <div className="font-mono text-[#EDEDED] truncate text-[11px]">
              {noiseStr}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-[#17171A] rounded border border-[#1F1F23]/40">
          <Activity className="w-3.5 h-3.5 text-[#8A8A93] shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <div className="text-[10px] text-[#8A8A93]">PTZ Jitter</div>
            <div className="font-mono text-[#EDEDED] truncate text-[11px]">
              {spec.cameraJitterEnabled 
                ? `±${spec.cameraJitterIntensity} px (${spec.cameraJitterWaveform})` 
                : 'Disabled'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-[#17171A] rounded border border-[#1F1F23]/40">
          <Cloud className="w-3.5 h-3.5 text-[#8A8A93] shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <div className="text-[10px] text-[#8A8A93]">Atmosphere</div>
            <div className="font-mono text-[#EDEDED] truncate text-[11px]">
              {spec.atmosphericDisturbance} ({spec.atmosphereSeverity}%)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-[#17171A] rounded border border-[#1F1F23]/40">
          <Compass className="w-3.5 h-3.5 text-[#8A8A93] shrink-0" strokeWidth={1.5} />
          <div className="min-w-0">
            <div className="text-[10px] text-[#8A8A93]">Platform Motion</div>
            <div className="font-mono text-[#EDEDED] truncate text-[11px]">
              {spec.platformMotion} ({spec.platformMotionAmp} px/f)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
