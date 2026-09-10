import React from 'react';
import { useAppStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Slider } from '../ui/Slider';
import { Select } from '../ui/Select';

export const DetectionEngine: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);
  const metrics = useAppStore((state) => state.metrics);

  return (
    <div className="space-y-4 select-none">
      {/* Computer Vision & AI Detection */}
      <Card
        title="Centroiding & Detection"
        specCode="SIH-16..18"
        specDescription="Optical spot detection, thresholding and center-of-mass centroid calculation algorithm"
      >
        <div className="space-y-3">
          <Select
            label="Detection Pipeline"
            value={spec.detectionAlgorithm}
            options={[
              'Threshold+Centroid',
              'Gaussian Filter+Centroid',
              { value: 'AI/CNN (YOLO-FSOC)', label: 'AI/CNN (YOLO-FSOC Deep Detector)', disabled: false },
              { value: 'Optical Flow', label: 'Lucas-Kanade Optical Flow (Phase 2)', disabled: true },
            ]}
            onChange={(val) => updateSpec({ detectionAlgorithm: val as any })}
          />

          <Slider
            label="Intensity Threshold"
            value={spec.detectionThreshold}
            min={50}
            max={240}
            step={5}
            onChange={(val) => updateSpec({ detectionThreshold: val })}
          />

          <div className="p-2.5 bg-[#17171A] border border-[#1F1F23]/60 rounded text-xs space-y-1 font-mono">
            <div className="flex justify-between text-[#8A8A93]">
              <span>Active Centroid:</span>
              <span className="text-[#EDEDED] tabular-nums">
                {metrics.detectedCentroid
                  ? `(${metrics.detectedCentroid.x}, ${metrics.detectedCentroid.y})`
                  : 'Loss'}
              </span>
            </div>
            <div className="flex justify-between text-[#8A8A93]">
              <span>Algorithm Latency:</span>
              <span className="text-[#EDEDED] tabular-nums">{metrics.processingTimeMs.toFixed(1)} ms</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Closed-Loop Servo Controller */}
      <Card
        title="PTZ Servo Control"
        specCode="SIH-19..20"
        specDescription="Proportional-Derivative coarse alignment gimbal closed-loop feedback controller"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <Slider
              label="Kp (Pan Gain)"
              value={spec.kpPan}
              min={0.04}
              max={0.3}
              step={0.01}
              onChange={(val) => updateSpec({ kpPan: val })}
            />
            <Slider
              label="Kd (Pan Derivative)"
              value={spec.kdPan}
              min={0.0}
              max={0.1}
              step={0.01}
              onChange={(val) => updateSpec({ kdPan: val })}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Slider
              label="Kp (Tilt Gain)"
              value={spec.kpTilt}
              min={0.04}
              max={0.3}
              step={0.01}
              onChange={(val) => updateSpec({ kpTilt: val })}
            />
            <Slider
              label="Kd (Tilt Derivative)"
              value={spec.kdTilt}
              min={0.0}
              max={0.1}
              step={0.01}
              onChange={(val) => updateSpec({ kdTilt: val })}
            />
          </div>

          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded text-[11px] text-[#8A8A93] leading-relaxed font-mono">
            dθ/dt = clamp(Kp · e + Kd · Δe, -Vmax, Vmax). Bounded by gimbal limits ({spec.maxPanSpeed}°/s).
          </div>
        </div>
      </Card>
    </div>
  );
};
