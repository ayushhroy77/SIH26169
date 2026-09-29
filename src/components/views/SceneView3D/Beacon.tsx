import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { worldToScene } from './coordinateMapping';
import { useAppStore } from '../../../lib/store';

export interface BeaconProps {
  worldX?: number;
  worldY?: number;
  isVisible?: boolean;
}

export const Beacon: React.FC<BeaconProps> = ({
  worldX: initialX = 1000,
  worldY: initialY = 1000,
  isVisible: initialVisible = true,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const coreMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const initialPos = worldToScene(initialX, initialY);

  // High-frequency read from Zustand store via useFrame to preserve 60 FPS without component re-renders
  useFrame(() => {
    if (!groupRef.current) return;

    const metrics = useAppStore.getState().metrics;
    const targetPos = metrics?.targetWorldPos;
    const inFov = metrics?.targetInFov ?? initialVisible;

    if (targetPos) {
      const [sx, sy, sz] = worldToScene(targetPos.x, targetPos.y);
      groupRef.current.position.set(sx, sy, sz);
    }

    const targetScale = inFov ? 1.0 : 0.6;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);

    if (coreMatRef.current) {
      coreMatRef.current.opacity = inFov ? 1.0 : 0.35;
      coreMatRef.current.transparent = !inFov;
    }
    if (haloMatRef.current) {
      haloMatRef.current.opacity = inFov ? 0.28 : 0.08;
    }
  });

  return (
    <group ref={groupRef} position={initialPos}>
      {/* 1. Bright white optical core */}
      <mesh>
        <sphereGeometry args={[0.15, 24, 24]} />
        <meshBasicMaterial ref={coreMatRef} color="#ffffff" toneMapped={false} />
      </mesh>

      {/* 2. Cyan glow halo */}
      <mesh>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshBasicMaterial
          ref={haloMatRef}
          color="#06b6d4"
          transparent
          opacity={0.28}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* 3. Mission-control HUD label above beacon */}
      <Html position={[0, 0.75, 0]} center distanceFactor={14} zIndexRange={[100, 0]}>
        <div className="pointer-events-none select-none px-2 py-1 rounded bg-[#09131e]/90 border border-[#06b6d4]/50 text-[10px] font-mono shadow-lg shadow-[#06b6d4]/10 backdrop-blur-sm whitespace-nowrap flex flex-col items-center">
          <span className="font-semibold text-white tracking-wider">TARGET-01</span>
          <span className="text-[8px] text-[#06b6d4]">BEACON-01</span>
        </div>
      </Html>
    </group>
  );
};
