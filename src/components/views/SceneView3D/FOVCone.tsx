import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useAppStore } from '../../../lib/store';
import { worldToScene } from './coordinateMapping';

export interface FOVConeProps {
  cameraPosition?: [number, number, number];
  panAngle?: number;
  tiltAngle?: number;
  fovDeg?: [number, number];
  range?: number;
}

export const FOVCone: React.FC<FOVConeProps> = ({
  cameraPosition = [0, 0.5, -0.3],
  fovDeg = [4.0, 3.0],
  range = 15,
}) => {
  const coneGroupRef = useRef<THREE.Group>(null);
  const currentPan = useRef(0);
  const currentTilt = useRef(0);

  // Compute base radius from horizontal FOV
  const fovRad = ((fovDeg[0] || 4.0) * Math.PI) / 180;
  const radiusTop = 0.08;
  const radiusBottom = Math.max(0.4, Math.tan(fovRad / 2) * range);

  // 4 corner rays from apex to base
  const rays = useMemo(() => {
    const r = radiusBottom;
    return [
      [[0, 0, 0], [r, 0, -range]] as [number, number, number][],
      [[0, 0, 0], [-r, 0, -range]] as [number, number, number][],
      [[0, 0, 0], [0, r, -range]] as [number, number, number][],
      [[0, 0, 0], [0, -r, -range]] as [number, number, number][],
    ];
  }, [radiusBottom, range]);

  // Base circular rim
  const baseRing = useMemo(() => {
    const pts: [number, number, number][] = [];
    const segments = 32;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push([
        Math.cos(theta) * radiusBottom,
        Math.sin(theta) * radiusBottom,
        -range,
      ]);
    }
    return pts;
  }, [radiusBottom, range]);

  // Update cone rotation to track beacon position smoothly via useFrame
  useFrame((_state, delta) => {
    if (!coneGroupRef.current) return;

    const metrics = useAppStore.getState().metrics ?? {
      targetWorldPos: { x: 1000, y: 1000 },
    };
    if (!metrics?.targetWorldPos) return;

    const [bx, by] = worldToScene(
      metrics.targetWorldPos.x,
      metrics.targetWorldPos.y
    );

    const desiredYaw = Math.atan2(bx, 5);
    const desiredPitch = Math.atan2(by, 5);

    const lambda = 8;
    const safeDelta = delta > 0.001 ? delta : 1 / 60;
    currentPan.current = THREE.MathUtils.damp(currentPan.current, desiredYaw, lambda, safeDelta);
    currentTilt.current = THREE.MathUtils.damp(currentTilt.current, desiredPitch, lambda, safeDelta);

    coneGroupRef.current.rotation.y = currentPan.current;
    coneGroupRef.current.rotation.x = -currentTilt.current;
  });

  return (
    <group position={cameraPosition}>
      <group ref={coneGroupRef}>
        {/* Translucent frustum body with reduced opacity 0.08 and depthWrite false */}
        <mesh position={[0, 0, -range / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[radiusTop, radiusBottom, range, 32, 1, false]}
          />
          <meshBasicMaterial
            color="#06b6d4"
            transparent
            opacity={0.08}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        {/* Crisp optical perimeter boundary rays */}
        {rays.map((ray, idx) => (
          <Line
            key={idx}
            points={ray}
            color="#06b6d4"
            lineWidth={0.8}
            transparent
            opacity={0.35}
          />
        ))}

        {/* Far-field circular aperture perimeter */}
        <Line
          points={baseRing}
          color="#06b6d4"
          lineWidth={1.2}
          transparent
          opacity={0.45}
        />
      </group>
    </group>
  );
};
