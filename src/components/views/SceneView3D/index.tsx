import React, { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useAppStore } from '../../../lib/store';
import { StarField } from './StarField';
import { HostPlatform } from './HostPlatform';
import { Beacon } from './Beacon';
import { FOVCone } from './FOVCone';
import { TrajectoryTrail } from './TrajectoryTrail';
import { Overlay } from './Overlay';

export interface SceneView3DProps {
  targetTrail?: Array<{ x: number; y: number }>;
}

export const SceneView3D: React.FC<SceneView3DProps> = ({ targetTrail = [] }) => {
  const metrics = useAppStore((s) => s.metrics);
  const spec = useAppStore((s) => s.spec);

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [showFov, setShowFov] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  const targetPos = metrics?.targetWorldPos || { x: 1000, y: 1000 };
  const targetInFov = metrics?.targetInFov || false;

  const handleResetCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.target.set(0, 0, 0);
    }
  }, []);

  return (
    <div
      className="relative w-full h-full min-h-[600px] bg-[#0a0e14] rounded-lg overflow-hidden border border-[#1F1F23]"
      style={{ minHeight: '600px' }}
    >
      {/* Layer 1: 3D Canvas — bottom, z-0 */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, -25, 18], fov: 45, near: 0.1, far: 200 }}
          gl={{ antialias: true, alpha: false }}
          dpr={[1, 1.5]}
          style={{ width: '100%', height: '100%' }}
        >
          <StarField />

          <ambientLight intensity={0.35} />
          <directionalLight position={[5, 8, 6]} intensity={0.9} />
          <pointLight position={[-6, -4, 4]} intensity={0.35} color="#06b6d4" />

          {/* Optical Field-of-View Projection Cone */}
          {showFov && (
            <FOVCone
              cameraPosition={[0, 0.5, -0.3]}
              panAngle={0}
              tiltAngle={0}
              fovDeg={[spec?.cameraFov?.hDeg ?? 4, spec?.cameraFov?.vDeg ?? 3]}
              range={15}
            />
          )}

          {/* Satellite Host Platform with Gimbal */}
          <HostPlatform
            panAngle={metrics?.panSpeedDegSec ?? 0}
            tiltAngle={metrics?.tiltSpeedDegSec ?? 0}
          />

          {/* Optical Target Beacon */}
          <Beacon
            worldX={targetPos.x}
            worldY={targetPos.y}
            isVisible={targetInFov}
          />

          {/* Beacon Trajectory Line */}
          <TrajectoryTrail points={targetTrail} />

          <OrbitControls
            ref={controlsRef}
            target={[0, 0, 0]}
            enablePan
            enableZoom
            enableRotate
            minDistance={4}
            maxDistance={40}
            maxPolarAngle={Math.PI}
          />

          <EffectComposer>
            <Bloom
              intensity={1.0}
              luminanceThreshold={0.6}
              luminanceSmoothing={0.85}
            />
          </EffectComposer>
        </Canvas>
      </div>

      {/* Layer 2: HUD Overlay — top, z-10, pointer-events-none 
          so empty regions pass clicks through to the canvas */}
      {metrics && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <Overlay
            onResetCameraView={handleResetCamera}
            showFov={showFov}
            setShowFov={setShowFov}
            showLabels={showLabels}
            setShowLabels={setShowLabels}
          />
        </div>
      )}
    </div>
  );
};
