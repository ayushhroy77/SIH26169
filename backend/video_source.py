"""
VideoSource Module for FSOC Benchmark-2 Video Ingestion
Opens pre-recorded benchmark videos (.mp4, .avi, .mov) via OpenCV, probes
metadata (fps, resolution, duration), and streams raw/JPEG frames for direct
injection into the coarse-pointing tracker (bypassing the virtual PTZ camera).
"""

import os
import time
import base64
from typing import Tuple, Optional
import cv2
import numpy as np

class VideoSource:
    def __init__(self, path: str):
        if not os.path.exists(path):
            raise FileNotFoundError(f"Video file not found at: {path}")
        
        self.path = path
        self.cap = cv2.VideoCapture(path)
        if not self.cap.isOpened():
            raise ValueError(f"OpenCV could not open video file: {path}")

        # Probe native video properties
        self._fps = float(self.cap.get(cv2.CAP_PROP_FPS) or 30.0)
        self._width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 640)
        self._height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 480)
        self._total_frames = int(self.cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        self._duration = self._total_frames / self._fps if self._fps > 0 else 0.0
        self._current_idx = 0

    def fps(self) -> float:
        return self._fps

    def resolution(self) -> Tuple[int, int]:
        return (self._width, self._height)

    def duration(self) -> float:
        return self._duration

    def frame_count(self) -> int:
        return self._total_frames

    def current_frame_idx(self) -> int:
        return self._current_idx

    def read(self) -> Tuple[Optional[np.ndarray], float]:
        """
        Reads the next sequential frame.
        Returns:
            (frame_bgr, timestamp_seconds) or (None, timestamp_seconds) at EOF.
        """
        if not self.cap.isOpened():
            return None, 0.0

        ret, frame = self.cap.read()
        if not ret or frame is None:
            return None, (self._current_idx / self._fps if self._fps > 0 else 0.0)

        timestamp_s = self._current_idx / self._fps if self._fps > 0 else 0.0
        self._current_idx += 1
        return frame, timestamp_s

    def read_jpeg_b64(self, quality: int = 85) -> Tuple[Optional[str], Optional[np.ndarray], float]:
        """
        Reads next frame and encodes it as base64 JPEG string for WebSocket delivery.
        """
        frame, ts = self.read()
        if frame is None:
            return None, None, ts

        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
        if not ret:
            return None, frame, ts

        b64_str = base64.b64encode(buffer).decode('utf-8')
        return b64_str, frame, ts

    def seek(self, frame_idx: int) -> bool:
        """
        Seeks video capture to a specific frame index.
        """
        if not self.cap.isOpened():
            return False
        clamped_idx = max(0, min(self._total_frames - 1, frame_idx))
        success = self.cap.set(cv2.CAP_PROP_POS_FRAMES, clamped_idx)
        if success:
            self._current_idx = clamped_idx
        return bool(success)

    def reset(self):
        """Rewinds video to beginning (frame 0)."""
        self.seek(0)

    def get_thumbnail_b64(self) -> str:
        """
        Captures the first valid frame as a base64 JPEG thumbnail without advancing position permanently.
        """
        orig_pos = self._current_idx
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
        ret, frame = self.cap.read()
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, orig_pos)
        self._current_idx = orig_pos

        if not ret or frame is None:
            # Generate black placeholder thumbnail
            frame = np.zeros((240, 320, 3), dtype=np.uint8)

        # Scale thumbnail to 320x240 for lightweight transmission
        thumb = cv2.resize(frame, (320, 240))
        ret, buffer = cv2.imencode('.jpg', thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        if ret:
            return base64.b64encode(buffer).decode('utf-8')
        return ""

    def release(self):
        """Releases the underlying OpenCV video capture handle."""
        if self.cap and self.cap.isOpened():
            self.cap.release()
