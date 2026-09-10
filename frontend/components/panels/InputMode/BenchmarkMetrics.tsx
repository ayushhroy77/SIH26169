import React from 'react';
import { useAppStore } from '../../../lib/store';
import { Card } from '../../ui/Card';
import { MetricDot } from '../../ui/MetricDot';
import { Crosshair, Timer, RefreshCw, ShieldCheck, Gauge } from 'lucide-react';

export const BenchmarkMetricsPanel: React.FC = () => {
  const benchmarkMetrics = useAppStore((state) => state.benchmarkMetrics);

  const rmse = benchmarkMetrics.rmsePx ?? 0;
  const maxErr = benchmarkMetrics.maxErrorPx ?? 0;
  const currErr = benchmarkMetrics.centroidErrorPx ?? 0;
  const acq = benchmarkMetrics.acquisitionTimeS ?? 0;
  const reacq = benchmarkMetrics.reacquisitionTimeS ?? 0;
  const lockPct = benchmarkMetrics.lockRetentionPct ?? 100;
  const fps = benchmarkMetrics.fpsMeasured ?? 30;
  const procMs = benchmarkMetrics.processingTimeMs ?? 0;

  return (
    <Card
      title="Benchmark-2 Metrics"
      specCode="SIH-BM2"
      specDescription="Real-time centroiding accuracy and pointing servo metrics against Ground Truth"
    >
      <div className="space-y-3 select-none">
        {/* Instantaneous Centroid Status */}
        <div className="p-2.5 bg-[#17171A] border border-[#1F1F23]/60 rounded">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5 text-[#5B8DEF]" strokeWidth={1.5} />
              <span className="text-xs font-medium text-[#EDEDED]">Instant Error</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#EDEDED] tabular-nums">
                {currErr.toFixed(2)} px
              </span>
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#8A8A93]">
                <MetricDot status={benchmarkMetrics.locked ? 'success' : 'error'} />
                <span>{benchmarkMetrics.locked ? 'LOCKED' : 'UNLOCKED'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregated Benchmark Metric Cards */}
        <div className="grid grid-cols-2 gap-2">
          {/* 1. RMSE Error */}
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-[#8A8A93]">
              <span>Running RMSE</span>
              <span className="text-[10px] font-mono text-[#5C5C66]">≤ 10 px</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-medium text-[#EDEDED] tabular-nums">
                {rmse.toFixed(2)} px
              </span>
              <MetricDot status={rmse <= 10 ? 'success' : 'error'} />
            </div>
          </div>

          {/* 2. Peak / Max Error */}
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-[#8A8A93]">
              <span>Max Error</span>
              <span className="text-[10px] font-mono text-[#5C5C66]">Peak</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-medium text-[#EDEDED] tabular-nums">
                {maxErr.toFixed(2)} px
              </span>
              <MetricDot status={maxErr <= 10 ? 'success' : maxErr <= 20 ? 'warning' : 'error'} />
            </div>
          </div>

          {/* 3. Acquisition Time */}
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-[#8A8A93]">
              <span className="flex items-center gap-1">
                <Timer className="w-3 h-3 text-[#8A8A93]" strokeWidth={1.5} /> Acq Time
              </span>
              <span className="text-[10px] font-mono text-[#5C5C66]">≤ 2.0 s</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-medium text-[#EDEDED] tabular-nums">
                {acq > 0 ? `${acq.toFixed(2)} s` : '< 0.1 s'}
              </span>
              <MetricDot status={acq <= 2.0 ? 'success' : 'error'} />
            </div>
          </div>

          {/* 4. Re-acquisition Time */}
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-[#8A8A93]">
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3 text-[#8A8A93]" strokeWidth={1.5} /> Re-Acq
              </span>
              <span className="text-[10px] font-mono text-[#5C5C66]">≤ 1.0 s</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-medium text-[#EDEDED] tabular-nums">
                {reacq > 0 ? `${reacq.toFixed(2)} s` : 'N/A'}
              </span>
              <MetricDot status={reacq <= 1.0 ? 'success' : 'error'} />
            </div>
          </div>

          {/* 5. Lock Retention Rate */}
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-[#8A8A93]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#8A8A93]" strokeWidth={1.5} /> Lock Retention
              </span>
              <span className="text-[10px] font-mono text-[#5C5C66]">≥ 95%</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-medium text-[#EDEDED] tabular-nums">
                {lockPct.toFixed(1)}%
              </span>
              <MetricDot status={lockPct >= 95 ? 'success' : 'warning'} />
            </div>
          </div>

          {/* 6. Processing FPS */}
          <div className="p-2 bg-[#17171A] border border-[#1F1F23]/60 rounded space-y-0.5">
            <div className="flex items-center justify-between text-[11px] text-[#8A8A93]">
              <span className="flex items-center gap-1">
                <Gauge className="w-3 h-3 text-[#8A8A93]" strokeWidth={1.5} /> Frame Rate
              </span>
              <span className="text-[10px] font-mono text-[#5C5C66]">≥ 20 FPS</span>
            </div>
            <div className="flex items-center justify-between font-mono">
              <span className="text-sm font-medium text-[#EDEDED] tabular-nums">
                {fps.toFixed(1)} FPS
              </span>
              <MetricDot status={fps >= 20 ? 'success' : 'error'} />
            </div>
          </div>
        </div>

        {/* Runtime Performance Summary Bar */}
        <div className="flex items-center justify-between text-[11px] text-[#8A8A93] px-2.5 py-1.5 bg-[#0A0A0B] border border-[#1F1F23]/60 rounded font-mono">
          <span>Frame: {benchmarkMetrics.frameIdx ?? 0}</span>
          <span>Latency: {procMs.toFixed(1)} ms</span>
          <span>Loss: {(100 - lockPct).toFixed(1)}%</span>
        </div>
      </div>
    </Card>
  );
};
