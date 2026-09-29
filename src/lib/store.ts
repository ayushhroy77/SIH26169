import { create } from 'zustand';
import {
  DEFAULT_SPEC,
  DEFAULT_TARGET_CONFIG,
  SystemSpec,
  TargetConfig,
  TelemetryMetrics,
  InputModeType,
  VideoConfig,
  GTConfig,
  BenchmarkMetrics
} from './spec';
import { CnnCandidate } from '../components/views/CNNView/types';

export type NavTab = 
  | 'simulation'
  | 'camera'
  | 'disturbances'
  | 'detection'
  | 'input'
  | 'performance'
  | 'reports'
  | 'help'
  | 'code';

export interface ErrorDataPoint {
  time: string;
  error: number;
  threshold: number;
  fps: number;
}

interface AppStore {
  // Navigation & UI
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  helpModalOpen: boolean;
  setHelpModalOpen: (open: boolean) => void;

  // Mode Switcher Slice (Phase 3: Live Simulation vs Video Ingestion)
  inputMode: InputModeType;
  setInputMode: (mode: InputModeType) => void;

  // Scene Dimension View Mode (2D Canvas vs 3D Spatial Universe vs CNN Classifier View)
  sceneMode: '2d' | '3d' | 'cnn';
  setSceneMode: (mode: '2d' | '3d' | 'cnn') => void;

  // CNN Visualization Slice
  cnnViewEnabled: boolean;
  setCnnViewEnabled: (enabled: boolean) => void;
  cnnCandidates: CnnCandidate[];
  setCnnCandidates: (candidates: CnnCandidate[]) => void;
  cnnThreshold: number;
  setCnnThreshold: (threshold: number) => void;

  // Phase 2 Interactive editors
  isCustomPathEditing: boolean;
  setIsCustomPathEditing: (editing: boolean) => void;

  // Configuration
  spec: SystemSpec;
  updateSpec: (partial: Partial<SystemSpec>) => void;
  resetSpecToDefault: () => void;
  setTargetCount: (count: number) => void;
  updateTargetConfig: (targetId: number, partial: Partial<TargetConfig>) => void;
  setCustomPathWaypoints: (pts: Array<{ x: number; y: number }>) => void;
  setCustomMask32x32: (mask: number[][] | null) => void;
  randomizeDisturbances: () => void;
  resetDisturbances: () => void;

  // Simulation execution state
  isRunning: boolean;
  setIsRunning: (running: boolean) => void;
  stepTrigger: number;
  triggerStep: () => void;
  resetSimulationTrigger: number;
  triggerReset: () => void;

  // Live Telemetry
  metrics: TelemetryMetrics;
  updateMetrics: (m: TelemetryMetrics) => void;
  errorHistory: ErrorDataPoint[];
  addErrorHistoryPoint: (pt: ErrorDataPoint) => void;
  clearErrorHistory: () => void;

  // Benchmark scenario execution
  activeBenchmark: string | null;
  setActiveBenchmark: (name: string | null) => void;
  benchmarkLogs: string[];
  addBenchmarkLog: (log: string) => void;
  clearBenchmarkLogs: () => void;

  // Phase 3: Video Ingestion Slice
  videoConfig: VideoConfig | null;
  setVideoConfig: (cfg: VideoConfig | null) => void;
  videoFile: File | null;
  setVideoFile: (file: File | null) => void;
  videoUrl: string | null;
  setVideoUrl: (url: string | null) => void;
  videoPlaybackState: 'playing' | 'paused' | 'stopped';
  setVideoPlaybackState: (state: 'playing' | 'paused' | 'stopped') => void;
  currentVideoFrame: number;
  setCurrentVideoFrame: (frame: number) => void;
  videoFrameDataUrl: string | null;
  setVideoFrameDataUrl: (url: string | null) => void;

  // Phase 3: Ground Truth Slice
  gtConfig: GTConfig;
  setGtConfig: (cfg: Partial<GTConfig>) => void;
  addMarkedSample: (frameIdx: number, pt: [number, number]) => void;
  removeMarkedSample: (frameIdx: number) => void;
  clearMarkedSamples: () => void;
  setGtTrack: (track: Record<number, [number, number]>, isApproximate?: boolean) => void;

