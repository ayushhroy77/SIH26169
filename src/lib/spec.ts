/**
 * FSOC Coarse Alignment Virtual Tracking System — Specification Contract
 * Single source of truth for all simulation, camera, target, and performance parameters.
 * Reference: ISRO / SIH 2024 (Department of Space) — Theme: Smart Automation & Space Technology
 * Phase 2: Full Multi-Target and Disturbances & Noise Engine
 */

export interface TargetConfig {
  id: number;
  shape: 'Square' | 'Circle' | 'Triangle' | 'Cross' | 'Custom';
  size: number; // 5–20 px, default 10
  initialLocation: 'Random' | 'Center' | 'Custom';
  customPos?: { x: number; y: number };
  motion: 'Straight Line' | 'Circular' | 'Figure-of-8' | 'Random' | 'Spiral' | 'Sinusoidal' | 'User-defined';
  speed: number; // 0–500 px/s, default 90 px/s
  customPathWaypoints?: Array<{ x: number; y: number }>;
  customMask?: number[][]; // 32x32 binary grid (0 or 1)
}

export interface SystemSpec {
  // 1. Camera Parameters
  screenSize: { width: number; height: number }; // min 2000x2000 px, default 2000x2000
  cameraType: 'Monochrome' | 'Colour';           // Monochrome (default) | Colour
  cameraResolution: { width: number; height: number }; // default 640x480
  cameraFov: { hDeg: number; vDeg: number };     // default 4° x 3°
  cameraUpdateRate: number;                       // min 30 Hz (default 30)
  initialCameraPos: { x: number; y: number };    // centre of screen (default 1000, 1000)

  // 2. Target Parameters (Spec Items 7–12)
  targetType: 'Beacon Spot';
  targetCount: number;                           // 1 mandatory, up to 8
  targets: TargetConfig[];                       // per-target configuration
  targetShape: 'Square' | 'Circle' | 'Triangle' | 'Cross' | 'Custom'; // primary default
  customMask32x32: number[][] | null;            // 32x32 binary grid
  targetSize: number;                            // 5–20 px, default 10
  initialTargetLocation: 'Random' | 'Center' | 'Custom'; // default Random
  customTargetPos?: { x: number; y: number };
  targetMotion: 'Straight Line' | 'Circular' | 'Figure-of-8' | 'Random' | 'Spiral' | 'Sinusoidal' | 'User-defined';
  targetSpeed: number;                           // pixels per second (0-500 px/s, default 90)
  customPathWaypoints: Array<{ x: number; y: number }>;

  // 3. Camera Motion Constraints
  maxPanSpeed: number;                           // 5–10°/s, default 5°/s
  maxTiltSpeed: number;                          // 5–10°/s, default 5°/s
  updateIntervalHz: number;                      // >= 20 Hz, default 30 Hz

  // 4. Performance Specifications & Thresholds
  maxAcquisitionTimeSec: number;                 // <= 2.0 s
  maxTrackingErrorPx: number;                    // <= 10.0 px
  maxTargetLossPercent: number;                  // < 5.0 %
  maxReacquisitionTimeSec: number;               // <= 1.0 s
  minProcessingFps: number;                      // >= 20 FPS

  // 5. Disturbances & Noise (Spec Items 21–25)
  // Image Noise (Spec 21, 22)
  noiseMasterIntensity: number;                  // 0–100%, default 100%
  noiseSaltPepperEnabled: boolean;               // default true
  noiseSaltPepperDensity: number;                // 0–20%, default 10%
  noiseGaussianEnabled: boolean;                 // default false
  noiseGaussianStdDev: number;                   // 0–20 px, default 8 px
  noisePoissonEnabled: boolean;                  // default false
  noisePoissonScale: number;                     // 1–100, default 20

  // Camera Jitter (Spec 23)
  cameraJitterEnabled: boolean;                  // default true
  cameraJitterIntensity: number;                 // 0–20 px/frame, default 2.0 px
  cameraJitterWaveform: 'Uniform' | 'Perlin';    // default 'Uniform'

