import React from 'react';
import { useAppStore } from '../../../lib/store';
import { Slider } from '../../ui/Slider';
import { Toggle } from '../../ui/Toggle';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { SpecChip } from '../../ui/SpecChip';
import { Activity } from 'lucide-react';

export const JitterCard: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);

  return (
    <div className="bg-[#111113] border border-[#1F1F23]/40 rounded-lg overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1F1F23]/30">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#5B8DEF]" strokeWidth={1.5} />
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#EDEDED]">Camera Mechanical Jitter</span>
            <SpecChip code="SIH-23" description="Mount vibration applied after servo calculation, before image capture (0-20 px/frame)" />
          </div>
        </div>
        <Toggle
          label=""
          checked={spec.cameraJitterEnabled}
          onChange={(val) => updateSpec({ cameraJitterEnabled: val })}
        />
      </div>

      {/* Body */}
      {spec.cameraJitterEnabled && (
        <div className="p-3.5 space-y-3">
          <Slider
            label="Jitter Intensity"
            tooltip="Displacement injected into camera pan/tilt per frame (0–20 px/frame per spec cap)"
            value={spec.cameraJitterIntensity}
            min={0}
            max={20}
            step={0.5}
            unit=" px/frame"
            onChange={(val) => updateSpec({ cameraJitterIntensity: val, cameraJitter: val })}
          />

          <div className="space-y-1.5">
            <span className="text-xs text-[#8A8A93] block">Jitter Waveform</span>
            <SegmentedControl<'Uniform' | 'Perlin'>
              options={[
                { value: 'Uniform', label: 'Uniform Random' },
                { value: 'Perlin', label: 'Perlin / Harmonic' },
              ]}
              value={spec.cameraJitterWaveform}
              onChange={(val) => updateSpec({ cameraJitterWaveform: val })}
            />
          </div>

          <p className="text-[11px] text-[#5C5C66] font-mono">
            Operates independently of vehicle platform motion; composes additively on optical boresight.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-3.5 py-2 bg-[#17171A] border-t border-[#1F1F23]/30 flex items-center justify-between text-[11px] font-mono">
        <span className="text-[#8A8A93]">Jitter State:</span>
        <span className="text-[#EDEDED]">
          {spec.cameraJitterEnabled
            ? `±${spec.cameraJitterIntensity.toFixed(1)} px/f · ${spec.cameraJitterWaveform}`
            : 'Offline'}
        </span>
      </div>
    </div>
  );
};
