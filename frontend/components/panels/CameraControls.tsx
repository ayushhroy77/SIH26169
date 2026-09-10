import React from 'react';
import { useAppStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Slider } from '../ui/Slider';
import { Select } from '../ui/Select';

export const CameraControls: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);
  const metrics = useAppStore((state) => state.metrics);

  return (
    <div className="space-y-4 select-none">
      {/* Camera Sensor Parameters */}
      <Card
        title="Camera Sensor Parameters"
        specCode="SIH-2..6"
        specDescription="Optical receiving terminal camera sensor configuration (FOV, frame rate, resolution)"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <Select
              label="Sensor Type"
              value={spec.cameraType}
              options={['Monochrome', 'Colour']}
              onChange={(val) => updateSpec({ cameraType: val as any })}
            />

            <Select
              label="Resolution"
              value={`${spec.cameraResolution.width}x${spec.cameraResolution.height}`}
              options={[
                '640x480',
                { value: '1280x720', label: '1280x720 (Phase 2)', disabled: true },
                { value: '1920x1080', label: '1920x1080 (Phase 2)', disabled: true },
              ]}
              onChange={(val) => {
                const [w, h] = val.split('x').map(Number);
                updateSpec({ cameraResolution: { width: w, height: h } });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Slider
              label="Horizontal FOV"
              value={spec.cameraFov.hDeg}
              min={2.0}
              max={10.0}
              step={0.5}
              unit="°"
              onChange={(val) =>
                updateSpec({ cameraFov: { ...spec.cameraFov, hDeg: val } })
              }
            />

            <Slider
              label="Vertical FOV"
              value={spec.cameraFov.vDeg}
              min={1.5}
              max={8.0}
              step={0.5}
              unit="°"
              onChange={(val) =>
                updateSpec({ cameraFov: { ...spec.cameraFov, vDeg: val } })
              }
            />
          </div>

          <Slider
            label="Camera Update Rate"
            value={spec.cameraUpdateRate}
            min={20}
            max={60}
            step={5}
            unit=" Hz"
            onChange={(val) => updateSpec({ cameraUpdateRate: val, updateIntervalHz: val })}
          />

          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded text-[11px] font-mono text-[#8A8A93] space-y-1">
            <div className="flex justify-between">
              <span>Sensor Pitch:</span>
              <span className="text-[#EDEDED] tabular-nums">
                {(spec.cameraResolution.width / spec.cameraFov.hDeg).toFixed(1)} px/deg (22.5″/px)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Boresight Center:</span>
              <span className="text-[#5B8DEF] tabular-nums">
                ({spec.cameraResolution.width / 2}, {spec.cameraResolution.height / 2}) px
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Pan-Tilt Gimbal Constraints */}
      <Card
        title="PTZ Motion Constraints"
        specCode="SIH-13..15"
        specDescription="Physical slew rate limits of the coarse gimbal mechanism (5-10°/s)"
      >
        <div className="space-y-3">
          <Slider
            label="Max Pan Speed (Azimuth)"
            value={spec.maxPanSpeed}
            min={5.0}
            max={10.0}
            step={0.5}
            unit="°/s"
            onChange={(val) => updateSpec({ maxPanSpeed: val })}
          />

          <Slider
            label="Max Tilt Speed (Elevation)"
            value={spec.maxTiltSpeed}
            min={5.0}
            max={10.0}
            step={0.5}
            unit="°/s"
            onChange={(val) => updateSpec({ maxTiltSpeed: val })}
          />

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded">
              <div className="text-[10px] uppercase tracking-[0.08em] text-[#8A8A93]">Current Pan Slew</div>
              <div className="font-mono text-xs font-medium text-[#EDEDED] mt-0.5 tabular-nums">
                {(metrics.panSpeedDegSec ?? 0).toFixed(2)} <span className="text-[10px] text-[#8A8A93]">°/s</span>
              </div>
            </div>
            <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded">
              <div className="text-[10px] uppercase tracking-[0.08em] text-[#8A8A93]">Current Tilt Slew</div>
              <div className="font-mono text-xs font-medium text-[#EDEDED] mt-0.5 tabular-nums">
                {(metrics.tiltSpeedDegSec ?? 0).toFixed(2)} <span className="text-[10px] text-[#8A8A93]">°/s</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
