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

export const SceneCanvas: React.FC<SceneCanvasProps> = ({
  targetWorldPos,
  cameraWorldPos,
  targetTrail = [],
  camTrail = [],
  onSetTargetPos,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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

    // Draw primary beacon history trail
    if (targetTrail.length > 1) {
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

    // Render Targets
    const targetsToRender = (spec.targets && spec.targets.length > 0)
      ? spec.targets.slice(0, spec.targetCount)
      : [{
          id: 1,
          shape: spec.targetShape,
          size: spec.targetSize,
          initialLocation: spec.initialTargetLocation,
          motion: spec.targetMotion,
          speed: spec.targetSpeed,
        }];

    targetsToRender.forEach((tgt) => {
      let wx: number, wy: number;
      if (tgt.id === metrics.primaryTargetId) {
        wx = targetWorldPos.x * scale;
        wy = targetWorldPos.y * scale;

        // Primary Beacon: White/Accent
        ctx.fillStyle = '#EDEDED';
        ctx.beginPath();
        ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#5B8DEF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(wx, wy, 7, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        const sec = metrics.secondaryTargets?.find((s) => s.id === tgt.id);
        if (!sec) return;
        wx = sec.worldPos.x * scale;
        wy = sec.worldPos.y * scale;

        // Secondary Beacons: Subtle grey
        ctx.fillStyle = '#8A8A93';
        ctx.beginPath();
        ctx.arc(wx, wy, 2.5, 0, Math.PI * 2);
        ctx.fill();
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
