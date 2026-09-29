import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { worldToScene } from './coordinateMapping';

export interface TrajectoryTrailProps {
  points?: Array<{ x: number; y: number }>;
}

export const TrajectoryTrail: React.FC<TrajectoryTrailProps> = ({ points = [] }) => {
  // Convert 2D world points into 3D scene coordinates
  const scenePoints = useMemo(() => {
    if (!points || points.length < 2) return [];
    return points.map((pt) => worldToScene(pt.x, pt.y));
  }, [points]);

  if (scenePoints.length < 2) {
    return null;
  }

  // Split into 3 segments with fading opacities (recent = bright, older = dim)
  const total = scenePoints.length;
  const split1 = Math.floor(total * 0.35);
  const split2 = Math.floor(total * 0.7);

  // Segment 1 (oldest): index 0 to split1
  const segOld = scenePoints.slice(0, Math.max(2, split1 + 1));
  // Segment 2 (mid): split1 to split2
  const segMid = scenePoints.slice(split1, Math.max(split1 + 2, split2 + 1));
  // Segment 3 (newest): split2 to end
  const segRecent = scenePoints.slice(split2);

  return (
    <group>
      {segOld.length >= 2 && (
        <Line
          points={segOld}
          color="#06b6d4"
          lineWidth={1.5}
          transparent
          opacity={0.18}
        />
      )}
      {segMid.length >= 2 && (
        <Line
          points={segMid}
          color="#06b6d4"
          lineWidth={1.5}
          transparent
          opacity={0.45}
        />
      )}
      {segRecent.length >= 2 && (
        <Line
          points={segRecent}
          color="#06b6d4"
          lineWidth={1.8}
          transparent
          opacity={0.88}
        />
      )}
    </group>
  );
};
