import React from 'react';
import { useAppStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { Select } from '../ui/Select';
import { ModeSwitcher } from './InputMode/ModeSwitcher';
import { VideoIngestion } from './InputMode/VideoIngestion';
import { Play } from 'lucide-react';

export const InputMode: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);
  const inputMode = useAppStore((state) => state.inputMode);
  const addBenchmarkLog = useAppStore((state) => state.addBenchmarkLog);
  const benchmarkLogs = useAppStore((state) => state.benchmarkLogs);
  const clearBenchmarkLogs = useAppStore((state) => state.clearBenchmarkLogs);

  const runBenchmark1 = () => {
    clearBenchmarkLogs();
    addBenchmarkLog('Starting Benchmark Performance-1: Multi-trajectory coarse PAT evaluation');
    addBenchmarkLog('Scenario 1/4: Straight Line Trajectory @ 80 px/s with ±4 px platform vibration');
    updateSpec({ targetMotion: 'Straight Line', platformMotion: 'Linear', platformMotionAmp: 4 });

    setTimeout(() => {
      addBenchmarkLog('Scenario 2/4: Circular Trajectory (R=350px) @ 100 px/s with Salt & Pepper noise');
      updateSpec({ targetMotion: 'Circular', noiseType: 'Salt & Pepper', noiseStdDev: 8 });
    }, 3000);

    setTimeout(() => {
      addBenchmarkLog('Scenario 3/4: Figure-of-8 Lemniscate @ 90 px/s under Fog atmospheric disturbance');
      updateSpec({ targetMotion: 'Figure-of-8', atmosphericDisturbance: 'Fog' });
    }, 6000);

    setTimeout(() => {
      addBenchmarkLog('Scenario 4/4: High-dynamic Random walk with ±15 px/frame camera jitter');
      updateSpec({ targetMotion: 'Random', cameraJitter: 15 });
    }, 9000);

    setTimeout(() => {
      addBenchmarkLog('Benchmark Performance-1 completed. Generated SIH compliance metrics.');
    }, 12000);
  };

  return (
    <div className="space-y-4 select-none">
      {/* Operating Mode Header */}
      <div className="flex items-center justify-between p-3 bg-[#111113] border border-[#1F1F23]/40 rounded-lg">
        <div>
          <h2 className="text-xs font-semibold text-[#EDEDED]">Input & Evaluation Mode</h2>
          <p className="text-[11px] text-[#8A8A93]">SIH 2024 Stage-1 Evaluation Protocol</p>
        </div>
        <ModeSwitcher />
      </div>

      {inputMode === 'Video Ingestion' ? (
        /* Phase 3 Benchmark-2 Mode: Video Ingestion & Ground Truth comparison */
        <VideoIngestion />
      ) : (
        /* Phase 1/2 Live Virtual Simulation Mode */
        <div className="space-y-4">
          <Card
            title="Simulation Operating Mode"
            specCode="SIH-BM1"
            specDescription="Virtual PTZ closed-loop tracking scenario profiles"
          >
            <div className="space-y-3">
              <Select
                label="Simulation Profile"
                value={spec.inputMode || 'Virtual Simulation'}
                options={[
                  'Virtual Simulation',
                  'Benchmark-1 Scenario',
                  'Benchmark-2 Validation',
                ]}
                onChange={(val) => updateSpec({ inputMode: val as any })}
              />

              <div className="p-2.5 bg-[#17171A] border border-[#1F1F23]/40 rounded text-xs space-y-1">
                <div className="font-medium text-[#EDEDED]">
                  {spec.inputMode === 'Virtual Simulation' && 'Mode: Live Virtual Simulation'}
                  {spec.inputMode === 'Benchmark-1 Scenario' && 'Mode: Benchmark Performance-1 (Automated Scenarios)'}
                  {spec.inputMode === 'Benchmark-2 Validation' && 'Mode: Benchmark Performance-2 (PTZ Bypass Video)'}
                </div>
                <p className="text-[11px] text-[#8A8A93]">
                  Interactive end-to-end simulation of 2000×2000 scene, PTZ camera servo, disturbance pipeline, and live coarse tracking.
                </p>
              </div>
            </div>
          </Card>

          {/* Benchmark 1 Execution Trigger */}
          <Card
            title="Benchmark Performance-1 Suite"
            specCode="SIH-EVAL1"
            specDescription="Run multi-trajectory SIH evaluation protocols with live telemetry logging"
          >
            <div className="space-y-3">
              <button
                id="btn-run-benchmark-1"
                onClick={runBenchmark1}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#17171A] hover:bg-[#1F1F23] border border-[#1F1F23]/60 rounded text-xs font-medium text-[#EDEDED] transition-colors duration-120"
              >
                <Play className="w-3.5 h-3.5 text-[#5B8DEF]" strokeWidth={1.5} />
                <span>Run Benchmark-1 (Automated Trajectory Scenarios)</span>
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Benchmark Terminal Log */}
      <Card
        title="Evaluation Console Output"
        specCode="LOGS"
        specDescription="Real-time log of test execution, ground truth comparisons, and compliance metrics"
        action={
          <button
            onClick={clearBenchmarkLogs}
            className="text-[10px] font-mono text-[#8A8A93] hover:text-[#EDEDED] transition-colors"
          >
            Clear
          </button>
        }
      >
        <div className="h-44 bg-[#0A0A0B] rounded border border-[#1F1F23]/60 p-2.5 font-mono text-[11px] text-[#8A8A93] overflow-y-auto space-y-1">
          {benchmarkLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#5C5C66] text-xs">
              Evaluation telemetry and ground truth error records stream here.
            </div>
          ) : (
            benchmarkLogs.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes('PASS')
                    ? 'text-[#3FB950]'
                    : log.includes('Initiating') || log.includes('Starting') || log.includes('Benchmark')
                    ? 'text-[#5B8DEF]'
                    : log.includes('error') || log.includes('FAIL')
                    ? 'text-[#F85149]'
                    : 'text-[#EDEDED]'
                }
              >
                {log}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
