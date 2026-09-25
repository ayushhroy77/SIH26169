"""
Coarse Pointing Autonomous Tracker & Servo Controller (Phase 5)
Department of Space / ISRO (SIH 2024)
Robust Multi-Stage Detection Pipeline, CV Kalman Filter with Chi2 Gating & Coasting,
Logged State Transitions (SEARCH | ACQUIRE | TRACK | COAST | REACQUIRE),
and PID + Feed-Forward Gimbal Servo Controller with Anti-Windup.
"""

from dataclasses import dataclass, field
import math
import time
from typing import Optional, Tuple, Dict, Any, List
import cv2
import numpy as np

from spec import SystemSpec, DetectionConfig
from kalman import CVKalman

@dataclass
class Candidate:
    x: float
    y: float
    area: int
    compactness: float
    mean_intensity: float
    score: float

def detect(frame: np.ndarray, cfg: Optional[DetectionConfig] = None, expected_size: int = 10) -> List[Candidate]:
    """
    Robust multi-stage detection pipeline:
      1. Grayscale conversion (if needed)
      2. Median prefilter (kernel 3) — removes impulse & Salt & Pepper noise
      3. Gaussian blur (sigma = 0.8) — smooths single-pixel dropouts
      4. Adaptive threshold:
           - Primary: Otsu's method
           - Fallback: local contrast (blockSize=31, C=5)
         Chooses Otsu when histogram is bimodal, else local contrast.
      5. Morphological opening (3x3 ellipse, 1 iteration) — eliminates thin noise bridges
      6. Connected components with stats
      7. Blob filtering by area, compactness >= 0.4, and local contrast intensity
      8. Candidate scoring: score = w1*intensity + w2*compactness + w3*area_prior
      9. Sort candidates descending by score and return top K.
    """
    if frame is None or frame.size == 0:
        return []

    if cfg is None:
        cfg = DetectionConfig()

    # 1. Grayscale
    if len(frame.shape) == 3:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    else:
        gray = frame.copy()

    # 2. Median prefilter (kernel must be odd >= 3)
    k_med = max(3, int(cfg.median_kernel))
    if k_med % 2 == 0:
        k_med += 1
    med = cv2.medianBlur(gray, k_med)

    # 3. Gaussian blur
    sigma = max(0.1, float(cfg.gaussian_sigma))
    blurred = cv2.GaussianBlur(med, (0, 0), sigmaX=sigma, sigmaY=sigma)

    # 4. Adaptive thresholding
    mode = cfg.threshold_mode.lower() if cfg.threshold_mode else "auto"
    bg_mean = float(np.mean(blurred))
    bg_std = float(np.std(blurred))
    otsu_val, binary_otsu = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Test bimodality: 2+ peaks and Otsu threshold separates beacon above noise floor
    hist = cv2.calcHist([blurred], [0], None, [32], [0, 256]).flatten()
    peaks = 0
    total_pix = hist.sum()
    for i in range(1, len(hist) - 1):
        if hist[i] > hist[i - 1] and hist[i] > hist[i + 1] and hist[i] > 0.01 * total_pix:
            peaks += 1

    is_bimodal = (peaks >= 2 and otsu_val > bg_mean + 2.5 * max(1.0, bg_std))
    white_ratio_otsu = np.count_nonzero(binary_otsu) / binary_otsu.size

    if mode == "otsu" or (mode == "auto" and is_bimodal and 0 < white_ratio_otsu < 0.20):
        binary = binary_otsu
    elif mode == "local":
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 31, -5
        )
    else:
        # Fallback local contrast above background noise floor
        thresh = max(otsu_val, bg_mean + 3.0 * max(1.0, bg_std))
        _, binary = cv2.threshold(blurred, thresh, 255, cv2.THRESH_BINARY)

    # 5. Morphological opening (3x3 ellipse, 1 iteration)
    m_k = max(3, int(cfg.morph_kernel))
    if m_k % 2 == 0:
        m_k += 1
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (m_k, m_k))
    opened = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

    # 6. Connected components
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(opened, connectivity=8)

    min_area = int(cfg.min_area)
    max_area = int((expected_size ** 2) * float(cfg.max_area_factor))
    min_comp = float(cfg.min_compactness)

    global_bg_mean = float(np.mean(blurred))
    global_bg_std = float(np.std(blurred))

    candidates: List[Candidate] = []
    H, W = blurred.shape

    # 7. Blob filtering
    for i in range(1, num_labels):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area < min_area or area > max_area:
            continue

        cx = float(centroids[i][0])
        cy = float(centroids[i][1])

        x_left = int(stats[i, cv2.CC_STAT_LEFT])
        y_top = int(stats[i, cv2.CC_STAT_TOP])
        w = int(stats[i, cv2.CC_STAT_WIDTH])
        h = int(stats[i, cv2.CC_STAT_HEIGHT])

        # Sub-mask for contour compactness
        sub_mask = (labels[y_top:y_top + h, x_left:x_left + w] == i).astype(np.uint8)
        cnts, _ = cv2.findContours(sub_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        if cnts:
            perimeter = cv2.arcLength(cnts[0], True)
            compactness = (4.0 * math.pi * area) / (perimeter ** 2) if perimeter > 0 else 0.0
        else:
            compactness = 0.0

        if compactness < min_comp:
            continue

        # Local background contrast check
        pad = 12
        y1 = max(0, y_top - pad)
        y2 = min(H, y_top + h + pad)
        x1 = max(0, x_left - pad)
        x2 = min(W, x_left + w + pad)
        roi_labels = labels[y1:y2, x1:x2]
        roi_blurred = blurred[y1:y2, x1:x2]
        bg_pixels = roi_blurred[roi_labels == 0]
        local_bg = float(np.mean(bg_pixels)) if len(bg_pixels) > 0 else global_bg_mean
        local_sigma = float(np.std(bg_pixels)) if len(bg_pixels) > 0 else global_bg_std

        sub_blurred = blurred[y_top:y_top + h, x_left:x_left + w]
        fg_pixels = sub_blurred[sub_mask > 0]
        if len(fg_pixels) == 0:
            continue
        mean_intensity = float(np.mean(fg_pixels))

        if mean_intensity < (local_bg + 1.8 * max(1.0, local_sigma)):
            continue

        # 8. Candidate scoring
        min_v = float(np.min(blurred))
        max_v = float(np.max(blurred))
        intensity_norm = (mean_intensity - min_v) / max(1.0, max_v - min_v)
        norm_compactness = min(1.0, max(0.0, compactness))
        expected_area = float(expected_size ** 2)
        area_diff = abs(area - expected_area) / max(1.0, expected_area)
        area_prior = math.exp(-0.5 * ((area_diff / 1.5) ** 2))

        score = 0.50 * intensity_norm + 0.25 * norm_compactness + 0.25 * area_prior

        candidates.append(Candidate(
            x=round(cx, 2),
            y=round(cy, 2),
            area=area,
            compactness=round(compactness, 3),
            mean_intensity=round(mean_intensity, 1),
            score=round(score, 4)
        ))

    # 9. Sort candidates by score descending and return top K
    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates[:cfg.top_k]


class PIDServoController:
    """
    PID Gimbal Servo Controller with Feed-Forward, Anti-Windup, and Hard Slew Clamping.
    """
    def __init__(
        self,
        kp_pan: float = 0.12,
        ki_pan: float = 0.005,
        kd_pan: float = 0.02,
        kff_pan: float = 0.05,
        kp_tilt: float = 0.12,
        ki_tilt: float = 0.005,
        kd_tilt: float = 0.02,
        kff_tilt: float = 0.05,
        max_pan_speed: float = 5.0,
        max_tilt_speed: float = 5.0,
        integral_limit_deg: float = 2.0
    ):
        self.kp_pan = kp_pan
        self.ki_pan = ki_pan
        self.kd_pan = kd_pan
        self.kff_pan = kff_pan

        self.kp_tilt = kp_tilt
        self.ki_tilt = ki_tilt
        self.kd_tilt = kd_tilt
        self.kff_tilt = kff_tilt

        self.max_pan_speed = max_pan_speed
        self.max_tilt_speed = max_tilt_speed
        self.integral_limit_deg = integral_limit_deg

        self.reset()

    def reset(self):
        self.integral_pan_deg = 0.0
        self.integral_tilt_deg = 0.0
        self.last_err_x_px = 0.0
        self.last_err_y_px = 0.0

    def compute(
        self,
        err_x_px: float,
        err_y_px: float,
        vel_x_px_s: float,
        vel_y_px_s: float,
        deg_per_px_h: float,
        deg_per_px_v: float,
        dt: float
    ) -> Tuple[float, float]:
        dt_safe = max(0.001, dt)

        # Angular errors
        err_pan_deg = err_x_px * deg_per_px_h
        err_tilt_deg = err_y_px * deg_per_px_v

        # Derivative
        d_err_x = (err_x_px - self.last_err_x_px) / dt_safe
        d_err_y = (err_y_px - self.last_err_y_px) / dt_safe
        self.last_err_x_px = err_x_px
        self.last_err_y_px = err_y_px

        d_err_pan_deg = d_err_x * deg_per_px_h
        d_err_tilt_deg = d_err_y * deg_per_px_v

        # Feed-forward
        ff_pan_deg = (vel_x_px_s * deg_per_px_h) * self.kff_pan
        ff_tilt_deg = (vel_y_px_s * deg_per_px_v) * self.kff_tilt

        # Anti-windup integral accumulation
        self.integral_pan_deg += err_pan_deg * dt
        self.integral_pan_deg = max(-self.integral_limit_deg, min(self.integral_limit_deg, self.integral_pan_deg))

        self.integral_tilt_deg += err_tilt_deg * dt
        self.integral_tilt_deg = max(-self.integral_limit_deg, min(self.integral_limit_deg, self.integral_tilt_deg))

        # Closed-loop PID + Feed-Forward command
        cmd_pan = (
            self.kp_pan * err_pan_deg * 30.0 +
            self.ki_pan * self.integral_pan_deg * 30.0 +
            self.kd_pan * d_err_pan_deg +
            ff_pan_deg
        )
        cmd_tilt = (
            self.kp_tilt * err_tilt_deg * 30.0 +
            self.ki_tilt * self.integral_tilt_deg * 30.0 +
            self.kd_tilt * d_err_tilt_deg +
            ff_tilt_deg
        )

        # Hard motor slew clamping (5-10 deg/s)
        clamped_pan = max(-self.max_pan_speed, min(self.max_pan_speed, cmd_pan))
        clamped_tilt = max(-self.max_tilt_speed, min(self.max_tilt_speed, cmd_tilt_deg if hasattr(self, "cmd_tilt") else cmd_tilt))

        return clamped_pan, clamped_tilt


class CentroidTracker:
    """
    Coarse Pointing Autonomous Tracker & Servo Controller (Phase 5).
    Maintains Kalman filter state, logs formal state transitions, and commands PID servo.
    """
    def __init__(self, spec: SystemSpec):
        self.spec = spec
        self.boresight_x = spec.camera_width / 2.0
        self.boresight_y = spec.camera_height / 2.0
        self.detection_cfg = getattr(spec, "detection_config", DetectionConfig())

        # Subsystems
        self.kalman = CVKalman(
            dt=1.0 / 30.0,
            process_noise=getattr(spec, "kalman_process_noise", 5.0),
            meas_noise=getattr(spec, "kalman_meas_noise", 2.0),
            gate_chi2=getattr(spec, "kalman_gate_chi2", 9.21),
            coast_frames_max=getattr(spec, "coast_frames_max", 15)
        )

        self.servo = PIDServoController(
            kp_pan=getattr(spec, "kp_pan", 0.12),
            ki_pan=getattr(spec, "ki_pan", 0.005),
            kd_pan=getattr(spec, "kd_pan", 0.02),
            kff_pan=getattr(spec, "kff_pan", 0.05),
            kp_tilt=getattr(spec, "kp_tilt", 0.12),
            ki_tilt=getattr(spec, "ki_tilt", 0.005),
            kd_tilt=getattr(spec, "kd_tilt", 0.02),
            kff_tilt=getattr(spec, "kff_tilt", 0.05),
            max_pan_speed=getattr(spec, "max_pan_speed", 5.0),
            max_tilt_speed=getattr(spec, "max_tilt_speed", 5.0),
            integral_limit_deg=getattr(spec, "integral_limit_deg", 2.0)
        )

        self.reset()

    def reset(self):
        self.boresight_x = self.spec.camera_width / 2.0
        self.boresight_y = self.spec.camera_height / 2.0
        self.kalman.reset()
        self.servo.reset()

        # Formal State Machine
        self.lock_state = "SEARCH"  # SEARCH | ACQUIRE | TRACK | COAST | REACQUIRE
        self.consecutive_lock_count = 0
        self.consecutive_loss_count = 0
        self.state_transitions: List[Dict[str, Any]] = []

        self.total_frames = 0
        self.sim_time_s = 0.0
        self.last_candidate: Optional[Candidate] = None

    def update_spec(self, spec: SystemSpec):
        self.spec = spec
        self.detection_cfg = getattr(spec, "detection_config", DetectionConfig())
        self.kalman.update_params(
            process_noise=getattr(spec, "kalman_process_noise", 5.0),
            meas_noise=getattr(spec, "kalman_meas_noise", 2.0),
            gate_chi2=getattr(spec, "kalman_gate_chi2", 9.21),
            coast_frames_max=getattr(spec, "coast_frames_max", 15)
        )
        self.servo.kp_pan = getattr(spec, "kp_pan", 0.12)
        self.servo.ki_pan = getattr(spec, "ki_pan", 0.005)
        self.servo.kd_pan = getattr(spec, "kd_pan", 0.02)
        self.servo.kff_pan = getattr(spec, "kff_pan", 0.05)
        self.servo.kp_tilt = getattr(spec, "kp_tilt", 0.12)
        self.servo.ki_tilt = getattr(spec, "ki_tilt", 0.005)
        self.servo.kd_tilt = getattr(spec, "kd_tilt", 0.02)
        self.servo.kff_tilt = getattr(spec, "kff_tilt", 0.05)
        self.servo.max_pan_speed = getattr(spec, "max_pan_speed", 5.0)
        self.servo.max_tilt_speed = getattr(spec, "max_tilt_speed", 5.0)

    def log_transition(self, from_state: str, to_state: str, reason: str):
        record = {
            "frame": self.total_frames,
            "sim_time_s": round(self.sim_time_s, 4),
            "from_state": from_state,
            "to_state": to_state,
            "reason": reason
        }
        self.state_transitions.append(record)

    def detect(self, frame: np.ndarray) -> Tuple[Optional[Tuple[float, float]], Optional[Tuple[float, float, float, float]]]:
        """
        Backwards-compatible detect interface for benchmark video ingestion.
        Returns:
            ((cx, cy), (x, y, w, h)) or (None, None)
        """
        candidates = detect(frame, self.detection_cfg, expected_size=self.spec.target_size)
        if candidates:
            top = candidates[0]
            w = math.sqrt(max(1, top.area))
            h = w
            return (top.x, top.y), (top.x - w / 2.0, top.y - h / 2.0, w, h)
        return None, None

    def track(self, detected_pt: Optional[Tuple[float, float]], dt: float = 1.0 / 30.0) -> Dict[str, Any]:
        """
        Legacy track method updated with PID + Kalman integration.
        """
        self.total_frames += 1
        self.sim_time_s += dt

        deg_per_px_h = self.spec.camera_fov_h_deg / self.spec.camera_width
        deg_per_px_v = self.spec.camera_fov_v_deg / self.spec.camera_height

        # Kalman prediction
        pred = self.kalman.predict()

        if detected_pt is not None:
            self.kalman.update(detected_pt)
            cx, cy = detected_pt
        elif self.kalman.initialized and self.kalman.coast():
            cx, cy = float(pred[0]), float(pred[1])
        else:
            return {
                "lock_status": "Lost",
                "tracking_error_px": 0.0,
                "tracking_error_deg": 0.0,
                "pan_speed_deg_sec": 0.0,
                "tilt_speed_deg_sec": 0.0,
                "boresight": {"x": round(self.boresight_x, 1), "y": round(self.boresight_y, 1)}
            }

        err_x = cx - self.boresight_x
        err_y = cy - self.boresight_y
        error_px = math.hypot(err_x, err_y)

        vx, vy = float(self.kalman.x[2, 0]), float(self.kalman.x[3, 0])
        clamped_pan, clamped_tilt = self.servo.compute(
            err_x, err_y, vx, vy, deg_per_px_h, deg_per_px_v, dt
        )

        lock_status = "Tracking" if error_px <= self.spec.max_tracking_error_px else "Re-acquiring"

        return {
            "lock_status": lock_status,
            "tracking_error_px": round(error_px, 2),
            "tracking_error_deg": round(error_px * deg_per_px_h, 4),
            "pan_speed_deg_sec": round(abs(clamped_pan), 2),
            "tilt_speed_deg_sec": round(abs(clamped_tilt), 2),
            "boresight": {"x": round(self.boresight_x, 1), "y": round(self.boresight_y, 1)}
        }

    def detect_and_track_raw(
        self,
        frame: np.ndarray,
        target_cam_pos: Optional[dict] = None,
        dt: float = 1.0 / 30.0
    ) -> Tuple[Optional[Dict[str, float]], Dict[str, Any]]:
        """
        Executes full Phase 5 perception-action loop:
          1. Multi-candidate robust detection
          2. Kalman predict + Chi2 gating association
          3. State machine update & logged transitions
          4. PID + Feed-Forward gimbal servoing
        """
        self.total_frames += 1
        self.sim_time_s += dt

        deg_per_px_h = self.spec.camera_fov_h_deg / self.spec.camera_width
        deg_per_px_v = self.spec.camera_fov_v_deg / self.spec.camera_height
        px_per_deg_h = 1.0 / deg_per_px_h
        px_per_deg_v = 1.0 / deg_per_px_v

        R = getattr(self.spec, "lock_radius_px", 12)
        M = getattr(self.spec, "lock_frames_m", 3)
        K = getattr(self.spec, "loss_frames_k", 5)

        # 1. Detection Candidates
        candidates = detect(frame, self.detection_cfg, expected_size=self.spec.target_size)

        # 2. Kalman Project
        pred_state = self.kalman.predict()
        pred_x, pred_y = float(pred_state[0]), float(pred_state[1])

        # 3. Association & Chi2 Gating
        selected_meas: Optional[Candidate] = None
        if candidates:
            if self.kalman.initialized:
                # Gated candidates
                in_gate = [c for c in candidates if self.kalman.is_in_gate((c.x, c.y))]
                if in_gate:
                    # Choose candidate minimizing Mahalanobis distance / score
                    selected_meas = min(in_gate, key=lambda c: self.kalman.mahalanobis((c.x, c.y)) / (0.1 + c.score))
            else:
                # Initial acquisition: pick top scored candidate
                selected_meas = candidates[0]
                self.kalman.init_state(selected_meas.x, selected_meas.y)

        # 4. State Machine Transition Logic
        old_state = self.lock_state
        target_pt: Optional[Tuple[float, float]] = None

        if selected_meas is not None:
            self.kalman.update((selected_meas.x, selected_meas.y))
            target_pt = (selected_meas.x, selected_meas.y)
            self.last_candidate = selected_meas

            err_x = target_pt[0] - self.boresight_x
            err_y = target_pt[1] - self.boresight_y
            error_px = math.hypot(err_x, err_y)

            if error_px <= R:
                self.consecutive_lock_count += 1
                self.consecutive_loss_count = 0
                if self.consecutive_lock_count >= M:
                    new_state = "TRACK"
                else:
                    new_state = "ACQUIRE"
            else:
                self.consecutive_lock_count = 0
                self.consecutive_loss_count += 1
                if self.consecutive_loss_count >= K:
                    new_state = "REACQUIRE"
                else:
                    new_state = "COAST" if old_state in ["TRACK", "COAST"] else "SEARCH"
        else:
            # Measurement absent or gated out -> Coast via Kalman prediction
            self.consecutive_lock_count = 0
            self.consecutive_loss_count += 1

            can_coast = self.kalman.coast()
            if can_coast and old_state in ["TRACK", "COAST"]:
                new_state = "COAST"
                target_pt = (pred_x, pred_y)
                err_x = pred_x - self.boresight_x
                err_y = pred_y - self.boresight_y
                error_px = math.hypot(err_x, err_y)
            else:
                new_state = "REACQUIRE" if self.consecutive_loss_count >= K else "SEARCH"
                err_x = 0.0
                err_y = 0.0
                error_px = 0.0

        if new_state != old_state:
            reason = f"lock_cnt={self.consecutive_lock_count}, loss_cnt={self.consecutive_loss_count}, err={error_px:.1f}px"
            self.log_transition(old_state, new_state, reason)
            self.lock_state = new_state

        # 5. PID + Feed-Forward Gimbal Servo
        if target_pt is not None:
            vx, vy = float(self.kalman.x[2, 0]), float(self.kalman.x[3, 0])
            clamped_pan, clamped_tilt = self.servo.compute(
                err_x, err_y, vx, vy, deg_per_px_h, deg_per_px_v, dt
            )
        else:
            clamped_pan, clamped_tilt = 0.0, 0.0

        centroid_dict = (
            {"x": round(target_pt[0], 1), "y": round(target_pt[1], 1)}
            if target_pt is not None else None
        )

        track_res = {
            "lock_status": "Tracking" if self.lock_state == "TRACK" else self.lock_state,
            "lock_state": self.lock_state,
            "tracking_error_px": round(error_px, 2),
            "tracking_error_deg": round(error_px * deg_per_px_h, 4),
            "pan_speed_deg_sec": round(abs(clamped_pan), 2),
            "tilt_speed_deg_sec": round(abs(clamped_tilt), 2),
            "pan_cmd_deg_sec": clamped_pan,
            "tilt_cmd_deg_sec": clamped_tilt,
            "boresight": {"x": round(self.boresight_x, 1), "y": round(self.boresight_y, 1)},
            "detected_centroid": centroid_dict,
            "candidates_count": len(candidates),
            "kalman_state": {
                "x": round(float(self.kalman.x[0, 0]), 1),
                "y": round(float(self.kalman.x[1, 0]), 1),
                "vx": round(float(self.kalman.x[2, 0]), 1),
                "vy": round(float(self.kalman.x[3, 0]), 1),
                "coast_count": self.kalman.coast_count
            }
        }
        return centroid_dict, track_res

    def process_frame(self, frame_b64: str, target_cam_pos: dict):
        """
        Decodes b64 frame and runs detection + tracking loop.
        """
        if not frame_b64:
            return None, {
                "lock_status": "Lost",
                "lock_state": "SEARCH",
                "tracking_error_px": 0.0,
                "tracking_error_deg": 0.0,
                "pan_speed_deg_sec": 0.0,
                "tilt_speed_deg_sec": 0.0,
                "detected_centroid": None
            }

        # Decode base64 image
        try:
            if "," in frame_b64:
                frame_data = frame_b64.split(",", 1)[1]
            else:
                frame_data = frame_b64
            import base64
            nparr = np.frombuffer(base64.b64decode(frame_data), np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception:
            frame = None

        if frame is not None:
            return self.detect_and_track_raw(frame, target_cam_pos, dt=1.0 / 30.0)

        # Fallback to simulated target position if decoding unavailable
        deg_per_px_h = self.spec.camera_fov_h_deg / self.spec.camera_width
        deg_per_px_v = self.spec.camera_fov_v_deg / self.spec.camera_height
        px_per_deg_h = 1.0 / deg_per_px_h
        px_per_deg_v = 1.0 / deg_per_px_v

        if target_cam_pos:
            cx, cy = target_cam_pos["x"], target_cam_pos["y"]
            err_x = cx - self.boresight_x
            err_y = cy - self.boresight_y
            error_px = math.hypot(err_x, err_y)
            clamped_pan, clamped_tilt = self.servo.compute(
                err_x, err_y, 0.0, 0.0, deg_per_px_h, deg_per_px_v, 1.0 / 30.0
            )
            self.boresight_x += clamped_pan * (1.0 / 30.0) * px_per_deg_h
            self.boresight_y += clamped_tilt * (1.0 / 30.0) * px_per_deg_v
            lock_status = "Tracking" if error_px <= self.spec.max_tracking_error_px else "Re-acquiring"
            return {"x": cx, "y": cy}, {
                "lock_status": lock_status,
                "lock_state": self.lock_state,
                "tracking_error_px": round(error_px, 2),
                "tracking_error_deg": round(error_px * deg_per_px_h, 4),
                "pan_speed_deg_sec": round(abs(clamped_pan), 2),
                "tilt_speed_deg_sec": round(abs(clamped_tilt), 2),
                "pan_cmd_deg_sec": clamped_pan,
                "tilt_cmd_deg_sec": clamped_tilt,
                "detected_centroid": {"x": round(cx, 1), "y": round(cy, 1)}
            }
        return None, {
            "lock_status": "Lost",
            "lock_state": "SEARCH",
            "tracking_error_px": 0.0,
            "tracking_error_deg": 0.0,
            "pan_speed_deg_sec": 0.0,
            "tilt_speed_deg_sec": 0.0,
            "detected_centroid": None
        }
