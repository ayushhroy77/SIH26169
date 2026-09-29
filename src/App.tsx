/**
 * FSOC Virtual Camera Tracking System — Main Application Container
 * AI-Based Virtual Camera Tracking System for Coarse Alignment of Mobile FSOC Terminals
 * Smart India Hackathon 2024 / Department of Space (ISRO)
 */

import React, { useEffect, useRef } from 'react';
import { useAppStore } from './lib/store';
import { createInitialSimState, stepSimulation, SimState } from './lib/simulationEngine';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { SceneCanvas } from './components/views/SceneCanvas';
import { SceneView3D } from './components/views/SceneView3D';
import { CameraView } from './components/views/CameraView';
import { VideoView } from './components/views/VideoView';
import { CNNView } from './components/views/CNNView';
import { SimulationSetup } from './components/panels/SimulationSetup';
import { CameraControls } from './components/panels/CameraControls';
import { Disturbances } from './components/panels/Disturbances';
import { DetectionEngine } from './components/panels/DetectionEngine';
import { InputMode } from './components/panels/InputMode';
import { Performance } from './components/panels/Performance';
import { Reports } from './components/panels/Reports';
import { Help } from './components/panels/Help';
import { ProjectFilesViewer } from './components/panels/ProjectFilesViewer';
import { HelpModal } from './components/ui/HelpModal';

