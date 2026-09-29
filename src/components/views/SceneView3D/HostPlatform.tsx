import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { useAppStore } from '../../../lib/store';
import { worldToScene } from './coordinateMapping';

export interface HostPlatformProps {
  panAngle?: number;   // kept for API compat; no longer used for rotation
  tiltAngle?: number;  // kept for API compat; no longer used for rotation
}

export const HostPlatform: React.FC<HostPlatformProps> = () => {
  const panGroupRef = useRef<THREE.Group>(null);
  const tiltGroupRef = useRef<THREE.Group>(null);

  // Current applied rotations (smoothed)
  const currentPan = useRef(0);
  const currentTilt = useRef(0);

  // Clamps
  const PAN_LIMIT = THREE.MathUtils.degToRad(60);
  const TILT_LIMIT = THREE.MathUtils.degToRad(45);
  const FORWARD_DIST = 5; // stand-in for beacon's z-distance

  // Gimbal tracking logic: points optical boresight toward beacon coordinates
  useFrame((state, delta) => {
    const metrics = useAppStore.getState().metrics ?? {
      targetWorldPos: { x: 1000, y: 1000 },
      lockState: 'SEARCH' as const,
    };

    if (!metrics?.targetWorldPos) return;

    const safeDelta = delta > 0.001 ? delta : 1 / 60;

    // Beacon position in scene coords
    const [bx, by] = worldToScene(
      metrics.targetWorldPos.x,
      metrics.targetWorldPos.y
    );

    // Desired yaw/pitch so camera points at beacon
    const desiredYaw = Math.atan2(bx, FORWARD_DIST);
    const desiredPitch = Math.atan2(by, FORWARD_DIST);

    // Clamp
    const targetYaw = THREE.MathUtils.clamp(desiredYaw, -PAN_LIMIT, PAN_LIMIT);
    const targetPitch = THREE.MathUtils.clamp(desiredPitch, -TILT_LIMIT, TILT_LIMIT);

    // Smooth toward target (exponential damp)
    const lambda = 8;
    const beforePan = currentPan.current;
    currentPan.current = THREE.MathUtils.damp(beforePan, targetYaw, lambda, safeDelta);
    currentTilt.current = THREE.MathUtils.damp(currentTilt.current, targetPitch, lambda, safeDelta);

    const t = state.clock.elapsedTime;

    // Residual idle oscillation for visible lifelike motion
    const idlePan = THREE.MathUtils.degToRad(1.5) * Math.sin(t * 1.5);
    const idleTilt = THREE.MathUtils.degToRad(1.0) * Math.cos(t * 1.8);

    if (panGroupRef.current) {
      panGroupRef.current.rotation.y = currentPan.current + idlePan;
    }
    if (tiltGroupRef.current) {
      tiltGroupRef.current.rotation.x = -currentTilt.current + idleTilt;
    }
  });

  // Vertical cyan glow lines on each edge of the octagonal bus (8 facets)
  const busGlowLines = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const angle = (i * Math.PI) / 4 + Math.PI / 8;
      const x = Math.sin(angle) * 0.505;
      const z = Math.cos(angle) * 0.505;
      return [
        [x, -0.35, z],
        [x, 0.35, z],
      ] as [number, number, number][];
    });
  }, []);

  // Solar array perimeter lines
  const leftPanelOutline: [number, number, number][] = [
    [-4.2, 0.015, -0.7],
    [-0.8, 0.015, -0.7],
    [-0.8, 0.015, 0.7],
    [-4.2, 0.015, 0.7],
    [-4.2, 0.015, -0.7],
  ];

  const rightPanelOutline: [number, number, number][] = [
    [0.8, 0.015, -0.7],
    [4.2, 0.015, -0.7],
    [4.2, 0.015, 0.7],
    [0.8, 0.015, 0.7],
    [0.8, 0.015, -0.7],
  ];

  return (
    <group position={[0, 0, 0]}>
      {/* ── 1. MAIN BODY (Octagonal Spacecraft Bus) ───────────────── */}
      <group>
        {/* Octagonal body */}
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 8, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.7, 8]} />
          <meshStandardMaterial
            color="#1e2328"
            metalness={0.75}
            roughness={0.35}
            flatShading={true}
          />
        </mesh>

        {/* Metallic top and bottom bus caps */}
        <mesh position={[0, 0.36, 0]} rotation={[0, Math.PI / 8, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.03, 8]} />
          <meshStandardMaterial color="#2a3038" metalness={0.9} roughness={0.2} flatShading />
        </mesh>
        <mesh position={[0, -0.36, 0]} rotation={[0, Math.PI / 8, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 0.03, 8]} />
          <meshStandardMaterial color="#2a3038" metalness={0.9} roughness={0.2} flatShading />
        </mesh>

        {/* 8 vertical cyan structural glow lines running down the facets */}
        {busGlowLines.map((pts, idx) => (
          <Line
            key={idx}
            points={pts}
            color="#06b6d4"
            lineWidth={0.8}
            transparent
            opacity={0.35}
          />
        ))}
      </group>

      {/* ── 2. SOLAR ARRAYS (Detailed 4x2 Photovoltaic Cells) ──────── */}
      {/* Left Solar Array */}
      <group>
        {/* Array structural frame */}
        <mesh position={[-2.5, 0, 0]}>
          <boxGeometry args={[3.4, 0.02, 1.4]} />
          <meshStandardMaterial color="#0a1420" metalness={0.6} roughness={0.5} />
        </mesh>

        {/* Solar cell grid — 4×2 cells */}
        {Array.from({ length: 4 }).map((_, xi) =>
          Array.from({ length: 2 }).map((_, yi) => {
            const cellX = -2.5 + (xi - 1.5) * 0.82;
            const cellZ = (yi - 0.5) * 0.62;
            return (
              <mesh key={`l-${xi}-${yi}`} position={[cellX, 0.012, cellZ]}>
                <boxGeometry args={[0.76, 0.008, 0.56]} />
                <meshStandardMaterial
                  color="#0d1b2e"
                  emissive="#06b6d4"
                  emissiveIntensity={0.08}
                  metalness={0.85}
                  roughness={0.25}
                />
              </mesh>
            );
          })
        )}

        {/* High-visibility cyan perimeter boundary */}
        <Line
          points={leftPanelOutline}
          color="#06b6d4"
          lineWidth={1.5}
          transparent
          opacity={0.9}
        />
      </group>

      {/* Right Solar Array */}
      <group>
        {/* Array structural frame */}
        <mesh position={[2.5, 0, 0]}>
          <boxGeometry args={[3.4, 0.02, 1.4]} />
          <meshStandardMaterial color="#0a1420" metalness={0.6} roughness={0.5} />
        </mesh>

        {/* Solar cell grid — 4×2 cells */}
        {Array.from({ length: 4 }).map((_, xi) =>
          Array.from({ length: 2 }).map((_, yi) => {
            const cellX = 2.5 + (xi - 1.5) * 0.82;
            const cellZ = (yi - 0.5) * 0.62;
            return (
              <mesh key={`r-${xi}-${yi}`} position={[cellX, 0.012, cellZ]}>
                <boxGeometry args={[0.76, 0.008, 0.56]} />
                <meshStandardMaterial
                  color="#0d1b2e"
                  emissive="#06b6d4"
                  emissiveIntensity={0.08}
                  metalness={0.85}
                  roughness={0.25}
                />
              </mesh>
            );
          })
        )}

        {/* High-visibility cyan perimeter boundary */}
        <Line
          points={rightPanelOutline}
          color="#06b6d4"
          lineWidth={1.5}
          transparent
          opacity={0.9}
        />
      </group>

      {/* ── 3. PANEL MOUNTING HINGES ──────────────────────────────── */}
      {/* Left hinge */}
      <mesh position={[-0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.15, 16]} />
        <meshStandardMaterial color="#2a3038" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[-0.78, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.065, 0.008, 8, 16]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* Right hinge */}
      <mesh position={[0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.15, 16]} />
        <meshStandardMaterial color="#2a3038" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0.78, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.065, 0.008, 8, 16]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* ── 4. GIMBAL ASSEMBLY (Precision PTZ Mechanism) ─────────── */}
      {/* 4a. Gimbal base ring on top of the body */}
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.06, 24]} />
        <meshStandardMaterial color="#2a3038" metalness={0.95} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.008, 8, 32]} />
        <meshBasicMaterial color="#06b6d4" />
      </mesh>

      {/* 4b. Pan yoke (U-shaped bracket) */}
      <group ref={panGroupRef} position={[0, 0.5, 0]}>
        {/* Left arm */}
        <mesh position={[-0.15, 0.08, 0]}>
          <boxGeometry args={[0.05, 0.16, 0.1]} />
          <meshStandardMaterial color="#2a3038" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Right arm */}
        <mesh position={[0.15, 0.08, 0]}>
          <boxGeometry args={[0.05, 0.16, 0.1]} />
          <meshStandardMaterial color="#2a3038" metalness={0.95} roughness={0.15} />
        </mesh>
        {/* Base of U */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.34, 0.05, 0.1]} />
          <meshStandardMaterial color="#2a3038" metalness={0.95} roughness={0.15} />
        </mesh>

        {/* 4c. Tilt group with bearing */}
        <group ref={tiltGroupRef} position={[0, 0.16, 0]}>
          {/* Tilt axle */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.03, 0.03, 0.3, 12]} />
            <meshStandardMaterial color="#3a4048" metalness={1.0} roughness={0.1} />
          </mesh>

          {/* Cyan bearing rings at each end */}
          <mesh position={[-0.16, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.045, 0.01, 8, 20]} />
            <meshBasicMaterial color="#06b6d4" />
          </mesh>
          <mesh position={[0.16, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.045, 0.01, 8, 20]} />
            <meshBasicMaterial color="#06b6d4" />
          </mesh>

          {/* 4d. Camera assembly (detailed optic) */}
          {/* Main housing — rectangular */}
          <mesh position={[0, 0, -0.15]}>
            <boxGeometry args={[0.28, 0.24, 0.42]} />
            <meshStandardMaterial color="#0a0e14" metalness={0.85} roughness={0.25} />
          </mesh>

          {/* Thermal cooling fins on top of camera housing */}
          {Array.from({ length: 5 }).map((_, i) => (
            <mesh key={i} position={[0, 0.14, -0.15 + (i - 2) * 0.08]}>
              <boxGeometry args={[0.22, 0.04, 0.015]} />
              <meshStandardMaterial color="#1a1d22" metalness={0.9} roughness={0.3} />
            </mesh>
          ))}

          {/* Lens barrel — 3 nested cylinders */}
          <mesh position={[0, 0, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.09, 0.09, 0.06, 24]} />
            <meshStandardMaterial color="#0a0e14" metalness={0.95} roughness={0.15} />
          </mesh>
          <mesh position={[0, 0, -0.44]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 24]} />
            <meshStandardMaterial color="#1a1d22" metalness={0.9} roughness={0.2} />
          </mesh>

          {/* Cyan lens element (glowing aperture) */}
          <mesh position={[0, 0, -0.47]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.015, 24]} />
            <meshStandardMaterial
              color="#06b6d4"
              emissive="#06b6d4"
              emissiveIntensity={3.0}
            />
          </mesh>
        </group>
      </group>

      {/* ── 5. THRUSTERS (2 small nozzles on bottom) ──────────────── */}
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} position={[x, -0.42, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.06, 0.12, 12, 1, true]} />
          <meshStandardMaterial color="#2a3038" metalness={1.0} roughness={0.1} side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* ── 6. ANTENNA DISH (top of body, offset) ─────────────────── */}
      <group position={[0.28, 0.38, 0.2]} rotation={[-Math.PI / 3, 0, Math.PI / 6]}>
        {/* Parabolic reflector dish */}
        <mesh>
          <sphereGeometry args={[0.12, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#1a1d22"
            metalness={0.95}
            roughness={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Cyan accent rim on dish perimeter */}
        <mesh>
          <torusGeometry args={[0.12, 0.006, 8, 32]} />
          <meshBasicMaterial color="#06b6d4" />
        </mesh>
        {/* Feed horn at focal point */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.06, 8]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* ── 7. STATUS LIGHTS (Sub-miniature Avionics Status LEDs) ──── */}
      {[
        { pos: [-0.35, 0.15, 0.35], color: '#06b6d4' },
        { pos: [0.35, 0.15, -0.35], color: '#3FB950' },
        { pos: [-0.35, -0.15, -0.35], color: '#D29922' },
      ].map((light, i) => (
        <mesh key={i} position={light.pos as [number, number, number]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color={light.color} />
        </mesh>
      ))}
    </group>
  );
};
