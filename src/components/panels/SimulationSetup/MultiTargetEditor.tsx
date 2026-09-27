import React, { useState } from 'react';
import { useAppStore } from '../../../lib/store';
import { StepperInput } from '../../ui/StepperInput';
import { Select } from '../../ui/Select';
import { Slider } from '../../ui/Slider';
import { Collapsible } from '../../ui/Collapsible';
import { ShapeMaskEditor } from './ShapeMaskEditor';
import { CustomPathEditor } from './CustomPathEditor';
import { TargetConfig } from '../../../lib/spec';
import { Target, Edit3 } from 'lucide-react';

export const MultiTargetEditor: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);
  const setTargetCount = useAppStore((state) => state.setTargetCount);
  const updateTargetConfig = useAppStore((state) => state.updateTargetConfig);
  const metrics = useAppStore((state) => state.metrics);

  const [selectedTargetId, setSelectedTargetId] = useState<number>(1);
  const [showMaskEditor, setShowMaskEditor] = useState<boolean>(false);

  const activeTarget: TargetConfig =
    spec.targets.find((t) => t.id === selectedTargetId) || spec.targets[0] || {
      id: 1,
      shape: spec.targetShape,
      size: spec.targetSize,
      initialLocation: spec.initialTargetLocation,
      motion: spec.targetMotion,
      speed: spec.targetSpeed,
    };

  const handleUpdate = (partial: Partial<TargetConfig>) => {
    updateTargetConfig(selectedTargetId, partial);
    if (selectedTargetId === 1) {
      const mirrored: any = {};
      if (partial.shape !== undefined) mirrored.targetShape = partial.shape;
      if (partial.size !== undefined) mirrored.targetSize = partial.size;
      if (partial.motion !== undefined) mirrored.targetMotion = partial.motion;
      if (partial.speed !== undefined) mirrored.targetSpeed = partial.speed;
      if (partial.initialLocation !== undefined) mirrored.initialTargetLocation = partial.initialLocation;
      if (partial.customPos !== undefined) mirrored.customTargetPos = partial.customPos;
      updateSpec(mirrored);
    }
  };

  const isPrimary = activeTarget.id === metrics.primaryTargetId;

  // Default X/Y for the current target's custom position
  const customX = activeTarget.customPos?.x ?? 1000;
  const customY = activeTarget.customPos?.y ?? 1000;

  return (
    <div className="space-y-3 select-none">
      {/* Target Count Stepper */}
      <div className="p-2.5 rounded bg-[#17171A] border border-[#1F1F23]/60">
        <StepperInput
          label="Target Count"
          tooltip="Simultaneous optical beacon transmitters (Spec Item 8)."
          value={spec.targetCount}
          min={1}
          max={8}
          step={1}
          unit="beacons"
          onChange={(count) => {
            setTargetCount(count);
            if (selectedTargetId > count) {
              setSelectedTargetId(1);
            }
          }}
        />
      </div>

      {/* Target Selector Tabs if multiple */}
      {spec.targetCount > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {spec.targets.slice(0, spec.targetCount).map((t) => {
            const isTargetPrimary = t.id === metrics.primaryTargetId;
            const isSelected = t.id === selectedTargetId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTargetId(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors duration-120 whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF] ${
                  isSelected
                    ? 'bg-[#1F1F23] text-[#EDEDED] border border-[#5B8DEF]/40'
                    : 'bg-[#17171A] text-[#8A8A93] hover:text-[#EDEDED] border border-[#1F1F23]/40'
                }`}
              >
                <Target className={`w-3 h-3 ${isTargetPrimary ? 'text-[#3FB950]' : 'text-[#8A8A93]'}`} strokeWidth={1.5} />
                <span>T{t.id}</span>
                {isTargetPrimary && (
                  <span className="text-[9px] text-[#3FB950] font-sans font-medium">
                    PRI
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Collapsible 1: Beacon Identity (expanded by default) */}
      <Collapsible
        title={`Beacon Identity (Target #${activeTarget.id})`}
        specCode="SIH-9"
        specDescription="Optical beacon shape (Square, Circle, Triangle, Cross, Custom) & 5-20px sizing"
        defaultOpen={true}
      >
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2.5">
            <Select
              label="Shape"
              value={activeTarget.shape}
              options={['Square', 'Circle', 'Triangle', 'Cross', 'Custom']}
              onChange={(val) => {
                handleUpdate({ shape: val as any });
                if (val === 'Custom') setShowMaskEditor(true);
              }}
            />

            <Select
              label="Spawn Location"
              value={activeTarget.initialLocation}
              options={['Random', 'Center', 'Custom']}
              onChange={(val) => {
                const patch: Partial<TargetConfig> = { initialLocation: val as any };
                if (val === 'Custom' && !activeTarget.customPos) {
                  patch.customPos = { x: 1000, y: 1000 };
                }
                handleUpdate(patch);
              }}
            />
          </div>

          {/* ── Custom X/Y inputs (only when spawn location = Custom) ── */}
          {activeTarget.initialLocation === 'Custom' && (
            <div className="grid grid-cols-2 gap-2.5 p-2.5 rounded bg-[#17171A] border border-[#1F1F23]/60">
              <div>
                <label
                  htmlFor={`custom-x-${activeTarget.id}`}
                  className="text-[11px] text-[#8A8A93] mb-1 block font-mono"
                >
                  X (px)
                </label>
                <input
                  id={`custom-x-${activeTarget.id}`}
                  type="number"
                  min={0}
                  max={2000}
                  step={10}
                  value={customX}
                  onChange={(e) => {
                    const next = Math.max(0, Math.min(2000, Number(e.target.value) || 0));
                    handleUpdate({ customPos: { x: next, y: customY } });
                  }}
                  className="w-full px-2 py-1 bg-[#0E0E10] border border-[#1F1F23] rounded text-[12px] text-[#EDEDED] font-mono tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF]"
                />
              </div>
              <div>
                <label
                  htmlFor={`custom-y-${activeTarget.id}`}
                  className="text-[11px] text-[#8A8A93] mb-1 block font-mono"
                >
                  Y (px)
                </label>
                <input
                  id={`custom-y-${activeTarget.id}`}
                  type="number"
                  min={0}
                  max={2000}
                  step={10}
                  value={customY}
                  onChange={(e) => {
                    const next = Math.max(0, Math.min(2000, Number(e.target.value) || 0));
                    handleUpdate({ customPos: { x: customX, y: next } });
                  }}
                  className="w-full px-2 py-1 bg-[#0E0E10] border border-[#1F1F23] rounded text-[12px] text-[#EDEDED] font-mono tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#5B8DEF]"
                />
              </div>
              <div className="col-span-2 text-[10px] text-[#5C5C66] font-mono">
                Beacon will spawn at ({customX}, {customY}) px on the 2000×2000 canvas
              </div>
            </div>
          )}

          {activeTarget.shape === 'Custom' && (
            <div>
              <button
                type="button"
                onClick={() => setShowMaskEditor(!showMaskEditor)}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1 rounded text-xs bg-[#17171A] hover:bg-[#1F1F23] text-[#5B8DEF] border border-[#1F1F23]/60 transition-colors duration-120 focus-visible:outline-none"
              >
                <Edit3 className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{showMaskEditor ? 'Close 32×32 Mask' : 'Edit 32×32 Mask'}</span>
              </button>

              {showMaskEditor && (
                <div className="mt-2">
                  <ShapeMaskEditor
                    targetId={activeTarget.id}
                    onClose={() => setShowMaskEditor(false)}
                  />
                </div>
              )}
            </div>
          )}

          <Slider
            label="Beacon Size"
            tooltip="Focal spot dimension on camera array (5–20 px per Spec Item 10)"
            value={activeTarget.size}
            min={5}
            max={20}
            step={1}
            unit=" px"
            onChange={(val) => handleUpdate({ size: val })}
          />
        </div>
      </Collapsible>

      {/* Collapsible 2: Motion (collapsed by default) */}
      <Collapsible
        title="Kinematic Motion"
        specCode="SIH-12"
        specDescription="Flight trajectories across 2000x2000 universe: Straight line, Circular, Figure-8, Spiral, Sinusoidal, User-defined"
        defaultOpen={false}
      >
        <div className="space-y-3 pt-1">
          <Select
            label="Trajectory Pattern"
            value={activeTarget.motion}
            options={[
              'Straight Line',
              'Circular',
              'Figure-of-8',
              'Random',
              'Spiral',
              'Sinusoidal',
              'User-defined',
            ]}
            onChange={(val) => handleUpdate({ motion: val as any })}
          />

          <Slider
            label="Trajectory Speed"
            tooltip="Kinematic velocity (0–500 px/s in universe scene)"
            value={activeTarget.speed}
            min={0}
            max={500}
            step={10}
            unit=" px/s"
            onChange={(val) => handleUpdate({ speed: val })}
          />

          {activeTarget.motion === 'User-defined' && (
            <div className="pt-1">
              <CustomPathEditor />
            </div>
          )}
        </div>
      </Collapsible>

      {/* Collapsible 3: Lock (collapsed by default) */}
      <Collapsible
        title="Tracking Lock & Role"
        specCode="SIH-8"
        specDescription="Multi-target coarse tracking and primary boresight alignment assignment"
        defaultOpen={false}
      >
        <div className="pt-1 flex items-center justify-between">
          <div className="text-xs text-[#8A8A93]">
            Target Status: <span className={isPrimary ? 'text-[#3FB950] font-medium' : 'text-[#EDEDED]'}>{isPrimary ? 'Primary Lock' : 'Secondary Beacon'}</span>
          </div>

          {!isPrimary && (
            <button
              type="button"
              onClick={() => {
                useAppStore.setState((s) => ({
                  metrics: { ...s.metrics, primaryTargetId: activeTarget.id }
                }));
              }}
              className="px-2.5 py-1 rounded bg-[#17171A] hover:bg-[#1F1F23] text-[#EDEDED] text-xs font-medium border border-[#1F1F23]/60 transition-colors duration-120"
            >
              Assign as Primary Lock
            </button>
          )}
        </div>
      </Collapsible>
    </div>
  );
};