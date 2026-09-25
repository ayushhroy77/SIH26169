"""
Single Source of Truth: Python Dataclasses and Defaults
Strictly honors the non-negotiable ISRO SIH 2024 problem statement specification.
Department of Space / ISRO (Theme: Smart Automation & Space Technology)
Phase 2: Full Multi-Target and Disturbances & Noise implementation.
"""

from dataclasses import dataclass, field
from typing import Optional, Tuple, List, Dict, Any

@dataclass
class TargetBeaconConfig:
    id: int = 1
    shape: str = "Square"       # Square, Circle, Triangle, Cross, Custom
    size: int = 10              # 5-20 px
    initial_location: str = "Random" # Random, Center, Custom
    custom_pos: Optional[Dict[str, float]] = None
    motion: str = "Figure-of-8" # Straight Line, Circular, Figure-of-8, Random, Spiral, Sinusoidal, User-defined
    speed: float = 90.0         # 0-500 px/s
    waypoints: List[Dict[str, float]] = field(default_factory=list)
    custom_mask: Optional[List[List[int]]] = None # 32x32 binary grid

@dataclass
class MetricConfig:
    lock_radius_px: int = 12        # R — above spec's 10 px
    lock_frames_M: int = 3          # consecutive frames to confirm lock
    loss_frames_K: int = 5          # frames of miss to declare loss
    gt_source: str = "csv"          # or "click", "auto"

@dataclass
class DetectionConfig:
    median_kernel: int = 3
    gaussian_sigma: float = 0.8
    threshold_mode: str = "auto"     # "otsu" | "local" | "auto"
    morph_kernel: int = 3
    min_area: int = 3
    max_area_factor: float = 3.0
    min_compactness: float = 0.4
    top_k: int = 5

