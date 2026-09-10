import React from 'react';
import { useAppStore } from '../../../lib/store';
import { Activity, Video } from 'lucide-react';

export const ModeSwitcher: React.FC = () => {
  const inputMode = useAppStore((state) => state.inputMode);
  const setInputMode = useAppStore((state) => state.setInputMode);
  const updateSpec = useAppStore((state) => state.updateSpec);

  const handleSelectMode = (mode: 'Live Simulation' | 'Video Ingestion') => {
    setInputMode(mode);
    updateSpec({ inputMode: mode });
  };

  return (
    <div className="flex items-center bg-[#17171A] border border-[#1F1F23]/60 rounded-md p-0.5 text-xs select-none">
      <button
        id="mode-switch-live-sim"
        type="button"
        onClick={() => handleSelectMode('Live Simulation')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors duration-120 ${
          inputMode === 'Live Simulation'
            ? 'bg-[#1F1F23] text-[#EDEDED]'
            : 'text-[#8A8A93] hover:text-[#EDEDED]'
        }`}
      >
        <Activity className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>Live Simulation</span>
      </button>

      <button
        id="mode-switch-video-ingest"
        type="button"
        onClick={() => handleSelectMode('Video Ingestion')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors duration-120 ${
          inputMode === 'Video Ingestion'
            ? 'bg-[#1F1F23] text-[#EDEDED]'
            : 'text-[#8A8A93] hover:text-[#EDEDED]'
        }`}
      >
        <Video className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>Video Ingestion</span>
        <span className="text-[10px] font-mono px-1 py-0.2 bg-[#111113] text-[#8A8A93] rounded border border-[#1F1F23]/60">
          BM-2
        </span>
      </button>
    </div>
  );
};