  // Phase 3: Benchmark-2 Telemetry Slice
  benchmarkMetrics: BenchmarkMetrics;
  updateBenchmarkMetrics: (m: Partial<BenchmarkMetrics>) => void;
  resetBenchmarkMetrics: () => void;
  detectedVideoCentroid: { x: number; y: number } | null;
  setDetectedVideoCentroid: (pt: { x: number; y: number } | null) => void;
  detectedVideoBbox: { x: number; y: number; w: number; h: number } | null;
  setDetectedVideoBbox: (bbox: { x: number; y: number; w: number; h: number } | null) => void;
  virtualBoresight: { x: number; y: number };
  setVirtualBoresight: (pos: { x: number; y: number }) => void;
}

const initialMetrics: TelemetryMetrics = {
  timestamp: Date.now(),
  simDurationSec: 0,
  fps: 30.0,
  processingTimeMs: 4.2,
  targetInFov: false,
  isLocked: false,
  targetWorldPos: { x: 1000, y: 1000 },
  cameraWorldPos: { x: 1000, y: 1000 },
  effectiveCameraPos: { x: 1000, y: 1000 },
  targetCameraPos: null,
  detectedCentroid: null,
  boresightPos: { x: 320, y: 240 },
  trackingErrorPx: 0,
  trackingErrorDeg: 0,
  panSpeedDegSec: 0,
  tiltSpeedDegSec: 0,
  acquisitionTimeSec: 0,
  reacquisitionTimeSec: 0,
  targetLossPercent: 0,
  primaryTargetId: 1,
  allTargets: [],
  jitterOffset: { dx: 0, dy: 0 },
  platformOffset: { dx: 0, dy: 0 },
  passAcquisition: true,
  passTrackingError: true,
  passTargetLoss: true,
  passReacquisition: true,
  passFps: true,
};

const initialBenchmarkMetrics: BenchmarkMetrics = {
  frameIdx: 0,
  timestampMs: 0,
  detectedCentroid: null,
  detectedBbox: null,
  gtCentroid: null,
  centroidErrorPx: 0.0,
  rmsePx: 0.0,
  maxErrorPx: 0.0,
  acquisitionTimeS: 0.0,
  reacquisitionTimeS: 0.0,
  lockRetentionPct: 100.0,
  targetLossPct: 0.0,
  processingTimeMs: 0.0,
  fpsMeasured: 30.0,
  locked: false,
  isApproximateGt: false,
  passRmse: true,
  passAcq: true,
  passReacq: true,
  passLock: true,
  passFps: true,
};

function interpolateSamples(
  samples: Record<number, [number, number]>,
  totalFrames: number
): Record<number, [number, number]> {
  const frames = Object.keys(samples).map(Number).sort((a, b) => a - b);
  if (frames.length === 0 || totalFrames <= 0) return {};
  if (frames.length === 1) {
    const single = samples[frames[0]];
    const res: Record<number, [number, number]> = {};
    for (let i = 0; i < totalFrames; i++) res[i] = single;
    return res;
  }
  const res: Record<number, [number, number]> = {};
  for (let i = 0; i < totalFrames; i++) {
    if (samples[i]) {
      res[i] = samples[i];
    } else if (i < frames[0]) {
      res[i] = samples[frames[0]];
    } else if (i > frames[frames.length - 1]) {
      res[i] = samples[frames[frames.length - 1]];
    } else {
      const prev = frames.filter((f) => f <= i).pop()!;
      const next = frames.find((f) => f >= i)!;
      if (prev === next) {
        res[i] = samples[prev];
      } else {
        const alpha = (i - prev) / (next - prev);
        const x = samples[prev][0] + alpha * (samples[next][0] - samples[prev][0]);
        const y = samples[prev][1] + alpha * (samples[next][1] - samples[prev][1]);
        res[i] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
      }
    }
  }
  return res;
}

