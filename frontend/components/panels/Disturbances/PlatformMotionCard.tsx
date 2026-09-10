import React from 'react';
import { useAppStore } from '../../../lib/store';
import { Select } from '../../ui/Select';
import { Slider } from '../../ui/Slider';
import { Toggle } from '../../ui/Toggle';
import { SpecChip } from '../../ui/SpecChip';
import { Compass } from 'lucide-react';

export const PlatformMotionCard: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);

  const togglePlatformMotion = (active: boolean) => {
    if (!active) {
      updateSpec({ platformMotion: 'None', platformMotionAmp: 0 });
    } else {
      updateSpec({ platformMotion: 'Linear', platformMotionAmp: 4.0 });
    }
  };

  return (
    <div className="bg-[#111113] border border-[#1F1F23]/40 rounded-lg overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#1F1F23]/30">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[#5B8DEF]" strokeWidth={1.5} />
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#EDEDED]">Platform Kinematic Motion</span>
            <SpecChip code="SIH-25" description="Base terminal vehicle / vessel motion perturbation applied to scene reference frame (0-20 px/f)" />
          </div>
        </div>
        <Toggle
          label=""
          checked={spec.platformMotion !== 'None'}
          onChange={togglePlatformMotion}
        />
      </div>

      {/* Body */}
      {spec.platformMotion !== 'None' && (
        <div className="p-3.5 space-y-3">
          <Select
            label="Motion Trajectory"
            value={spec.platformMotion}
            options={['Linear', 'Circular', 'Random', 'Spiral', 'Figure-of-8']}
            onChange={(val) => updateSpec({ platformMotion: val as any })}
          />

          <Slider
            label="Motion Amplitude"
            tooltip="Displacement magnitude applied to scene coordinates per frame (0–20 px/frame per Spec Item 25)"
            value={spec.platformMotionAmp}
            min={0}
            max={20}
            step={0.5}
            unit=" px/frame"
            onChange={(val) => updateSpec({ platformMotionAmp: val })}
          />

          <p className="text-[11px] text-[#5C5C66] font-mono leading-relaxed">
            Translates the optical baseline relative to the inertial frame, simulating mobile platform pitch/yaw drift.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-3.5 py-2 bg-[#17171A] border-t border-[#1F1F23]/30 flex items-center justify-between text-[11px] font-mono">
        <span className="text-[#8A8A93]">Platform Carrier:</span>
        <span className="text-[#EDEDED]">
          {spec.platformMotion === 'None'
            ? 'Stationary'
            : `${spec.platformMotion} · ${spec.platformMotionAmp.toFixed(1)} px/f`}
        </span>
      </div>
    </div>
  );
};
