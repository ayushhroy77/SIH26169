"""
Server-side 2000x2000 Scene Rendering & Physical Kinematics (OpenCV + NumPy)
Phase 2: Multi-Target (N=1..8), Custom Shapes & Masks, Extended Kinematics,
and Composable Disturbance Engine (Noise, Atmosphere, Jitter, Platform Motion).
Department of Space / ISRO (SIH 2024)
"""

import numpy as np
import cv2
import base64
import math
from typing import List, Dict, Any, Tuple, Optional
from spec import SystemSpec
from disturbances import NoiseModel, AtmosphereModel, CameraJitter, PlatformMotion

class TargetState:
    def __init__(self, target_id: int, config: Dict[str, Any], screen_w: int, screen_h: int):
        self.id = target_id
        self.shape = config.get("shape", "Square")
        self.size = config.get("size", 10)
        self.motion = config.get("motion", "Figure-of-8")
        self.speed = float(config.get("speed", 90.0))
        self.waypoints = config.get("waypoints", [])
        self.custom_mask = config.get("custom_mask", None)
        
        # Position initialization
        loc = config.get("initial_location", "Random")
        custom_pos = config.get("custom_pos")
        
        if custom_pos and "x" in custom_pos and "y" in custom_pos:
            self.x = float(custom_pos["x"])
            self.y = float(custom_pos["y"])
        elif loc == "Center":
            self.x = screen_w / 2.0 + (target_id - 1) * 30.0
            self.y = screen_h / 2.0 + (target_id - 1) * 30.0
        else: # Random
            np.random.seed(target_id * 1013 + 7)
            self.x = 350.0 + np.random.rand() * (screen_w - 700.0)
            self.y = 350.0 + np.random.rand() * (screen_h - 700.0)

        angle = np.random.rand() * math.pi * 2.0
        self.vx = math.cos(angle) * self.speed
        self.vy = math.sin(angle) * self.speed
        self.angle = (target_id - 1) * (math.pi / 4.0)
        self.trail: List[Tuple[float, float]] = []
        self.waypoint_idx = 0
        self.waypoint_t = 0.0

    def step(self, dt: float, sim_time: float, screen_w: int, screen_h: int):
        margin = 100.0
        speed = self.speed

        if self.motion == "Straight Line":
            self.x += self.vx * dt
            self.y += self.vy * dt
            if self.x < margin:
                self.x = margin
                self.vx = abs(self.vx)
            elif self.x > screen_w - margin:
                self.x = screen_w - margin
                self.vx = -abs(self.vx)
            if self.y < margin:
                self.y = margin
                self.vy = abs(self.vy)
            elif self.y > screen_h - margin:
                self.y = screen_h - margin
                self.vy = -abs(self.vy)

        elif self.motion == "Circular":
            radius = 350.0 + (self.id - 1) * 40.0
            omega = speed / max(10.0, radius)
            self.angle += omega * dt
            self.x = screen_w / 2.0 + math.cos(self.angle) * radius
            self.y = screen_h / 2.0 + math.sin(self.angle) * radius

        elif self.motion == "Figure-of-8":
            a = 420.0
            omega = 0.35 * (speed / 90.0)
            self.angle += omega * dt
            sin_t = math.sin(self.angle)
            cos_t = math.cos(self.angle)
            denom = 1.0 + sin_t * sin_t
            self.x = screen_w / 2.0 + (a * cos_t) / denom
            self.y = screen_h / 2.0 + (a * sin_t * cos_t) / denom

        elif self.motion == "Spiral":
            # Archimedean Spiral: r = a + b * theta
            omega = 0.8 * (speed / 90.0)
            self.angle += omega * dt
            r = (80.0 + (sim_time * 30.0 + (self.id - 1) * 70.0) % 500.0)
            self.x = screen_w / 2.0 + math.cos(self.angle) * r
            self.y = screen_h / 2.0 + math.sin(self.angle) * r

        elif self.motion == "Sinusoidal":
            # X progress + Y sinusoid
            self.x += (speed * 0.85) * dt
            if self.x > screen_w - margin:
                self.x = margin
            freq = 1.5 + (self.id - 1) * 0.3
            self.y = screen_h / 2.0 + math.sin(sim_time * freq + self.id) * 280.0

        elif self.motion == "User-defined" and len(self.waypoints) >= 2:
            # Interpolate through waypoints
            p1 = self.waypoints[self.waypoint_idx]
            next_idx = (self.waypoint_idx + 1) % len(self.waypoints)
            p2 = self.waypoints[next_idx]
            
            dx = p2["x"] - p1["x"]
            dy = p2["y"] - p1["y"]
            dist = math.hypot(dx, dy)
            travel_time = max(0.01, dist / max(20.0, speed))
            self.waypoint_t += dt / travel_time
            if self.waypoint_t >= 1.0:
                self.waypoint_t = 0.0
                self.waypoint_idx = next_idx
            
            # Smooth cubic ease
            t = self.waypoint_t
            smooth_t = t * t * (3.0 - 2.0 * t)
            self.x = p1["x"] + dx * smooth_t
            self.y = p1["y"] + dy * smooth_t

        else: # Random walk
            self.x += (np.random.rand() - 0.5) * speed * dt * 2.2
            self.y += (np.random.rand() - 0.5) * speed * dt * 2.2
            self.x = max(margin, min(screen_w - margin, self.x))
            self.y = max(margin, min(screen_h - margin, self.y))


