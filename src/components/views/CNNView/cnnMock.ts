/**
 * CNN Candidate Extraction and Simulation Helper
 * Simulates TinyBeaconNet inference on 32x32 candidate patches extracted from
 * the 640x480 optical camera sensor.
 */

import { TelemetryMetrics, SystemSpec } from '../../../lib/spec';
import { CnnCandidate } from './types';

// Cache for generating offscreen canvas patches efficiently
let offscreenPatchCanvas: HTMLCanvasElement | null = null;
let offscreenFrameCanvas: HTMLCanvasElement | null = null;

function getPatchCanvas(): HTMLCanvasElement {
  if (!offscreenPatchCanvas && typeof document !== 'undefined') {
    offscreenPatchCanvas = document.createElement('canvas');
    offscreenPatchCanvas.width = 32;
    offscreenPatchCanvas.height = 32;
  }
  return offscreenPatchCanvas!;
}

function getFrameCanvas(): HTMLCanvasElement {
  if (!offscreenFrameCanvas && typeof document !== 'undefined') {
    offscreenFrameCanvas = document.createElement('canvas');
    offscreenFrameCanvas.width = 640;
    offscreenFrameCanvas.height = 480;
  }
  return offscreenFrameCanvas!;
}

/**
 * Renders a synthetic 32x32 grayscale patch and returns a data URL.
 */
