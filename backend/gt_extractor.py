"""
Ground Truth (GT) Extractor & Interpolator for FSOC Benchmark-2
Supports two evaluation pathways:
  1. User-provided GT:
     - CSV parsing: (frame_idx, x, y)
     - Click-to-mark linear interpolation between sparse user-clicked keyframes
  2. Auto-derived GT (Fallback):
     - Offline "teacher" detector on full video with large thresholding window,
       contour morphology, and a 5-frame temporal median filter.
"""

import csv
import io
import cv2
import numpy as np
from typing import Dict, Tuple, List, Optional

def parse_gt_csv(csv_text: str) -> Dict[int, Tuple[float, float]]:
    """
    Parses a CSV file containing ground-truth coordinates.
    Accepts formats:
      frame_idx, x, y
      frame, x, y
      time_s, x, y (if frame_idx missing, row index used)
    """
    gt_map: Dict[int, Tuple[float, float]] = {}
    f = io.StringIO(csv_text.strip())
    reader = csv.reader(f)
    
    header = None
    row_idx = 0
    for row in reader:
        if not row or len(row) < 2:
            continue
        # Check for header
        if any(h in row[0].lower() for h in ['frame', 'idx', 'time', 'x', 'y', 'target']):
            header = [c.strip().lower() for c in row]
            continue
        
        try:
            if len(row) >= 3:
                frame_val = int(float(row[0].strip()))
                x_val = float(row[1].strip())
                y_val = float(row[2].strip())
                gt_map[frame_val] = (x_val, y_val)
            elif len(row) == 2:
                # Row index as frame
                x_val = float(row[0].strip())
                y_val = float(row[1].strip())
                gt_map[row_idx] = (x_val, y_val)
            row_idx += 1
        except (ValueError, IndexError):
            continue

    return gt_map

def interpolate_marked_points(
    marked_samples: Dict[int, Tuple[float, float]],
    total_frames: int
) -> Dict[int, Tuple[float, float]]:
    """
    Linearly interpolates sparse click-to-mark keyframes across all video frames [0, total_frames - 1].
    Boundary frames before the first mark or after the last mark are clamped to the nearest keyframe.
    """
    if not marked_samples or total_frames <= 0:
        return {}

    sorted_frames = sorted(marked_samples.keys())
    if len(sorted_frames) == 1:
        single_val = marked_samples[sorted_frames[0]]
        return {i: single_val for i in range(total_frames)}

    interpolated: Dict[int, Tuple[float, float]] = {}

    for i in range(total_frames):
        if i in marked_samples:
            interpolated[i] = marked_samples[i]
        elif i < sorted_frames[0]:
            # Clamp to first marked sample
            interpolated[i] = marked_samples[sorted_frames[0]]
        elif i > sorted_frames[-1]:
            # Clamp to last marked sample
            interpolated[i] = marked_samples[sorted_frames[-1]]
        else:
            # Find bounding keyframes
            f_prev = max(f for f in sorted_frames if f <= i)
            f_next = min(f for f in sorted_frames if f >= i)
            if f_prev == f_next:
                interpolated[i] = marked_samples[f_prev]
            else:
                alpha = (i - f_prev) / float(f_next - f_prev)
                x0, y0 = marked_samples[f_prev]
                x1, y1 = marked_samples[f_next]
                interp_x = x0 + alpha * (x1 - x0)
                interp_y = y0 + alpha * (y1 - y0)
                interpolated[i] = (round(interp_x, 2), round(interp_y, 2))

    return interpolated

def extract_auto_gt(video_path: str, threshold: int = 170, temporal_window: int = 5) -> Dict[int, Tuple[float, float]]:
    """
    Offline 'teacher' detector on full video:
      - Reads every frame
      - Applies adaptive threshold + morphological opening
      - Extracts centroid
      - Applies a temporal rolling median filter (window=5) to eliminate transient noise spikes
    Returns:
      Dict[int, (x, y)] of robust, smoothed ground-truth coordinates.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return {}

    raw_centroids: List[Optional[Tuple[float, float]]] = []
    
    while True:
        ret, frame = cap.read()
        if not ret or frame is None:
            break

        if len(frame.shape) == 3:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        else:
            gray = frame

        # High-dynamic thresholding + morphological filtering
        _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        opened = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

        # Connected component moments
        moments = cv2.moments(opened)
        if moments["m00"] > 5:
            cx = moments["m10"] / moments["m00"]
            cy = moments["m01"] / moments["m00"]
            raw_centroids.append((cx, cy))
        else:
            # Fallback to brightest pixel local window
            min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(gray)
            if max_val > 100:
                raw_centroids.append((float(max_loc[0]), float(max_loc[1])))
            else:
                raw_centroids.append(None)

    cap.release()
    total_frames = len(raw_centroids)
    if total_frames == 0:
        return {}

    # Temporal median filter across rolling window
    smoothed_gt: Dict[int, Tuple[float, float]] = {}
    radius = temporal_window // 2

    # Forward fill / backward fill initial Nones
    first_valid = next((pt for pt in raw_centroids if pt is not None), (320.0, 240.0))
    filled_centroids = []
    last_valid = first_valid
    for pt in raw_centroids:
        if pt is not None:
            last_valid = pt
            filled_centroids.append(pt)
        else:
            filled_centroids.append(last_valid)

    for i in range(total_frames):
        start = max(0, i - radius)
        end = min(total_frames, i + radius + 1)
        sub_pts = filled_centroids[start:end]
        xs = [p[0] for p in sub_pts]
        ys = [p[1] for p in sub_pts]
        med_x = float(np.median(xs))
        med_y = float(np.median(ys))
        smoothed_gt[i] = (round(med_x, 2), round(med_y, 2))

    return smoothed_gt
