"""
FSOC Coarse Alignment Virtual Testbed - Headless Simulation Batch Runner
Department of Space / ISRO (SIH 2024)
Phase 4: High-Speed Batch Simulation without UI, streaming, or rendering overhead.
"""

import argparse
import json
import math
import os
import sys
import time
from typing import Dict, Any

import numpy as np

# Adjust sys.path so backend modules can be imported directly or via python -m backend.headless
cur_dir = os.path.dirname(os.path.abspath(__file__))
if cur_dir not in sys.path:
    sys.path.insert(0, cur_dir)
parent_dir = os.path.dirname(cur_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from spec import SystemSpec, MetricConfig
from simulation import SimulationEngine, DT
from tracker import CentroidTracker
from rng import RNGRegistry
from session import config_hash, get_software_version

def run_headless(config: dict, seed: int = 42, duration_s: float = 30.0) -> Dict[str, Any]:
    """
    Runs full simulation headlessly for duration_s using fixed DT = 1/30s.
    Returns session result dictionary with full metrics history and summary.
    """
    spec = SystemSpec()
    for k, v in config.items():
        if hasattr(spec, k):
            setattr(spec, k, v)

    # Initialize simulation with isolated subsystem RNG
    sim = SimulationEngine(spec, master_seed=seed)
    tracker = CentroidTracker(spec)

    total_steps = int(round(duration_s / DT))
    t_start_wall = time.perf_counter()
    processing_times = []

    for _ in range(total_steps):
        t_step_0 = time.perf_counter()

        # 1. Update dynamics and render frame (raw numpy array, no JPEG encoding)
        raw_frame, sim_metrics = sim.step_raw(DT)

        # 2. Centroid detection & tracking loop
        detected_centroid, track_res = tracker.detect_and_track_raw(
            raw_frame,
            sim_metrics["target_camera_pos"],
            DT
        )

        # 3. Apply gimbal servo slew to physical camera platform
        if "pan_cmd_deg_sec" in track_res and "tilt_cmd_deg_sec" in track_res:
            sim.apply_gimbal_slew(track_res["pan_cmd_deg_sec"], track_res["tilt_cmd_deg_sec"], DT)

        t_proc = time.perf_counter() - t_step_0
        processing_times.append(t_proc)

    total_wall_time = time.perf_counter() - t_start_wall
    avg_proc_time_ms = float(np.mean(processing_times) * 1000.0) if processing_times else 0.0
    measured_fps = float(1.0 / np.mean(processing_times)) if processing_times and np.mean(processing_times) > 0 else 0.0

    # Extract deterministic final simulation summary
    final_metrics = sim.get_session_summary()

    version = get_software_version()
    cfg_h = config_hash(config)

    session_result = {
        "header": {
            "master_seed": seed,
            "config_hash": cfg_h,
            "software_version": version,
            "timestamp": time.time(),
        },
        "summary": {
            "sim_duration_s": round(duration_s, 2),
            "total_frames": total_steps,
            "acquisition_time_s": final_metrics.get("acquisition_time_s", 0.0),
            "reacquisition_time_s": final_metrics.get("reacquisition_time_s", 0.0),
            "lock_retention_pct": final_metrics.get("lock_retention_pct", 0.0),
            "loss_pct": final_metrics.get("target_loss_pct", 0.0),
            "error_mean_px": final_metrics.get("error_mean_px", 0.0),
            "error_rms_px": final_metrics.get("error_rms_px", 0.0),
            "error_p95_px": final_metrics.get("error_p95_px", 0.0),
            "error_max_px": final_metrics.get("error_max_px", 0.0),
            "error_std_px": final_metrics.get("error_std_px", 0.0),
            "state_transitions_count": len(tracker.state_transitions) if tracker.state_transitions else final_metrics.get("state_transitions_count", 0),
            "state_transitions": tracker.state_transitions if tracker.state_transitions else final_metrics.get("state_transitions", []),
        },
        "spec_validation": {
            "acquisition_time_s": final_metrics.get("acquisition_time_s", 0.0),
            "tracking_error_rms_px": final_metrics.get("error_rms_px", 0.0),
            "tracking_error_mean_px": final_metrics.get("error_mean_px", 0.0),
            "target_loss_pct": final_metrics.get("target_loss_pct", 0.0),
            "reacquisition_time_s": final_metrics.get("reacquisition_time_s", 0.0),
            "pass_spec_16_acq": final_metrics.get("acquisition_time_s", 0.0) <= spec.max_acquisition_time_sec,
            "pass_spec_17_error": final_metrics.get("error_rms_px", 0.0) <= spec.max_tracking_error_px,
            "pass_spec_18_loss": final_metrics.get("target_loss_pct", 0.0) < spec.max_target_loss_percent,
            "pass_spec_19_reacq": final_metrics.get("reacquisition_time_s", 0.0) <= spec.max_reacquisition_time_sec,
        },
        "_performance": {
            "wall_duration_s": round(total_wall_time, 4),
            "avg_processing_ms": round(avg_proc_time_ms, 2),
            "fps_measured": round(measured_fps, 1),
            "realtime_speedup": round(duration_s / max(1e-6, total_wall_time), 2)
        }
    }
    return session_result

def main():
    parser = argparse.ArgumentParser(description="FSOC Headless Simulation Batch Runner")
    parser.add_argument("--config", type=str, default="", help="Path to config JSON file")
    parser.add_argument("--seed", type=int, default=42, help="Master RNG seed")
    parser.add_argument("--duration", type=float, default=30.0, help="Simulation duration in seconds")
    parser.add_argument("--out", type=str, default="sessions/seed42.json", help="Path to output JSON")
    args = parser.parse_args()

    cfg = {}
    if args.config and os.path.exists(args.config):
        with open(args.config, "r", encoding="utf-8") as f:
            cfg = json.load(f)

    result = run_headless(cfg, seed=args.seed, duration_s=args.duration)

    # Prepare exact clean output schema without volatile performance timing if requested
    out_dict = {
        "header": result["header"],
        "summary": result["summary"],
        "spec_validation": result["spec_validation"]
    }

    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out_dict, f, indent=2)
        print(f"[Headless] Session saved to {args.out}")

    summ = result["summary"]
    perf = result["_performance"]

    print("\n════════════════════════════════════════════════════════════════")
    print(f" FSOC Headless Simulation Summary (Seed: {args.seed}, Version: {result['header']['software_version']})")
    print("════════════════════════════════════════════════════════════════")
    print(f"  sim_duration_s:        {summ.get('sim_duration_s', 0.0):.2f} s")
    print(f"  wall_duration_s:       {perf.get('wall_duration_s', 0.0):.4f} s")
    print(f"  fps_measured:          {perf.get('fps_measured', 0.0):.1f} FPS")
    print(f"  acquisition_time_s:    {summ.get('acquisition_time_s', 0.0):.3f} s")
    print(f"  reacquisition_time_s:  {summ.get('reacquisition_time_s', 0.0):.3f} s")
    print(f"  lock_retention_pct:    {summ.get('lock_retention_pct', 0.0):.1f} %")
    print(f"  loss_pct:              {summ.get('loss_pct', 0.0):.1f} %")
    print(f"  error_mean_px:         {summ.get('error_mean_px', 0.0):.2f} ± {summ.get('error_std_px', 0.0):.2f} px")
    print(f"  error_rms_px:          {summ.get('error_rms_px', 0.0):.2f} px")
    print(f"  error_p95_px:          {summ.get('error_p95_px', 0.0):.2f} px")
    print(f"  error_max_px:          {summ.get('error_max_px', 0.0):.2f} px")
    print(f"  realtime_speedup:      {perf.get('realtime_speedup', 1.0):.2f}x")
    print("════════════════════════════════════════════════════════════════\n")

if __name__ == "__main__":
    main()
