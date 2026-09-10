import React, { useState, useRef } from 'react';
import { useAppStore } from '../../../lib/store';
import { Card } from '../../ui/Card';
import { GTEditor } from './GTEditor';
import { BenchmarkMetricsPanel } from './BenchmarkMetrics';
import {
  Upload,
  FileVideo,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  AlertTriangle,
  Film,
  Sparkles,
  Zap,
} from 'lucide-react';

export const VideoIngestion: React.FC = () => {
  const videoConfig = useAppStore((state) => state.videoConfig);
  const setVideoConfig = useAppStore((state) => state.setVideoConfig);
  const setVideoFile = useAppStore((state) => state.setVideoFile);
  const videoUrl = useAppStore((state) => state.videoUrl);
  const setVideoUrl = useAppStore((state) => state.setVideoUrl);
  const videoPlaybackState = useAppStore((state) => state.videoPlaybackState);
  const setVideoPlaybackState = useAppStore((state) => state.setVideoPlaybackState);
  const currentVideoFrame = useAppStore((state) => state.currentVideoFrame);
  const setCurrentVideoFrame = useAppStore((state) => state.setCurrentVideoFrame);
  const addBenchmarkLog = useAppStore((state) => state.addBenchmarkLog);
  const resetBenchmarkMetrics = useAppStore((state) => state.resetBenchmarkMetrics);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (file: File) => {
    setUploadError(null);

    // 1. Format check
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!['.mp4', '.avi', '.mov'].includes(ext)) {
      setUploadError('Invalid format: File must be .mp4, .avi, or .mov');
      return;
    }

    setVideoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);

    // Probe video attributes client-side via HTML5 video element
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = objectUrl;

    tempVideo.onloadedmetadata = async () => {
      const width = tempVideo.videoWidth || 640;
      const height = tempVideo.videoHeight || 480;
      const duration = tempVideo.duration || 10.0;
      const fps = 30.0; // Standard nominal probe
      const totalFrames = Math.floor(duration * fps);

      // Resolution validation (≥ 640x480)
      if (width < 640 || height < 480) {
        setUploadError(`Resolution ${width}x${height} is below minimum requirement (640x480)`);
        return;
      }

      // Capture first frame thumbnail
      tempVideo.currentTime = 0.05;
      tempVideo.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(tempVideo, 0, 0, 320, 240);
          const thumb = canvas.toDataURL('image/jpeg', 0.8);

          setVideoConfig({
            videoId: file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 16),
            filename: file.name,
            width,
            height,
            fps,
            durationSec: Math.round(duration * 10) / 10,
            totalFrames,
            thumbnail: thumb,
            fpsWarning: fps < 25 || fps > 35 ? `Nominal FPS ${fps} is outside 25-35 Hz` : null,
          });

          addBenchmarkLog(`Loaded video "${file.name}" (${width}x${height}, ${totalFrames} frames, ~30 FPS).`);
        }
      };
    };

    // Attempt multipart upload to backend if server is accessible
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('http://localhost:8000/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setVideoConfig({
          videoId: data.video_id,
          filename: data.filename,
          width: data.width,
          height: data.height,
          fps: data.fps,
          durationSec: data.duration_sec,
          totalFrames: data.total_frames,
          thumbnail: data.thumbnail ? `data:image/jpeg;base64,${data.thumbnail}` : undefined,
          fpsWarning: data.fps_warning,
        });
        addBenchmarkLog(`Backend registered video session ID: ${data.video_id}`);
      }
    } catch (err) {
      console.log('Backend upload skipped, continuing in client-first mode', err);
    } finally {
      setIsUploading(false);
    }
  };

  const loadSyntheticBenchmarkVideo = () => {
    setUploadError(null);
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#08080A';
      ctx.fillRect(0, 0, 640, 480);
      // Beacon representation
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(320, 240, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    const thumb = canvas.toDataURL('image/jpeg', 0.85);

    const cfg = {
      videoId: 'benchmark2_sim',
      filename: 'isro_sih_benchmark2_standard.mp4',
      width: 640,
      height: 480,
      fps: 30.0,
      durationSec: 12.0,
      totalFrames: 360,
      thumbnail: thumb,
      fpsWarning: null,
    };
    setVideoConfig(cfg);
    setVideoPlaybackState('playing');
    addBenchmarkLog('Loaded standard ISRO SIH Benchmark-2 test stream (640x480 @ 30 FPS, moving beacon + noise).');
  };

  const handlePlay = () => {
    setVideoPlaybackState('playing');
    addBenchmarkLog('Playback resumed: Ingesting video frames directly into coarse tracker.');
  };

  const handlePause = () => {
    setVideoPlaybackState('paused');
    addBenchmarkLog('Playback paused.');
  };

  const handleReset = () => {
    setCurrentVideoFrame(0);
    setVideoPlaybackState('playing');
    resetBenchmarkMetrics();
    addBenchmarkLog('Playback reset to frame 0.');
  };

  const handleStep = () => {
    const total = videoConfig?.totalFrames || 360;
    setCurrentVideoFrame(Math.min(total - 1, currentVideoFrame + 1));
    setVideoPlaybackState('paused');
  };

  const totalFrames = videoConfig?.totalFrames || 360;
  const currentTimeS = (currentVideoFrame / 30.0).toFixed(2);

  return (
    <div className="space-y-4">
      {/* 1. Video Source Card */}
      <Card
        title="Video Source"
        subtitle="Benchmark-2 Stream Ingestion"
        tooltip="Bypasses virtual PTZ camera to feed video frames directly to coarse pointing CV tracker"
      >
        <div className="space-y-3.5">
          {!videoConfig ? (
            <div className="space-y-3">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-[#27272A] hover:border-[#3F3F46] bg-[#0E0E10]'
                }`}
              >
                <Upload className="w-8 h-8 text-[#8A8A93] mb-2" />
                <span className="text-xs text-[#EDEDED] font-medium">
                  Drag & drop pre-recorded .mp4, .avi, or .mov
                </span>
                <span className="text-[11px] text-[#71717A] mt-1">
                  Target: 30 FPS, ≥ 640×480 with noise + beacon spot
                </span>
                <button
                  type="button"
                  className="mt-3 px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#EDEDED] text-xs font-medium rounded-md transition-colors"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.avi,.mov"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Instant Load Demo Benchmark Stream Button */}
              <div className="flex items-center justify-between p-3 bg-[#121215] border border-[#1F1F23] rounded-lg">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-xs font-medium text-[#EDEDED]">Standard SIH Benchmark Stream</div>
                    <div className="text-[10px] text-[#8A8A93]">360 frames · 640×480 · 30 FPS · S&P noise</div>
                  </div>
                </div>
                <button
                  id="btn-load-standard-bm2"
                  type="button"
                  onClick={loadSyntheticBenchmarkVideo}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Load Benchmark</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Loaded Video Metadata Header */}
              <div className="flex gap-3 p-3 bg-[#0E0E10] border border-[#1F1F23] rounded-lg">
                {videoConfig.thumbnail && (
                  <img
                    src={videoConfig.thumbnail}
                    alt="Video thumbnail"
                    className="w-24 h-16 object-cover rounded border border-[#27272A] bg-black flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-between text-xs">
                  <div>
                    <div className="font-medium text-[#EDEDED] truncate" title={videoConfig.filename}>
                      {videoConfig.filename}
                    </div>
                    <div className="text-[11px] text-[#8A8A93] font-mono mt-0.5">
                      {videoConfig.width}×{videoConfig.height} · {videoConfig.fps.toFixed(1)} fps · {videoConfig.durationSec}s
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400">
                      <CheckCircle2 className="w-3 h-3" />
                      PTZ Bypassed
                    </span>
                    <button
                      type="button"
                      onClick={() => setVideoConfig(null)}
                      className="text-[10px] text-[#8A8A93] hover:text-[#D4D4D8] underline"
                    >
                      Change Video
                    </button>
                  </div>
                </div>
              </div>

              {videoConfig.fpsWarning && (
                <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{videoConfig.fpsWarning}</span>
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      </Card>

      {/* 2. Ground Truth Configuration Card */}
      <GTEditor />

      {/* 3. Playback Controls Card */}
      <Card
        title="Playback"
        subtitle="Frame Ingestion Controls"
        tooltip="Control frame stepping and scrubbing through the benchmark video"
      >
        <div className="space-y-3">
          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {videoPlaybackState === 'playing' ? (
                <button
                  id="btn-video-pause"
                  type="button"
                  onClick={handlePause}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#EDEDED] text-xs font-medium rounded-md transition-colors"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  id="btn-video-play"
                  type="button"
                  onClick={handlePlay}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </button>
              )}

              <button
                id="btn-video-step"
                type="button"
                onClick={handleStep}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#D4D4D8] text-xs rounded-md transition-colors"
                title="Advance 1 frame"
              >
                <SkipForward className="w-3.5 h-3.5" />
                <span>Step</span>
              </button>

              <button
                id="btn-video-reset"
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-[#D4D4D8] text-xs rounded-md transition-colors"
                title="Rewind to frame 0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Frame & Time Readout */}
            <div className="text-right font-mono text-xs text-[#8A8A93]">
              <span className="text-[#EDEDED] font-semibold">Frame {currentVideoFrame}</span>
              <span> / {totalFrames}</span>
              <span className="text-[11px] block text-[#71717A]">t = {currentTimeS} s</span>
            </div>
          </div>

          {/* Scrubber Bar */}
          <div className="pt-1">
            <input
              id="video-frame-scrubber"
              type="range"
              min={0}
              max={totalFrames - 1}
              value={currentVideoFrame}
              onChange={(e) => {
                setCurrentVideoFrame(parseInt(e.target.value, 10));
              }}
              className="w-full accent-blue-500 h-1.5 bg-[#27272A] rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </Card>

      {/* 4. Benchmark-2 Evaluation Metrics */}
      <BenchmarkMetricsPanel />
    </div>
  );
};
