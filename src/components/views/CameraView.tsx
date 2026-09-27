import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { StatusPill } from '../ui/StatusPill';

interface CameraViewProps {
  detectedCentroid: { x: number; y: number } | null;
  targetCameraPos: { x: number; y: number } | null;
  boresightPos: { x: number; y: number };
  targetInFov: boolean;
  trackingErrorPx: number;
  trackingErrorDeg: number;
  panSpeedDegSec: number;
  tiltSpeedDegSec: number;
  fps: number;
}

// ── Shape-aware beacon renderer (matches SceneCanvas) ──────────
function drawBeaconShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  shape: string
): void {
  const half = size / 2;

  switch (shape) {
    case 'Circle':
      ctx.beginPath();
      ctx.arc(x, y, half, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'Triangle':
      ctx.beginPath();
      ctx.moveTo(x, y - half);
      ctx.lineTo(x + half, y + half);
      ctx.lineTo(x - half, y + half);
      ctx.closePath();
      ctx.fill();
      break;

    case 'Cross': {
      const arm = Math.max(1.5, size / 4);
      ctx.fillRect(x - arm, y - half, arm * 2, size);
      ctx.fillRect(x - half, y - arm, size, arm * 2);
      break;
    }

    case 'Custom': {
      const mask = (window as any).__fsoc_custom_mask as number[][] | undefined;
      if (mask && mask.length === 32) {
        const cellW = size / 32;
        const cellH = size / 32;
        const ox = x - half;
        const oy = y - half;
        for (let r = 0; r < 32; r++) {
          for (let c = 0; c < 32; c++) {
            if (mask[r] && mask[r][c]) {
              ctx.fillRect(ox + c * cellW, oy + r * cellH, cellW + 0.5, cellH + 0.5);
            }
          }
        }
      } else {
        // Fallback: diamond
        ctx.beginPath();
        ctx.moveTo(x, y - half);
        ctx.lineTo(x + half, y);
        ctx.lineTo(x, y + half);
        ctx.lineTo(x - half, y);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }

    case 'Square':
    default:
      ctx.fillRect(x - half, y - half, size, size);
      break;
  }
}

export const CameraView: React.FC<CameraViewProps> = ({
  detectedCentroid,
  targetCameraPos,
  boresightPos,
  targetInFov,
  trackingErrorPx,
  trackingErrorDeg,
  panSpeedDegSec,
  tiltSpeedDegSec,
  fps,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spec = useAppStore((state) => state.spec);
  const metrics = useAppStore((state) => state.metrics);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;   // 640
    const height = canvas.height; // 480

    // 1. Background Fill according to Camera Type & Atmospheric conditions
    const severity = (spec.atmosphereSeverity ?? 50) / 100;
    if (spec.cameraType === 'Monochrome') {
      let bgVal = 18;
      if (spec.atmosphericDisturbance === 'Low light') bgVal = Math.round(18 * (1 - 0.6 * severity));
      else if (spec.atmosphericDisturbance === 'Fog') bgVal = Math.round(18 + 45 * severity);
      else if (spec.atmosphericDisturbance === 'Haze') bgVal = Math.round(18 + 25 * severity);

      ctx.fillStyle = `rgb(${bgVal}, ${bgVal}, ${bgVal})`;
      ctx.fillRect(0, 0, width, height);
    } else {
      let r = 10, g = 14, b = 24;
      if (spec.atmosphericDisturbance === 'Low light') {
        const factor = 1 - 0.7 * severity;
        r = Math.round(r * factor);
        g = Math.round(g * factor);
        b = Math.round(b * factor);
      } else if (spec.atmosphericDisturbance === 'Fog') {
        r = Math.round(10 + 55 * severity);
        g = Math.round(14 + 60 * severity);
        b = Math.round(24 + 70 * severity);
      } else if (spec.atmosphericDisturbance === 'Haze') {
        r = Math.round(10 + 35 * severity);
        g = Math.round(14 + 40 * severity);
        b = Math.round(24 + 50 * severity);
      }

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Optical Reticle / Grid
    ctx.strokeStyle = spec.cameraType === 'Monochrome' ? '#26262C' : 'rgba(91, 141, 239, 0.12)';
    ctx.lineWidth = 1;

    // Center Cross-hairs across whole viewport
    ctx.beginPath();
    ctx.moveTo(0, boresightPos.y);
    ctx.lineTo(width, boresightPos.y);
    ctx.moveTo(boresightPos.x, 0);
    ctx.lineTo(boresightPos.x, height);
    ctx.stroke();

    // 3. Concentric Coarse Alignment Tolerance Rings around Boresight
    // Ring 1: 10px target specification threshold (Green)
    const r1 = spec.maxTrackingErrorPx; // 10px
    ctx.beginPath();
    ctx.arc(boresightPos.x, boresightPos.y, r1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(63, 185, 80, 0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ring 2: 25px acquisition limit
    ctx.beginPath();
    ctx.arc(boresightPos.x, boresightPos.y, 25, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(210, 153, 34, 0.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Ring 3: 50px boundary
    ctx.beginPath();
    ctx.arc(boresightPos.x, boresightPos.y, 50, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(138, 138, 147, 0.25)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Boresight Central Marker
    ctx.fillStyle = '#EDEDED';
    ctx.beginPath();
    ctx.arc(boresightPos.x, boresightPos.y, 2, 0, Math.PI * 2);
    ctx.fill();

    // 4. Atmospheric Rain Streaks Simulation
    if (spec.atmosphericDisturbance === 'Rain') {
      const rainCount = Math.round(25 + 50 * severity);
      ctx.strokeStyle = 'rgba(170, 200, 255, 0.3)';
      ctx.lineWidth = 1;
      for (let i = 0; i < rainCount; i++) {
        const rx = Math.random() * width;
        const ry = Math.random() * height;
        const rlen = 10 + Math.random() * 15;
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 2, ry + rlen);
        ctx.stroke();
      }
    }

    // 5. Render All Configured Optical Targets inside FOV — SHAPE-AWARE
    const activeTargets = (metrics.allTargets && metrics.allTargets.length > 0)
      ? metrics.allTargets
      : (spec.targets && spec.targets.length > 0)
        ? spec.targets.slice(0, spec.targetCount).map((tgt) => {
            const isPrimary = (tgt.id === metrics.primaryTargetId);
            return {
              id: tgt.id,
              shape: tgt.shape,
              size: tgt.size,
              inFov: isPrimary ? targetInFov : false,
              cameraPos: isPrimary ? targetCameraPos : null,
              isPrimary,
            };
          })
        : [{
            id: 1,
            shape: spec.targetShape,
            size: spec.targetSize,
            inFov: targetInFov,
            cameraPos: targetCameraPos,
            isPrimary: true,
          }];

    activeTargets.forEach((tgt: any) => {
      let tx: number, ty: number, inFov: boolean;
      if (tgt.cameraPos) {
        tx = tgt.cameraPos.x;
        ty = tgt.cameraPos.y;
        inFov = tgt.inFov;
      } else if (tgt.id === metrics.primaryTargetId && targetCameraPos) {
        tx = targetCameraPos.x;
        ty = targetCameraPos.y;
        inFov = targetInFov;
      } else {
        return;
      }

      if (!inFov || tx < -40 || tx > width + 40 || ty < -40 || ty > height + 40) return;

      const baseSize = tgt.size || 10;
      const shape = tgt.shape || 'Square';
      const targetColor = spec.cameraType === 'Monochrome' ? '#EDEDED' : '#5B8DEF';

      // Draw synthetic optical spot — SHAPE-AWARE
      const glowSize = baseSize * 1.8;
      const grad = ctx.createRadialGradient(tx, ty, 1, tx, ty, glowSize);
      grad.addColorStop(0, targetColor);
      grad.addColorStop(0.5, targetColor);
      grad.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = grad;
      drawBeaconShape(ctx, tx, ty, glowSize, shape);

      // Bright core — SHAPE-AWARE
      ctx.fillStyle = '#FFFFFF';
      drawBeaconShape(ctx, tx, ty, Math.max(2, baseSize * 0.7), shape);
    });

    // 6. Disturbances: Image Noise
    if (spec.noiseSaltPepperEnabled || (spec.noiseGaussianEnabled && spec.noiseGaussianStdDev > 0)) {
      const masterNoise = (spec.noiseGaussianStdDev || 8) / 25;
      if (spec.noiseSaltPepperEnabled) {
        const count = Math.floor(width * height * 0.003 * masterNoise);
        for (let i = 0; i < count; i++) {
          const nx = Math.random() * width;
          const ny = Math.random() * height;
          ctx.fillStyle = Math.random() > 0.5 ? '#FFFFFF' : '#000000';
          ctx.fillRect(nx, ny, 1, 1);
        }
      }
      if (spec.noiseGaussianEnabled && spec.noiseGaussianStdDev > 0) {
        const gCount = Math.floor(width * height * 0.015 * masterNoise);
        ctx.fillStyle = '#94A3B8';
        for (let i = 0; i < gCount; i++) {
          const nx = Math.random() * width;
          const ny = Math.random() * height;
          ctx.fillRect(nx, ny, 1, 1);
        }
      }
    }

    // 7. CV Tracker Overlays on Primary Target Centroid
    if (detectedCentroid) {
      const cx = detectedCentroid.x;
      const cy = detectedCentroid.y;
      const bboxPad = 12;

      // Tracking Error Vector from Boresight to Centroid
      ctx.beginPath();
      ctx.strokeStyle = trackingErrorPx <= spec.maxTrackingErrorPx ? '#3FB950' : '#F85149';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(boresightPos.x, boresightPos.y);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // Bounding Box around beacon
      ctx.strokeStyle = trackingErrorPx <= spec.maxTrackingErrorPx ? '#3FB950' : '#5B8DEF';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - bboxPad, cy - bboxPad, bboxPad * 2, bboxPad * 2);

      // Centroid Crosshair
      const chLen = 5;
      ctx.strokeStyle = '#3FB950';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - chLen, cy);
      ctx.lineTo(cx + chLen, cy);
      ctx.moveTo(cx, cy - chLen);
      ctx.lineTo(cx, cy + chLen);
      ctx.stroke();
    } else {
      // Unobtrusive search label
      ctx.fillStyle = '#5C5C66';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ACQUIRING BEACON...', boresightPos.x, boresightPos.y - 30);
      ctx.textAlign = 'left';
    }
  }, [detectedCentroid, targetCameraPos, boresightPos, targetInFov, trackingErrorPx, spec, metrics]);

  return (
    <div
      id="camera-viewport-panel"
      className="bg-[#111113] border border-[#1F1F23]/40 rounded-lg p-3 flex flex-col h-full select-none"
    >
      {/* 32px Header: "Virtual Camera Viewport" + resolution chip + mono/colour chip + compact status */}
      <div className="h-8 flex items-center justify-between pb-2 mb-2 border-b border-[#1F1F23]/30">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium tracking-tight text-[#EDEDED]">
            Virtual Camera Viewport
          </span>
          <span className="text-[10px] font-mono text-[#8A8A93] px-1.5 py-0.5 rounded bg-[#17171A] border border-[#1F1F23]/60">
            {spec.cameraResolution.width}×{spec.cameraResolution.height}
          </span>
          <span className="text-[10px] font-mono text-[#8A8A93] px-1.5 py-0.5 rounded bg-[#17171A] border border-[#1F1F23]/60">
            {spec.cameraType === 'Monochrome' ? 'MONO' : 'COLOR'}
          </span>
        </div>

        <StatusPill
          status={metrics.isLocked ? 'Tracking' : targetInFov ? 'Re-acquiring' : 'Lost'}
        />
      </div>

      {/* Camera Feed: 4:3 aspect ratio, full width, no letterbox black dead space */}
      <div className="relative w-full aspect-[4/3] bg-[#0A0A0B] rounded border border-[#1F1F23]/30 overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full object-cover"
        />
      </div>

      {/* 32px Telemetry Strip */}
      <div className="h-8 flex items-center justify-center text-[11px] font-mono text-[#8A8A93] tracking-tight border-b border-[#1F1F23]/30 truncate">
        <span>FOV {spec.cameraFov.hDeg}°×{spec.cameraFov.vDeg}°</span>
        <span className="mx-2 text-[#5C5C66]">·</span>
        <span>{spec.cameraUpdateRate} Hz</span>
        <span className="mx-2 text-[#5C5C66]">·</span>
        <span>PAN {(panSpeedDegSec ?? 0).toFixed(2)}°/s</span>
        <span className="mx-2 text-[#5C5C66]">·</span>
        <span>TILT {(tiltSpeedDegSec ?? 0).toFixed(2)}°/s</span>
        <span className="mx-2 text-[#5C5C66]">·</span>
        <span className="text-[#5C5C66]">MAX {spec.maxPanSpeed}°/s</span>
      </div>

      {/* Bottom strip: atmosphere chip + primary error chip only */}
      <div className="pt-2 flex items-center justify-between text-[11px] font-mono">
        <div className="flex items-center gap-1.5">
          <span className="text-[#5C5C66]">ATM:</span>
          <span className="px-1.5 py-0.5 rounded bg-[#17171A] text-[#8A8A93] border border-[#1F1F23]/40">
            {spec.atmosphericDisturbance.toUpperCase()}
            {spec.atmosphericDisturbance !== 'Clear' ? ` (${spec.atmosphereSeverity}%)` : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[#5C5C66]">ERROR:</span>
          <span className="px-1.5 py-0.5 rounded bg-[#17171A] text-[#EDEDED] border border-[#1F1F23]/40 tabular-nums">
            {(trackingErrorPx ?? 0).toFixed(2)} px
            <span className="text-[#5C5C66] ml-1">
              ({((trackingErrorDeg ?? 0) * 3600).toFixed(0)}″)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};