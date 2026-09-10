import React from 'react';
import { useAppStore } from '../../../lib/store';
import { Select } from '../../ui/Select';
import { Slider } from '../../ui/Slider';
import { Toggle } from '../../ui/Toggle';
import { SpecChip } from '../../ui/SpecChip';
import { Cloud, Info } from 'lucide-react';

export const AtmosphereCard: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);

  const toggleAtmosphere = (active: boolean) => {
    if (!active) {
      updateSpec({ atmosphericDisturbance: 'Clear', atmosphereSeverity: 0 });
    } else {
      updateSpec({ atmosphericDisturbance: 'Haze', atmosphereSeverity: 50 });
    }
  };

  return (
    <div className="bg-[#111113] border border-[#1F1F23]/40 rounded-lg overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1F1F23]/30">
        <div className="flex items-center gap-2">
          <Cloud className="w-3.5 h-3.5 text-[#5B8DEF]" strokeWidth={1.5} />
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#EDEDED]">Atmospheric Disturbance</span>
            <SpecChip code="SIH-24" description="Beam propagation loss: Clear, Haze, Fog, Rain, Low-light (0-100% severity)" />
          </div>
        </div>
        <Toggle
          label=""
          checked={spec.atmosphericDisturbance !== 'Clear'}
          onChange={toggleAtmosphere}
        />
      </div>

      {/* Body */}
      {spec.atmosphericDisturbance !== 'Clear' && (
        <div className="p-3.5 space-y-3">
          <Select
            label="Condition"
            value={spec.atmosphericDisturbance}
            options={['Clear', 'Haze', 'Fog', 'Rain', 'Low light']}
            onChange={(val) => updateSpec({ atmosphericDisturbance: val as any })}
          />

          <Slider
            label="Severity"
            value={spec.atmosphereSeverity}
            min={0}
            max={100}
            step={5}
            unit="%"
            onChange={(val) => updateSpec({ atmosphereSeverity: val })}
          />

          {/* Physical effect description */}
          <div className="p-2.5 bg-[#17171A] border border-[#1F1F23]/40 rounded text-xs text-[#8A8A93] space-y-1">
            <div className="flex items-center gap-1.5 text-[#EDEDED] text-[11px] font-medium">
              <Info className="w-3 h-3 text-[#5B8DEF]" strokeWidth={1.5} />
              <span>Channel Degradation</span>
            </div>
            <p className="text-[10px] text-[#5C5C66] font-mono leading-relaxed">
              {spec.atmosphericDisturbance === 'Haze' &&
                'Rayleigh scattering reduces contrast by ~20% with ambient veiling.'}
              {spec.atmosphericDisturbance === 'Fog' &&
                'Mie scattering produces severe beam diffusion, diffuse brightness lift, and Gaussian blur.'}
              {spec.atmosphericDisturbance === 'Rain' &&
                'Precipitation introduces diagonal streak noise and dynamic contrast degradation.'}
              {spec.atmosphericDisturbance === 'Low light' &&
                'Photon starvation reduces scene brightness by ~50% and elevates detector amplifier noise.'}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-3.5 py-2 bg-[#17171A] border-t border-[#1F1F23]/30 flex items-center justify-between text-[11px] font-mono">
        <span className="text-[#8A8A93]">Medium State:</span>
        <span className="text-[#EDEDED]">
          {spec.atmosphericDisturbance === 'Clear'
            ? 'Clear'
            : `${spec.atmosphericDisturbance} · ${spec.atmosphereSeverity}%`}
        </span>
      </div>
    </div>
  );
};
