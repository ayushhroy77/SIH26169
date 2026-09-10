import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../../lib/store';
import { Grid, Trash2, Check, RotateCcw, Sparkles } from 'lucide-react';

interface ShapeMaskEditorProps {
  targetId?: number;
  onClose?: () => void;
}

export const ShapeMaskEditor: React.FC<ShapeMaskEditorProps> = ({ targetId = 1, onClose }) => {
  const spec = useAppStore((state) => state.spec);
  const updateSpec = useAppStore((state) => state.updateSpec);
  const updateTargetConfig = useAppStore((state) => state.updateTargetConfig);

  const GRID_SIZE = 32;

  // Initialize 32x32 grid
  const initialGrid = (): number[][] => {
    if (spec.customMask32x32 && spec.customMask32x32.length === GRID_SIZE) {
      return spec.customMask32x32.map((row) => [...row]);
    }
    const grid: number[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: number[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        // Default diamond pattern in center
        const dist = Math.abs(r - 15.5) + Math.abs(c - 15.5);
        row.push(dist <= 7 ? 1 : 0);
      }
      grid.push(row);
    }
    return grid;
  };

  const [grid, setGrid] = useState<number[][]>(initialGrid);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [drawMode, setDrawMode] = useState<number>(1); // 1 = paint, 0 = erase
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render miniature live preview
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0E0E10';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellW = canvas.width / GRID_SIZE;
    const cellH = canvas.height / GRID_SIZE;

    ctx.fillStyle = '#EDEDED';
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (grid[r][c] === 1) {
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }
  }, [grid]);

  const toggleCell = (r: number, c: number, forceVal?: number) => {
    setGrid((prev) => {
      const next = prev.map((row) => [...row]);
      next[r][c] = forceVal !== undefined ? forceVal : next[r][c] === 1 ? 0 : 1;
      return next;
    });
  };

  const handleMouseDown = (r: number, c: number) => {
    const newVal = grid[r][c] === 1 ? 0 : 1;
    setDrawMode(newVal);
    setIsDrawing(true);
    toggleCell(r, c, newVal);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isDrawing) return;
    toggleCell(r, c, drawMode);
  };

  const applyPreset = (type: 'diamond' | 'cross' | 'ring' | 'star' | 'clear') => {
    const next: number[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: number[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const cr = r - 15.5;
        const cc = c - 15.5;
        const dist = Math.hypot(cr, cc);

        if (type === 'diamond') {
          row.push(Math.abs(cr) + Math.abs(cc) <= 8 ? 1 : 0);
        } else if (type === 'cross') {
          const inCross =
            (Math.abs(cr) <= 10 && Math.abs(cc) <= 2) ||
            (Math.abs(cc) <= 10 && Math.abs(cr) <= 2);
          row.push(inCross ? 1 : 0);
        } else if (type === 'ring') {
          row.push(dist >= 4 && dist <= 9 ? 1 : 0);
        } else if (type === 'star') {
          const angle = Math.atan2(cr, cc);
          const rLimit = 8 + 4 * Math.cos(4 * angle);
          row.push(dist <= rLimit ? 1 : 0);
        } else {
          row.push(0);
        }
      }
      next.push(row);
    }
    setGrid(next);
  };

  const saveMask = () => {
    updateSpec({
      customMask32x32: grid,
      targetShape: 'Custom',
    });
    updateTargetConfig(targetId, {
      shape: 'Custom',
      customMask: grid,
    });
    if (onClose) onClose();
  };

  return (
    <div className="bg-[#111113] border border-[#1F1F23] rounded-lg p-4 space-y-3.5">
      <div className="flex items-center justify-between border-b border-[#1F1F23] pb-2.5">
        <div className="flex items-center gap-2">
          <Grid className="w-4 h-4 text-[#5B8DEF]" />
          <div>
            <div className="text-xs font-medium text-[#EDEDED]">
              32×32 Custom Beacon Mask Editor
            </div>
            <div className="text-[10px] text-[#8A8A93]">
              Spec Item 9 · Binary Optical Aperture Mask
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="flex items-center gap-2">
          <div className="text-[10px] text-[#8A8A93]">Spot Preview:</div>
          <canvas
            ref={previewCanvasRef}
            width={32}
            height={32}
            className="w-8 h-8 rounded border border-[#1F1F23] bg-[#0E0E10]"
          />
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-[#8A8A93] mr-1">Presets:</span>
        <button
          type="button"
          onClick={() => applyPreset('diamond')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]"
        >
          Diamond
        </button>
        <button
          type="button"
          onClick={() => applyPreset('cross')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]"
        >
          Crosshair
        </button>
        <button
          type="button"
          onClick={() => applyPreset('ring')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]"
        >
          Annular Ring
        </button>
        <button
          type="button"
          onClick={() => applyPreset('star')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#EDEDED] border border-[#1F1F23]"
        >
          Star
        </button>
        <button
          type="button"
          onClick={() => applyPreset('clear')}
          className="px-2 py-0.5 rounded bg-[#161619] hover:bg-[#1F1F23] text-[#F85149] border border-[#1F1F23]"
        >
          Clear
        </button>
      </div>

      {/* 32x32 Grid */}
      <div
        className="w-full flex justify-center py-2 select-none"
        onMouseUp={() => setIsDrawing(false)}
        onMouseLeave={() => setIsDrawing(false)}
      >
        <div
          className="grid gap-[1px] bg-[#1F1F23] p-1 rounded border border-[#2A2A30]"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
            width: '264px',
            height: '264px',
          }}
        >
          {grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                onMouseDown={() => handleMouseDown(r, c)}
                onMouseEnter={() => handleMouseEnter(r, c)}
                className={`w-full h-full cursor-pointer transition-colors ${
                  cell === 1 ? 'bg-[#EDEDED]' : 'bg-[#0E0E10] hover:bg-[#1A1A20]'
                }`}
              />
            ))
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-[#1F1F23]">
        <div className="text-[10px] text-[#6B6B75]">
          Click and drag across cells to paint or erase optical profile.
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-[#8A8A93] hover:text-[#EDEDED] transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={saveMask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[#5B8DEF] hover:bg-[#4A7CE0] text-white font-medium transition-colors shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Mask</span>
          </button>
        </div>
      </div>
    </div>
  );
};
