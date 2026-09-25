import React from 'react';
import { useAppStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Slider } from '../ui/Slider';
import { Select } from '../ui/Select';
import { Target, ShieldCheck, AlertCircle } from 'lucide-react';

export const DetectionEngine: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);
  const metrics = useAppStore((state) => state.metrics);

  const lockRadius = spec.lockRadiusPx ?? 12;
  const lockFramesM = spec.lockFramesM ?? 3;
  const lossFramesK = spec.lossFramesK ?? 5;

  const inFrameError = metrics.inFrameErrorPx ?? (metrics.detectedCentroid && metrics.targetCameraPos
    ? Math.hypot(metrics.detectedCentroid.x - metrics.targetCameraPos.x, metrics.detectedCentroid.y - metrics.targetCameraPos.y)
    : metrics.trackingErrorPx);

  const truePointingError = metrics.truePointingErrorPx ?? metrics.trackingErrorPx;
  const lockState = metrics.lockState ?? (metrics.lockStatus === 'Tracking' ? 'TRACK' : 'SEARCH');

  return (
    <div className="space-y-4 select-none">
      {/* Metric Contract Criteria (Phase 4: R, M, K) */}
      <Card
        title="Lock & Loss Contract"
        specCode="SIH-16..18"
        specDescription="Configurable ISRO threshold criteria (R, M, K) for state machine transition and loss detection"
      >
        <div className="space-y-3">
          {/* Lock Radius R */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-[#EDEDED] font-medium" title="Lock radius threshold R: |centroid - gt| ≤ R defines within-lock region">
                Lock Radius R (px)
              </span>
              <span className="font-mono text-[#5B8DEF] tabular-nums">{lockRadius} px</span>
            </div>
            <Slider
              label=""
              value={lockRadius}
              min={5}
              max={30}
              step={1}
              onChange={(val) => updateSpec({ lockRadiusPx: val })}
            />
            <span className="text-[10px] text-[#8A8A93] font-mono">
              SIH-17 Target: ≤ 10 px. Tolerance gate R for lock confirmation.
            </span>
          </div>

          {/* Lock Persistence M (frames) & Loss Persistence K (frames) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-[#17171A] border border-[#1F1F23]/60 rounded p-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#8A8A93]" title="Consecutive frames within R required to declare locked(t)">
                  Lock Conf (M)
                </span>
                <span className="font-mono text-[#EDEDED] font-semibold">{lockFramesM}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => updateSpec({ lockFramesM: Math.max(1, lockFramesM - 1) })}
                  className="flex-1 py-1 bg-[#222226] hover:bg-[#2A2A30] text-[#EDEDED] rounded text-xs font-mono"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateSpec({ lockFramesM: Math.min(10, lockFramesM + 1) })}
                  className="flex-1 py-1 bg-[#222226] hover:bg-[#2A2A30] text-[#EDEDED] rounded text-xs font-mono"
                >
                  +
                </button>
              </div>
              <span className="text-[9px] text-[#5C5C66] mt-1 block font-mono">Consecutive frames</span>
            </div>

            <div className="bg-[#17171A] border border-[#1F1F23]/60 rounded p-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-[#8A8A93]" title="Consecutive out-of-lock frames before declaring loss(t)">
                  Loss Conf (K)
                </span>
                <span className="font-mono text-[#EDEDED] font-semibold">{lossFramesK}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => updateSpec({ lossFramesK: Math.max(1, lossFramesK - 1) })}
                  className="flex-1 py-1 bg-[#222226] hover:bg-[#2A2A30] text-[#EDEDED] rounded text-xs font-mono"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateSpec({ lossFramesK: Math.min(20, lossFramesK + 1) })}
                  className="flex-1 py-1 bg-[#222226] hover:bg-[#2A2A30] text-[#EDEDED] rounded text-xs font-mono"
                >
                  +
                </button>
              </div>
              <span className="text-[9px] text-[#5C5C66] mt-1 block font-mono">Frames before loss</span>
            </div>
          </div>

          {/* State & Ground Truth Defined Metric Telemetry */}
          <div className="p-2.5 bg-[#17171A] border border-[#1F1F23]/60 rounded text-xs space-y-1.5 font-mono">
            <div className="flex justify-between items-center text-[#8A8A93]">
              <span>Lock State:</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                lockState === 'TRACK' ? 'bg-[#22C55E]/15 text-[#22C55E]' :
                lockState === 'ACQUIRE' || lockState === 'COAST' ? 'bg-[#EAB308]/15 text-[#EAB308]' :
                'bg-[#EF4444]/15 text-[#EF4444]'
              }`}>
                {lockState}
              </span>
            </div>
            <div className="flex justify-between text-[#8A8A93]">
              <span title="|centroid(t) - gt(t)|">In-Frame Error:</span>
              <span className="text-[#EDEDED] tabular-nums">{Number(inFrameError).toFixed(2)} px</span>
            </div>
            <div className="flex justify-between text-[#8A8A93]">
              <span title="|boresight(t) - gt(t)|">True Pointing Error:</span>
              <span className="text-[#EDEDED] tabular-nums">{Number(truePointingError).toFixed(2)} px</span>
            </div>
          </div>
        </div>
      </Card>

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
