import React from 'react';
import { useAppStore } from '../../lib/store';
import { MetricDot, MetricStatus } from '../ui/MetricDot';

export const MetricsStrip: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const metrics = useAppStore((state) => state.metrics);
  const benchmarkMetrics = useAppStore((state) => state.benchmarkMetrics);
  const inputMode = useAppStore((state) => state.inputMode);

  const isVideoMode = inputMode === 'Video Ingestion';

  // 1. Centroid / RMSE Error
  const errorPx = isVideoMode ? (benchmarkMetrics.rmsePx ?? 0) : (metrics.trackingErrorPx ?? 0);
  let errorStatus: MetricStatus = 'success';
  if (errorPx > 20) errorStatus = 'error';
  else if (errorPx > spec.maxTrackingErrorPx) errorStatus = 'warning';

  // 2. Acquisition Time
  const acqTime = isVideoMode ? (benchmarkMetrics.acquisitionTimeS ?? 0) : (metrics.acquisitionTimeSec ?? 0);
  let acqStatus: MetricStatus = 'success';
  if (acqTime > 4.0) acqStatus = 'error';
  else if (acqTime > spec.maxAcquisitionTimeSec) acqStatus = 'warning';

  // 3. Re-acquisition Time
  const reacqTime = isVideoMode ? (benchmarkMetrics.reacquisitionTimeS ?? 0) : (metrics.reacquisitionTimeSec ?? 0);
  let reacqStatus: MetricStatus = 'success';
  if (reacqTime > 2.0) reacqStatus = 'error';
  else if (reacqTime > spec.maxReacquisitionTimeSec) reacqStatus = 'warning';

  // 4. Target Loss Rate
  const lossPct = isVideoMode ? (benchmarkMetrics.targetLossPct ?? 0) : (metrics.targetLossPercent ?? 0);
  let lossStatus: MetricStatus = 'success';
  if (lossPct > 10.0) lossStatus = 'error';
  else if (lossPct > spec.maxTargetLossPercent) lossStatus = 'warning';

  // 5. Lock Retention
  const lockPct = isVideoMode ? (benchmarkMetrics.lockRetentionPct ?? 100) : (metrics.lockRetentionRate ?? 100);
  let lockStatus: MetricStatus = 'success';
  if (lockPct < 90.0) lockStatus = 'error';
  else if (lockPct < 95.0) lockStatus = 'warning';

  // 6. Processing FPS
  const fps = isVideoMode ? (benchmarkMetrics.fpsMeasured ?? 30) : (metrics.fpsMeasured ?? metrics.fps ?? 30);
  let fpsStatus: MetricStatus = 'success';
  if (fps < 20) fpsStatus = 'error';
  else if (fps < 25) fpsStatus = 'warning';

  // 7. Processing Latency
  const latencyMs = isVideoMode ? (benchmarkMetrics.processingTimeMs ?? 4.2) : (metrics.processingMs ?? metrics.processingTimeMs ?? 3.8);
  let latencyStatus: MetricStatus = 'success';
  if (latencyMs > 33.3) latencyStatus = 'error';
  else if (latencyMs > 16.6) latencyStatus = 'warning';

  // Phase 4 Lock State enum: SEARCH | ACQUIRE | TRACK | COAST | REACQUIRE
  const lockState = metrics.lockState ?? (metrics.isLocked ? 'TRACK' : 'SEARCH');
  let lockStateStatus: MetricStatus = 'error';
  if (lockState === 'TRACK') lockStateStatus = 'success';
  else if (lockState === 'ACQUIRE' || lockState === 'COAST') lockStateStatus = 'warning';

  const inFrameErr = metrics.inFrameErrorPx ?? errorPx;
  const truePointErr = metrics.truePointingErrorPx ?? errorPx;

  const items = [
    {
      id: 'metric-state',
      label: 'STATE',
      value: lockState,
      target: 'SIH',
      status: lockStateStatus,
    },
    {
      id: 'metric-inframe',
      label: 'IN-FRAME',
      value: `${inFrameErr.toFixed(1)} px`,
      target: `R ≤ ${spec.lockRadiusPx ?? 12}`,
      status: inFrameErr <= (spec.lockRadiusPx ?? 12) ? 'success' : 'warning',
    },
    {
      id: 'metric-pointing',
      label: 'POINTING',
      value: `${truePointErr.toFixed(1)} px`,
      target: `≤ ${spec.maxTrackingErrorPx} px`,
      status: errorStatus,
    },
    {
      id: 'metric-acq',
      label: 'ACQ',
      value: `${acqTime.toFixed(2)} s`,
      target: `≤ ${spec.maxAcquisitionTimeSec} s`,
      status: acqStatus,
    },
    {
      id: 'metric-reacq',
      label: 'RE-ACQ',
      value: `${reacqTime.toFixed(2)} s`,
      target: `≤ ${spec.maxReacquisitionTimeSec} s`,
      status: reacqStatus,
    },
    {
      id: 'metric-loss',
      label: 'LOSS',
      value: `${lossPct.toFixed(1)}%`,
      target: `< ${spec.maxTargetLossPercent}%`,
      status: lossStatus,
    },
    {
      id: 'metric-retention',
      label: 'RETENTION',
      value: `${lockPct.toFixed(1)}%`,
      target: `≥ 95%`,
      status: lockStatus,
    },
    {
      id: 'metric-fps',
      label: 'FPS',
      value: `${fps.toFixed(0)}`,
      target: `≥ 20`,
      status: fpsStatus,
    },
    {
      id: 'metric-latency',
      label: 'LATENCY',
      value: `${latencyMs.toFixed(1)} ms`,
      target: `≤ 33 ms`,
      status: latencyStatus,
    },
  ];

  return (
    <div
      id="metrics-strip"
      className="h-8 shrink-0 bg-[#111113] border-t border-b border-[#1F1F23]/40 px-3 flex items-center gap-4 overflow-x-auto select-none no-scrollbar font-mono text-[11px]"
    >
      {items.map((item, idx) => (
        <React.Fragment key={item.id}>
          {idx > 0 && <span className="text-[#1F1F23] select-none">|</span>}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <MetricDot status={item.status as MetricStatus} />
            <span className="text-[#8A8A93] text-[10px] tracking-wide">{item.label}</span>
            <span className="text-[#EDEDED] font-medium tabular-nums">{item.value}</span>
            <span className="text-[#5C5C66] text-[10px] tabular-nums">({item.target})</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