export default function App() {
  const spec = useAppStore((state) => state.spec);
  const activeTab = useAppStore((state) => state.activeTab);
  const isRunning = useAppStore((state) => state.isRunning);
  const stepTrigger = useAppStore((state) => state.stepTrigger);
  const resetSimulationTrigger = useAppStore((state) => state.resetSimulationTrigger);
  const updateMetrics = useAppStore((state) => state.updateMetrics);
  const addErrorHistoryPoint = useAppStore((state) => state.addErrorHistoryPoint);
  const theme = useAppStore((state) => state.theme);
  const metrics = useAppStore((state) => state.metrics);
  const inputMode = useAppStore((state) => state.inputMode);
  const sceneMode = useAppStore((state) => state.sceneMode);
  const benchmarkMetrics = useAppStore((state) => state.benchmarkMetrics);

  const simStateRef = useRef<SimState>(createInitialSimState(spec));
  const lastStepTimeRef = useRef<number>(performance.now());
  const reqIdRef = useRef<number | null>(null);

  // Re-initialize state upon reset trigger
  useEffect(() => {
    simStateRef.current = createInitialSimState(spec);
    lastStepTimeRef.current = performance.now();
  }, [resetSimulationTrigger]);

  // Execute single manual step
  useEffect(() => {
    if (stepTrigger > 0) {
      const now = performance.now();
      const dt = 1.0 / spec.cameraUpdateRate;
      const { nextState, metrics: newMetrics } = stepSimulation(
        simStateRef.current,
        spec,
        dt,
        now
      );
      simStateRef.current = nextState;
      updateMetrics(newMetrics);
    }
  }, [stepTrigger]);

  // Main high-frequency simulation loop (active during Live Simulation)
  useEffect(() => {
    let lastMetricPush = performance.now();

    const loop = (currentTime: number) => {
      if (isRunning && inputMode === 'Live Simulation') {
        const targetInterval = 1000 / spec.cameraUpdateRate; // ~33.3ms for 30Hz
        const elapsed = currentTime - lastStepTimeRef.current;

        if (elapsed >= targetInterval) {
          const dt = Math.min(0.05, elapsed / 1000);
          lastStepTimeRef.current = currentTime;

          const { nextState, metrics: newMetrics } = stepSimulation(
            simStateRef.current,
            spec,
            dt,
            currentTime
          );
          simStateRef.current = nextState;
          updateMetrics(newMetrics);

          // Push telemetry point every ~150ms for performance charts
          if (currentTime - lastMetricPush > 150) {
            lastMetricPush = currentTime;
            addErrorHistoryPoint({
              time: `${newMetrics.simDurationSec}s`,
              error: newMetrics.trackingErrorPx,
              threshold: spec.maxTrackingErrorPx,
              fps: newMetrics.fps,
            });
          }
        }
      } else {
        lastStepTimeRef.current = currentTime;
      }

      reqIdRef.current = requestAnimationFrame(loop);
    };

    reqIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
    };
  }, [isRunning, inputMode, spec]);

  // Teleport beacon on click
  const handleSetTargetPos = (x: number, y: number) => {
    simStateRef.current.targetX = x;
    simStateRef.current.targetY = y;
  };

  return (
    <div className={`min-h-screen w-screen overflow-hidden flex ${theme === 'dark' ? 'bg-[#0A0A0B] text-[#EDEDED]' : 'bg-[#FAFAFA] text-[#111111]'}`}>
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Control Bar */}
        <TopBar />

        {/* 2-Column Main Workspace */}
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 p-3 overflow-y-auto min-h-0">
          {/* LEFT COLUMN: Live Simulation Views OR Benchmark-2 Video Ingestion View */}
          <div className="xl:col-span-7 flex flex-col gap-3 min-h-0">
            {inputMode === 'Video Ingestion' ? (
              /* Phase 3 Benchmark-2: PTZ Bypassed Video Ingestion Canvas */
              <div className="flex-1 min-h-[460px] bg-[#111113] border border-[#1F1F23] rounded-lg p-2 flex flex-col">
                <VideoView />
              </div>
            ) : (
              /* Phase 1/2 Dual Live Views: 2000x2000 Scene Canvas (2D/3D) + 640x480 Virtual Camera Sensor Viewport */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-[500px]">
                {sceneMode === '2d' ? (
                  <>
                    <SceneCanvas
                      targetWorldPos={metrics.targetWorldPos}
                      cameraWorldPos={metrics.cameraWorldPos}
                      targetTrail={simStateRef.current?.targetTrail || []}
                      camTrail={simStateRef.current?.camTrail || []}
                      onSetTargetPos={handleSetTargetPos}
                    />
                    <CameraView
                      detectedCentroid={metrics.detectedCentroid}
                      targetCameraPos={metrics.targetCameraPos}
                      boresightPos={metrics.boresightPos}
                      targetInFov={metrics.targetInFov}
                      trackingErrorPx={metrics.trackingErrorPx}
                      trackingErrorDeg={metrics.trackingErrorDeg}
                      panSpeedDegSec={metrics.panSpeedDegSec}
                      tiltSpeedDegSec={metrics.tiltSpeedDegSec}
                      fps={metrics.fps}
                    />
                  </>
                ) : sceneMode === '3d' ? (
                  <div className="col-span-2">
                    <SceneView3D targetTrail={simStateRef.current?.targetTrail || []} />
                  </div>
                ) : (
                  <div className="col-span-2">
                    <CNNView />
                  </div>
                )}
              </div>
            )}

            {/* Quick Live Telemetry Strip under views */}
            <div className="bg-[#111113] border border-[#1F1F23] rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              {inputMode === 'Video Ingestion' ? (
                <>
                  <div>
                    <span className="text-[10px] text-[#8A8A93] block">RMSE ERROR</span>
                    <span
                      className={`text-sm font-semibold ${
                        (benchmarkMetrics.rmsePx ?? 0) <= 10.0 ? 'text-[#3FB950]' : 'text-[#F85149]'
                      }`}
                    >
                      {(benchmarkMetrics.rmsePx ?? 0).toFixed(2)} px
                    </span>
                    <span className="text-[10px] text-[#6B6B75] ml-1">(&le; 10 px)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A8A93] block">INSTANT ERROR</span>
                    <span
                      className={`text-sm font-semibold ${
                        (benchmarkMetrics.centroidErrorPx ?? 0) <= 10.0 ? 'text-[#3FB950]' : 'text-[#D29922]'
                      }`}
                    >
                      {(benchmarkMetrics.centroidErrorPx ?? 0).toFixed(2)} px
                    </span>
                    <span className="text-[10px] text-[#6B6B75] ml-1">
                      {benchmarkMetrics.locked ? '[LOCKED]' : '[UNLOCKED]'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A8A93] block">LOCK RETENTION</span>
                    <span className="text-sm font-semibold text-[#EDEDED]">
                      {(benchmarkMetrics.lockRetentionPct ?? 100).toFixed(1)} %
                    </span>
                    <span className="text-[10px] text-[#6B6B75] ml-1">(&gt; 95%)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A8A93] block">FRAME RATE</span>
                    <span
                      className={`text-sm font-semibold ${
                        (benchmarkMetrics.fpsMeasured ?? 30) >= 20 ? 'text-[#3FB950]' : 'text-[#F85149]'
                      }`}
                    >
                      {(benchmarkMetrics.fpsMeasured ?? 30).toFixed(1)} FPS
                    </span>
                    <span className="text-[10px] text-[#6B6B75] ml-1">
                      ({(benchmarkMetrics.processingTimeMs ?? 4.2).toFixed(1)} ms)
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="text-[10px] text-[#8A8A93] block">CENTROID ERROR</span>
                    <span
                      className={`text-sm font-semibold ${
                        (metrics.trackingErrorPx ?? 0) <= spec.maxTrackingErrorPx ? 'text-[#3FB950]' : 'text-[#F85149]'
                      }`}
                    >
                      {(metrics.trackingErrorPx ?? 0).toFixed(2)} px
                    </span>
                    <span className="text-[10px] text-[#6B6B75] ml-1">(&le; 10 px)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A8A93] block">ACQUISITION TIME</span>
                    <span
                      className={`text-sm font-semibold ${
                        (metrics.acquisitionTimeSec ?? 0) <= spec.maxAcquisitionTimeSec ? 'text-[#3FB950]' : 'text-[#D29922]'
                      }`}
                    >
                      {(metrics.acquisitionTimeSec ?? 0).toFixed(2)} s
                    </span>
                    <span className="text-[10px] text-[#6B6B75] ml-1">(&le; 2.0 s)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A8A93] block">LOCK RETENTION</span>
                    <span className="text-sm font-semibold text-[#EDEDED]">
                      {(metrics.lockRetentionRate ?? 100).toFixed(1)} %
                    </span>
                    <span className="text-[10px] text-[#6B6B75] ml-1">(&gt; 95%)</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#8A8A93] block">PROCESSING RATE</span>
                    <span
                      className={`text-sm font-semibold ${
                        (metrics.fps ?? 30) >= spec.minProcessingFps ? 'text-[#3FB950]' : 'text-[#F85149]'
                      }`}
                    >
                      {metrics.fps ?? 30} FPS
                    </span>
                    <span className="text-[10px] text-[#6B6B75] ml-1">
                      ({(metrics.processingTimeMs ?? 0).toFixed(1)} ms)
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Tabbed Control Panel & Benchmarks */}
          <div className="xl:col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
            {activeTab === 'simulation' && <SimulationSetup />}
            {activeTab === 'camera' && <CameraControls />}
            {activeTab === 'disturbances' && <Disturbances />}
            {activeTab === 'detection' && <DetectionEngine />}
            {activeTab === 'input' && <InputMode />}
            {activeTab === 'performance' && <Performance />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'help' && <Help />}
            {activeTab === 'code' && <ProjectFilesViewer />}
          </div>
        </main>
      </div>

      {/* Global In-App Documentation Modal */}
      <HelpModal />
    </div>
  );
}
