'use client';

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../lib/store';
import { createInitialSimState, stepSimulation, SimState } from '../../src/lib/simulationEngine';
import { Sidebar } from '../../src/components/layout/Sidebar';
import { TopBar } from '../../src/components/layout/TopBar';
import { SceneCanvas } from '../../src/components/views/SceneCanvas';
import { CameraView } from '../../src/components/views/CameraView';
import { SimulationSetup } from '../../src/components/panels/SimulationSetup';
import { CameraControls } from '../../src/components/panels/CameraControls';
import { Disturbances } from '../../src/components/panels/Disturbances';
import { DetectionEngine } from '../../src/components/panels/DetectionEngine';
import { InputMode } from '../../src/components/panels/InputMode';
import { Performance } from '../../src/components/panels/Performance';
import { Reports } from '../../src/components/panels/Reports';
import { Help } from '../../src/components/panels/Help';
import { ProjectFilesViewer } from '../../src/components/panels/ProjectFilesViewer';
import { HelpModal } from '../../src/components/ui/HelpModal';

export default function Page() {
  const spec = useAppStore((state) => state.spec);
  const activeTab = useAppStore((state) => state.activeTab);
  const isRunning = useAppStore((state) => state.isRunning);
  const stepTrigger = useAppStore((state) => state.stepTrigger);
  const resetSimulationTrigger = useAppStore((state) => state.resetSimulationTrigger);
  const updateMetrics = useAppStore((state) => state.updateMetrics);
  const addErrorHistoryPoint = useAppStore((state) => state.addErrorHistoryPoint);
  const theme = useAppStore((state) => state.theme);
  const metrics = useAppStore((state) => state.metrics);

  const simStateRef = useRef<SimState>(createInitialSimState(spec));
  const lastStepTimeRef = useRef<number>(performance.now());
  const reqIdRef = useRef<number | null>(null);

  useEffect(() => {
    simStateRef.current = createInitialSimState(spec);
    lastStepTimeRef.current = performance.now();
  }, [resetSimulationTrigger]);

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

  useEffect(() => {
    let lastMetricPush = performance.now();

    const loop = (currentTime: number) => {
      if (isRunning) {
        const targetInterval = 1000 / spec.cameraUpdateRate;
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
  }, [isRunning, spec]);

  const handleSetTargetPos = (x: number, y: number) => {
    simStateRef.current.targetX = x;
    simStateRef.current.targetY = y;
  };

  return (
    <div className={`min-h-screen w-screen overflow-hidden flex ${theme === 'dark' ? 'bg-[#0A0A0B] text-[#EDEDED]' : 'bg-[#FAFAFA] text-[#111111]'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <TopBar />
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-3 p-3 overflow-y-auto min-h-0">
          <div className="xl:col-span-7 flex flex-col gap-3 min-h-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-[460px]">
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
            </div>
            <div className="bg-[#111113] border border-[#1F1F23] rounded-lg p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-[#8A8A93] block">CENTROID ERROR</span>
                <span className={`text-sm font-semibold ${metrics.trackingErrorPx <= spec.maxTrackingErrorPx ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
                  {metrics.trackingErrorPx.toFixed(2)} px
                </span>
                <span className="text-[10px] text-[#6B6B75] ml-1">(&le; 10 px)</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A8A93] block">ACQUISITION TIME</span>
                <span className={`text-sm font-semibold ${metrics.acquisitionTimeSec <= spec.maxAcquisitionTimeSec ? 'text-[#3FB950]' : 'text-[#D29922]'}`}>
                  {metrics.acquisitionTimeSec.toFixed(2)} s
                </span>
                <span className="text-[10px] text-[#6B6B75] ml-1">(&le; 2.0 s)</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A8A93] block">LOCK RETENTION</span>
                <span className="text-sm font-semibold text-[#EDEDED]">{metrics.lockRetentionRate.toFixed(1)} %</span>
                <span className="text-[10px] text-[#6B6B75] ml-1">(&gt; 95%)</span>
              </div>
              <div>
                <span className="text-[10px] text-[#8A8A93] block">PROCESSING RATE</span>
                <span className={`text-sm font-semibold ${metrics.fps >= spec.minProcessingFps ? 'text-[#3FB950]' : 'text-[#F85149]'}`}>
                  {metrics.fps} FPS
                </span>
                <span className="text-[10px] text-[#6B6B75] ml-1">({metrics.processingTimeMs.toFixed(1)} ms)</span>
              </div>
            </div>
          </div>
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
      <HelpModal />
    </div>
  );
}
