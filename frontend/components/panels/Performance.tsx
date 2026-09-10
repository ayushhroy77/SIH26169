import React from 'react';
import { useAppStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Metric } from '../ui/Metric';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';

export const Performance: React.FC = () => {
  const metrics = useAppStore((state) => state.metrics);
  const spec = useAppStore((state) => state.spec);
  const errorHistory = useAppStore((state) => state.errorHistory);

  // Compliance checks against non-negotiable spec contract
  const isAcquisitionCompliant = (metrics.acquisitionTimeSec ?? 0) <= spec.maxAcquisitionTimeSec;
  const isErrorCompliant = (metrics.trackingErrorPx ?? 0) <= spec.maxTrackingErrorPx;
  const isLossCompliant = (metrics.targetLossRate ?? 0) < spec.maxTargetLossPercent;
  const isReacqCompliant = (metrics.reacquisitionTimeSec ?? 0) <= spec.maxReacquisitionTimeSec;
  const isFpsCompliant = (metrics.fps ?? 30) >= spec.minProcessingFps;

  return (
    <div className="space-y-4 select-none">
      {/* Non-Negotiable Spec Performance KPIs */}
      <Card
        title="Live Compliance Matrix"
        specCode="SIH-16..20"
        specDescription="Official ISRO SIH 2024 coarse-tracking acceptance thresholds and error tolerances"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Metric
            label="Acquisition Time"
            value={(metrics.acquisitionTimeSec ?? 0) > 0 ? (metrics.acquisitionTimeSec ?? 0).toFixed(2) : '0.00'}
            unit="s"
            target="≤ 2.0 s"
            isCompliant={isAcquisitionCompliant}
            tooltip="Time from initiation until optical lock is sustained within 10px boresight error"
          />

          <Metric
            label="Tracking Error"
            value={(metrics.trackingErrorPx ?? 0).toFixed(2)}
            unit="px"
            target="≤ 10.0 px"
            isCompliant={isErrorCompliant}
            tooltip="Distance between detected centroid and optical boresight crosshair"
          />

          <Metric
            label="Target Loss Rate"
            value={(metrics.targetLossRate ?? 0).toFixed(1)}
            unit="%"
            target="< 5.0%"
            isCompliant={isLossCompliant}
            tooltip="Percentage of frames in which beacon was outside sensor FOV or lost"
          />

          <Metric
            label="Re-Acquisition Time"
            value={(metrics.reacquisitionTimeSec ?? 0).toFixed(2)}
            unit="s"
            target="≤ 1.0 s"
            isCompliant={isReacqCompliant}
            tooltip="Duration to re-center the beacon onto boresight after disturbance/occlusion"
          />

          <Metric
            label="Processing Speed"
            value={metrics.fps ?? 30}
            unit="FPS"
            target="≥ 20 FPS"
            isCompliant={isFpsCompliant}
            tooltip="End-to-end frame capture, detection, and servo calculation frequency"
          />

          <Metric
            label="Lock Retention"
            value={(metrics.lockRetentionRate ?? 100).toFixed(1)}
            unit="%"
            target="> 95.0%"
            isCompliant={(metrics.lockRetentionRate ?? 100) >= 95}
            tooltip="Ratio of locked tracking frames to total session frames"
          />
        </div>
      </Card>

      {/* Real-time Tracking Error vs Spec Threshold Chart */}
      <Card
        title="Tracking Error History"
        specCode="SIH-17"
        specDescription="Continuous real-time telemetry plot of centroid error vs 10px tolerance limit"
      >
        <div className="h-44 w-full pt-1">
          {errorHistory.length > 2 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={errorHistory}>
                <XAxis dataKey="time" hide />
                <YAxis
                  domain={[0, Math.max(25, ...errorHistory.map((d) => d.error + 5))]}
                  stroke="#5C5C66"
                  fontSize={10}
                  tickFormatter={(v) => `${v}px`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#111113',
                    border: '1px solid #1F1F23',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#EDEDED',
                  }}
                />
                <ReferenceLine
                  y={spec.maxTrackingErrorPx}
                  stroke="#5C5C66"
                  strokeDasharray="3 3"
                  label={{ value: '10px Limit', fill: '#8A8A93', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="error"
                  name="Error (px)"
                  stroke="#5B8DEF"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#5C5C66]">
              Collecting telemetry stream...
            </div>
          )}
        </div>
      </Card>

      {/* Statistical Telemetry Aggregates */}
      <Card title="Cumulative Statistics" specCode="METRICS" specDescription="Statistical aggregates across current simulation run">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded">
            <div className="text-[10px] text-[#8A8A93]">Mean Error</div>
            <div className="text-sm font-medium text-[#EDEDED] mt-0.5 tabular-nums">
              {(metrics.averageErrorPx ?? 0).toFixed(2)} <span className="text-[10px] text-[#8A8A93]">px</span>
            </div>
          </div>
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded">
            <div className="text-[10px] text-[#8A8A93]">RMSE Error</div>
            <div className="text-sm font-medium text-[#EDEDED] mt-0.5 tabular-nums">
              {(metrics.rmseErrorPx ?? 0).toFixed(2)} <span className="text-[10px] text-[#8A8A93]">px</span>
            </div>
          </div>
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded">
            <div className="text-[10px] text-[#8A8A93]">Peak Error</div>
            <div className="text-sm font-medium text-[#EDEDED] mt-0.5 tabular-nums">
              {(metrics.maxErrorPx ?? 0).toFixed(2)} <span className="text-[10px] text-[#8A8A93]">px</span>
            </div>
          </div>
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded">
            <div className="text-[10px] text-[#8A8A93]">Total Frames</div>
            <div className="text-sm font-medium text-[#EDEDED] mt-0.5 tabular-nums">
              {metrics.totalFrames ?? 0}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