class SimulationEngine:
    def __init__(self, spec: SystemSpec):
        self.spec = spec
        self.jitter_engine = CameraJitter()
        self.platform_engine = PlatformMotion()
        self.targets: List[TargetState] = []
        self.primary_target_id = 1
        self.reset()

    def reset(self):
        self.sim_time = 0.0
        self.total_frames = 0
        self.cam_x = float(self.spec.initial_camera_pos[0])
        self.cam_y = float(self.spec.initial_camera_pos[1])
        self.init_targets()

    def init_targets(self):
        self.targets = []
        count = max(1, min(8, self.spec.target_count))
        for i in range(count):
            target_id = i + 1
            cfg = self.spec.targets[i] if i < len(self.spec.targets) else {
                "id": target_id,
                "shape": self.spec.target_shape,
                "size": self.spec.target_size,
                "initial_location": self.spec.initial_target_loc,
                "motion": self.spec.target_motion,
                "speed": self.spec.target_speed,
                "waypoints": self.spec.custom_path_waypoints,
                "custom_mask": self.spec.custom_mask_32x32
            }
            self.targets.append(TargetState(target_id, cfg, self.spec.screen_width, self.spec.screen_height))
        self.primary_target_id = 1

    def update_spec(self, spec: SystemSpec):
        old_count = len(self.targets)
        self.spec = spec
        if len(self.targets) != spec.target_count:
            self.init_targets()
        else:
            # Update configs
            for i, target in enumerate(self.targets):
                if i < len(spec.targets):
                    cfg = spec.targets[i]
                    target.shape = cfg.get("shape", target.shape)
                    target.size = cfg.get("size", target.size)
                    target.motion = cfg.get("motion", target.motion)
                    target.speed = float(cfg.get("speed", target.speed))
                    target.waypoints = cfg.get("waypoints", target.waypoints)
                    target.custom_mask = cfg.get("custom_mask", target.custom_mask)

    def draw_shape(self, img: np.ndarray, shape: str, rx: int, ry: int, size: int, is_mono: bool, custom_mask: Optional[List[List[int]]] = None):
        half = max(2, size // 2)
        color = 255 if is_mono else (255, 255, 255)

        if shape == "Square":
            cv2.rectangle(img, (rx - half, ry - half), (rx + half, ry + half), color, -1)

        elif shape == "Circle":
            cv2.circle(img, (rx, ry), half, color, -1)

        elif shape == "Triangle":
            pts = np.array([
                [rx, ry - half],
                [rx - half, ry + half],
                [rx + half, ry + half]
            ], np.int32)
            cv2.fillPoly(img, [pts], color)

        elif shape == "Cross":
            thickness = max(1, size // 4)
            cv2.line(img, (rx - half, ry), (rx + half, ry), color, thickness)
            cv2.line(img, (rx, ry - half), (rx, ry + half), color, thickness)

        elif shape == "Custom" and custom_mask is not None:
            # 32x32 binary mask scaled to target size
            mask_np = np.array(custom_mask, dtype=np.uint8) * 255
            if mask_np.shape[0] > 0 and mask_np.shape[1] > 0:
                resized_mask = cv2.resize(mask_np, (size, size), interpolation=cv2.INTER_NEAREST)
                y1 = max(0, ry - half)
                y2 = min(img.shape[0], y1 + size)
                x1 = max(0, rx - half)
                x2 = min(img.shape[1], x1 + size)
                my1, my2 = 0, y2 - y1
                mx1, mx2 = 0, x2 - x1
                if my2 > my1 and mx2 > mx1:
                    sub_mask = resized_mask[my1:my2, mx1:mx2]
                    if is_mono:
                        img[y1:y2, x1:x2] = np.maximum(img[y1:y2, x1:x2], sub_mask)
                    else:
                        for c in range(3):
                            img[y1:y2, x1:x2, c] = np.maximum(img[y1:y2, x1:x2, c], sub_mask)
        else:
            # Default square
            cv2.rectangle(img, (rx - half, ry - half), (rx + half, ry + half), color, -1)

    def step(self, dt: float) -> Tuple[str, Dict[str, Any]]:
        self.sim_time += dt
        self.total_frames += 1

        # 1. Step all targets
        for target in self.targets:
            target.step(dt, self.sim_time, self.spec.screen_width, self.spec.screen_height)

        # 2. Camera Platform Disturbance & Jitter
        plat_dx, plat_dy = self.platform_engine.compute(
            self.spec.platform_motion,
            self.spec.platform_motion_amp,
            self.sim_time,
            dt
        )

        jit_dx, jit_dy = self.jitter_engine.compute(
            self.spec.camera_jitter_enabled,
            self.spec.camera_jitter_intensity,
            self.spec.camera_jitter_waveform,
            dt
        )

        effective_cam_x = self.cam_x + plat_dx + jit_dx
        effective_cam_y = self.cam_y + plat_dy + jit_dy

        # 3. Viewport Geometry
        cw = self.spec.camera_width
        ch = self.spec.camera_height
        boresight_x = cw / 2.0
        boresight_y = ch / 2.0

        # Determine Primary Target (closest to boresight or lock-maintained)
        in_fov_targets = []
        targets_info = []

        for target in self.targets:
            rel_x = target.x - (effective_cam_x - boresight_x)
            rel_y = target.y - (effective_cam_y - boresight_y)
            in_fov = (0 <= rel_x <= cw) and (0 <= rel_y <= ch)
            dist_to_bore = math.hypot(rel_x - boresight_x, rel_y - boresight_y) if in_fov else 9999.0
            
            info = {
                "id": target.id,
                "world_pos": {"x": target.x, "y": target.y},
                "camera_pos": {"x": rel_x, "y": rel_y} if in_fov else None,
                "in_fov": in_fov,
                "dist_to_bore": dist_to_bore,
                "shape": target.shape,
                "size": target.size
            }
            targets_info.append(info)
            if in_fov:
                in_fov_targets.append(info)

        # Update primary target selection
        primary_info = None
        if in_fov_targets:
            # Check if current primary is still in FOV
            current_primary = next((t for t in in_fov_targets if t["id"] == self.primary_target_id), None)
            if current_primary:
                primary_info = current_primary
            else:
                # Nearest to boresight
                in_fov_targets.sort(key=lambda t: t["dist_to_bore"])
                self.primary_target_id = in_fov_targets[0]["id"]
                primary_info = in_fov_targets[0]
        else:
            # If none in FOV, keep primary target ID
            primary_info = next((t for t in targets_info if t["id"] == self.primary_target_id), targets_info[0] if targets_info else None)

        # 4. Render Camera FOV Frame
        is_mono = (self.spec.camera_type == "Monochrome")
        base_frame = np.zeros((ch, cw), dtype=np.uint8) if is_mono else np.zeros((ch, cw, 3), dtype=np.uint8)

        # Draw all visible beacons
        for t_info in targets_info:
            if t_info["in_fov"] and t_info["camera_pos"]:
                rx = int(round(t_info["camera_pos"]["x"]))
                ry = int(round(t_info["camera_pos"]["y"]))
                target_obj = next((t for t in self.targets if t.id == t_info["id"]), None)
                mask = target_obj.custom_mask if target_obj else None
                self.draw_shape(base_frame, t_info["shape"], rx, ry, t_info["size"], is_mono, mask)

        # 5. Composable Disturbance Pipeline:
        # frame -> noise -> atmosphere -> output
        frame_noisy = NoiseModel.apply(
            base_frame,
            master_intensity=self.spec.noise_master_intensity,
            sp_enabled=self.spec.noise_sp_enabled,
            sp_density=self.spec.noise_sp_density,
            gauss_enabled=self.spec.noise_gauss_enabled,
            gauss_std=self.spec.noise_gauss_std,
            poisson_enabled=self.spec.noise_poisson_enabled,
            poisson_scale=self.spec.noise_poisson_scale
        )

        frame_final = AtmosphereModel.apply(
            frame_noisy,
            condition=self.spec.atmospheric_disturbance,
            severity=self.spec.atmosphere_severity,
            frame_idx=self.total_frames
        )

        # Encode JPEG base64
        _, buffer = cv2.imencode('.jpg', frame_final, [cv2.IMWRITE_JPEG_QUALITY, 75])
        jpg_as_text = base64.b64encode(buffer).decode('utf-8')

        sim_metrics = {
            "primary_target_id": self.primary_target_id,
            "target_world_pos": primary_info["world_pos"] if primary_info else {"x": 1000.0, "y": 1000.0},
            "camera_world_pos": {"x": self.cam_x, "y": self.cam_y},
            "effective_camera_pos": {"x": effective_cam_x, "y": effective_cam_y},
            "target_camera_pos": primary_info["camera_pos"] if (primary_info and primary_info["in_fov"]) else None,
            "target_in_fov": primary_info["in_fov"] if primary_info else False,
            "all_targets": targets_info,
            "jitter_offset": {"dx": jit_dx, "dy": jit_dy},
            "platform_offset": {"dx": plat_dx, "dy": plat_dy},
            "sim_duration_sec": round(self.sim_time, 2),
            "boresight_pos": {"x": boresight_x, "y": boresight_y}
        }

        return f"data:image/jpeg;base64,{jpg_as_text}", sim_metrics
