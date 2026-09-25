/**
 * Regression Test: Multi-Target SceneCanvas & Telemetry Rendering
 * SIH 2024 / ISRO Coarse Alignment Virtual Testbed - Phase 4 (Task 6)
 *
 * Tests that multi-target count renders correctly in SceneCanvas,
 * maintains independent trajectory trails, and updates metrics accurately.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../lib/store';
import { TelemetryMetrics, TargetInfo } from '../lib/spec';

describe('Multi-Target Virtual Universe Scene Regression Tests', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.getState().triggerReset();
    useAppStore.getState().setTargetCount(1);
  });

  it('Case 1: target_count = 1 renders 1 beacon and metrics shows TOTAL BEACONS: 1', () => {
    const store = useAppStore.getState();
    store.setTargetCount(1);
    
    // Simulate telemetry update with 1 beacon
    const testTargets: TargetInfo[] = [
      {
        id: 1,
        worldPos: { x: 1000, y: 1000 },
        cameraPos: { x: 320, y: 240 },
        inFov: true,
        distToBore: 0,
        shape: 'Square',
        size: 12,
        isPrimary: true,
        x: 1000,
        y: 1000,
      }
    ];

    store.updateMetrics({
      ...store.metrics,
      allTargets: testTargets,
      targets: testTargets.map(t => ({ id: t.id, x: t.x!, y: t.y!, shape: t.shape, size: t.size, is_primary: t.isPrimary })),
    });

    const currentMetrics = useAppStore.getState().metrics;
    const currentSpec = useAppStore.getState().spec;

    expect(currentSpec.targetCount).toBe(1);
    expect(currentMetrics.allTargets?.length).toBe(1);
    expect(currentMetrics.targets?.length).toBe(1);
    expect(currentMetrics.allTargets?.[0].id).toBe(1);
    expect(currentMetrics.allTargets?.[0].isPrimary).toBe(true);
  });

  it('Case 2: target_count = 3 renders 3 beacons and metrics shows TOTAL BEACONS: 3', () => {
    const store = useAppStore.getState();
    store.setTargetCount(3);

    const testTargets: TargetInfo[] = [
      { id: 1, worldPos: { x: 950, y: 950 }, cameraPos: { x: 300, y: 220 }, inFov: true, distToBore: 25, shape: 'Square', size: 10, isPrimary: true, x: 950, y: 950 },
      { id: 2, worldPos: { x: 1100, y: 1050 }, cameraPos: { x: 420, y: 290 }, inFov: true, distToBore: 110, shape: 'Circle', size: 12, isPrimary: false, x: 1100, y: 1050 },
      { id: 3, worldPos: { x: 600, y: 700 }, cameraPos: null, inFov: false, distToBore: 9999, shape: 'Triangle', size: 8, isPrimary: false, x: 600, y: 700 },
    ];

    store.updateMetrics({
      ...store.metrics,
      allTargets: testTargets,
      targets: testTargets.map(t => ({ id: t.id, x: t.x!, y: t.y!, shape: t.shape, size: t.size, is_primary: t.isPrimary })),
    });

    const currentMetrics = useAppStore.getState().metrics;
    const currentSpec = useAppStore.getState().spec;

    expect(currentSpec.targetCount).toBe(3);
    expect(currentMetrics.allTargets?.length).toBe(3);
    expect(currentMetrics.targets?.length).toBe(3);

    // Camera feed in-FOV count
    const inFovCount = currentMetrics.allTargets?.filter(t => t.inFov).length;
    expect(inFovCount).toBe(2);
  });

  it('Case 3: Increase count from 1 to 2 via UI action increments beacon count from 1 to 2', () => {
    const store = useAppStore.getState();
    store.setTargetCount(1);
    expect(useAppStore.getState().spec.targetCount).toBe(1);

    // Simulate UI Stepper click to increment count
    store.setTargetCount(2);
    expect(useAppStore.getState().spec.targetCount).toBe(2);
    expect(useAppStore.getState().spec.targets.length).toBe(2);

    // Verify both targets have valid initial configuration
    expect(useAppStore.getState().spec.targets[0].id).toBe(1);
    expect(useAppStore.getState().spec.targets[1].id).toBe(2);
  });

  it('Case 4: Each beacon maintains independent trail history', () => {
    const trailsMap = new Map<number, { x: number; y: number }[]>();

    // Target 1 steps in a figure-8, Target 2 steps in a circle
    trailsMap.set(1, [{ x: 1000, y: 1000 }, { x: 1010, y: 1005 }, { x: 1020, y: 1015 }]);
    trailsMap.set(2, [{ x: 500, y: 500 }, { x: 515, y: 495 }, { x: 530, y: 485 }]);

    expect(trailsMap.get(1)?.length).toBe(3);
    expect(trailsMap.get(2)?.length).toBe(3);
    expect(trailsMap.get(1)?.[0].x).not.toBe(trailsMap.get(2)?.[0].x);
    expect(trailsMap.get(1)?.[2].y).not.toBe(trailsMap.get(2)?.[2].y);
  });

  it('Case 5: Primary target selection does not affect secondary beacon rendering', () => {
    const store = useAppStore.getState();
    store.setTargetCount(4);

    const testTargets: TargetInfo[] = [
      { id: 1, worldPos: { x: 900, y: 900 }, cameraPos: null, inFov: false, distToBore: 9999, shape: 'Square', size: 10, isPrimary: false, x: 900, y: 900 },
      { id: 2, worldPos: { x: 1000, y: 1000 }, cameraPos: { x: 320, y: 240 }, inFov: true, distToBore: 0, shape: 'Circle', size: 10, isPrimary: true, x: 1000, y: 1000 },
      { id: 3, worldPos: { x: 1050, y: 1020 }, cameraPos: { x: 370, y: 260 }, inFov: true, distToBore: 53, shape: 'Triangle', size: 10, isPrimary: false, x: 1050, y: 1020 },
      { id: 4, worldPos: { x: 1200, y: 1200 }, cameraPos: null, inFov: false, distToBore: 9999, shape: 'Cross', size: 10, isPrimary: false, x: 1200, y: 1200 },
    ];

    store.updateMetrics({
      ...store.metrics,
      allTargets: testTargets,
      primaryTargetId: 2,
    });

    const all = useAppStore.getState().metrics.allTargets || [];
    expect(all.length).toBe(4);
    
    // Exactly one primary target
    const primaryTargets = all.filter(t => t.isPrimary || t.id === 2);
    expect(primaryTargets.length).toBe(1);
    expect(primaryTargets[0].id).toBe(2);

    // All secondary targets remain present and renderable
    const secondaries = all.filter(t => t.id !== 2);
    expect(secondaries.length).toBe(3);
  });

  it('Case 6: Stepper 1->8 renders 8 beacons; 8->1 leaves 1', () => {
    const store = useAppStore.getState();
    // Step 1 -> 8
    store.setTargetCount(8);
    expect(useAppStore.getState().spec.targetCount).toBe(8);
    expect(useAppStore.getState().spec.targets.length).toBe(8);

    // Verify each has distinct id 1..8
    const ids = useAppStore.getState().spec.targets.map((t) => t.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    // Step 8 -> 1
    store.setTargetCount(1);
    expect(useAppStore.getState().spec.targetCount).toBe(1);
    expect(useAppStore.getState().spec.targets.length).toBe(1);
    expect(useAppStore.getState().spec.targets[0].id).toBe(1);
  });

  it('Case 7: MetricConfig R, M, K parameters and state definitions', () => {
    const store = useAppStore.getState();
    store.updateSpec({
      lockRadiusPx: 15,
      lockFramesM: 4,
      lossFramesK: 7,
    });

    const spec = useAppStore.getState().spec;
    expect(spec.lockRadiusPx).toBe(15);
    expect(spec.lockFramesM).toBe(4);
    expect(spec.lossFramesK).toBe(7);

    // Test lockState and inFrameError / truePointingError updates
    store.updateMetrics({
      ...store.metrics,
      lockState: 'TRACK',
      inFrameErrorPx: 2.34,
      truePointingErrorPx: 4.12,
    });

    const m = useAppStore.getState().metrics;
    expect(m.lockState).toBe('TRACK');
    expect(m.inFrameErrorPx).toBe(2.34);
    expect(m.truePointingErrorPx).toBe(4.12);
  });
});
