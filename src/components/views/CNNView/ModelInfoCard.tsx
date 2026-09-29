/**
 * Model Info Card Component
 * Displays architecture metadata, training benchmarks, and runtime specifications for TinyBeaconNet.
 */

import React from 'react';
import { Cpu, Network, CheckCircle, Zap } from 'lucide-react';

export const ModelInfoCard: React.FC = () => {
  const specs = [
    { label: 'Architecture', value: 'TinyBeaconNet' },
    { label: 'Parameters', value: '~110,000' },
    { label: 'Input', value: '32 \u00D7 32 grayscale' },
    { label: 'Output', value: 'Beacon probability [0\u20131]' },
    { label: 'Training samples', value: '4,983 pos / 49,830 neg' },
    { label: 'Validation acc', value: '98.65%' },
    { label: 'Inference', value: '< 5 ms per batch' },
    { label: 'Backend', value: 'ONNX Runtime (CPU)' },
  ];

  return (
    <div className="bg-[#0e121a] border border-[#1f2937] rounded-xl p-4 shadow-lg flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1f2937]/70 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-[#06b6d4]/10 text-[#06b6d4]">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono tracking-wider text-[#ededed] uppercase">
              CNN Classifier
            </h3>
            <span className="text-[10px] text-[#8a8a93] font-mono">TinyBeaconNet v1.2</span>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#3FB950]/15 text-[#3FB950] text-[10px] font-mono font-medium border border-[#3FB950]/30">
          <CheckCircle className="w-3 h-3" />
          <span>ONNX Active</span>
        </div>
      </div>

      {/* Metadata Rows */}
      <div className="space-y-1.5 text-xs font-mono">
        {specs.map((row, idx) => (
          <div key={idx} className="flex items-center justify-between py-0.5">
            <span className="text-[#8a8a93] text-[11px]">{row.label}</span>
            <span className="text-[#ededed] font-medium text-[11px] text-right">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Footer Tag */}
      <div className="mt-3 pt-2 border-t border-[#1f2937]/50 flex items-center justify-between text-[10px] font-mono text-[#8a8a93]">
        <div className="flex items-center gap-1 text-[#06b6d4]">
          <Network className="w-3 h-3" />
          <span>Conv2D &rarr; MaxPool &rarr; Dense</span>
        </div>
        <div className="flex items-center gap-1 text-[#3FB950]">
          <Zap className="w-3 h-3" />
          <span>INT8 Quantized</span>
        </div>
      </div>
    </div>
  );
};