function renderPatchDataUrl(
  type: 'beacon' | 'hot_pixel' | 'streak' | 'diffuse' | 'noise',
  seed: number,
  intensity = 250
): string {
  const canvas = getPatchCanvas();
  if (!canvas) return '';
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = ctx.createImageData(32, 32);
  const data = imgData.data;

  // Background noise baseline ~14-22
  for (let i = 0; i < 32 * 32; i++) {
    const noise = Math.floor(14 + Math.random() * 8);
    const idx = i * 4;
    data[idx] = noise;     // R
    data[idx + 1] = noise; // G
    data[idx + 2] = noise; // B
    data[idx + 3] = 255;   // A
  }

  const cx = 15.5;
  const cy = 15.5;

  if (type === 'beacon') {
    // Symmetrical Gaussian Airy diffraction disk
    const sigma = 3.2;
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        const val = Math.exp(-distSq / (2 * sigma * sigma)) * intensity;
        const idx = (y * 32 + x) * 4;
        const current = data[idx];
        const pixelVal = Math.min(255, Math.floor(current + val));
        data[idx] = pixelVal;
        data[idx + 1] = pixelVal;
        data[idx + 2] = pixelVal;
      }
    }
  } else if (type === 'hot_pixel') {
    // Sharp isolated 1-2 saturated pixels with zero blur
    const hx = 15 + Math.floor((seed % 3) - 1);
    const hy = 15 + Math.floor(((seed * 7) % 3) - 1);
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const idx = ((hy + dy) * 32 + (hx + dx)) * 4;
        data[idx] = 252;
        data[idx + 1] = 252;
        data[idx + 2] = 252;
      }
    }
  } else if (type === 'streak') {
    // Diagonal cosmic ray / solar glint artifact streak
    const slope = 0.8;
    for (let x = 4; x < 28; x++) {
      const y = Math.floor(cx + (x - cx) * slope);
      if (y >= 0 && y < 32) {
        for (let w = -1; w <= 1; w++) {
          const py = y + w;
          if (py >= 0 && py < 32) {
            const idx = (py * 32 + x) * 4;
            const streakVal = w === 0 ? 190 : 80;
            data[idx] = Math.min(255, data[idx] + streakVal);
            data[idx + 1] = Math.min(255, data[idx + 1] + streakVal);
            data[idx + 2] = Math.min(255, data[idx + 2] + streakVal);
          }
        }
      }
    }
  } else if (type === 'diffuse') {
    // Low-contrast atmospheric cloud/fog glint
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const val = Math.max(0, (1 - dist / 14) * 85);
        const idx = (y * 32 + x) * 4;
        const pixelVal = Math.min(255, Math.floor(data[idx] + val));
        data[idx] = pixelVal;
        data[idx + 1] = pixelVal;
        data[idx + 2] = pixelVal;
      }
    }
  } else {
    // Random false alarm blob
    for (let y = 10; y < 22; y++) {
      for (let x = 10; x < 22; x++) {
        const idx = (y * 32 + x) * 4;
        const val = 45 + Math.floor(Math.random() * 50);
        data[idx] = Math.min(255, data[idx] + val);
        data[idx + 1] = Math.min(255, data[idx + 1] + val);
        data[idx + 2] = Math.min(255, data[idx + 2] + val);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Extracts and scores candidates from the current simulation state.
 */
export function extractCnnCandidates(
  metrics: TelemetryMetrics,
  spec: SystemSpec,
  threshold: number,
  timeSec: number
): { candidates: CnnCandidate[]; frameImageB64: string } {
  const candidates: CnnCandidate[] = [];

  // Determine beacon location in camera frame
  const beaconPos = metrics.targetCameraPos || metrics.detectedCentroid || { x: 320, y: 240 };
  const targetInFov = metrics.targetInFov !== false;

  // 1. Primary Beacon Candidate (if in FOV or target exists)
  if (targetInFov && beaconPos.x >= 16 && beaconPos.x <= 624 && beaconPos.y >= 16 && beaconPos.y <= 464) {
    // Beacon confidence is typically very high (> 0.92) under nominal lock
    const trackingErr = metrics.trackingErrorPx || 0;
    const atmPen = ((spec.atmosphereSeverity ?? 50) / 100) * 0.08;
    const rawConf = 0.985 - Math.min(0.06, trackingErr * 0.003) - atmPen;
    const confidence = Math.max(0.72, Math.min(0.99, Math.round(rawConf * 100) / 100));

    candidates.push({
      id: 1,
      x: Math.round(beaconPos.x),
      y: Math.round(beaconPos.y),
      patchDataUrl: renderPatchDataUrl('beacon', 101, 245),
      confidence: confidence,
      accepted: confidence >= threshold,
      isBeacon: true,
      label: confidence >= threshold ? 'BEACON' : 'CLUTTER',
      areaPx: 142,
      meanIntensity: 218,
    });
  }

  // 2. Clutter Candidates (Simulated optical background noise, hot pixels, cosmic rays)
  const clutterConfigs = [
    {
      id: 2,
      type: 'streak' as const,
      baseX: 180 + Math.sin(timeSec * 0.4) * 40,
      baseY: 120 + Math.cos(timeSec * 0.3) * 30,
      confidence: 0.28,
      area: 64,
      meanIntensity: 95,
    },
    {
      id: 3,
      type: 'hot_pixel' as const,
      baseX: 490,
      baseY: 340,
      confidence: 0.14,
      area: 8,
      meanIntensity: 250,
    },
    {
      id: 4,
      type: 'diffuse' as const,
      baseX: 420 + Math.cos(timeSec * 0.25) * 50,
      baseY: 190 + Math.sin(timeSec * 0.35) * 40,
      confidence: 0.42, // Hard negative near threshold
      area: 195,
      meanIntensity: 78,
    },
    {
      id: 5,
      type: 'noise' as const,
      baseX: 140,
      baseY: 390,
      confidence: 0.08,
      area: 32,
      meanIntensity: 58,
    },
  ];

  clutterConfigs.forEach((c) => {
    // Avoid spawning clutter exactly on top of the beacon
    const distToBeacon = Math.hypot(c.baseX - beaconPos.x, c.baseY - beaconPos.y);
    if (distToBeacon < 35) return;

    candidates.push({
      id: c.id,
      x: Math.round(c.baseX),
      y: Math.round(c.baseY),
      patchDataUrl: renderPatchDataUrl(c.type, c.id * 17, 180),
      confidence: c.confidence,
      accepted: c.confidence >= threshold,
      isBeacon: false,
      label: c.confidence >= threshold ? 'BEACON' : 'CLUTTER',
      areaPx: c.area,
      meanIntensity: c.meanIntensity,
    });
  });

  // Sort candidates by confidence descending
  candidates.sort((a, b) => b.confidence - a.confidence);

  // 3. Render 640x480 frame for the CameraFrameCanvas
  const frameCanvas = getFrameCanvas();
  let frameImageB64 = '';
  if (frameCanvas) {
    const fctx = frameCanvas.getContext('2d');
    if (fctx) {
      // Dark space backdrop
      fctx.fillStyle = '#0a0e14';
      fctx.fillRect(0, 0, 640, 480);

      // Subtle sensor grid
      fctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      fctx.lineWidth = 1;
      for (let gx = 80; gx < 640; gx += 80) {
        fctx.beginPath();
        fctx.moveTo(gx, 0);
        fctx.lineTo(gx, 480);
        fctx.stroke();
      }
      for (let gy = 60; gy < 480; gy += 60) {
        fctx.beginPath();
        fctx.moveTo(0, gy);
        fctx.lineTo(640, gy);
        fctx.stroke();
      }

      // Optical Boresight Crosshair
      fctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      fctx.beginPath();
      fctx.moveTo(320, 210);
      fctx.lineTo(320, 270);
      fctx.moveTo(290, 240);
      fctx.lineTo(350, 240);
      fctx.stroke();

      // Render candidates on the full frame
      candidates.forEach((cand) => {
        if (cand.isBeacon) {
          // Glow halo
          const grad = fctx.createRadialGradient(cand.x, cand.y, 1, cand.x, cand.y, 14);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
          grad.addColorStop(0.3, 'rgba(6, 182, 212, 0.6)');
          grad.addColorStop(1, 'rgba(6, 182, 212, 0)');
          fctx.fillStyle = grad;
          fctx.beginPath();
          fctx.arc(cand.x, cand.y, 14, 0, Math.PI * 2);
          fctx.fill();

          // Core point
          fctx.fillStyle = '#ffffff';
          fctx.beginPath();
          fctx.arc(cand.x, cand.y, 2.5, 0, Math.PI * 2);
          fctx.fill();
        } else {
          // Clutter artifact
          fctx.fillStyle = 'rgba(156, 163, 175, 0.65)';
          fctx.beginPath();
          fctx.arc(cand.x, cand.y, 3, 0, Math.PI * 2);
          fctx.fill();
        }
      });

      frameImageB64 = frameCanvas.toDataURL('image/jpeg', 0.85);
    }
  }

  return { candidates, frameImageB64 };
}
