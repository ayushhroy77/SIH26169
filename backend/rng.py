"""
FSOC Virtual Camera Tracking System - Subsystem-Isolated RNG Registry
Department of Space / ISRO (SIH 2024)
Phase 4: Exact Reproducibility via SeedSequence
"""

import numpy as np

class RNGRegistry:
    """
    Subsystem-isolated seeded RNG registry ensuring reproducible runs.
    A single master seed deterministically spawns independent generators
    for each subsystem via np.random.SeedSequence.
    """
    def __init__(self, master_seed: int = 42):
        self.master_seed = int(master_seed)
        ss = np.random.SeedSequence(self.master_seed)
        children = ss.spawn(6)
        self.spawn       = np.random.default_rng(children[0])
        self.noise       = np.random.default_rng(children[1])
        self.jitter      = np.random.default_rng(children[2])
        self.motion      = np.random.default_rng(children[3])
        self.atmosphere  = np.random.default_rng(children[4])
        self.platform    = np.random.default_rng(children[5])
