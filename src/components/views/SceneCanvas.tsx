import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../lib/store';
import { MousePointer } from 'lucide-react';

type SetTargetFn = (x: number, y: number) => void;

interface SceneCanvasProps {
  targetWorldPos: { x: number; y: number };
  cameraWorldPos: { x: number; y: number };
  targetTrail?: Array<{ x: number; y: number }>;
  camTrail?: Array<{ x: number; y: number }>;
  onSetTargetPos?: SetTargetFn;
}

// ── Shape-aware beacon renderer ─────────────────────────────────
// Draws the beacon in the requested shape, centered at (x, y),
// with the given pixel size. Uses the current ctx.fillStyle.
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
      // Read the 32×32 mask if available (set by ShapeMaskEditor)
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
        // Fallback: draw a diamond
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

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  targetWorldPos,
  cameraWorldPos,
  targetTrail = [],
  camTrail = [],
  onSetTargetPos,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trailsRef = useRef<Map<number, Array<{ x: number; y: number }>>>(new Map());
  const spec = useAppStore((state) => state.spec);
  const metrics = useAppStore((state) => state.metrics);
  const isCustomPathEditing = useAppStore((state) => state.isCustomPathEditing);
  const setIsCustomPathEditing = useAppStore((state) => state.setIsCustomPathEditing);
  const setCustomPathWaypoints = useAppStore((state) => state.setCustomPathWaypoints);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions
    const width = canvas.width;
    const height = canvas.height;
    const scale = width / spec.screenSize.width; // 500 / 2000 = 0.25

    // Clear background
    ctx.fillStyle = '#0E0E10';
    ctx.fillRect(0, 0, width, height);

    // Grid lines (every 250 world units)
    ctx.strokeStyle = '#17171A';
    ctx.lineWidth = 1;
    const gridStep = 250 * scale;
    for (let x = 0; x <= width; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Outer boundary border
    ctx.strokeStyle = '#1F1F23';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // Draw camera history trail
    if (camTrail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(91, 141, 239, 0.2)';
      ctx.lineWidth = 1;
      camTrail.forEach((pt, i) => {
        const cx = pt.x * scale;
        const cy = pt.y * scale;
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    }

    // Resolve active targets from metrics (backend allTargets / targets) or spec
    const activeTargets = (metrics.allTargets && metrics.allTargets.length > 0)
      ? metrics.allTargets
      : (metrics.targets && metrics.targets.length > 0)
        ? metrics.targets.map(t => ({
            id: t.id,
            worldPos: { x: t.x, y: t.y },
            cameraPos: null,
            inFov: false,
            distToBore: 9999,
            shape: t.shape,
            size: t.size,
            isPrimary: t.is_primary,
            x: t.x,
            y: t.y
          }))
        : (spec.targets && spec.targets.length > 0)
          ? spec.targets.slice(0, spec.targetCount).map((st, idx) => ({
              id: st.id || idx + 1,
              worldPos: (st.id === metrics.primaryTargetId) ? targetWorldPos : { x: 1000 + (idx * 120), y: 1000 + (idx * 120) },
              cameraPos: null,
              inFov: false,
              distToBore: 9999,
              shape: st.shape || 'Square',
              size: st.size || 10,
              isPrimary: (st.id === metrics.primaryTargetId),
              x: (st.id === metrics.primaryTargetId) ? targetWorldPos.x : 1000 + (idx * 120),
              y: (st.id === metrics.primaryTargetId) ? targetWorldPos.y : 1000 + (idx * 120)
            }))
          : [{
              id: 1,
              worldPos: targetWorldPos,
              cameraPos: null,
              inFov: true,
              distToBore: 0,
              shape: spec.targetShape || 'Square',
              size: spec.targetSize || 10,
              isPrimary: true,
              x: targetWorldPos.x,
              y: targetWorldPos.y
            }];

    // Update trails per beacon
    activeTargets.forEach((tgt) => {
      const pos = tgt.worldPos || { x: tgt.x ?? 1000, y: tgt.y ?? 1000 };
      let trail = trailsRef.current.get(tgt.id);
      if (!trail) {
        trail = [];
        trailsRef.current.set(tgt.id, trail);
      }
      trail.push({ x: pos.x, y: pos.y });
      if (trail.length > 60) trail.shift();
    });

    // Draw independent trail for each beacon
    trailsRef.current.forEach((trail, tid) => {
      if (trail.length > 1) {
        const isPrimary = (tid === metrics.primaryTargetId);
        ctx.beginPath();
        ctx.strokeStyle = isPrimary ? 'rgba(237, 237, 237, 0.25)' : 'rgba(138, 138, 147, 0.18)';
        ctx.lineWidth = 1;
        trail.forEach((pt, i) => {
          const tx = pt.x * scale;
          const ty = pt.y * scale;
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        });
        ctx.stroke();
      }
    });

    // Fallback draw primary target trail if provided in props
    if (trailsRef.current.size === 0 && targetTrail.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(237, 237, 237, 0.2)';
      ctx.lineWidth = 1;
      targetTrail.forEach((pt, i) => {
        const tx = pt.x * scale;
        const ty = pt.y * scale;
        if (i === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      });
      ctx.stroke();
    }

    // Draw Custom Path Waypoints (if user defined)
    const waypoints = spec.customPathWaypoints || [];
    if (waypoints.length > 0 && (spec.targetMotion === 'User-defined' || isCustomPathEditing)) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(91, 141, 239, 0.4)';
      ctx.lineWidth = 1;
      waypoints.forEach((wp, idx) => {
        const wx = wp.x * scale;
        const wy = wp.y * scale;
        if (idx === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      });
      ctx.stroke();

      waypoints.forEach((wp, idx) => {
        const wx = wp.x * scale;
        const wy = wp.y * scale;
        ctx.fillStyle = '#5B8DEF';
        ctx.beginPath();
        ctx.arc(wx, wy, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8A8A93';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`${idx + 1}`, wx + 4, wy - 4);
      });
    }

    // Draw camera FOV frustum projection rectangle
    const fovWidthPx = 2000 * (spec.cameraFov.hDeg / 20.0);
    const fovHeightPx = 2000 * (spec.cameraFov.vDeg / 20.0);
    const camFovScaledW = fovWidthPx * scale;
    const camFovScaledH = fovHeightPx * scale;
    const camCenterScaledX = cameraWorldPos.x * scale;
    const camCenterScaledY = cameraWorldPos.y * scale;

    ctx.strokeStyle = '#5B8DEF';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      camCenterScaledX - camFovScaledW / 2,
      camCenterScaledY - camFovScaledH / 2,
      camFovScaledW,
      camFovScaledH
    );

    // Camera Center Cross
    ctx.strokeStyle = '#5B8DEF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(camCenterScaledX - 4, camCenterScaledY);
    ctx.lineTo(camCenterScaledX + 4, camCenterScaledY);
    ctx.moveTo(camCenterScaledX, camCenterScaledY - 4);
    ctx.lineTo(camCenterScaledX, camCenterScaledY + 4);
    ctx.stroke();

    // Render All Active Beacons — shape-aware
    activeTargets.forEach((tgt) => {
      const isPrimary = tgt.isPrimary || (tgt.id === metrics.primaryTargetId);
      const wx = (tgt.worldPos ? tgt.worldPos.x : (tgt.x ?? 1000)) * scale;
      const wy = (tgt.worldPos ? tgt.worldPos.y : (tgt.y ?? 1000)) * scale;
      const shape = tgt.shape || 'Square';
      // On scene canvas the world is scaled ~0.25, so use visual sizes
      const visualSize = isPrimary ? 8 : 5;

      if (isPrimary) {
        // Primary Beacon: shape-aware white/accent with outer ring and label
        ctx.fillStyle = '#EDEDED';
        drawBeaconShape(ctx, wx, wy, visualSize, shape);

        ctx.strokeStyle = '#5B8DEF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(wx, wy, Math.max(7, visualSize * 0.9), 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#EDEDED';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`T${tgt.id} (P)`, wx + 9, wy - 4);
      } else {
        // Secondary Beacons: shape-aware subtle grey with ring and label
        ctx.fillStyle = '#8A8A93';
        drawBeaconShape(ctx, wx, wy, visualSize, shape);

        ctx.strokeStyle = 'rgba(138, 138, 147, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(wx, wy, Math.max(5.5, visualSize * 0.9), 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#8A8A93';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`T${tgt.id}`, wx + 7, wy - 3);
      }
    });
  }, [targetWorldPos, cameraWorldPos, targetTrail, camTrail, spec, metrics, isCustomPathEditing]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const scale = canvasRef.current.width / spec.screenSize.width;
    const worldX = Math.round(clickX / scale);
    const worldY = Math.round(clickY / scale);

    if (isCustomPathEditing) {
      const currentWaypoints = spec.customPathWaypoints || [];
      setCustomPathWaypoints([...currentWaypoints, { x: worldX, y: worldY }]);
    } else if (onSetTargetPos) {
      onSetTargetPos(worldX, worldY);
    }
  };

  return (
    <div
      ref={containerRef}
      id="virtual-scene-panel"
      className="bg-[#111113] border border-[#1F1F23]/40 rounded-lg p-3 flex flex-col h-full select-none"
    >
      {/* Calm Header */}
      <div className="h-8 flex items-center justify-between pb-2 mb-2 border-b border-[#1F1F23]/30">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium tracking-tight text-[#EDEDED]">
            Virtual Universe Scene
          </span>
          <span className="text-[10px] font-mono text-[#8A8A93] px-1.5 py-0.5 rounded bg-[#17171A] border border-[#1F1F23]/60">
            {spec.screenSize.width}×{spec.screenSize.height} px
          </span>
        </div>

        <span className="text-[11px] font-mono text-[#5C5C66]">
          Click to reposition beacon
        </span>
      </div>

      {isCustomPathEditing && (
        <div className="mb-2 p-1.5 bg-[#17171A] border border-[#1F1F23] rounded text-xs text-[#EDEDED] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#8A8A93]">
            <MousePointer className="w-3.5 h-3.5 text-[#5B8DEF]" />
            <span>Waypoint Placement Active: Click scene to append route nodes.</span>
          </div>
          <button
            onClick={() => setIsCustomPathEditing(false)}
            className="px-2 py-0.5 rounded bg-[#5B8DEF] text-white text-[11px] font-medium"
          >
            Done
          </button>
        </div>
      )}

      {/* Canvas View */}
      <div className="relative flex-1 w-full bg-[#0A0A0B] rounded border border-[#1F1F23]/30 overflow-hidden flex items-center justify-center min-h-[300px]">
        <canvas
          ref={canvasRef}
          width={500}
          height={500}
          onClick={handleCanvasClick}
          className={`w-full h-full object-contain ${
            isCustomPathEditing ? 'cursor-pointer' : 'cursor-crosshair'
          }`}
          title={isCustomPathEditing ? 'Click to place waypoint' : 'Click to relocate primary beacon'}
        />
      </div>

      {/* Reduced-chrome 32px telemetry strip below scene */}
      <div className="h-8 flex items-center justify-between text-[11px] font-mono text-[#8A8A93] pt-2 border-t border-[#1F1F23]/30 mt-2">
        <div>
          <span>TGT: </span>
          <span className="text-[#EDEDED] tabular-nums">
            {Math.round(targetWorldPos.x)}, {Math.round(targetWorldPos.y)}
          </span>
        </div>
        <div>
          <span>CAM: </span>
          <span className="text-[#5B8DEF] tabular-nums">
            {Math.round(cameraWorldPos.x)}, {Math.round(cameraWorldPos.y)}
          </span>
        </div>
        <div>
          <span className="text-[#5C5C66]">TARGETS: </span>
          <span className="text-[#EDEDED] tabular-nums">{spec.targetCount}</span>
        </div>
      </div>
    </div>
  );
};