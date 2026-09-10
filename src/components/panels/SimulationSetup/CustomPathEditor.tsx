import React from 'react';
import { useAppStore } from '../../../lib/store';
import { MousePointer, Trash2, Plus, CornerDownRight, Sparkles } from 'lucide-react';
import { Tooltip } from '../../ui/Tooltip';

export const CustomPathEditor: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);
  const setCustomPathWaypoints = useAppStore((state) => state.setCustomPathWaypoints);
  const isEditing = useAppStore((state) => state.isCustomPathEditing);
  const setIsEditing = useAppStore((state) => state.setIsCustomPathEditing);

  const waypoints = spec.customPathWaypoints || [];

  const handleRemovePoint = (index: number) => {
    const updated = waypoints.filter((_, i) => i !== index);
    setCustomPathWaypoints(updated);
  };

  const applyPresetPath = (preset: 'orbit' | 'box' | 'zigzag' | 'star') => {
    const cx = spec.screenSize.width / 2;
    const cy = spec.screenSize.height / 2;

    if (preset === 'orbit') {
      const r = 500;
      const pts = [];
      for (let i = 0; i < 8; i++) {
        const theta = (i / 8) * Math.PI * 2;
        pts.push({
          x: Math.round(cx + Math.cos(theta) * r),
          y: Math.round(cy + Math.sin(theta) * r),
        });
      }
      setCustomPathWaypoints(pts);
    } else if (preset === 'box') {
      const half = 450;
      setCustomPathWaypoints([
        { x: cx - half, y: cy - half },
        { x: cx + half, y: cy - half },
        { x: cx + half, y: cy + half },
        { x: cx - half, y: cy + half },
      ]);
    } else if (preset === 'zigzag') {
      setCustomPathWaypoints([
        { x: 300, y: 400 },
        { x: 700, y: 1600 },
        { x: 1100, y: 400 },
        { x: 1500, y: 1600 },
        { x: 1700, y: 400 },
      ]);
    } else if (preset === 'star') {
      const pts = [];
      const outerR = 550;
      const innerR = 250;
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const theta = (i / 10) * Math.PI * 2 - Math.PI / 2;
        pts.push({
          x: Math.round(cx + Math.cos(theta) * r),
          y: Math.round(cy + Math.sin(theta) * r),
        });
      }
      setCustomPathWaypoints(pts);
    }
    updateSpec({ targetMotion: 'User-defined' });
  };

  const clearWaypoints = () => {
    setCustomPathWaypoints([]);
  };

  return (
    <div className="bg-[#111113] border border-[#1F1F23] rounded-lg p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[#EDEDED] font-medium">
          <CornerDownRight className="w-3.5 h-3.5 text-[#5B8DEF]" />
          <span>User-Defined Waypoint Path</span>
          <Tooltip content="Custom trajectory created by placing sequential waypoints across the 2000x2000 universe. Target smoothly interpolates with cubic easing." />
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
            isEditing
              ? 'bg-[#5B8DEF] text-white shadow-sm'
              : 'bg-[#16161A] text-[#8A8A93] hover:text-[#EDEDED] border border-[#1F1F23]'
          }`}
        >
          <MousePointer className="w-3 h-3" />
          <span>{isEditing ? 'Click Canvas to Add' : 'Edit on Canvas'}</span>
        </button>
      </div>

      {isEditing && (
        <div className="p-2 bg-[#5B8DEF]/10 border border-[#5B8DEF]/25 rounded text-[11px] text-[#5B8DEF] flex items-center justify-between">
          <span>Click anywhere inside the 2000×2000 Scene Canvas to append path waypoints.</span>
          <button
            onClick={() => setIsEditing(false)}
            className="text-[#EDEDED] hover:underline font-mono text-[10px] ml-2"
          >
            Done
          </button>
        </div>
      )}

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-[#8A8A93] text-[10px]">Presets:</span>
        <button
          type="button"
          onClick={() => applyPresetPath('orbit')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]"
        >
          Circular Orbit
        </button>
        <button
          type="button"
          onClick={() => applyPresetPath('box')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]"
        >
          Box Patrol
        </button>
        <button
          type="button"
          onClick={() => applyPresetPath('zigzag')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]"
        >
          Zig-Zag
        </button>
        <button
          type="button"
          onClick={() => applyPresetPath('star')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]"
        >
          Star Maneuver
        </button>
        {waypoints.length > 0 && (
          <button
            type="button"
            onClick={clearWaypoints}
            className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#F85149] border border-[#1F1F23] ml-auto"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Waypoints List */}
      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
        {waypoints.length === 0 ? (
          <div className="p-3 text-center text-xs text-[#6B6B75] bg-[#0E0E10] border border-[#1F1F23] rounded">
            No waypoints defined. Click "Edit on Canvas" or select a preset above.
          </div>
        ) : (
          waypoints.map((pt, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-2.5 py-1 bg-[#0E0E10] border border-[#1F1F23]/60 rounded text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#1F1F23] text-[10px] font-mono flex items-center justify-center text-[#5B8DEF]">
                  {idx + 1}
                </span>
                <span className="font-mono text-[#EDEDED] text-[11px]">
                  ({Math.round(pt.x)}, {Math.round(pt.y)})
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemovePoint(idx)}
                className="text-[#8A8A93] hover:text-[#F85149] p-0.5 rounded"
                aria-label={`Remove point ${idx + 1}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
