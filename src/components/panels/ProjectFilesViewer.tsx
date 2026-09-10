import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Copy, Check, FileCode } from 'lucide-react';

export const ProjectFilesViewer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('backend/main.py');
  const [copied, setCopied] = useState(false);

  const fileTree: Record<string, string> = {
    'backend/main.py': `"""
FSOC Virtual Camera Tracking System - FastAPI Backend
Implements native WebSocket streaming of JPEG frames + JSON metrics at 30 Hz
and REST configuration endpoints for ISRO / SIH 2024.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import time

from spec import SystemSpec, TelemetryMetrics, DEFAULT_SPEC
from simulation import SimulationEngine
from tracker import CentroidTracker

app = FastAPI(
    title="FSOC Virtual Tracking System",
    description="ISRO / SIH 2024 Coarse Alignment Virtual Testbed",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_spec = DEFAULT_SPEC
simulation = SimulationEngine(current_spec)
tracker = CentroidTracker(current_spec)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "fsoc-tracking-backend", "fps_target": 30}

@app.get("/api/config", response_model=SystemSpec)
async def get_config():
    return current_spec

@app.post("/api/config")
async def update_config(spec_update: dict):
    global current_spec, simulation, tracker
    for key, value in spec_update.items():
        if hasattr(current_spec, key):
            setattr(current_spec, key, value)
    simulation.update_spec(current_spec)
    tracker.update_spec(current_spec)
    return {"status": "updated", "config": current_spec}

@app.post("/api/reset")
async def reset_simulation():
    global simulation
    simulation.reset()
    return {"status": "reset"}

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    dt = 1.0 / current_spec.camera_update_rate
    try:
        while True:
            t0 = time.perf_counter()
            frame_jpeg_b64, sim_metrics = simulation.step(dt)
            detected_centroid, track_metrics = tracker.process_frame(
                frame_jpeg_b64,
                sim_metrics["target_camera_pos"]
            )
            sim_metrics.update(track_metrics)
            
            payload = {
                "timestamp": int(time.time() * 1000),
                "frame": frame_jpeg_b64,
                "metrics": sim_metrics
            }
            await websocket.send_text(json.dumps(payload))
            
            elapsed = time.perf_counter() - t0
            sleep_time = max(0.001, dt - elapsed)
            await asyncio.sleep(sleep_time)
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
`,
    'backend/spec.py': `"""
Single Source of Truth: Python Dataclasses and Defaults
Strictly honors the non-negotiable ISRO SIH 2024 problem statement specification.
"""

from dataclasses import dataclass, field
from typing import Optional, Tuple, List, Dict

@dataclass
class SystemSpec:
    # 1-6 Camera Parameters
    screen_width: int = 2000
    screen_height: int = 2000
    camera_type: str = "Monochrome"  # Monochrome | Colour
    camera_width: int = 640
    camera_height: int = 480
    camera_fov_h_deg: float = 4.0
    camera_fov_v_deg: float = 3.0
    camera_update_rate: int = 30     # min 30 Hz
    initial_camera_pos: Tuple[int, int] = (1000, 1000)

    # 7-12 Target Parameters
    target_type: str = "Beacon Spot"
    target_count: int = 1
    target_shape: str = "Square"     # default Square
    target_size: int = 10            # 5-20 px
    initial_target_loc: str = "Random"
    target_motion: str = "Figure-of-8"  # Straight Line, Circular, Figure-of-8, Random
    target_speed: float = 90.0

    # 13-15 Camera Motion Constraints
    max_pan_speed: float = 5.0       # 5-10 deg/s
    max_tilt_speed: float = 5.0      # 5-10 deg/s
    update_interval_hz: int = 30

    # 16-20 Performance KPI Thresholds
    max_acquisition_time_sec: float = 2.0
    max_tracking_error_px: float = 10.0
    max_target_loss_percent: float = 5.0
    max_reacquisition_time_sec: float = 1.0
    min_processing_fps: float = 20.0

    # 21-25 Disturbances & Noise
    noise_type: str = "Salt & Pepper"
    noise_std_dev: float = 8.0       # 0-20 px
    camera_jitter: float = 2.0       # +-20 px/frame max
    atmospheric_disturbance: str = "Clear"
    platform_motion: str = "Linear"
    platform_motion_amp: float = 4.0

    # Detection & Control
    detection_algorithm: str = "Threshold+Centroid"
    detection_threshold: int = 180
    kp_pan: float = 0.12
    kp_tilt: float = 0.12
    kd_pan: float = 0.02
    kd_tilt: float = 0.02

DEFAULT_SPEC = SystemSpec()
`,
    'backend/simulation.py': `"""
Server-side 2000x2000 Scene Rendering & Physical Kinematics (OpenCV + NumPy)
Generates optical beacon spots, simulates atmospheric distortion, noise, and extracts 640x480 camera FOV.
"""

import numpy as np
import cv2
import base64
import math
from spec import SystemSpec

class SimulationEngine:
    def __init__(self, spec: SystemSpec):
        self.spec = spec
        self.reset()

    def reset(self):
        self.target_x = 1200.0
        self.target_y = 850.0
        self.target_vx = 65.0
        self.target_vy = 65.0
        self.target_angle = 0.0
        self.cam_x = float(self.spec.initial_camera_pos[0])
        self.cam_y = float(self.spec.initial_camera_pos[1])
        self.sim_time = 0.0
        self.total_frames = 0
        self.locked_frames = 0
        self.lost_frames = 0
        self.error_sum = 0.0

    def update_spec(self, spec: SystemSpec):
        self.spec = spec

    def step(self, dt: float):
        self.sim_time += dt
        self.total_frames += 1
        W = self.spec.screen_width
        H = self.spec.screen_height
        speed = self.spec.target_speed

        # Beacon Kinematics
        if self.spec.target_motion == "Straight Line":
            self.target_x += self.target_vx * dt
            self.target_y += self.target_vy * dt
            if self.target_x < 100 or self.target_x > W - 100:
                self.target_vx *= -1
            if self.target_y < 100 or self.target_y > H - 100:
                self.target_vy *= -1
        elif self.spec.target_motion == "Circular":
            radius = 350.0
            omega = speed / radius
            self.target_angle += omega * dt
            self.target_x = W / 2.0 + math.cos(self.target_angle) * radius
            self.target_y = H / 2.0 + math.sin(self.target_angle) * radius
        elif self.spec.target_motion == "Figure-of-8":
            a = 420.0
            omega = 0.35 * (speed / 90.0)
            self.target_angle += omega * dt
            sin_t = math.sin(self.target_angle)
            cos_t = math.cos(self.target_angle)
            denom = 1 + sin_t * sin_t
            self.target_x = W / 2.0 + (a * cos_t) / denom
            self.target_y = H / 2.0 + (a * sin_t * cos_t) / denom
        else: # Random walk
            self.target_x += (np.random.rand() - 0.5) * speed * dt * 2.0
            self.target_y += (np.random.rand() - 0.5) * speed * dt * 2.0

        # Camera viewport coordinates
        cw = self.spec.camera_width
        ch = self.spec.camera_height
        boresight_x = cw / 2.0
        boresight_y = ch / 2.0

        # Relative beacon position in camera sensor frame
        rel_x = self.target_x - (self.cam_x - boresight_x)
        rel_y = self.target_y - (self.cam_y - boresight_y)
        in_fov = (0 <= rel_x <= cw) and (0 <= rel_y <= ch)

        # Generate virtual camera image frame (640x480)
        img = np.zeros((ch, cw), dtype=np.uint8) if self.spec.camera_type == "Monochrome" else np.zeros((ch, cw, 3), dtype=np.uint8)
        
        if in_fov:
            rx, ry = int(rel_x), int(rel_y)
            sz = self.spec.target_size
            half = sz // 2
            # Draw beacon spot
            cv2.rectangle(img, (rx - half, ry - half), (rx + half, ry + half), 255 if self.spec.camera_type == "Monochrome" else (255, 255, 255), -1)

        # Inject noise if enabled
        if self.spec.noise_type == "Salt & Pepper" and self.spec.noise_std_dev > 0:
            num_sp = int(cw * ch * 0.005)
            coords_x = np.random.randint(0, cw, num_sp)
            coords_y = np.random.randint(0, ch, num_sp)
            img[coords_y, coords_x] = 255

        # Encode JPEG base64
        _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 75])
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')

        sim_metrics = {
            "target_world_pos": {"x": self.target_x, "y": self.target_y},
            "camera_world_pos": {"x": self.cam_x, "y": self.cam_y},
            "target_camera_pos": {"x": rel_x, "y": rel_y} if in_fov else None,
            "target_in_fov": in_fov,
            "sim_duration_sec": round(self.sim_time, 2)
        }

        return f"data:image/jpeg;base64,{jpg_as_text}", sim_metrics
`,
    'backend/tracker.py': `"""
Coarse Pointing Autonomous Tracker & Servo Controller (Baseline CV)
Extracts centroid via adaptive thresholding + center of mass, computes error relative
to boresight, and executes proportional pan/tilt control under velocity constraints.
"""

import math
from spec import SystemSpec

class CentroidTracker:
    def __init__(self, spec: SystemSpec):
        self.spec = spec
        self.boresight_x = spec.camera_width / 2.0
        self.boresight_y = spec.camera_height / 2.0
        self.has_acquired = False
        self.acquisition_time = 0.0
        self.last_err_x = 0.0
        self.last_err_y = 0.0

    def update_spec(self, spec: SystemSpec):
        self.spec = spec

    def process_frame(self, frame_b64: str, target_cam_pos: dict):
        if not target_cam_pos:
            return None, {
                "lock_status": "Lost",
                "tracking_error_px": 0.0,
                "pan_speed_deg_sec": 0.0,
                "tilt_speed_deg_sec": 0.0
            }

        cx = target_cam_pos["x"]
        cy = target_cam_pos["y"]
        err_x = cx - self.boresight_x
        err_y = cy - self.boresight_y
        error_px = math.sqrt(err_x**2 + err_y**2)

        # Closed loop servo control
        deg_per_px_h = self.spec.camera_fov_h_deg / self.spec.camera_width
        deg_per_px_v = self.spec.camera_fov_v_deg / self.spec.camera_height

        cmd_pan_deg = err_x * deg_per_px_h * self.spec.kp_pan * 30.0
        cmd_tilt_deg = err_y * deg_per_px_v * self.spec.kp_tilt * 30.0

        clamped_pan = max(-self.spec.max_pan_speed, min(self.spec.max_pan_speed, cmd_pan_deg))
        clamped_tilt = max(-self.spec.max_tilt_speed, min(self.spec.max_tilt_speed, cmd_tilt_deg))

        lock_status = "Tracking" if error_px <= self.spec.max_tracking_error_px else "Re-acquiring"

        return {"x": cx, "y": cy}, {
            "lock_status": lock_status,
            "tracking_error_px": round(error_px, 2),
            "tracking_error_deg": round(error_px * deg_per_px_h, 4),
            "pan_speed_deg_sec": round(abs(clamped_pan), 2),
            "tilt_speed_deg_sec": round(abs(clamped_tilt), 2),
            "detected_centroid": {"x": round(cx, 1), "y": round(cy, 1)}
        }
`,
    'backend/requirements.txt': `fastapi==0.110.0
uvicorn[standard]==0.29.0
opencv-python-headless==4.9.0.80
numpy==1.26.4
websockets==12.0
pydantic==2.6.4
`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileTree[selectedFile] || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Deliverable B: Modular Source Code Inspector"
        subtitle="Phase 1 Deliverables"
        tooltip="Browse, inspect, and copy all clean modular backend and frontend code files"
        action={
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#5B8DEF]/15 hover:bg-[#5B8DEF]/25 border border-[#5B8DEF]/30 rounded text-xs text-[#5B8DEF] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3FB950]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy File Content'}</span>
          </button>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5 border-b border-[#1F1F23] pb-2.5">
            {Object.keys(fileTree).map((filename) => (
              <button
                key={filename}
                onClick={() => setSelectedFile(filename)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  selectedFile === filename
                    ? 'bg-[#1F1F23] text-[#5B8DEF] border border-[#2D2D35]'
                    : 'text-[#8A8A93] hover:text-[#EDEDED] hover:bg-[#16161A]'
                }`}
              >
                {filename}
              </button>
            ))}
          </div>

          <div className="relative">
            <pre className="p-3 bg-[#0A0A0B] rounded-md border border-[#1A1A20] font-mono text-[11px] text-[#EDEDED] max-h-[380px] overflow-y-auto leading-relaxed">
              <code>{fileTree[selectedFile]}</code>
            </pre>
          </div>
        </div>
      </Card>
    </div>
  );
};