  // Atmospheric Disturbance (Spec 24)
  atmosphericDisturbance: 'Clear' | 'Haze' | 'Fog' | 'Rain' | 'Low light'; // default 'Clear'
  atmosphereSeverity: number;                    // 0–100%, default 50%

  // Platform Motion (Spec 25)
  platformMotion: 'None' | 'Linear' | 'Circular' | 'Random' | 'Spiral' | 'Figure-of-8'; // default 'Linear'
  platformMotionAmp: number;                     // 0–20 px/frame, default 4.0 px

  // Backward compatibility aliases
  noiseType: 'None' | 'Salt & Pepper' | 'Gaussian' | 'Poisson';
  noiseStdDev: number;
  cameraJitter: number;

  // 6. Detection & Tracking Algorithm
  detectionAlgorithm: 'Threshold+Centroid' | 'Gaussian Filter+Centroid' | 'AI/CNN (YOLO-FSOC)' | 'Optical Flow';
  detectionThreshold: number;                    // 0–255, default 180
  kpPan: number;                                 // Proportional servo gain (Pan)
  kpTilt: number;                                // Proportional servo gain (Tilt)
  kdPan: number;                                 // Derivative gain
  kdTilt: number;

  // Phase 4: Defined Metric Configuration (R, M, K)
  lockRadiusPx?: number;                         // Lock radius R (px)
  lockFramesM?: number;                          // Lock confirmation frames M
  lossFramesK?: number;                          // Loss confirmation frames K
  gtSource?: string;                             // Ground truth source

  // 7. Input Mode
  inputMode: 'Virtual Simulation' | 'Video Ingest (Bypass PTZ)' | 'Benchmark-1 Scenario' | 'Benchmark-2 Validation' | 'Live Simulation' | 'Video Ingestion';
}

export const DEFAULT_TARGET_CONFIG: TargetConfig = {
  id: 1,
  shape: 'Square',
  size: 10,
  initialLocation: 'Random',
  motion: 'Figure-of-8',
  speed: 90,
  customPathWaypoints: [],
  customMask: undefined,
};

export const DEFAULT_SPEC: SystemSpec = {
  screenSize: { width: 2000, height: 2000 },
  cameraType: 'Monochrome',
  cameraResolution: { width: 640, height: 480 },
  cameraFov: { hDeg: 4.0, vDeg: 3.0 },
  cameraUpdateRate: 30,
  initialCameraPos: { x: 1000, y: 1000 },

  // Phase 4 Defined Metrics
  lockRadiusPx: 12,
  lockFramesM: 3,
  lossFramesK: 5,
  gtSource: 'csv',

  targetType: 'Beacon Spot',
  targetCount: 1,
  targets: [{ ...DEFAULT_TARGET_CONFIG }],
  targetShape: 'Square',
  customMask32x32: null,
  targetSize: 10,
  initialTargetLocation: 'Random',
  targetMotion: 'Figure-of-8',
  targetSpeed: 90,
  customPathWaypoints: [
    { x: 600, y: 600 },
    { x: 1400, y: 600 },
    { x: 1400, y: 1400 },
    { x: 600, y: 1400 },
  ],

  maxPanSpeed: 5.0,
  maxTiltSpeed: 5.0,
  updateIntervalHz: 30,

  maxAcquisitionTimeSec: 2.0,
  maxTrackingErrorPx: 10.0,
  maxTargetLossPercent: 5.0,
  maxReacquisitionTimeSec: 1.0,
  minProcessingFps: 20.0,

  // Disturbances Defaults (Spec compliant)
  noiseMasterIntensity: 100,
  noiseSaltPepperEnabled: true,
  noiseSaltPepperDensity: 10,
  noiseGaussianEnabled: false,
  noiseGaussianStdDev: 8,
  noisePoissonEnabled: false,
  noisePoissonScale: 20,

  cameraJitterEnabled: true,
  cameraJitterIntensity: 2.0,
  cameraJitterWaveform: 'Uniform',

  atmosphericDisturbance: 'Clear',
  atmosphereSeverity: 50,

  platformMotion: 'Linear',
  platformMotionAmp: 4.0,

  // Aliases
  noiseType: 'Salt & Pepper',
  noiseStdDev: 8.0,
  cameraJitter: 2.0,

  detectionAlgorithm: 'Threshold+Centroid',
  detectionThreshold: 180,
  kpPan: 0.12,
  kpTilt: 0.12,
  kdPan: 0.02,
  kdTilt: 0.02,

  inputMode: 'Virtual Simulation',
};