export const useAppStore = create<AppStore>((set) => ({
  activeTab: 'simulation',
  setActiveTab: (tab) => set({ activeTab: tab }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  helpModalOpen: false,
  setHelpModalOpen: (open) => set({ helpModalOpen: open }),

  inputMode: 'Live Simulation',
  setInputMode: (mode) =>
    set((state) => ({
      inputMode: mode,
      isRunning: mode === 'Live Simulation',
      videoPlaybackState: mode === 'Video Ingestion' ? 'playing' : 'stopped',
    })),

  sceneMode: '2d',
  setSceneMode: (mode) => set({ sceneMode: mode }),

  // CNN Visualization State
  cnnViewEnabled: false,
  setCnnViewEnabled: (enabled) => set({ cnnViewEnabled: enabled }),
  cnnCandidates: [],
  setCnnCandidates: (candidates) => set({ cnnCandidates: candidates }),
  cnnThreshold: 0.5,
  setCnnThreshold: (threshold) => set({ cnnThreshold: threshold }),

  isCustomPathEditing: false,
  setIsCustomPathEditing: (editing) => set({ isCustomPathEditing: editing }),

  spec: { ...DEFAULT_SPEC },
  updateSpec: (partial) =>
    set((state) => {
      const newSpec = { ...state.spec, ...partial };
      if (partial.noiseGaussianStdDev !== undefined || partial.noiseSaltPepperDensity !== undefined) {
        if (partial.noiseGaussianStdDev !== undefined) newSpec.noiseStdDev = partial.noiseGaussianStdDev;
      }
      if (partial.cameraJitterIntensity !== undefined) {
        newSpec.cameraJitter = partial.cameraJitterIntensity;
      }
      return { spec: newSpec };
    }),
  resetSpecToDefault: () => set({ spec: { ...DEFAULT_SPEC } }),

  setTargetCount: (count) =>
    set((state) => {
      const current = [...state.spec.targets];
      if (count > current.length) {
        for (let i = current.length + 1; i <= count; i++) {
          current.push({
            ...DEFAULT_TARGET_CONFIG,
            id: i,
            initialLocation: 'Random',
            motion: 'Straight Line',
            speed: 80,
          });
        }
      } else {
        current.length = count;
      }
      return {
        spec: {
          ...state.spec,
          targetCount: count,
          targets: current,
        },
      };
    }),

  updateTargetConfig: (targetId, partial) =>
    set((state) => ({
      spec: {
        ...state.spec,
        targets: state.spec.targets.map((t) => (t.id === targetId ? { ...t, ...partial } : t)),
      },
    })),

  setCustomPathWaypoints: (pts) =>
    set((state) => ({
      spec: {
        ...state.spec,
        customPathWaypoints: pts,
      },
    })),

  setCustomMask32x32: (mask) =>
    set((state) => ({
      spec: {
        ...state.spec,
        customMask32x32: mask,
      },
    })),

  randomizeDisturbances: () =>
    set((state) => ({
      spec: {
        ...state.spec,
        noiseMasterIntensity: Math.floor(Math.random() * 80) + 20,
        noiseSaltPepperDensity: Math.floor(Math.random() * 15) + 2,
        noiseGaussianStdDev: Math.floor(Math.random() * 12) + 2,
        cameraJitterIntensity: +(Math.random() * 8 + 1).toFixed(1),
        atmosphereSeverity: Math.floor(Math.random() * 70) + 15,
        platformMotionAmp: +(Math.random() * 8 + 1).toFixed(1),
      },
    })),

  resetDisturbances: () =>
    set((state) => ({
      spec: {
        ...state.spec,
        noiseMasterIntensity: DEFAULT_SPEC.noiseMasterIntensity,
        noiseSaltPepperEnabled: DEFAULT_SPEC.noiseSaltPepperEnabled,
        noiseSaltPepperDensity: DEFAULT_SPEC.noiseSaltPepperDensity,
        noiseGaussianEnabled: DEFAULT_SPEC.noiseGaussianEnabled,
        noiseGaussianStdDev: DEFAULT_SPEC.noiseGaussianStdDev,
        noisePoissonEnabled: DEFAULT_SPEC.noisePoissonEnabled,
        cameraJitterEnabled: DEFAULT_SPEC.cameraJitterEnabled,
        cameraJitterIntensity: DEFAULT_SPEC.cameraJitterIntensity,
        cameraJitterWaveform: DEFAULT_SPEC.cameraJitterWaveform,
        atmosphericDisturbance: DEFAULT_SPEC.atmosphericDisturbance,
        atmosphereSeverity: DEFAULT_SPEC.atmosphereSeverity,
        platformMotion: DEFAULT_SPEC.platformMotion,
        platformMotionAmp: DEFAULT_SPEC.platformMotionAmp,
      },
    })),

  isRunning: true,
  setIsRunning: (running) => set({ isRunning: running }),
  stepTrigger: 0,
  triggerStep: () => set((state) => ({ stepTrigger: state.stepTrigger + 1, isRunning: false })),
  resetSimulationTrigger: 0,
  triggerReset: () =>
    set((state) => ({
      resetSimulationTrigger: state.resetSimulationTrigger + 1,
      metrics: { ...initialMetrics, timestamp: Date.now() },
      errorHistory: [],
    })),

  metrics: initialMetrics,
  updateMetrics: (m) => set({ metrics: m }),

  errorHistory: [],
  addErrorHistoryPoint: (pt) =>
    set((state) => ({
      errorHistory: [...state.errorHistory.slice(-50), pt],
    })),
  clearErrorHistory: () => set({ errorHistory: [] }),

  activeBenchmark: null,
  setActiveBenchmark: (name) => set({ activeBenchmark: name }),
  benchmarkLogs: [],
  addBenchmarkLog: (log) =>
    set((state) => ({
      benchmarkLogs: [
        `[${new Date().toISOString().substring(11, 19)}] ${log}`,
        ...state.benchmarkLogs.slice(0, 99),
      ],
    })),
  clearBenchmarkLogs: () => set({ benchmarkLogs: [] }),

  // Phase 3 Video Ingestion State
  videoConfig: null,
  setVideoConfig: (cfg) => set({ videoConfig: cfg }),
  videoFile: null,
  setVideoFile: (file) => set({ videoFile: file }),
  videoUrl: null,
  setVideoUrl: (url) => set({ videoUrl: url }),
  videoPlaybackState: 'stopped',
  setVideoPlaybackState: (st) => set({ videoPlaybackState: st }),
  currentVideoFrame: 0,
  setCurrentVideoFrame: (frame) => set({ currentVideoFrame: frame }),
  videoFrameDataUrl: null,
  setVideoFrameDataUrl: (url) => set({ videoFrameDataUrl: url }),

  // Phase 3 Ground Truth State
  gtConfig: {
    mode: 'auto',
    isApproximate: true,
    markedSamples: {},
    gtTrack: {},
  },
  setGtConfig: (cfg) =>
    set((state) => ({
      gtConfig: { ...state.gtConfig, ...cfg },
    })),
  addMarkedSample: (frameIdx, pt) =>
    set((state) => {
      const samples = { ...state.gtConfig.markedSamples, [frameIdx]: pt };
      const total = state.videoConfig?.totalFrames || 300;
      const interp = interpolateSamples(samples, total);
      return {
        gtConfig: {
          ...state.gtConfig,
          markedSamples: samples,
          gtTrack: interp,
          isApproximate: false,
        },
      };
    }),
  removeMarkedSample: (frameIdx) =>
    set((state) => {
      const samples = { ...state.gtConfig.markedSamples };
      delete samples[frameIdx];
      const total = state.videoConfig?.totalFrames || 300;
      const interp = interpolateSamples(samples, total);
      return {
        gtConfig: {
          ...state.gtConfig,
          markedSamples: samples,
          gtTrack: interp,
        },
      };
    }),
  clearMarkedSamples: () =>
    set((state) => ({
      gtConfig: {
        ...state.gtConfig,
        markedSamples: {},
        gtTrack: {},
      },
    })),
  setGtTrack: (track, isApproximate = false) =>
    set((state) => ({
      gtConfig: {
        ...state.gtConfig,
        gtTrack: track,
        isApproximate,
      },
    })),

  // Phase 3 Benchmark-2 Telemetry State
  benchmarkMetrics: initialBenchmarkMetrics,
  updateBenchmarkMetrics: (m) =>
    set((state) => ({
      benchmarkMetrics: { ...state.benchmarkMetrics, ...m },
    })),
  resetBenchmarkMetrics: () =>
    set({
      benchmarkMetrics: initialBenchmarkMetrics,
      detectedVideoCentroid: null,
      detectedVideoBbox: null,
    }),
  detectedVideoCentroid: null,
  setDetectedVideoCentroid: (pt) => set({ detectedVideoCentroid: pt }),
  detectedVideoBbox: null,
  setDetectedVideoBbox: (bbox) => set({ detectedVideoBbox: bbox }),
  virtualBoresight: { x: 320, y: 240 },
  setVirtualBoresight: (pos) => set({ virtualBoresight: pos }),
}));
