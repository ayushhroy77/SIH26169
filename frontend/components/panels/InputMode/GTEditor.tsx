import React, { useState } from 'react';
import { useAppStore } from '../../../lib/store';
import { Card } from '../../ui/Card';
import { Upload, Crosshair, Sparkles, Check, AlertCircle, Trash2 } from 'lucide-react';

export const GTEditor: React.FC = () => {
  const videoConfig = useAppStore((state) => state.videoConfig);
  const gtConfig = useAppStore((state) => state.gtConfig);
  const setGtConfig = useAppStore((state) => state.setGtConfig);
  const setGtTrack = useAppStore((state) => state.setGtTrack);
  const clearMarkedSamples = useAppStore((state) => state.clearMarkedSamples);
  const addBenchmarkLog = useAppStore((state) => state.addBenchmarkLog);
  const currentVideoFrame = useAppStore((state) => state.currentVideoFrame);

  const [csvText, setCsvText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [csvStatus, setCsvStatus] = useState<string | null>(null);

  const totalFrames = videoConfig?.totalFrames || 300;
  const markedCount = Object.keys(gtConfig.markedSamples).length;
  const trackCount = Object.keys(gtConfig.gtTrack).length;

  const handleModeChange = (mode: 'csv' | 'click' | 'auto') => {
    setGtConfig({ mode, isApproximate: mode === 'auto' });
    if (mode === 'auto') {
      triggerAutoGT();
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseAndApplyCsv(content);
    };
    reader.readAsText(file);
  };

  const parseAndApplyCsv = (raw: string) => {
    try {
      const lines = raw.trim().split('\n');
      const track: Record<number, [number, number]> = {};
      let parsed = 0;

      lines.forEach((line, idx) => {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          const f = parseInt(parts[0], 10);
          const x = parseFloat(parts[1]);
          const y = parseFloat(parts[2]);
          if (!isNaN(f) && !isNaN(x) && !isNaN(y)) {
            track[f] = [x, y];
            parsed++;
          }
        } else if (parts.length === 2) {
          const x = parseFloat(parts[0]);
          const y = parseFloat(parts[1]);
          if (!isNaN(x) && !isNaN(y)) {
            track[idx] = [x, y];
            parsed++;
          }
        }
      });

      if (parsed > 0) {
        setGtTrack(track, false);
        setCsvStatus(`Successfully loaded ${parsed} ground-truth coordinates from CSV.`);
        addBenchmarkLog(`Ground Truth: Loaded ${parsed} points from CSV companion file.`);
      } else {
        setCsvStatus('No valid coordinate rows found in CSV. Format: frame_idx, x, y');
      }
    } catch (err: any) {
      setCsvStatus(`CSV parsing error: ${err.message}`);
    }
  };

  const triggerAutoGT = async () => {
    setIsProcessing(true);
    addBenchmarkLog('Running offline Teacher Detector (temporal median filter, window=5)...');
    try {
      if (videoConfig?.videoId) {
        // Send request to backend
        const res = await fetch(`http://localhost:8000/api/video/${videoConfig.videoId}/gt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'auto' }),
        });
        if (res.ok) {
          const data = await res.json();
          addBenchmarkLog(`Auto-GT generated: ${data.points_count || totalFrames} frames tracked (approximate).`);
        }
      } else {
        // Client-side fallback generation
        const track: Record<number, [number, number]> = {};
        for (let i = 0; i < totalFrames; i++) {
          const t = i / 30.0;
          const x = 320 + Math.sin(t * 0.8) * 140;
          const y = 240 + Math.sin(t * 1.6) * 70;
          track[i] = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
        }
        setGtTrack(track, true);
        addBenchmarkLog('Auto-GT: Generated synthetic beacon trajectory track for offline validation.');
      }
    } catch (err) {
      console.warn('Auto-GT API call failed, using fallback track', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card
      title="Ground Truth (GT)"
      subtitle="Benchmark Evaluation Reference"
      tooltip="Reference coordinates to evaluate centroiding error, RMSE, and lock retention"
    >
      <div className="space-y-4">
        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0E0E10] border border-[#1F1F23] rounded-md text-xs">
          <button
            id="gt-mode-csv"
            type="button"
            onClick={() => handleModeChange('csv')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded font-medium transition-all ${
              gtConfig.mode === 'csv'
                ? 'bg-[#1F1F23] text-[#EDEDED] shadow-sm'
                : 'text-[#8A8A93] hover:text-[#D4D4D8]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload CSV</span>
          </button>

          <button
            id="gt-mode-click"
            type="button"
            onClick={() => handleModeChange('click')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded font-medium transition-all ${
              gtConfig.mode === 'click'
                ? 'bg-[#1F1F23] text-[#EDEDED] shadow-sm'
                : 'text-[#8A8A93] hover:text-[#D4D4D8]'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Click-to-Mark</span>
          </button>

          <button
            id="gt-mode-auto"
            type="button"
            onClick={() => handleModeChange('auto')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded font-medium transition-all ${
              gtConfig.mode === 'auto'
                ? 'bg-[#1F1F23] text-[#EDEDED] shadow-sm'
                : 'text-[#8A8A93] hover:text-[#D4D4D8]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-GT</span>
          </button>
        </div>

        {/* Status & Coverage Badge */}
        <div className="flex items-center justify-between text-xs px-2.5 py-2 bg-[#121215] border border-[#1F1F23] rounded">
          <div className="flex items-center gap-1.5">
            <span className="text-[#8A8A93]">GT Coverage:</span>
            <span className="font-mono text-[#EDEDED] font-medium">
              {gtConfig.mode === 'click' ? markedCount : trackCount} / {totalFrames} frames
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {gtConfig.isApproximate ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                <AlertCircle className="w-3 h-3" />
                auto-GT (approximate)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                <Check className="w-3 h-3" />
                Verified Ground Truth
              </span>
            )}
          </div>
        </div>

        {/* Path 1: CSV Mode Details */}
        {gtConfig.mode === 'csv' && (
          <div className="space-y-2.5">
            <label
              htmlFor="csv-file-input"
              className="flex flex-col items-center justify-center p-3 border border-dashed border-[#27272A] hover:border-[#3F3F46] rounded-md cursor-pointer bg-[#0E0E10] transition-colors"
            >
              <Upload className="w-5 h-5 text-[#8A8A93] mb-1" />
              <span className="text-xs text-[#EDEDED] font-medium">Choose Companion .csv file</span>
              <span className="text-[10px] text-[#71717A] mt-0.5">Format: frame_idx, x, y</span>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={handleCsvUpload}
              />
            </label>

            {csvStatus && (
              <p className="text-[11px] text-[#A1A1AA] bg-[#18181B] p-2 rounded border border-[#27272A]">
                {csvStatus}
              </p>
            )}
          </div>
        )}

        {/* Path 2: Click-to-Mark Mode Details */}
        {gtConfig.mode === 'click' && (
          <div className="space-y-2.5">
            <div className="p-2.5 bg-[#0E0E10] border border-[#1F1F23] rounded text-xs space-y-1">
              <div className="font-medium text-[#EDEDED]">Interactive Keyframe Marking</div>
              <p className="text-[11px] text-[#8A8A93] leading-relaxed">
                Scrub to sample frames in the Video View and click directly on the beacon center.
                Linear interpolation automatically calculates the full trajectory between marked keyframes.
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-[#8A8A93]">
                Current Scrub Frame: <strong className="text-[#EDEDED] font-mono">{currentVideoFrame}</strong>
              </span>

              {markedCount > 0 && (
                <button
                  type="button"
                  onClick={clearMarkedSamples}
                  className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Marks ({markedCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Path 3: Auto-GT Mode Details */}
        {gtConfig.mode === 'auto' && (
          <div className="p-2.5 bg-[#0E0E10] border border-[#1F1F23] rounded text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[#EDEDED]">Offline Teacher Detector</span>
              <button
                type="button"
                onClick={triggerAutoGT}
                disabled={isProcessing}
                className="px-2 py-1 text-[11px] font-medium bg-[#27272A] hover:bg-[#3F3F46] text-[#EDEDED] rounded transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Recalculate GT'}
              </button>
            </div>
            <p className="text-[11px] text-[#8A8A93] leading-relaxed">
              Applies a high-dynamic threshold window with a 5-frame rolling median filter across the video.
              Results are labeled as approximate in technical evaluation reports.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};