export interface TargetInfo {
  id: number;
  worldPos: { x: number; y: number };
  cameraPos: { x: number; y: number } | null;
  inFov: boolean;
  isPrimary: boolean;
  shape: string;
  size: number;
}

export interface TelemetryMetrics {
  timestamp: number;
  simDurationSec: number;
  fps: number;
  processingTimeMs: number;

  targetWorldPos: { x: number; y: number };
  cameraWorldPos: { x: number; y: number };
  effectiveCameraPos?: { x: number; y: number };
  targetCameraPos: { x: number; y: number } | null;
  detectedCentroid: { x: number; y: number } | null;
  boresightPos: { x: number; y: number };

  targetInFov: boolean;
  isLocked: boolean;
  trackingErrorPx: number;
  trackingErrorDeg: number;

  panSpeedDegSec: number;
  tiltSpeedDegSec: number;

  acquisitionTimeSec: number;
  reacquisitionTimeSec: number;
  targetLossPercent: number;

  // Performance and statistics
  lockStatus?: 'Tracking' | 'Lost' | 'Re-acquiring';
  targetLossRate?: number;
  lockRetentionRate?: number;
  averageErrorPx?: number;
  rmseErrorPx?: number;
  maxErrorPx?: number;
  totalFrames?: number;

  // Phase 2 Multi-target and disturbances telemetry
  primaryTargetId: number;
  allTargets: TargetInfo[];
  targets?: Array<{ id: number; x: number; y: number; shape: string; size: number; is_primary: boolean }>;
  secondaryTargets?: TargetInfo[];
  jitterOffset?: { dx: number; dy: number };
  platformOffset?: { dx: number; dy: number };

  // Phase 4 Defined Metrics
  lockState?: 'SEARCH' | 'ACQUIRE' | 'TRACK' | 'COAST' | 'REACQUIRE';
  inFrameErrorPx?: number;
  truePointingErrorPx?: number;
  errorMeanPx?: number;
  errorRmsPx?: number;
  errorP95Px?: number;
  errorMaxPx?: number;
  errorStdPx?: number;
  simTimeS?: number;
  wallTimeS?: number;
  processingMs?: number;
  fpsMeasured?: number;

  passAcquisition: boolean;
  passTrackingError: boolean;
  passTargetLoss: boolean;
  passReacquisition: boolean;
  passFps: boolean;
}

export type InputModeType = 'Live Simulation' | 'Video Ingestion';

export interface VideoConfig {
  videoId: string;
  filename: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  totalFrames: number;
  thumbnail?: string;
  fpsWarning?: string | null;
}

export interface GTConfig {
  mode: 'csv' | 'click' | 'auto';
  isApproximate: boolean;
  markedSamples: Record<number, [number, number]>;
  gtTrack: Record<number, [number, number]>;
}

export interface BenchmarkMetrics {
  frameIdx: number;
  timestampMs: number;
  detectedCentroid: { x: number; y: number } | null;
  detectedBbox?: { x: number; y: number; w: number; h: number } | null;
  gtCentroid: { x: number; y: number } | null;
  centroidErrorPx: number;
  rmsePx: number;
  maxErrorPx: number;
  acquisitionTimeS: number;
  reacquisitionTimeS: number;
  lockRetentionPct: number;
  targetLossPct: number;
  processingTimeMs: number;
  fpsMeasured: number;
  locked: boolean;
  isApproximateGt: boolean;
  passRmse: boolean;
  passAcq: boolean;
  passReacq: boolean;
  passLock: boolean;
  passFps: boolean;
}
