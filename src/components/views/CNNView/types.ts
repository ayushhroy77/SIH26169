/**
 * CNN View Data Types
 * Defines data structures for candidate patch extraction, inference scores, and visualization.
 */

export interface CnnCandidate {
  id: number;
  x: number;             // X coordinate in 640x480 frame
  y: number;             // Y coordinate in 640x480 frame
  patchDataUrl: string;  // 32x32 grayscale image data URL
  confidence: number;    // 0..1 CNN probability
  accepted: boolean;     // confidence >= threshold
  isBeacon?: boolean;    // Ground truth tag
  label?: string;        // 'BEACON' | 'CLUTTER'
  areaPx?: number;       // Area of detected component
  meanIntensity?: number;// Average intensity 0-255
}

export interface CnnModelInfo {
  architecture: string;
  parameters: string;
  input: string;
  output: string;
  trainingSamples: string;
  validationAcc: string;
  inference: string;
  backend: string;
}

export interface CnnLiveStats {
  candidatesCount: number;
  acceptedCount: number;
  rejectedCount: number;
  avgConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  threshold: number;
  lockState: string;
}
