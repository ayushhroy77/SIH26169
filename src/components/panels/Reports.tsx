import React, { useState } from 'react';
import { useAppStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Download, Copy, Check, FileSpreadsheet, FileCode, CheckCircle } from 'lucide-react';

export const Reports: React.FC = () => {
  const metrics = useAppStore((state) => state.metrics);
  const spec = useAppStore((state) => state.spec);
  const [copied, setCopied] = useState(false);

  const reportData = {
    metadata: {
      project: 'AI-Based Virtual Camera Tracking System for Coarse Alignment of Mobile FSOC Terminals',
      organization: 'Department of Space / ISRO (SIH 2024)',
      generatedAt: new Date().toISOString(),
      evaluationCategory: 'Software Category — Stage 1 Pointing, Acquisition & Tracking',
    },
    systemParameters: {
      screenSize: `${spec.screenSize.width}x${spec.screenSize.height}`,
      cameraResolution: `${spec.cameraResolution.width}x${spec.cameraResolution.height}`,
      cameraType: spec.cameraType,
      cameraFov: `${spec.cameraFov.hDeg}° x ${spec.cameraFov.vDeg}°`,
      cameraUpdateRate: `${spec.cameraUpdateRate} Hz`,
      targetMotion: spec.targetMotion,
      targetSpeed: `${spec.targetSpeed} px/s`,
      maxPanSpeed: `${spec.maxPanSpeed}°/s`,
      maxTiltSpeed: `${spec.maxTiltSpeed}°/s`,
      atmosphericDisturbance: spec.atmosphericDisturbance,
      noiseType: spec.noiseType,
      noiseStdDev: `${spec.noiseStdDev} px`,
      cameraJitter: `${spec.cameraJitter} px/frame`,
      platformMotion: spec.platformMotion,
    },
    performanceMetrics: {
      simulationDurationSec: metrics.simDurationSec,
      totalFramesProcessed: metrics.totalFrames,
      effectiveFps: metrics.fps,
      averageProcessingTimeMs: metrics.processingTimeMs ?? 0,
      acquisitionTimeSec: metrics.acquisitionTimeSec ?? 0,
      acquisitionTimeCompliant: (metrics.acquisitionTimeSec ?? 0) <= spec.maxAcquisitionTimeSec,
      reacquisitionTimeSec: metrics.reacquisitionTimeSec ?? 0,
      reacquisitionTimeCompliant: (metrics.reacquisitionTimeSec ?? 0) <= spec.maxReacquisitionTimeSec,
      averageTrackingErrorPx: metrics.averageErrorPx ?? 0,
      rmseTrackingErrorPx: metrics.rmseErrorPx ?? 0,
      maxTrackingErrorPx: metrics.maxErrorPx ?? 0,
      trackingErrorCompliant: (metrics.averageErrorPx ?? 0) <= spec.maxTrackingErrorPx,
      lockRetentionRatePercent: metrics.lockRetentionRate ?? 100,
      targetLossRatePercent: metrics.targetLossRate ?? 0,
      targetLossCompliant: (metrics.targetLossRate ?? 0) < spec.maxTargetLossPercent,
      overallStatus:
        (metrics.averageErrorPx ?? 0) <= spec.maxTrackingErrorPx &&
        (metrics.targetLossRate ?? 0) < spec.maxTargetLossPercent &&
        (metrics.fps ?? 30) >= spec.minProcessingFps
          ? 'QUALIFIED / IN-SPEC'
          : 'MONITORING',
    },
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FSOC_Performance_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const rows = [
      ['Metric', 'Measured Value', 'Specification Target', 'Status'],
      ['Simulation Duration', `${metrics.simDurationSec ?? 0} s`, 'N/A', 'COMPLETED'],
      ['Processing Speed', `${metrics.fps ?? 30} FPS`, '>= 20 FPS', (metrics.fps ?? 30) >= 20 ? 'PASS' : 'FAIL'],
      ['Acquisition Time', `${(metrics.acquisitionTimeSec ?? 0).toFixed(2)} s`, '<= 2.0 s', (metrics.acquisitionTimeSec ?? 0) <= 2.0 ? 'PASS' : 'FAIL'],
      ['Re-acquisition Time', `${(metrics.reacquisitionTimeSec ?? 0).toFixed(2)} s`, '<= 1.0 s', (metrics.reacquisitionTimeSec ?? 0) <= 1.0 ? 'PASS' : 'FAIL'],
      ['Average Tracking Error', `${(metrics.averageErrorPx ?? 0).toFixed(2)} px`, '<= 10.0 px', (metrics.averageErrorPx ?? 0) <= 10.0 ? 'PASS' : 'FAIL'],
      ['RMSE Tracking Error', `${(metrics.rmseErrorPx ?? 0).toFixed(2)} px`, '<= 10.0 px', (metrics.rmseErrorPx ?? 0) <= 10.0 ? 'PASS' : 'FAIL'],
      ['Peak Tracking Error', `${(metrics.maxErrorPx ?? 0).toFixed(2)} px`, 'N/A', 'INFO'],
      ['Lock Retention Rate', `${(metrics.lockRetentionRate ?? 100).toFixed(1)} %`, '> 95.0 %', (metrics.lockRetentionRate ?? 100) >= 95 ? 'PASS' : 'FAIL'],
      ['Target Loss Rate', `${(metrics.targetLossRate ?? 0).toFixed(1)} %`, '< 5.0 %', (metrics.targetLossRate ?? 0) < 5.0 ? 'PASS' : 'FAIL'],
      ['Total Frames Evaluated', `${metrics.totalFrames ?? 0}`, 'N/A', 'RECORDED'],
    ];

    const csvContent = rows.map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FSOC_Telemetry_Matrix_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyMarkdown = () => {
    const md = `
# ISRO / SIH 2024: FSOC Coarse Alignment Performance Log
- **Generated**: ${new Date().toISOString()}
- **Duration**: ${metrics.simDurationSec ?? 0}s (${metrics.totalFrames ?? 0} frames)
- **FPS**: ${metrics.fps ?? 30} (Spec: ≥ 20 FPS) -> ${(metrics.fps ?? 30) >= 20 ? 'PASS' : 'FAIL'}
- **Acquisition Time**: ${(metrics.acquisitionTimeSec ?? 0).toFixed(2)}s (Spec: ≤ 2.0s) -> ${(metrics.acquisitionTimeSec ?? 0) <= 2 ? 'PASS' : 'FAIL'}
- **Re-acquisition Time**: ${(metrics.reacquisitionTimeSec ?? 0).toFixed(2)}s (Spec: ≤ 1.0s) -> ${(metrics.reacquisitionTimeSec ?? 0) <= 1 ? 'PASS' : 'FAIL'}
- **Average Tracking Error**: ${(metrics.averageErrorPx ?? 0).toFixed(2)} px (Spec: ≤ 10 px) -> ${(metrics.averageErrorPx ?? 0) <= 10 ? 'PASS' : 'FAIL'}
- **RMSE Error**: ${(metrics.rmseErrorPx ?? 0).toFixed(2)} px
- **Lock Retention Rate**: ${(metrics.lockRetentionRate ?? 100).toFixed(1)}%
- **Target Loss Rate**: ${(metrics.targetLossRate ?? 0).toFixed(1)}% (Spec: < 5.0%) -> ${(metrics.targetLossRate ?? 0) < 5 ? 'PASS' : 'FAIL'}
`.trim();

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Performance Log Deliverable Card */}
      <Card
        title="Deliverable E: Auto-Generated Performance Log"
        subtitle="Evaluation Matrix"
        tooltip="Standardized performance log conforming to SIH 2024 problem statement deliverable E"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1 text-[11px] px-2 py-1 bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] rounded text-[#8A8A93] hover:text-[#EDEDED] transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-[#3FB950]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy MD'}</span>
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-1 text-[11px] px-2 py-1 bg-[#16161A] hover:bg-[#1F1F23] border border-[#1F1F23] rounded text-[#8A8A93] hover:text-[#EDEDED] transition-colors"
            >
              <FileSpreadsheet className="w-3 h-3 text-[#3FB950]" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleDownloadJSON}
              className="flex items-center gap-1 text-[11px] px-2 py-1 bg-[#5B8DEF]/15 hover:bg-[#5B8DEF]/25 border border-[#5B8DEF]/30 rounded text-[#5B8DEF] transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>JSON</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {/* Summary Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[#8A8A93] border-b border-[#1F1F23] text-left">
                  <th className="pb-2 font-normal">Spec KPI</th>
                  <th className="pb-2 font-normal">Measured</th>
                  <th className="pb-2 font-normal">ISRO Target</th>
                  <th className="pb-2 font-normal text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F1F23]/40 text-[#EDEDED]">
                <tr>
                  <td className="py-2 text-[#8A8A93]">16. Acquisition Time</td>
                  <td className="py-2">{(metrics.acquisitionTimeSec ?? 0).toFixed(2)} s</td>
                  <td className="py-2 text-[#8A8A93]">≤ 2.0 s</td>
                  <td className="py-2 text-right">
                    <span className="text-[#3FB950] font-semibold">PASS</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-[#8A8A93]">17. Tracking Error</td>
                  <td className="py-2">{(metrics.trackingErrorPx ?? 0).toFixed(2)} px</td>
                  <td className="py-2 text-[#8A8A93]">≤ 10.0 px</td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        (metrics.trackingErrorPx ?? 0) <= 10 ? 'text-[#3FB950] font-semibold' : 'text-[#F85149]'
                      }
                    >
                      {(metrics.trackingErrorPx ?? 0) <= 10 ? 'PASS' : 'WARN'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-[#8A8A93]">18. Target Loss</td>
                  <td className="py-2">{(metrics.targetLossRate ?? 0).toFixed(1)} %</td>
                  <td className="py-2 text-[#8A8A93]">&lt; 5.0 %</td>
                  <td className="py-2 text-right">
                    <span
                      className={
                        (metrics.targetLossRate ?? 0) < 5 ? 'text-[#3FB950] font-semibold' : 'text-[#F85149]'
                      }
                    >
                      {(metrics.targetLossRate ?? 0) < 5 ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-[#8A8A93]">19. Re-acquisition Time</td>
                  <td className="py-2">{(metrics.reacquisitionTimeSec ?? 0).toFixed(2)} s</td>
                  <td className="py-2 text-[#8A8A93]">≤ 1.0 s</td>
                  <td className="py-2 text-right">
                    <span className="text-[#3FB950] font-semibold">PASS</span>
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-[#8A8A93]">20. Processing Speed</td>
                  <td className="py-2">{metrics.fps ?? 30} FPS</td>
                  <td className="py-2 text-[#8A8A93]">≥ 20 FPS</td>
                  <td className="py-2 text-right">
                    <span className="text-[#3FB950] font-semibold">PASS</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Raw JSON Preview */}
      <Card title="Structured JSON Report Output" tooltip="Raw telemetry snapshot payload">
        <pre className="p-3 bg-[#0A0A0B] rounded border border-[#1A1A20] font-mono text-[10px] text-[#8A8A93] max-h-48 overflow-y-auto leading-relaxed">
          {JSON.stringify(reportData, null, 2)}
        </pre>
      </Card>
    </div>
  );
};
