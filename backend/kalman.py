"""
Constant-Velocity Kalman Filter (CVKalman)
SIH 2024 / ISRO FSOC Coarse Alignment Virtual Testbed - Phase 5
"""

from typing import Tuple, Optional
import numpy as np

class CVKalman:
    """
    Constant-velocity Kalman filter on (x, y) with state
    [x, y, vx, vy].
    """
    def __init__(
        self,
        dt: float,
        process_noise: float = 5.0,
        meas_noise: float = 2.0,
        gate_chi2: float = 9.21,
        coast_frames_max: int = 15
    ):
        self.dt = float(dt)
        self.process_noise = float(process_noise)
        self.meas_noise = float(meas_noise)
        self.gate_chi2 = float(gate_chi2)
        self.coast_frames_max = int(coast_frames_max)

        # State transition matrix F (4x4)
        self.F = np.array([
            [1.0, 0.0, self.dt, 0.0],
            [0.0, 1.0, 0.0, self.dt],
            [0.0, 0.0, 1.0, 0.0],
            [0.0, 0.0, 0.0, 1.0]
        ], dtype=np.float64)

        # Measurement matrix H (2x4)
        self.H = np.array([
            [1.0, 0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0, 0.0]
        ], dtype=np.float64)

        self._build_covariances()
        self.reset()

    def _build_covariances(self):
        dt = self.dt
        q = self.process_noise ** 2
        dt2 = dt * dt
        dt3 = dt2 * dt / 2.0
        dt4 = dt2 * dt2 / 4.0
        # Continuous white noise acceleration kinematic discrete Q
        self.Q = q * np.array([
            [dt4, 0.0, dt3, 0.0],
            [0.0, dt4, 0.0, dt3],
            [dt3, 0.0, dt2, 0.0],
            [0.0, dt3, 0.0, dt2]
        ], dtype=np.float64)

        r = self.meas_noise ** 2
        self.R = np.eye(2, dtype=np.float64) * r

    def update_params(
        self,
        process_noise: Optional[float] = None,
        meas_noise: Optional[float] = None,
        gate_chi2: Optional[float] = None,
        coast_frames_max: Optional[int] = None
    ):
        if process_noise is not None:
            self.process_noise = float(process_noise)
        if meas_noise is not None:
            self.meas_noise = float(meas_noise)
        if gate_chi2 is not None:
            self.gate_chi2 = float(gate_chi2)
        if coast_frames_max is not None:
            self.coast_frames_max = int(coast_frames_max)
        self._build_covariances()

    def reset(self):
        self.x = np.zeros((4, 1), dtype=np.float64)
        self.P = np.eye(4, dtype=np.float64) * 100.0
        self.initialized = False
        self.coast_count = 0

    def init_state(self, x: float, y: float, vx: float = 0.0, vy: float = 0.0):
        self.x = np.array([[float(x)], [float(y)], [float(vx)], [float(vy)]], dtype=np.float64)
        self.P = np.eye(4, dtype=np.float64) * (self.meas_noise ** 2)
        self.P[2, 2] = 10000.0
        self.P[3, 3] = 10000.0
        self.initialized = True
        self.coast_count = 0

    def predict(self) -> np.ndarray:
        """
        Projects state and covariance forward:
        x = F * x
        P = F * P * F^T + Q
        Returns predicted state array [x, y, vx, vy].
        """
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        return self.x.flatten()

    def mahalanobis(self, z: Tuple[float, float]) -> float:
        """
        Computes squared Mahalanobis distance between measurement z and predicted state:
        d^2 = (z - H*x)^T * S^-1 * (z - H*x)
        where S = H * P * H^T + R.
        """
        z_vec = np.array([[float(z[0])], [float(z[1])]], dtype=np.float64)
        y = z_vec - self.H @ self.x
        S = self.H @ self.P @ self.H.T + self.R
        try:
            S_inv = np.linalg.inv(S)
            d2 = float((y.T @ S_inv @ y)[0, 0])
            return d2
        except np.linalg.LinAlgError:
            return float('inf')

    def is_in_gate(self, z: Tuple[float, float], gate: Optional[float] = None) -> bool:
        thresh = self.gate_chi2 if gate is None else gate
        return self.mahalanobis(z) <= thresh

    def update(self, z: Tuple[float, float]) -> None:
        """
        Updates state and covariance with valid measurement z.
        """
        if not self.initialized:
            self.init_state(z[0], z[1])
            return

        z_vec = np.array([[float(z[0])], [float(z[1])]], dtype=np.float64)
        y = z_vec - self.H @ self.x
        S = self.H @ self.P @ self.H.T + self.R
        try:
            S_inv = np.linalg.inv(S)
            K = self.P @ self.H.T @ S_inv
            self.x = self.x + K @ y
            I = np.eye(4, dtype=np.float64)
            IKH = I - K @ self.H
            # Joseph form for numerical stability
            self.P = IKH @ self.P @ IKH.T + K @ self.R @ K.T
            self.coast_count = 0
        except np.linalg.LinAlgError:
            pass

    def coast(self) -> bool:
        """
        Increments coast counter. If coast_count > coast_frames_max, resets and returns False.
        Otherwise returns True.
        """
        self.coast_count += 1
        if self.coast_count > self.coast_frames_max:
            self.reset()
            return False
        return True

    def state(self) -> Tuple[float, float, float, float]:
        """Returns current state (x, y, vx, vy)."""
        return (float(self.x[0, 0]), float(self.x[1, 0]), float(self.x[2, 0]), float(self.x[3, 0]))
