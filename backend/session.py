"""
FSOC Virtual Camera Tracking System - Session Metadata & Hashing
Department of Space / ISRO (SIH 2024)
Phase 4: Session Header & Configuration Hashing
"""

import os
import json
import time
import hashlib
from typing import Dict, Any

def config_hash(cfg: dict) -> str:
    """Computes deterministic SHA-256 hash of JSON-serialized configuration dictionary."""
    return hashlib.sha256(
        json.dumps(cfg, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()[:16]

def get_software_version() -> str:
    """Reads current software version from project root VERSION file."""
    cur_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(cur_dir, "VERSION"),
        os.path.join(os.path.dirname(cur_dir), "VERSION"),
        os.path.join(cur_dir, "..", "VERSION")
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    return f.read().strip()
            except Exception:
                pass
    return "0.5.0"

def write_session_header(path: str, seed: int, cfg: dict, version: str) -> dict:
    """Writes session header containing master_seed, config_hash, software_version, and timestamp."""
    header = {
        "master_seed": seed,
        "config_hash": config_hash(cfg),
        "software_version": version,
        "timestamp": time.time(),
    }
    dir_name = os.path.dirname(path)
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"header": header, "config": cfg}, f, indent=2)
    return header
