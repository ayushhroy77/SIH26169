/**
 * FSOC Virtual Camera & Beacon Physics Simulation Engine
 * Simulates 2000x2000 space, multi-target kinematics (1-8 beacons), camera FOV projection,
 * image disturbances (atmospheric, sensor noise, PTZ jitter, platform kinematics),
 * nearest-neighbour primary target lock, centroiding, and PTZ servo control.
 * Reference: ISRO / SIH 2024 (Department of Space)
 */

import { SystemSpec, TelemetryMetrics, TargetInfo, TargetConfig } from './spec';

export interface SimTargetItem {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  trail: { x: number; y: number }[];
  waypointIdx: number;
  waypointT: number;
  shape: string;
  size: number;
  motion: string;
  speed: number;
}

export interface SimState {
  // Multi-target list
  targets: SimTargetItem[];
  primaryTargetId: number;

  // Primary target legacy kinematics references
  targetX: number;
  targetY: number;
  targetTrail: { x: number; y: number }[];

  // Camera state
  camX: number;
  camY: number;
  camPanSpeedDeg: number;
  camTiltSpeedDeg: number;
  camTrail: { x: number; y: number }[];

  // Platform and jitter state
  jitterPhaseX: number;
  jitterPhaseY: number;
  platformAngle: number;
  platformWalkX: number;
  platformWalkY: number;

  // Timing & Performance tracking
  totalFrames: number;
  lockedFrames: number;
  lostFrames: number;
  errorSum: number;
  errorSqSum: number;
  maxError: number;

  acquisitionStartTime: number | null;
  acquisitionTimeSec: number;
  hasAcquiredOnce: boolean;

  lossStartTime: number | null;
  lastReacquisitionTimeSec: number;

  lastErrorX: number;
  lastErrorY: number;

  // Synthetic time
  simTimeSec: number;
}

export function createInitialSimState(spec: SystemSpec): SimState {
  const count = Math.max(1, Math.min(8, spec.targetCount));
  const simTargets: SimTargetItem[] = [];

  for (let i = 0; i < count; i++) {
    const targetId = i + 1;
    const cfg = spec.targets[i] || {
      id: targetId,
      shape: spec.targetShape,
      size: spec.targetSize,
      initialLocation: spec.initialTargetLocation,
      motion: spec.targetMotion,
      speed: spec.targetSpeed,
    };

    let initX = 1200 + (i * 70);
    let initY = 850 + (i * 60);

    if (cfg.customPos) {
      initX = cfg.customPos.x;
      initY = cfg.customPos.y;
    } else if (cfg.initialLocation === 'Center') {
      initX = spec.screenSize.width / 2 + (i - (count - 1) / 2) * 60;
      initY = spec.screenSize.height / 2 + (i - (count - 1) / 2) * 60;
    } else {
      // Random deterministic by targetId
      const seedR = (targetId * 9301 + 49297) % 233280;
      const seedC = (targetId * 49297 + 9301) % 233280;
      initX = 400 + (seedR / 233280) * (spec.screenSize.width - 800);
      initY = 400 + (seedC / 233280) * (spec.screenSize.height - 800);
    }

    const speed = cfg.speed ?? spec.targetSpeed;
    const angle = (targetId * 1.2);

    simTargets.push({
      id: targetId,
      x: initX,
      y: initY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: angle,
      trail: [],
      waypointIdx: 0,
      waypointT: 0,
      shape: cfg.shape || spec.targetShape,
      size: cfg.size || spec.targetSize,
      motion: cfg.motion || spec.targetMotion,
      speed: speed,
    });
  }

  const primary = simTargets[0] || { x: 1000, y: 1000, trail: [] };

  return {
    targets: simTargets,
    primaryTargetId: 1,
    targetX: primary.x,
    targetY: primary.y,
    targetTrail: [],
    camX: spec.initialCameraPos.x,
    camY: spec.initialCameraPos.y,
    camPanSpeedDeg: 0,
    camTiltSpeedDeg: 0,
    camTrail: [],
    jitterPhaseX: 0,
    jitterPhaseY: 0,
    platformAngle: 0,
    platformWalkX: 0,
    platformWalkY: 0,
    totalFrames: 0,
    lockedFrames: 0,
    lostFrames: 0,
    errorSum: 0,
    errorSqSum: 0,
    maxError: 0,
    acquisitionStartTime: null,
    acquisitionTimeSec: 0,
    hasAcquiredOnce: false,
    lossStartTime: null,
    lastReacquisitionTimeSec: 0,
    lastErrorX: 0,
    lastErrorY: 0,
    simTimeSec: 0,
  };
}

