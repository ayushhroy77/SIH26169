import React from 'react';
import { useAppStore } from '../../lib/store';
import { Card } from '../ui/Card';
import { MultiTargetEditor } from './SimulationSetup/MultiTargetEditor';
import { RotateCcw } from 'lucide-react';

export const SimulationSetup: React.FC = () => {
  const spec = useAppStore((state) => state.spec);
  const resetSpecToDefault = useAppStore((state) => state.resetSpecToDefault);

  return (
    <div className="space-y-4">
      {/* Target Parameters & Multi-Target Extension */}
      <Card
        title="Target Parameters"
        specCode="SIH-7..12"
        specDescription="Optical beacons emulating remote FSOC transmitters (shapes, sizes, kinematic motions)"
        action={
          <button
            type="button"
            onClick={resetSpecToDefault}
            className="flex items-center gap-1 text-[11px] text-[#8A8A93] hover:text-[#EDEDED] transition-colors duration-120"
            title="Reset targets to default configuration"
          >
            <RotateCcw className="w-3 h-3" strokeWidth={1.5} />
            <span>Reset</span>
          </button>
        }
      >
        <MultiTargetEditor />
      </Card>

      {/* Screen & Spatial Bounds */}
      <Card
        title="Spatial Bounds"
        specCode="SIH-1"
        specDescription="Virtual simulation universe size. Minimum 2000×2000 px coordinate space per ISRO spec."
      >
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="text-[11px] text-[#8A8A93] block mb-1">Width</span>
              <div className="bg-[#17171A] border border-[#1F1F23]/60 rounded px-2.5 py-1.5 text-xs font-mono text-[#EDEDED]">
                {spec.screenSize.width} px
              </div>
            </div>
            <div>
              <span className="text-[11px] text-[#8A8A93] block mb-1">Height</span>
              <div className="bg-[#17171A] border border-[#1F1F23]/60 rounded px-2.5 py-1.5 text-xs font-mono text-[#EDEDED]">
                {spec.screenSize.height} px
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#5C5C66] font-mono leading-relaxed">
            Universe coordinates (0, 0) to (2000, 2000). Initial boresight centered at (1000, 1000).
          </p>
        </div>
      </Card>
    </div>
  );
};
