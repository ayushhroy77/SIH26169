import React from 'react';
import { useAppStore } from '../../../lib/store';
import { Slider } from '../../ui/Slider';
import { Toggle } from '../../ui/Toggle';
import { SpecChip } from '../../ui/SpecChip';
import { Radio } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';

export const NoiseCard: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);

  const isMasterActive =
    spec.noiseMasterIntensity > 0 &&
    (spec.noiseSaltPepperEnabled || spec.noiseGaussianEnabled || spec.noisePoissonEnabled);

  const toggleMaster = (enabled: boolean) => {
    if (!enabled) {
      updateSpec({ noiseMasterIntensity: 0 });
    } else {
      updateSpec({
        noiseMasterIntensity: 100,
        noiseSaltPepperEnabled: true,
      });
    }
  };

  const noiseParts: string[] = [];
  if (spec.noiseSaltPepperEnabled && spec.noiseMasterIntensity > 0) {
    noiseParts.push(`S&P ${spec.noiseSaltPepperDensity}%`);
  }
  if (spec.noiseGaussianEnabled && spec.noiseMasterIntensity > 0) {
    noiseParts.push(`Gauss σ=${spec.noiseGaussianStdDev}px`);
  }
  if (spec.noisePoissonEnabled && spec.noiseMasterIntensity > 0) {
    noiseParts.push(`Poisson λ=${spec.noisePoissonScale}`);
  }
  const footerReadout =
    noiseParts.length > 0 ? noiseParts.join(' · ') : 'Offline';

  return (
    <div className="bg-[#111113] border border-[#1F1F23]/40 rounded-lg overflow-hidden select-none">
      {/* Card Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1F1F23]/30">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-[#5B8DEF]" strokeWidth={1.5} />
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#EDEDED]">Image Sensor Noise</span>
            <SpecChip code="SIH-21..22" description="Focal plane array readout noise (Gaussian σ=0-20px) and impulse bit-flip noise (Salt & Pepper)" />
          </div>
        </div>
        <Toggle
          label=""
          checked={isMasterActive}
          onChange={toggleMaster}
        />
      </div>

      {/* Card Body */}
      {isMasterActive && (
        <div className="p-3.5 space-y-3">
          {/* Master Intensity */}
          <Slider
            label="Master Noise Intensity"
            tooltip="Global gain multiplier scaling all active sensor noise distributions"
            value={spec.noiseMasterIntensity}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(val) => updateSpec({ noiseMasterIntensity: val })}
          />

          <div className="space-y-2.5 pt-1">
            {/* 1. Salt & Pepper */}
            <div className="p-2.5 bg-[#17171A] border border-[#1F1F23]/40 rounded space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#EDEDED] font-medium">
                  <span>1. Salt & Pepper Noise</span>
                  <Tooltip content="Impulse bit-flip noise representing dead and saturated photodiode pixels across the camera matrix." />
                </div>
                <Toggle
                  label=""
                  checked={spec.noiseSaltPepperEnabled}
                  onChange={(val) => updateSpec({ noiseSaltPepperEnabled: val })}
                />
              </div>

              {spec.noiseSaltPepperEnabled && (
                <Slider
                  label="Impulse Density"
                  value={spec.noiseSaltPepperDensity}
                  min={0}
                  max={20}
                  step={1}
                  unit="%"
                  onChange={(val) => updateSpec({ noiseSaltPepperDensity: val })}
                />
              )}
            </div>

            {/* 2. Gaussian */}
            <div className="p-2.5 bg-[#17171A] border border-[#1F1F23]/40 rounded space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#EDEDED] font-medium">
                  <span>2. Gaussian Readout Noise</span>
                  <Tooltip content="Zero-mean thermal Johnson noise on the analog amplifier chain (0–20 px standard deviation cap)." />
                </div>
                <Toggle
                  label=""
                  checked={spec.noiseGaussianEnabled}
                  onChange={(val) => updateSpec({ noiseGaussianEnabled: val })}
                />
              </div>

              {spec.noiseGaussianEnabled && (
                <Slider
                  label="Std-Deviation (σ)"
                  value={spec.noiseGaussianStdDev}
                  min={0}
                  max={20}
                  step={1}
                  unit=" px"
                  onChange={(val) => updateSpec({ noiseGaussianStdDev: val })}
                />
              )}
            </div>

            {/* 3. Poisson */}
            <div className="p-2.5 bg-[#17171A] border border-[#1F1F23]/40 rounded space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#EDEDED] font-medium">
                  <span>3. Poisson Shot Noise</span>
                  <Tooltip content="Simulates discrete quantum photon arrival fluctuations governed by Poisson statistics." />
                </div>
                <Toggle
                  label=""
                  checked={spec.noisePoissonEnabled}
                  onChange={(val) => updateSpec({ noisePoissonEnabled: val })}
                />
              </div>

              {spec.noisePoissonEnabled && (
                <Slider
                  label="Photon Scale (λ)"
                  value={spec.noisePoissonScale}
                  min={1}
                  max={100}
                  step={5}
                  unit=""
                  onChange={(val) => updateSpec({ noisePoissonScale: val })}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="px-3.5 py-2 bg-[#17171A] border-t border-[#1F1F23]/30 flex items-center justify-between text-[11px] font-mono">
        <span className="text-[#8A8A93]">Noise Vector:</span>
        <span className="text-[#EDEDED]">{footerReadout}</span>
      </div>
    </div>
  );
};