export function stepSimulation(
  state: SimState,
  spec: SystemSpec,
  dt: number,
  nowMs: number
): { nextState: SimState; metrics: TelemetryMetrics } {
  const t0 = performance.now();
  const s: SimState = {
    ...state,
    targets: state.targets.map((t) => ({ ...t, trail: [...t.trail] })),
    camTrail: [...state.camTrail],
  };

  s.simTimeSec += dt;
  s.totalFrames += 1;

  if (s.acquisitionStartTime === null) {
    s.acquisitionStartTime = s.simTimeSec;
  }

  const W = spec.screenSize.width;
  const H = spec.screenSize.height;
  const margin = 100;

  // Synchronize targets count with spec if changed
  const count = Math.max(1, Math.min(8, spec.targetCount));
  while (s.targets.length < count) {
    const nextId = s.targets.length + 1;
    const cfg = spec.targets[nextId - 1] || {
      id: nextId,
      shape: spec.targetShape,
      size: spec.targetSize,
      motion: 'Circular',
      speed: 90,
      initialLocation: 'Random',
    };
    s.targets.push({
      id: nextId,
      x: 400 + Math.random() * (W - 800),
      y: 400 + Math.random() * (H - 800),
      vx: 60,
      vy: 60,
      angle: nextId * 1.1,
      trail: [],
      waypointIdx: 0,
      waypointT: 0,
      shape: cfg.shape || spec.targetShape,
      size: cfg.size || spec.targetSize,
      motion: cfg.motion || spec.targetMotion,
      speed: cfg.speed || spec.targetSpeed,
    });
  }
  if (s.targets.length > count) {
    s.targets = s.targets.slice(0, count);
  }

  // Update target properties from spec
  s.targets.forEach((t, i) => {
    const cfg = spec.targets[i];
    if (cfg) {
      t.shape = cfg.shape;
      t.size = cfg.size;
      t.motion = cfg.motion;
      t.speed = cfg.speed;
    }
  });

  // 1. Step Kinematics for All Beacons
  s.targets.forEach((target) => {
    const speed = target.speed;

    switch (target.motion) {
      case 'Straight Line': {
        target.x += target.vx * dt;
        target.y += target.vy * dt;
        if (target.x < margin) {
          target.x = margin;
          target.vx = Math.abs(target.vx);
        } else if (target.x > W - margin) {
          target.x = W - margin;
          target.vx = -Math.abs(target.vx);
        }
        if (target.y < margin) {
          target.y = margin;
          target.vy = Math.abs(target.vy);
        } else if (target.y > H - margin) {
          target.y = H - margin;
          target.vy = -Math.abs(target.vy);
        }
        break;
      }

      case 'Circular': {
        const radius = 350 + (target.id - 1) * 45;
        const omega = speed / Math.max(10, radius);
        target.angle += omega * dt;
        target.x = W / 2 + Math.cos(target.angle) * radius;
        target.y = H / 2 + Math.sin(target.angle) * radius;
        break;
      }

      case 'Figure-of-8': {
        const a = 420;
        const omega = 0.35 * (speed / 90);
        target.angle += omega * dt;
        const sinT = Math.sin(target.angle);
        const cosT = Math.cos(target.angle);
        const denom = 1 + sinT * sinT;
        target.x = W / 2 + (a * cosT) / denom;
        target.y = H / 2 + (a * sinT * cosT) / denom;
        break;
      }

      case 'Spiral': {
        // Archimedean Spiral: r = a + b * theta
        const omega = 0.8 * (speed / 90);
        target.angle += omega * dt;
        const r = (60 + (s.simTimeSec * 35 + (target.id - 1) * 80) % 520);
        target.x = W / 2 + Math.cos(target.angle) * r;
        target.y = H / 2 + Math.sin(target.angle) * r;
        break;
      }

      case 'Sinusoidal': {
        target.x += (speed * 0.85) * dt;
        if (target.x > W - margin) target.x = margin;
        const freq = 1.6 + (target.id - 1) * 0.25;
        target.y = H / 2 + Math.sin(s.simTimeSec * freq + target.id) * 300;
        break;
      }

      case 'User-defined': {
        const waypoints = spec.customPathWaypoints;
        if (waypoints && waypoints.length >= 2) {
          const p1 = waypoints[target.waypointIdx];
          const nextIdx = (target.waypointIdx + 1) % waypoints.length;
          const p2 = waypoints[nextIdx];

          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);
          const travelTime = Math.max(0.01, dist / Math.max(20, speed));
          target.waypointT += dt / travelTime;

          if (target.waypointT >= 1.0) {
            target.waypointT = 0.0;
            target.waypointIdx = nextIdx;
          }

          // Smooth cubic ease
          const t = target.waypointT;
          const smoothT = t * t * (3 - 2 * t);
          target.x = p1.x + dx * smoothT;
          target.y = p1.y + dy * smoothT;
        } else {
          target.x += target.vx * dt;
          target.y += target.vy * dt;
        }
        break;
      }

      default: {
        // Random walk
        const jitterAngle = (Math.random() - 0.5) * 1.5;
        const currentAngle = Math.atan2(target.vy, target.vx) + jitterAngle * dt * 3;
        target.vx = Math.cos(currentAngle) * speed;
        target.vy = Math.sin(currentAngle) * speed;
        target.x += target.vx * dt;
        target.y += target.vy * dt;

        if (target.x < margin || target.x > W - margin) target.vx *= -1;
        if (target.y < margin || target.y > H - margin) target.vy *= -1;
        target.x = Math.max(margin, Math.min(W - margin, target.x));
        target.y = Math.max(margin, Math.min(H - margin, target.y));
        break;
      }
    }

    // Update individual trail
    if (s.totalFrames % 3 === 0) {
      target.trail = [...target.trail.slice(-50), { x: target.x, y: target.y }];
    }
  });

  // 2. Camera Platform Disturbance Kinematics (Spec 25)
  let platDx = 0;
  let platDy = 0;
  if (spec.platformMotion !== 'None' && spec.platformMotionAmp > 0) {
    const amp = Math.min(20, spec.platformMotionAmp);
    if (spec.platformMotion === 'Linear') {
      platDx = Math.sin(s.simTimeSec * 1.8) * amp;
      platDy = Math.cos(s.simTimeSec * 1.8) * amp * 0.5;
    } else if (spec.platformMotion === 'Circular') {
      s.platformAngle += dt * 2.2;
      platDx = Math.cos(s.platformAngle) * amp;
      platDy = Math.sin(s.platformAngle) * amp;
    } else if (spec.platformMotion === 'Random') {
      const stepX = (Math.random() - 0.5) * amp * 0.6;
      const stepY = (Math.random() - 0.5) * amp * 0.6;
      s.platformWalkX = Math.max(-amp, Math.min(amp, s.platformWalkX * 0.94 + stepX));
      s.platformWalkY = Math.max(-amp, Math.min(amp, s.platformWalkY * 0.94 + stepY));
      platDx = s.platformWalkX;
      platDy = s.platformWalkY;
    } else if (spec.platformMotion === 'Spiral') {
      s.platformAngle += dt * 2.4;
      const r = (Math.sin(s.simTimeSec * 0.8) * 0.5 + 0.5) * amp;
      platDx = Math.cos(s.platformAngle) * r;
      platDy = Math.sin(s.platformAngle) * r;
    } else if (spec.platformMotion === 'Figure-of-8') {
      s.platformAngle += dt * 1.6;
      const sinT = Math.sin(s.platformAngle);
      const cosT = Math.cos(s.platformAngle);
      const denom = 1 + sinT * sinT;
      platDx = (amp * cosT) / denom;
      platDy = (amp * sinT * cosT) / denom;
    }
  }

  // 3. Camera Pan/Tilt Jitter (Spec 23)
  let jitDx = 0;
  let jitDy = 0;
  if (spec.cameraJitterEnabled && spec.cameraJitterIntensity > 0) {
    const amp = Math.min(20, spec.cameraJitterIntensity);
    if (spec.cameraJitterWaveform === 'Perlin') {
      s.jitterPhaseX += dt * 19.0;
      s.jitterPhaseY += dt * 24.5;
      jitDx = (Math.sin(s.jitterPhaseX) * 0.6 + Math.sin(s.jitterPhaseX * 2.3) * 0.4) * amp;
      jitDy = (Math.cos(s.jitterPhaseY) * 0.6 + Math.cos(s.jitterPhaseY * 1.9) * 0.4) * amp;
    } else {
      jitDx = (Math.random() - 0.5) * amp * 2;
      jitDy = (Math.random() - 0.5) * amp * 2;
    }
  }

  // Effective camera center in world coordinates with platform offset & jitter
  const effectiveCamX = s.camX + platDx + jitDx;
  const effectiveCamY = s.camY + platDy + jitDy;

  if (s.totalFrames % 3 === 0) {
    s.camTrail = [...s.camTrail.slice(-50), { x: s.camX, y: s.camY }];
  }

  // Camera viewport geometry
  const camWidth = spec.cameraResolution.width;
  const camHeight = spec.cameraResolution.height;
  const boresightX = camWidth / 2;
  const boresightY = camHeight / 2;

  // 4. Project All Targets onto Camera Focal Plane
  const allTargetsInfo: TargetInfo[] = s.targets.map((target) => {
    const relX = target.x - (effectiveCamX - boresightX);
    const relY = target.y - (effectiveCamY - boresightY);
    const inFov = relX >= 0 && relX <= camWidth && relY >= 0 && relY <= camHeight;

    return {
      id: target.id,
      worldPos: { x: target.x, y: target.y },
      cameraPos: inFov ? { x: relX, y: relY } : null,
      inFov,
      isPrimary: false,
      shape: target.shape,
      size: target.size,
    };
  });

  // 5. Nearest-Neighbor Primary Target Association
  const inFovTargets = allTargetsInfo.filter((t) => t.inFov && t.cameraPos !== null);
  let primaryTarget = inFovTargets.find((t) => t.id === s.primaryTargetId);

  if (!primaryTarget && inFovTargets.length > 0) {
    // If current primary lost, lock onto nearest to boresight
    inFovTargets.sort((a, b) => {
      const da = Math.hypot(a.cameraPos!.x - boresightX, a.cameraPos!.y - boresightY);
      const db = Math.hypot(b.cameraPos!.x - boresightX, b.cameraPos!.y - boresightY);
      return da - db;
    });
    s.primaryTargetId = inFovTargets[0].id;
    primaryTarget = inFovTargets[0];
  } else if (!primaryTarget) {
    // None in FOV, fallback to primary target world info
    const pWorld = s.targets.find((t) => t.id === s.primaryTargetId) || s.targets[0];
    primaryTarget = {
      id: pWorld.id,
      worldPos: { x: pWorld.x, y: pWorld.y },
      cameraPos: null,
      inFov: false,
      isPrimary: true,
      shape: pWorld.shape,
      size: pWorld.size,
    };
  }

  // Mark primary in allTargetsInfo
  allTargetsInfo.forEach((t) => {
    t.isPrimary = t.id === s.primaryTargetId;
  });

  const targetInFov = primaryTarget.inFov && primaryTarget.cameraPos !== null;
  s.targetX = primaryTarget.worldPos.x;
  s.targetY = primaryTarget.worldPos.y;
  s.targetTrail = s.targets.find((t) => t.id === s.primaryTargetId)?.trail || [];

  // 6. Centroid Detection with Noise & Atmospheric Impairments
  let detectedCentroid: { x: number; y: number } | null = null;
  let trackingErrorPx = 0;
  let trackingErrorDeg = 0;

  if (targetInFov && primaryTarget.cameraPos) {
    let detX = primaryTarget.cameraPos.x;
    let detY = primaryTarget.cameraPos.y;

    const masterNoise = (spec.noiseMasterIntensity ?? 100) / 100;

    // Atmospheric beam diffusion & scattering
    if (spec.atmosphericDisturbance !== 'Clear') {
      const sev = (spec.atmosphereSeverity ?? 50) / 100;
      let atmoSpread = 0;
      if (spec.atmosphericDisturbance === 'Fog') atmoSpread = 2.5 * sev;
      else if (spec.atmosphericDisturbance === 'Haze') atmoSpread = 1.2 * sev;
      else if (spec.atmosphericDisturbance === 'Rain') atmoSpread = 1.6 * sev;
      else if (spec.atmosphericDisturbance === 'Low light') atmoSpread = 2.0 * sev;

      detX += (Math.random() - 0.5) * atmoSpread * 2;
      detY += (Math.random() - 0.5) * atmoSpread * 2;
    }

    // Focal Plane Sensor Noise
    if (masterNoise > 0) {
      if (spec.noiseGaussianEnabled && spec.noiseGaussianStdDev > 0) {
        const gSpread = spec.noiseGaussianStdDev * masterNoise * 0.45;
        detX += (Math.random() - 0.5) * gSpread * 2;
        detY += (Math.random() - 0.5) * gSpread * 2;
      }
      if (spec.noiseSaltPepperEnabled && spec.noiseSaltPepperDensity > 0) {
        if (Math.random() < (spec.noiseSaltPepperDensity / 100) * masterNoise) {
          detX += (Math.random() - 0.5) * 6;
          detY += (Math.random() - 0.5) * 6;
        }
      }
      if (spec.noisePoissonEnabled && spec.noisePoissonScale > 0) {
        const pVariance = (100 / Math.max(1, spec.noisePoissonScale)) * 0.25 * masterNoise;
        detX += (Math.random() - 0.5) * pVariance;
        detY += (Math.random() - 0.5) * pVariance;
      }
    }

    detectedCentroid = {
      x: Math.max(0, Math.min(camWidth, detX)),
      y: Math.max(0, Math.min(camHeight, detY)),
    };

    const ex = detectedCentroid.x - boresightX;
    const ey = detectedCentroid.y - boresightY;
    trackingErrorPx = Math.sqrt(ex * ex + ey * ey);

    const degPerPx = spec.cameraFov.hDeg / camWidth;
    trackingErrorDeg = trackingErrorPx * degPerPx;
  }

  // 7. Pan/Tilt Servo Control Loop on Primary Target
  const pxPerDegH = camWidth / spec.cameraFov.hDeg;   // 160 px/deg
  const pxPerDegV = camHeight / spec.cameraFov.vDeg; // 160 px/deg
  const maxPanSpeedPxSec = spec.maxPanSpeed * pxPerDegH;
  const maxTiltSpeedPxSec = spec.maxTiltSpeed * pxPerDegV;

  let slewPanDegSec = 0;
  let slewTiltDegSec = 0;

  if (detectedCentroid) {
    const errX = detectedCentroid.x - boresightX;
    const errY = detectedCentroid.y - boresightY;

    const dErrX = (errX - s.lastErrorX) / Math.max(0.001, dt);
    const dErrY = (errY - s.lastErrorY) / Math.max(0.001, dt);
    s.lastErrorX = errX;
    s.lastErrorY = errY;

    const commandedVx = spec.kpPan * errX * 24 + spec.kdPan * dErrX;
    const commandedVy = spec.kpTilt * errY * 24 + spec.kdTilt * dErrY;

    const clampedVx = Math.max(-maxPanSpeedPxSec, Math.min(maxPanSpeedPxSec, commandedVx));
    const clampedVy = Math.max(-maxTiltSpeedPxSec, Math.min(maxTiltSpeedPxSec, commandedVy));

    s.camX += clampedVx * dt;
    s.camY += clampedVy * dt;

    slewPanDegSec = clampedVx / pxPerDegH;
    slewTiltDegSec = clampedVy / pxPerDegV;
  } else {
    s.lastErrorX = 0;
    s.lastErrorY = 0;
  }

  s.camX = Math.max(boresightX, Math.min(W - boresightX, s.camX));
  s.camY = Math.max(boresightY, Math.min(H - boresightY, s.camY));
  s.camPanSpeedDeg = Math.abs(slewPanDegSec);
  s.camTiltSpeedDeg = Math.abs(slewTiltDegSec);

  // 8. Performance KPIs & Metrics
  let isLocked = false;
  if (targetInFov && detectedCentroid) {
    if (trackingErrorPx <= spec.maxTrackingErrorPx) {
      isLocked = true;
      s.lockedFrames += 1;

      if (!s.hasAcquiredOnce) {
        s.hasAcquiredOnce = true;
        s.acquisitionTimeSec = Number((s.simTimeSec - (s.acquisitionStartTime || 0)).toFixed(2));
      }

      if (s.lossStartTime !== null) {
        s.lastReacquisitionTimeSec = Number((s.simTimeSec - s.lossStartTime).toFixed(2));
        s.lossStartTime = null;
      }
    } else {
      isLocked = false;
    }
  } else {
    isLocked = false;
    s.lostFrames += 1;
    if (s.lossStartTime === null) {
      s.lossStartTime = s.simTimeSec;
    }
  }

  if (detectedCentroid) {
    s.errorSum += trackingErrorPx;
    s.errorSqSum += trackingErrorPx * trackingErrorPx;
    if (trackingErrorPx > s.maxError) {
      s.maxError = trackingErrorPx;
    }
  }

  const validFrames = s.lockedFrames + s.lostFrames;
  const lockRetentionRate = validFrames > 0 ? (s.lockedFrames / validFrames) * 100 : 100;
  const targetLossPercent = validFrames > 0 ? (s.lostFrames / validFrames) * 100 : 0;
  const averageErrorPx = s.totalFrames > 0 ? s.errorSum / s.totalFrames : 0;
  const rmseErrorPx = s.totalFrames > 0 ? Math.sqrt(s.errorSqSum / s.totalFrames) : 0;
  const processingTimeMs = performance.now() - t0;
  const currentFps = Math.round(1 / Math.max(0.001, dt));

  const lockStatus: 'Tracking' | 'Lost' | 'Re-acquiring' = isLocked
    ? 'Tracking'
    : targetInFov
    ? 'Re-acquiring'
    : 'Lost';

  const metrics: TelemetryMetrics = {
    timestamp: nowMs,
    simDurationSec: Number(s.simTimeSec.toFixed(2)),
    fps: currentFps,
    processingTimeMs: Number(processingTimeMs.toFixed(1)),

    targetWorldPos: { x: s.targetX, y: s.targetY },
    cameraWorldPos: { x: s.camX, y: s.camY },
    effectiveCameraPos: { x: effectiveCamX, y: effectiveCamY },
    targetCameraPos: primaryTarget.cameraPos,
    detectedCentroid,
    boresightPos: { x: boresightX, y: boresightY },

    targetInFov,
    isLocked,
    lockStatus,
    trackingErrorPx: Number(trackingErrorPx.toFixed(2)),
    trackingErrorDeg: Number(trackingErrorDeg.toFixed(4)),

    panSpeedDegSec: Number(s.camPanSpeedDeg.toFixed(2)),
    tiltSpeedDegSec: Number(s.camTiltSpeedDeg.toFixed(2)),

    acquisitionTimeSec: s.acquisitionTimeSec,
    reacquisitionTimeSec: s.lastReacquisitionTimeSec,
    targetLossPercent: Number(targetLossPercent.toFixed(1)),
    targetLossRate: Number(targetLossPercent.toFixed(1)),
    lockRetentionRate: Number(lockRetentionRate.toFixed(1)),
    averageErrorPx: Number(averageErrorPx.toFixed(2)),
    rmseErrorPx: Number(rmseErrorPx.toFixed(2)),
    maxErrorPx: Number(s.maxError.toFixed(2)),
    totalFrames: s.totalFrames,

    primaryTargetId: s.primaryTargetId,
    allTargets: allTargetsInfo,
    jitterOffset: { dx: jitDx, dy: jitDy },
    platformOffset: { dx: platDx, dy: platDy },

    passAcquisition: s.acquisitionTimeSec <= spec.maxAcquisitionTimeSec,
    passTrackingError: trackingErrorPx <= spec.maxTrackingErrorPx,
    passTargetLoss: targetLossPercent < spec.maxTargetLossPercent,
    passReacquisition: s.lastReacquisitionTimeSec <= spec.maxReacquisitionTimeSec,
    passFps: currentFps >= spec.minProcessingFps,
  };

  return { nextState: s, metrics };
}
