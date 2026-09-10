import React from 'react';
import { useAppStore } from '../../lib/store';
import { DisturbanceReadout } from './Disturbances/DisturbanceReadout';
import { NoiseCard } from './Disturbances/NoiseCard';
import { JitterCard } from './Disturbances/JitterCard';
import { AtmosphereCard } from './Disturbances/AtmosphereCard';
import { PlatformMotionCard } from './Disturbances/PlatformMotionCard';
import { Shuffle, RotateCcw } from 'lucide-react';

export const Disturbances: React.FC = () => {
  const randomizeDisturbances = useAppStore((state) => state.randomizeDisturbances);
  const resetDisturbances = useAppStore((state) => state.resetDisturbances);

  return (
    <div className="space-y-4">
      {/* Top Controls: Quick Actions */}
      <div className="flex items-center justify-between pb-1">
        <div className="text-xs text-[#8A8A93]">
          Dynamic Disturbances & Channel Impairments
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={randomizeDisturbances}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161619] hover:bg-[#1F1F23] text-xs text-[#EDEDED] border border-[#1F1F23] transition-colors"
            title="Randomize all disturbance parameters for stress-testing"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#5B8DEF]" />
            <span>Randomize</span>
          </button>
          <button
            type="button"
            onClick={resetDisturbances}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161619] hover:bg-[#1F1F23] text-xs text-[#8A8A93] hover:text-[#EDEDED] border border-[#1F1F23] transition-colors"
            title="Reset disturbances to ISRO baseline spec defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Spec</span>
          </button>
        </div>
      </div>

      {/* Live Readout Bar */}
      <DisturbanceReadout />

      {/* Modular Disturbance Cards */}
      <div className="space-y-3.5">
        {/* Spec 21, 22: Focal Plane Noise */}
        <NoiseCard />

        {/* Spec 23: Camera Mechanical Jitter */}
        <JitterCard />

        {/* Spec 24: Atmospheric Disturbance */}
        <AtmosphereCard />

        {/* Spec 25: Platform Kinematic Motion */}
        <PlatformMotionCard />
      </div>
    </div>
  );
};