@dataclass
class SystemSpec:
    # 1. Screen size (min 2000x2000 px, default 2000x2000)
    screen_width: int = 2000
    screen_height: int = 2000

    # 2. Camera type (Monochrome default | Colour)
    camera_type: str = "Monochrome"

    # 3. Camera resolution (default 640x480)
    camera_width: int = 640
    camera_height: int = 480

    # 4. Camera FOV (default 4° x 3°)
    camera_fov_h_deg: float = 4.0
    camera_fov_v_deg: float = 3.0

    # 5. Camera update rate (min 30 Hz)
    camera_update_rate: int = 30

    # 6. Initial camera position (centre of screen: 1000, 1000)
    initial_camera_pos: Tuple[int, int] = (1000, 1000)

    # 7. Target type (Beacon Spot)
    target_type: str = "Beacon Spot"

    # 8. Number of targets (1 mandatory, multiple optional, max 8)
    target_count: int = 1
    targets: List[Dict[str, Any]] = field(default_factory=lambda: [
        {
            "id": 1,
            "shape": "Square",
            "size": 10,
            "initial_location": "Random",
            "motion": "Figure-of-8",
            "speed": 90.0,
            "waypoints": [],
            "custom_mask": None
        }
    ])

    # 9. Target shape (default Square, circle, triangle, cross, custom)
    target_shape: str = "Square"
    custom_mask_32x32: Optional[List[List[int]]] = None

    # 10. Target size (5-20 px, default 10x10)
    target_size: int = 10

    # 11. Initial target location (user-defined, default Random)
    initial_target_loc: str = "Random"
    custom_target_pos: Optional[Dict[str, float]] = None

    # 12. Motion (Straight Line, Circular, Figure-of-8, Random, Spiral, Sinusoidal, User-defined)
    target_motion: str = "Figure-of-8"
    target_speed: float = 90.0
    custom_path_waypoints: List[Dict[str, float]] = field(default_factory=list)

    # 13-15 Camera Motion Constraints
    max_pan_speed: float = 5.0       # 5-10°/s, default 5°/s
    max_tilt_speed: float = 5.0      # 5-10°/s, default 5°/s
    update_interval_hz: int = 30     # >= 20 Hz

    # 16-20 Performance Specifications (Live Tracked)
    max_acquisition_time_sec: float = 2.0  # <= 2 s
    max_tracking_error_px: float = 10.0   # <= 10 px
    max_target_loss_percent: float = 5.0  # < 5%
    max_reacquisition_time_sec: float = 1.0 # <= 1 s
    min_processing_fps: float = 20.0      # >= 20 FPS

    # 21-22 Image Noise (Master intensity + individual toggles)
    noise_master_intensity: float = 1.0   # 0.0 to 1.0 (0-100%)
    noise_sp_enabled: bool = True
    noise_sp_density: float = 0.10        # 0 to 0.20 (0-20%)
    noise_gauss_enabled: bool = False
    noise_gauss_std: float = 8.0          # 0 to 20 px std dev
    noise_poisson_enabled: bool = False
    noise_poisson_scale: float = 20.0     # 1 to 100

    # Legacy alias support
    noise_type: str = "Salt & Pepper"
    noise_std_dev: float = 8.0

    # 23 Camera Jitter
    camera_jitter_enabled: bool = True
    camera_jitter_intensity: float = 2.0  # 0 to 20 px/frame max
    camera_jitter_waveform: str = "Uniform" # Uniform | Perlin
    camera_jitter: float = 2.0

    # 24 Atmospheric Disturbance
    atmospheric_disturbance: str = "Clear" # Clear, Haze, Fog, Rain, Low light
    atmosphere_severity: float = 0.5       # 0.0 to 1.0 (0-100%)

    # 25 Platform Motion
    platform_motion: str = "Linear"        # Linear (default), Circular, Random, Spiral, Figure-of-8
    platform_motion_amp: float = 4.0       # 0 to 20 px/frame max

    # Detection & Servo Law
    detection_algorithm: str = "Adaptive+Morphology+Kalman"
    detection_threshold: int = 180
    median_kernel: int = 3
    gaussian_sigma: float = 0.8
    threshold_mode: str = "auto"     # "otsu" | "local" | "auto"
    morph_kernel: int = 3
    min_area: int = 3
    max_area_factor: float = 3.0
    min_compactness: float = 0.4
    top_k: int = 5
    detection_config: DetectionConfig = field(default_factory=DetectionConfig)

    # Kalman Filter (Phase 5)
    kalman_process_noise: float = 5.0
    kalman_meas_noise: float = 2.0
    kalman_gate_chi2: float = 9.21     # 99% confidence, 2 DOF
    coast_frames_max: int = 15         # 0.5 s at 30 Hz

    # Servo PID & Feed-Forward Law (Phase 5)
    kp_pan: float = 0.12
    kp_tilt: float = 0.12
    ki_pan: float = 0.005
    ki_tilt: float = 0.005
    kd_pan: float = 0.02
    kd_tilt: float = 0.02
    kff_pan: float = 0.05
    kff_tilt: float = 0.05
    integral_limit_deg: float = 2.0

    # Metric Criteria (Phase 4)
    lock_radius_px: int = 12        # R (5-20 px)
    lock_frames_m: int = 3          # M consecutive frames
    loss_frames_k: int = 5          # K consecutive miss frames
    gt_source: str = "csv"          # "csv", "click", "auto"
    metric_config: MetricConfig = field(default_factory=MetricConfig)

    # Input Mode ("Live Simulation" | "Video Ingestion")
    input_mode: str = "Live Simulation"

@dataclass
class VideoConfig:
    video_id: str = ""
    filename: str = ""
    filepath: str = ""
    width: int = 640
    height: int = 480
    fps: float = 30.0
    duration_sec: float = 0.0
    total_frames: int = 0
    thumbnail_b64: str = ""

@dataclass
class GTConfig:
    mode: str = "auto"                     # "csv" | "click" | "auto"
    is_approximate: bool = True           # True if auto-GT teacher detector
    gt_points: Dict[int, Tuple[float, float]] = field(default_factory=dict)
    marked_samples: Dict[int, Tuple[float, float]] = field(default_factory=dict)

@dataclass
class BenchmarkMetrics:
    frame_idx: int = 0
    timestamp_ms: float = 0.0
    detected_centroid: Optional[Dict[str, float]] = None
    detected_bbox: Optional[Dict[str, float]] = None
    gt_centroid: Optional[Dict[str, float]] = None
    centroid_error_px: float = 0.0
    rmse_px: float = 0.0
    max_error_px: float = 0.0
    acquisition_time_s: float = 0.0
    reacquisition_time_s: float = 0.0
    lock_retention_pct: float = 100.0
    target_loss_pct: float = 0.0
    processing_time_ms: float = 0.0
    fps_measured: float = 30.0
    locked: bool = False
    is_approximate_gt: bool = False
    pass_rmse: bool = True
    pass_acq: bool = True
    pass_reacq: bool = True
    pass_lock: bool = True
    pass_fps: bool = True

DEFAULT_SPEC = SystemSpec()
