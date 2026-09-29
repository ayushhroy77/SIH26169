import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../../lib/store';
import { TargetConfig } from '../../../lib/spec';
import {
  ChevronDown,
  Crosshair,
  Trash2,
  Pause,
  Play,
  RotateCw,
  Move,
  Layers,
  Eye,
  Camera,
  Maximize2,
} from 'lucide-react';

export interface OverlayProps {
  onResetCameraView?: () => void;
  showFov?: boolean;
  setShowFov?: (show: boolean) => void;
  showLabels?: boolean;
  setShowLabels?: (show: boolean) => void;
}

export const Overlay: React.FC<OverlayProps> = ({
  onResetCameraView,
  showFov = true,
  setShowFov,
  showLabels = true,
  setShowLabels,
}) => {
  const rawMetrics = useAppStore((state) => state.metrics);
  const spec = useAppStore((state) => state.spec);

  // Safe defaults — the overlay renders even before the first 
  // WebSocket frame arrives, preventing undefined-property crashes.
  const metrics = {
    trackingErrorPx: 0,
    fps: 30,
    lockState: 'SEARCH' as const,
    isLocked: false,
    targetInFov: false,
    targetWorldPos: { x: 1000, y: 1000 },
    panSpeedDegSec: 0,
    tiltSpeedDegSec: 0,
    ...(rawMetrics ?? {}),
  };
  const updateSpec = useAppStore((state) => state.updateSpec);
  const isRunning = useAppStore((state) => state.isRunning);
  const setIsRunning = useAppStore((state) => state.setIsRunning);
  const triggerReset = useAppStore((state) => state.triggerReset);

  const [viewAngle, setViewAngle] = useState<'Default' | 'Host' | 'Target'>('Default');
  const [showViewDropdown, setShowViewDropdown] = useState(false);

  // Local velocity estimation
  const lastPosRef = useRef<{ x: number; y: number; time: number }>({
    x: metrics.targetWorldPos?.x ?? 1000,
    y: metrics.targetWorldPos?.y ?? 1000,
    time: performance.now(),
  });
  const [velocity, setVelocity] = useState<{ vx: number; vy: number; vz: number }>({
    vx: 0,
    vy: 0,
    vz: 0,
  });

  useEffect(() => {
    const now = performance.now();
    const dt = (now - lastPosRef.current.time) / 1000;
    if (dt >= 0.08 && metrics.targetWorldPos) {
      const dx = metrics.targetWorldPos.x - lastPosRef.current.x;
      const dy = metrics.targetWorldPos.y - lastPosRef.current.y;
      setVelocity({
        vx: Math.round((dx / dt) * 10) / 10,
        vy: Math.round((dy / dt) * 10) / 10,
        vz: 0,
      });
      lastPosRef.current = {
        x: metrics.targetWorldPos.x,
        y: metrics.targetWorldPos.y,
        time: now,
      };
    }
  }, [metrics.targetWorldPos]);

  // Determine lock state label & color
  const lockState =
    metrics.lockState ||
    (metrics.isLocked
      ? 'TRACK'
      : metrics.targetInFov
      ? 'ACQUIRE'
      : 'REACQUIRE');

  const getLockBadge = () => {
    switch (lockState) {
      case 'TRACK':
        return {
          text: 'TRACKING',
          dot: 'bg-[#3FB950]',
          border: 'border-[#3FB950]/40',
          textCol: 'text-[#3FB950]',
        };
      case 'ACQUIRE':
        return {
          text: 'ACQUIRING',
          dot: 'bg-[#5B8DEF]',
          border: 'border-[#5B8DEF]/40',
          textCol: 'text-[#5B8DEF]',
        };
      case 'REACQUIRE':
      case 'SEARCH':
      default:
        return {
          text: 'REACQUIRING',
          dot: 'bg-[#D29922]',
          border: 'border-[#D29922]/40',
          textCol: 'text-[#D29922]',
        };
    }
  };

  const badge = getLockBadge();
  const currentMotion = spec.targets?.[0]?.motion ?? spec.targetMotion;
  const currentSpeed = spec.targets?.[0]?.speed ?? spec.targetSpeed;

  const handleMotionChange = (motion: TargetConfig['motion']) => {
    const speed = motion === 'User-defined' ? 0 : Math.max(60, spec.targetSpeed);

    updateSpec({
      targetMotion: motion,
      targetSpeed: speed,
      targets: spec.targets.map((t, i) =>
        i === 0 ? { ...t, motion, speed } : t
      ),
    });

    // Force the simulation to restart with the new motion
    // (many patterns depend on initial state)
    setTimeout(() => triggerReset(), 30);
  };

  return (
    <div className="absolute inset-0 pointer-events-none p-3 flex flex-col justify-between select-none z-10">
      {/* ── Top Bar HUD ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between w-full">
        {/* Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0e121a]/85 border border-[#1f2937] backdrop-blur-md shadow-lg shadow-black/50">
          <span className={`w-2 h-2 rounded-full ${badge.dot} animate-pulse`} />
          <span className={`text-[11px] font-mono font-medium tracking-wide ${badge.textCol}`}>
            {badge.text}
          </span>
          <span className="text-[#4b5563] text-xs font-mono">|</span>
          <span className="text-[11px] font-mono text-[#9ca3af]">
            ERR: <strong className="text-[#ededed]">{metrics.trackingErrorPx.toFixed(1)} px</strong>
          </span>
          <span className="text-[#4b5563] text-xs font-mono">|</span>
          <span className="text-[11px] font-mono text-[#9ca3af]">
            FPS: <strong className="text-[#ededed]">{metrics.fps.toFixed(0)}</strong>
          </span>
        </div>

        {/* View Selection Dropdown */}
        <div className="relative pointer-events-auto">
          <button
            type="button"
            onClick={() => setShowViewDropdown(!showViewDropdown)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0e121a]/85 border border-[#1f2937] hover:border-[#06b6d4]/50 text-xs font-mono text-[#d1d5db] transition-colors shadow-lg backdrop-blur-md"
          >
            <Camera className="w-3.5 h-3.5 text-[#06b6d4]" />
            <span>View: {viewAngle}</span>
            <ChevronDown className="w-3 h-3 text-[#9ca3af]" />
          </button>

          {showViewDropdown && (
            <div className="absolute right-0 mt-1 w-36 rounded-md bg-[#0e121a] border border-[#1f2937] py-1 shadow-2xl z-30 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setViewAngle('Default');
                  setShowViewDropdown(false);
                  onResetCameraView?.();
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-[#1a2332] transition-colors ${
                  viewAngle === 'Default' ? 'text-[#06b6d4] font-medium' : 'text-[#d1d5db]'
                }`}
              >
                Orbit (Default)
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewAngle('Host');
                  setShowViewDropdown(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-[#1a2332] transition-colors ${
                  viewAngle === 'Host' ? 'text-[#06b6d4] font-medium' : 'text-[#d1d5db]'
                }`}
              >
                Host Platform
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewAngle('Target');
                  setShowViewDropdown(false);
                }}
                className={`w-full text-left px-3 py-1.5 hover:bg-[#1a2332] transition-colors ${
                  viewAngle === 'Target' ? 'text-[#06b6d4] font-medium' : 'text-[#d1d5db]'
                }`}
              >
                Target Beacon
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Right-Side Mission-Control Telemetry Card ────────────── */}
      <div className="self-end pointer-events-auto w-52 mt-14 mb-10 rounded-lg bg-[#0e121a]/90 border border-[#1f2937] p-2.5 text-xs shadow-2xl backdrop-blur-md flex flex-col gap-2 max-h-[58vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1f2937] pb-2">
          <div>
            <div className="text-[12px] font-bold tracking-wider text-white font-mono">
              TARGET-01
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              <span className={`text-[10px] font-mono font-medium ${badge.textCol}`}>
                {badge.text}
              </span>
            </div>
          </div>
          <div className="px-1.5 py-0.5 rounded bg-[#16202e] border border-[#06b6d4]/40 text-[9px] font-mono text-[#06b6d4]">
            2.5D SPACE
          </div>
        </div>

        {/* Target Entity Identification */}
        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-[#090d13]/60 p-1.5 rounded border border-[#1f2937]/50">
          <span className="text-[#6b7280]">TYPE:</span>
          <span className="text-[#ededed] text-right font-medium">OPTICAL TARGET</span>
          <span className="text-[#6b7280]">HOST:</span>
          <span className="text-[#ededed] text-right">SAT-01 (LEO)</span>
          <span className="text-[#6b7280]">BEACON:</span>
          <span className="text-[#06b6d4] text-right font-medium">BEACON-01</span>
        </div>

        {/* Position (World) */}
        <div>
          <span className="text-[10px] font-mono text-[#9ca3af] uppercase tracking-wider block mb-1">
            Position (World)
          </span>
          <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center">
            <div className="bg-[#090d13] border border-[#1f2937] rounded p-1">
              <span className="text-[9px] text-[#6b7280] block">X</span>
              <span className="text-[#ededed] font-semibold tabular-nums">
                {metrics.targetWorldPos?.x?.toFixed(1) ?? '1000.0'}
              </span>
            </div>
            <div className="bg-[#090d13] border border-[#1f2937] rounded p-1">
              <span className="text-[9px] text-[#6b7280] block">Y</span>
              <span className="text-[#ededed] font-semibold tabular-nums">
                {metrics.targetWorldPos?.y?.toFixed(1) ?? '1000.0'}
              </span>
            </div>
            <div className="bg-[#090d13] border border-[#1f2937] rounded p-1">
              <span className="text-[9px] text-[#6b7280] block">Z</span>
              <span className="text-[#06b6d4] font-semibold tabular-nums">0.0</span>
            </div>
          </div>
        </div>

        {/* Velocity */}
        <div>
          <span className="text-[10px] font-mono text-[#9ca3af] uppercase tracking-wider block mb-1">
            Estimated Velocity
          </span>
          <div className="grid grid-cols-3 gap-1 text-[11px] font-mono text-center">
            <div className="bg-[#090d13] border border-[#1f2937] rounded p-1">
              <span className="text-[9px] text-[#6b7280] block">Vx</span>
              <span className="text-[#ededed] tabular-nums">{velocity.vx.toFixed(1)}</span>
            </div>
            <div className="bg-[#090d13] border border-[#1f2937] rounded p-1">
              <span className="text-[9px] text-[#6b7280] block">Vy</span>
              <span className="text-[#ededed] tabular-nums">{velocity.vy.toFixed(1)}</span>
            </div>
            <div className="bg-[#090d13] border border-[#1f2937] rounded p-1">
              <span className="text-[9px] text-[#6b7280] block">Vz</span>
              <span className="text-[#ededed] tabular-nums">0.0</span>
            </div>
          </div>
        </div>

        {/* Motion Patterns Selection */}
        <div>
          <span className="text-[10px] font-mono text-[#9ca3af] uppercase tracking-wider block mb-1">
            Motion Pattern
          </span>
          <div className="grid grid-cols-3 gap-1">
            {[
              {
                id: 'Static',
                label: 'STATIC',
                action: () =>
                  updateSpec({
                    targetSpeed: 0,
                    targets: spec.targets.map((t, i) =>
                      i === 0 ? { ...t, speed: 0 } : t
                    ),
                  }),
              },
              { id: 'Circular', label: 'CIRCULAR', action: () => handleMotionChange('Circular') },
              { id: 'Figure-of-8', label: 'FIG-8', action: () => handleMotionChange('Figure-of-8') },
              { id: 'Straight Line', label: 'STRAIGHT', action: () => handleMotionChange('Straight Line') },
              { id: 'Sinusoidal', label: 'SIN', action: () => handleMotionChange('Sinusoidal') },
              { id: 'Random', label: 'RANDOM', action: () => handleMotionChange('Random') },
            ].map((btn) => {
              const active =
                (btn.id === 'Static' && currentSpeed === 0) ||
                (btn.id !== 'Static' && currentMotion === btn.id && currentSpeed > 0);
              return (
                <button
                  key={btn.id}
                  type="button"
                  onClick={btn.action}
                  className={`py-1 px-1 rounded text-[9px] font-mono transition-colors border ${
                    active
                      ? 'bg-[#06b6d4]/20 border-[#06b6d4] text-[#06b6d4] font-semibold'
                      : 'bg-[#121824] hover:bg-[#1a2332] border-[#1f2937] text-[#9ca3af] hover:text-[#ededed]'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-1 pt-1 border-t border-[#1f2937]">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className={`flex items-center justify-center gap-1 py-1 px-2 rounded text-[10px] font-mono font-medium transition-colors border ${
              isRunning
                ? 'bg-[#121824] border-[#1f2937] text-[#ededed] hover:bg-[#1f2937]'
                : 'bg-[#06b6d4] border-[#06b6d4] text-[#09131e] hover:bg-[#22d3ee] font-bold'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3 h-3 text-[#d29922]" />
                <span>STOP TRACK</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3" />
                <span>TRACK TARGET</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={triggerReset}
            className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-[#121824] hover:bg-[#1f2937] border border-[#1f2937] text-[10px] font-mono text-[#d1d5db] transition-colors"
          >
            <RotateCw className="w-3 h-3 text-[#06b6d4]" />
            <span>FOCUS TARGET</span>
          </button>

          <button
            type="button"
            onClick={() => {
              // Shift beacon to center coordinates
              updateSpec({
                initialTargetLocation: 'Center',
              });
            }}
            className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-[#121824] hover:bg-[#1f2937] border border-[#1f2937] text-[10px] font-mono text-[#9ca3af] hover:text-white transition-colors"
          >
            <Move className="w-3 h-3 text-[#14b8a6]" />
            <span>MOVE CENTER</span>
          </button>

          <button
            type="button"
            onClick={() => {
              // Randomize beacon location
              updateSpec({
                initialTargetLocation: 'Random',
              });
              triggerReset();
            }}
            className="flex items-center justify-center gap-1 py-1 px-2 rounded bg-[#121824] hover:bg-[#1f2937] border border-[#1f2937] text-[10px] font-mono text-[#9ca3af] hover:text-white transition-colors"
          >
            <Crosshair className="w-3 h-3 text-[#d29922]" />
            <span>3D SHIFT</span>
          </button>
        </div>
      </div>

      {/* ── Bottom Controls & Visibility Toggles ────────────────── */}
      <div className="flex items-center justify-between w-full">
        <div className="text-[10px] font-mono text-[#6b7280]">
          Drag to Orbit &bull; Right-Click to Pan &bull; Scroll to Zoom
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#0e121a]/85 border border-[#1f2937] rounded-md p-1 shadow-lg backdrop-blur-md">
          <button
            type="button"
            onClick={() => setShowFov?.(!showFov)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              showFov
                ? 'bg-[#06b6d4]/20 text-[#06b6d4] font-medium border border-[#06b6d4]/40'
                : 'text-[#6b7280] hover:text-[#ededed]'
            }`}
          >
            FOV
          </button>

          <button
            type="button"
            onClick={() => setShowLabels?.(!showLabels)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              showLabels
                ? 'bg-[#06b6d4]/20 text-[#06b6d4] font-medium border border-[#06b6d4]/40'
                : 'text-[#6b7280] hover:text-[#ededed]'
            }`}
          >
            Labels
          </button>

          {onResetCameraView && (
            <button
              type="button"
              onClick={onResetCameraView}
              className="p-1 rounded text-[#9ca3af] hover:text-[#ededed] hover:bg-[#1f2937]"
              title="Reset Orbit Camera"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
