"""
FSOC Coarse Alignment Virtual Testbed - Disturbances & Noise Engine
Department of Space / ISRO (SIH 2024)

Implements Spec Items 21–25:
- Spec 21/22: Image Noise (Salt & Pepper, Gaussian, Poisson)
- Spec 23: Camera Jitter (Uniform / Perlin-style smooth)
- Spec 24: Atmospheric Disturbances (Clear, Haze, Fog, Rain, Low Light)
- Spec 25: Platform Motion (Linear, Circular, Random, Spiral, Figure-of-8)
"""

import numpy as np
import cv2
import math
from typing import Tuple, List, Optional

class NoiseModel:
    """
    Simulates optical sensor noise on the camera focal plane array.
    Order of execution: Salt & Pepper -> Gaussian -> Poisson.
    Controlled by individual toggles and scaled by a master intensity factor.
    """
    @staticmethod
    def apply(
        frame: np.ndarray,
        master_intensity: float = 1.0,
        sp_enabled: bool = False,
        sp_density: float = 0.10,  # 0.0 to 0.20 (0-20%)
        gauss_enabled: bool = False,
        gauss_std: float = 8.0,     # 0 to 20 px std dev
        poisson_enabled: bool = False,
        poisson_scale: float = 20.0, # 1 to 100
        rng: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        if master_intensity <= 0.001:
            return frame

        out = frame.astype(np.float32)
        h, w = frame.shape[:2]
        is_mono = (len(frame.shape) == 2 or frame.shape[2] == 1)
        r = rng if rng is not None else np.random.default_rng()

        # 1. Salt & Pepper Noise (0-20% density)
        if sp_enabled and sp_density > 0:
            effective_density = min(0.25, sp_density * master_intensity)
            num_salt = int(np.ceil(effective_density * 0.5 * h * w))
            num_pepper = int(np.ceil(effective_density * 0.5 * h * w))

            # Salt (White pixels)
            if num_salt > 0:
                y_coords = r.integers(0, h, num_salt)
                x_coords = r.integers(0, w, num_salt)
                if is_mono:
                    out[y_coords, x_coords] = 255.0
                else:
                    out[y_coords, x_coords] = [255.0, 255.0, 255.0]

            # Pepper (Dark pixels)
            if num_pepper > 0:
                y_coords = r.integers(0, h, num_pepper)
                x_coords = r.integers(0, w, num_pepper)
                if is_mono:
                    out[y_coords, x_coords] = 0.0
                else:
                    out[y_coords, x_coords] = [0.0, 0.0, 0.0]

        # 2. Gaussian Noise (mean 0, std-dev 0-20 px per spec item 22 — hard-clamped)
        if gauss_enabled and gauss_std > 0:
            clamped_std = min(20.0, max(0.0, gauss_std))
            effective_sigma = clamped_std * master_intensity
            noise = r.normal(0, effective_sigma, frame.shape)
            out = out + noise

        # 3. Poisson / Shot Noise (Photon noise model)
        if poisson_enabled and poisson_scale > 0:
            # Scale frame to photon count, sample Poisson, scale back
            scale = max(1.0, poisson_scale * (1.0 / max(0.1, master_intensity)))
            scaled = np.maximum(0.0, out) / scale
            poisson_noisy = r.poisson(scaled).astype(np.float32) * scale
            blend_factor = min(1.0, master_intensity)
            out = out * (1.0 - blend_factor) + poisson_noisy * blend_factor

        return np.clip(out, 0, 255).astype(np.uint8)


class AtmosphereModel:
    """
    Physical atmospheric degradation model:
    - Clear: Nominal transmission
    - Haze: Reduced contrast ~20%, slight white veil
    - Fog: Reduced contrast ~40%, brightness lift, Gaussian blur
    - Rain: Directional streak noise + 10% contrast loss
    - Low Light: Reduced brightness ~50%, boosted gain noise
    Severity slider: 0.0 to 1.0 (0-100%).
    """
    @staticmethod
    def apply(
        frame: np.ndarray,
        condition: str = "Clear",
        severity: float = 0.5,
        frame_idx: int = 0,
        rng: Optional[np.random.Generator] = None
    ) -> np.ndarray:
        if condition == "Clear" or severity <= 0.01:
            return frame

        s = float(np.clip(severity, 0.0, 1.0))
        out = frame.astype(np.float32)
        h, w = frame.shape[:2]
        is_mono = (len(frame.shape) == 2 or frame.shape[2] == 1)
        r = rng if rng is not None else np.random.default_rng()

        if condition == "Haze":
            # Contrast reduction by ~20% * severity, white airlight veil
            contrast_factor = 1.0 - (0.35 * s)
            veil = 40.0 * s
            out = out * contrast_factor + veil

        elif condition == "Fog":
            # Severe Mie scattering: contrast drop by up to 50%, large diffuse brightness lift, blur
            contrast_factor = 1.0 - (0.55 * s)
            brightness_lift = 70.0 * s
            out = out * contrast_factor + brightness_lift
            blur_ksize = max(3, int(round(3 + s * 4)))
            if blur_ksize % 2 == 0:
                blur_ksize += 1
            blurred = cv2.GaussianBlur(out, (blur_ksize, blur_ksize), 1.5 * s)
            out = blurred

        elif condition == "Rain":
            # Contrast loss ~15% * s
            out = out * (1.0 - 0.18 * s)
            # Diagonal rain streaks
            streak_img = np.zeros((h, w), dtype=np.float32)
            num_streaks = int(80 * s)
            xs = r.integers(0, w, num_streaks)
            ys = r.integers(0, h, num_streaks)
            lengths = r.integers(12, 28, num_streaks)
            for x, y, l in zip(xs, ys, lengths):
                cv2.line(streak_img, (x, y), (int(x - l * 0.4), int(y + l)), 180.0 * s, 1)
            if not is_mono:
                streak_img = cv2.cvtColor(streak_img, cv2.COLOR_GRAY2BGR)
            out = cv2.add(out, streak_img)

        elif condition == "Low light":
            # Reduction in scene brightness ~50% * s, ambient photon starvation, sensor gain noise
            attenuation = 1.0 - (0.65 * s)
            out = out * attenuation
            gain_noise = r.normal(0, 10.0 * s, frame.shape).astype(np.float32)
            out = out + gain_noise

        return np.clip(out, 0, 255).astype(np.uint8)


class CameraJitter:
    """
    High-frequency mechanical/angular jitter of the camera pan-tilt mounting.
    Applied after control update, before rendering.
    Supports Uniform random or Perlin-style smooth oscillatory jitter.
    Intensity: 0 to 20 px/frame (spec maximum).
    """
    def __init__(self, rng: Optional[np.random.Generator] = None):
        self.phase_x = 0.0
        self.phase_y = 0.0
        self.rng = rng if rng is not None else np.random.default_rng()

    def set_rng(self, rng: np.random.Generator):
        self.rng = rng

    def compute(
        self,
        enabled: bool,
        intensity: float,
        waveform: str = "Uniform",
        dt: float = 0.033
    ) -> Tuple[float, float]:
        if not enabled or intensity <= 0.001:
            return 0.0, 0.0

        amp = min(20.0, max(0.0, intensity))

        if waveform == "Perlin":
            # Smooth synthetic band-limited harmonic jitter (simulates structural resonance)
            self.phase_x += dt * 18.0
            self.phase_y += dt * 23.5
            jx = (math.sin(self.phase_x) * 0.6 + math.sin(self.phase_x * 2.3) * 0.4) * amp
            jy = (math.cos(self.phase_y) * 0.6 + math.cos(self.phase_y * 1.9) * 0.4) * amp
            return jx, jy
        else:
            # Uniform high-frequency random jitter using subsystem generator
            jx = (self.rng.random() - 0.5) * 2.0 * amp
            jy = (self.rng.random() - 0.5) * 2.0 * amp
            return float(jx), float(jy)


class PlatformMotion:
    """
    Base vehicle / terminal platform kinematics disturbance (Spec Item 25):
    Linear | Circular | Random | Spiral | Figure-of-8.
    Applied in the world/scene reference frame (0-20 px/frame max amplitude).
    Composes additively with camera jitter in final viewport.
    """
    def __init__(self, rng: Optional[np.random.Generator] = None):
        self.angle = 0.0
        self.walk_x = 0.0
        self.walk_y = 0.0
        self.rng = rng if rng is not None else np.random.default_rng()

    def set_rng(self, rng: np.random.Generator):
        self.rng = rng

    def compute(
        self,
        motion_type: str,
        amplitude: float,
        sim_time: float,
        dt: float
    ) -> Tuple[float, float]:
        if motion_type == "None" or amplitude <= 0.001:
            return 0.0, 0.0

        amp = min(20.0, max(0.0, amplitude))

        if motion_type == "Linear":
            # Oscillatory linear perturbation along azimuth/elevation
            dx = math.sin(sim_time * 1.8) * amp
            dy = math.cos(sim_time * 1.8) * amp * 0.5
            return dx, dy

        elif motion_type == "Circular":
            self.angle += dt * 2.2
            dx = math.cos(self.angle) * amp
            dy = math.sin(self.angle) * amp
            return dx, dy

        elif motion_type == "Random":
            # Random drift with dampening using subsystem generator
            step_x = (self.rng.random() - 0.5) * amp * 0.5
            step_y = (self.rng.random() - 0.5) * amp * 0.5
            self.walk_x = np.clip(self.walk_x * 0.95 + step_x, -amp, amp)
            self.walk_y = np.clip(self.walk_y * 0.95 + step_y, -amp, amp)
            return float(self.walk_x), float(self.walk_y)

        elif motion_type == "Spiral":
            self.angle += dt * 2.5
            r = (math.sin(sim_time * 0.8) * 0.5 + 0.5) * amp
            dx = math.cos(self.angle) * r
            dy = math.sin(self.angle) * r
            return dx, dy

        elif motion_type == "Figure-of-8":
            self.angle += dt * 1.6
            sin_t = math.sin(self.angle)
            cos_t = math.cos(self.angle)
            denom = 1.0 + sin_t * sin_t
            dx = (amp * cos_t) / denom
            dy = (amp * sin_t * cos_t) / denom
            return dx, dy

        return 0.0, 0.0