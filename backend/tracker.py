"""
Coarse Pointing Autonomous Tracker & Servo Controller (Baseline CV)
Extracts centroid via adaptive thresholding + center of mass, computes error relative
to optical boresight, and executes proportional pan/tilt control under velocity limits.
"""

import math
from typing import Optional, Tuple, Dict, Any
import cv2
import numpy as np
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

    def detect(self, frame: np.ndarray) -> Tuple[Optional[Tuple[float, float]], Optional[Tuple[float, float, float, float]]]:
        """
        Direct frame detection for Benchmark-2 mode.
        Applies thresholding and moment-based centroid calculation directly on raw video frames.
        Returns:
            ((cx, cy), (x, y, w, h)) or (None, None)
        """
        if frame is None:
            return None, None

        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame

        # Adaptive thresholding per spec (detection_threshold)
        thresh_val = getattr(self.spec, "detection_threshold", 180)
        _, binary = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY)

        # Morphological noise filtering
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        filtered = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        contours, _ = cv2.findContours(filtered, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            # Pick brightest or largest contour
            largest_c = max(contours, key=cv2.contourArea)
            m = cv2.moments(largest_c)
            if m["m00"] > 3:
                cx = m["m10"] / m["m00"]
                cy = m["m01"] / m["m00"]
                x, y, w, h = cv2.boundingRect(largest_c)
                return (cx, cy), (float(x), float(y), float(w), float(h))

        # Fallback to maximum intensity peak if bright beacon exists
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(gray)
        if max_val >= thresh_val:
            cx, cy = float(max_loc[0]), float(max_loc[1])
            return (cx, cy), (cx - 5.0, cy - 5.0, 10.0, 10.0)

        return None, None

    def track(self, detected_pt: Optional[Tuple[float, float]], dt: float = 1.0/30.0) -> Dict[str, Any]:
        """
        Executes coarse-pointing servo tracking loop for a detected beacon.
        Maintains virtual optical boresight position and computes gimbal slew commands.
        """
        deg_per_px_h = self.spec.camera_fov_h_deg / self.spec.camera_width
        deg_per_px_v = self.spec.camera_fov_v_deg / self.spec.camera_height

        if detected_pt is None:
            return {
                "lock_status": "Lost",
                "tracking_error_px": 0.0,
                "tracking_error_deg": 0.0,
                "pan_speed_deg_sec": 0.0,
                "tilt_speed_deg_sec": 0.0,
                "boresight": {"x": self.boresight_x, "y": self.boresight_y}
            }

        cx, cy = detected_pt
        err_x = cx - self.boresight_x
        err_y = cy - self.boresight_y
        error_px = math.sqrt(err_x**2 + err_y**2)

        # Proportional-Derivative gimbal slew rates
        d_err_x = (err_x - self.last_err_x) / max(0.001, dt)
        d_err_y = (err_y - self.last_err_y) / max(0.001, dt)
        self.last_err_x = err_x
        self.last_err_y = err_y

        cmd_pan_deg = (err_x * self.spec.kp_pan + d_err_x * self.spec.kd_pan) * 30.0 * deg_per_px_h
        cmd_tilt_deg = (err_y * self.spec.kp_tilt + d_err_y * self.spec.kd_tilt) * 30.0 * deg_per_px_v

        # Slew rate clamping to physical motor limits (5-10°/s)
        clamped_pan = max(-self.spec.max_pan_speed, min(self.spec.max_pan_speed, cmd_pan_deg))
        clamped_tilt = max(-self.spec.max_tilt_speed, min(self.spec.max_tilt_speed, cmd_tilt_deg))

        # Update virtual boresight position towards beacon
        px_per_deg_h = 1.0 / deg_per_px_h
        px_per_deg_v = 1.0 / deg_per_px_v
        self.boresight_x += clamped_pan * dt * px_per_deg_h
        self.boresight_y += clamped_tilt * dt * px_per_deg_v

        lock_status = "Tracking" if error_px <= self.spec.max_tracking_error_px else "Re-acquiring"

        return {
            "lock_status": lock_status,
            "tracking_error_px": round(error_px, 2),
            "tracking_error_deg": round(error_px * deg_per_px_h, 4),
            "pan_speed_deg_sec": round(abs(clamped_pan), 2),
            "tilt_speed_deg_sec": round(abs(clamped_tilt), 2),
            "boresight": {"x": round(self.boresight_x, 1), "y": round(self.boresight_y, 1)}
        }

    def process_frame(self, frame_b64: str, target_cam_pos: dict):
        if not target_cam_pos:
            return None, {
                "lock_status": "Lost",
                "tracking_error_px": 0.0,
                "tracking_error_deg": 0.0,
                "pan_speed_deg_sec": 0.0,
                "tilt_speed_deg_sec": 0.0,
                "detected_centroid": None
            }

        cx = target_cam_pos["x"]
        cy = target_cam_pos["y"]
        err_x = cx - self.boresight_x
        err_y = cy - self.boresight_y
        error_px = math.sqrt(err_x**2 + err_y**2)

        # Angular conversion
        deg_per_px_h = self.spec.camera_fov_h_deg / self.spec.camera_width
        deg_per_px_v = self.spec.camera_fov_v_deg / self.spec.camera_height

        # Proportional pan-tilt slew command
        cmd_pan_deg = err_x * deg_per_px_h * self.spec.kp_pan * 30.0
        cmd_tilt_deg = err_y * deg_per_px_v * self.spec.kp_tilt * 30.0

        # Enforce physical gimbal speed bounds (5-10 deg/s)
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
