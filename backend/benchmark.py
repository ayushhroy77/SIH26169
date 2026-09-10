"""
Benchmark-2 Performance Evaluator & Metrics Aggregator
Evaluates coarse-pointing tracker against pre-recorded video and ground truth.
Computes:
  - Centroid error (px)
  - Running Root Mean Square Error (RMSE px)
  - Peak/Max error (px)
  - Optical acquisition time (s)
  - Re-acquisition time after loss (s)
  - Lock retention rate (%)
  - Target loss rate (%)
  - Processing FPS & latency (ms)
Persists session JSON records for ISRO SIH technical evaluation and reporting.
"""

import os
import json
import time
import math
from typing import Dict, List, Optional, Tuple, Any
from spec import BenchmarkMetrics, SystemSpec

SESSIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sessions")
os.makedirs(SESSIONS_DIR, exist_ok=True)

class BenchmarkAggregator:
    def __init__(self, spec: Optional[SystemSpec] = None, is_approximate_gt: bool = False):
        self.spec = spec or SystemSpec()
        self.is_approximate_gt = is_approximate_gt
        self.reset()

    def reset(self):
        self.records: List[Dict[str, Any]] = []
        self.errors_squared_sum: float = 0.0
        self.errors_count: int = 0
        self.max_error_px: float = 0.0
        
        self.first_lock_frame: Optional[int] = None
        self.acquisition_time_s: float = 0.0
        self.reacquisition_time_s: float = 0.0
        
        self.locked_frames_count: int = 0
        self.total_frames_count: int = 0
        
        self.was_previously_locked: bool = False
        self.unlock_start_time_s: Optional[float] = None
        
        self.last_timestamp_s: Optional[float] = None
        self.frame_durations: List[float] = []

    def update(
        self,
        frame_idx: int,
        timestamp_s: float,
        detected_centroid: Optional[Tuple[float, float]],
        detected_bbox: Optional[Tuple[float, float, float, float]],
        gt_centroid: Optional[Tuple[float, float]],
        processing_time_ms: float
    ) -> BenchmarkMetrics:
        self.total_frames_count += 1
        
        # Calculate instantaneous FPS
        if self.last_timestamp_s is not None:
            dt = timestamp_s - self.last_timestamp_s
            if dt > 0.001:
                self.frame_durations.append(dt)
                if len(self.frame_durations) > 30:
                    self.frame_durations.pop(0)
        self.last_timestamp_s = timestamp_s

        avg_dt = sum(self.frame_durations) / len(self.frame_durations) if self.frame_durations else (1.0 / 30.0)
        fps_measured = round(1.0 / avg_dt, 1) if avg_dt > 0 else 30.0

        # Centroid error against Ground Truth
        error_px = 0.0
        is_locked = False

        if detected_centroid is not None and gt_centroid is not None:
            dx = detected_centroid[0] - gt_centroid[0]
            dy = detected_centroid[1] - gt_centroid[1]
            error_px = math.sqrt(dx * dx + dy * dy)
            self.errors_squared_sum += error_px * error_px
            self.errors_count += 1
            if error_px > self.max_error_px:
                self.max_error_px = error_px

            # Locked condition: within 10.0 px tolerance per spec
            is_locked = error_px <= self.spec.max_tracking_error_px
        else:
            # Beacon undetected or GT unavailable
            error_px = 99.0
            is_locked = False

        if is_locked:
            self.locked_frames_count += 1
            if self.first_lock_frame is None:
                self.first_lock_frame = frame_idx
                self.acquisition_time_s = round(timestamp_s, 2)
            
            # Check re-acquisition
            if not self.was_previously_locked and self.unlock_start_time_s is not None:
                reacq = timestamp_s - self.unlock_start_time_s
                self.reacquisition_time_s = round(reacq, 2)
                self.unlock_start_time_s = None
        else:
            if self.was_previously_locked and self.unlock_start_time_s is None:
                self.unlock_start_time_s = timestamp_s

        self.was_previously_locked = is_locked

        # Cumulative Metrics
        rmse_px = math.sqrt(self.errors_squared_sum / self.errors_count) if self.errors_count > 0 else 0.0
        lock_retention_pct = (self.locked_frames_count / self.total_frames_count * 100.0) if self.total_frames_count > 0 else 100.0
        target_loss_pct = 100.0 - lock_retention_pct

        # Append structured record
        det_dict = {"x": round(detected_centroid[0], 1), "y": round(detected_centroid[1], 1)} if detected_centroid else None
        bbox_dict = {"x": detected_bbox[0], "y": detected_bbox[1], "w": detected_bbox[2], "h": detected_bbox[3]} if detected_bbox else None
        gt_dict = {"x": round(gt_centroid[0], 1), "y": round(gt_centroid[1], 1)} if gt_centroid else None

        record = {
            "frame_idx": frame_idx,
            "timestamp_ms": round(timestamp_s * 1000.0, 1),
            "detected_x": det_dict["x"] if det_dict else None,
            "detected_y": det_dict["y"] if det_dict else None,
            "gt_x": gt_dict["x"] if gt_dict else None,
            "gt_y": gt_dict["y"] if gt_dict else None,
            "error_px": round(error_px, 2),
            "locked": is_locked,
            "processing_ms": round(processing_time_ms, 2)
        }
        self.records.append(record)

        return BenchmarkMetrics(
            frame_idx=frame_idx,
            timestamp_ms=round(timestamp_s * 1000.0, 1),
            detected_centroid=det_dict,
            detected_bbox=bbox_dict,
            gt_centroid=gt_dict,
            centroid_error_px=round(error_px, 2),
            rmse_px=round(rmse_px, 2),
            max_error_px=round(self.max_error_px, 2),
            acquisition_time_s=self.acquisition_time_s,
            reacquisition_time_s=self.reacquisition_time_s,
            lock_retention_pct=round(lock_retention_pct, 1),
            target_loss_pct=round(target_loss_pct, 1),
            processing_time_ms=round(processing_time_ms, 2),
            fps_measured=fps_measured,
            locked=is_locked,
            is_approximate_gt=self.is_approximate_gt,
            pass_rmse=rmse_px <= self.spec.max_tracking_error_px,
            pass_acq=self.acquisition_time_s <= self.spec.max_acquisition_time_sec,
            pass_reacq=self.reacquisition_time_s <= self.spec.max_reacquisition_time_sec,
            pass_lock=lock_retention_pct >= 95.0,
            pass_fps=fps_measured >= self.spec.min_processing_fps
        )

    def save_session(self, session_id: str) -> str:
        filepath = os.path.join(SESSIONS_DIR, f"{session_id}.json")
        summary = {
            "session_id": session_id,
            "total_frames": self.total_frames_count,
            "rmse_px": round(math.sqrt(self.errors_squared_sum / self.errors_count), 2) if self.errors_count > 0 else 0.0,
            "max_error_px": round(self.max_error_px, 2),
            "acquisition_time_s": self.acquisition_time_s,
            "reacquisition_time_s": self.reacquisition_time_s,
            "lock_retention_pct": round(self.locked_frames_count / max(1, self.total_frames_count) * 100.0, 1),
            "is_approximate_gt": self.is_approximate_gt,
            "records": self.records
        }
        with open(filepath, "w") as f:
            json.dump(summary, f, indent=2)
        return filepath

    @staticmethod
    def get_session(session_id: str) -> Optional[Dict[str, Any]]:
        filepath = os.path.join(SESSIONS_DIR, f"{session_id}.json")
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                return json.load(f)
        return None
