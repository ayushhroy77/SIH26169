import sys; sys.path.insert(0, "backend")
import json, cv2, numpy as np
from spec import SystemSpec
from simulation import SimulationEngine, DT
from tracker import CentroidTracker

with open("configs/fog_stress.json") as f:
    cfg = json.load(f)

cfg["initial_camera_pos"] = [1420, 1000]
spec = SystemSpec()
for k, v in cfg.items():
    if hasattr(spec, k):
        setattr(spec, k, v)

sim = SimulationEngine(spec, master_seed=42)
tracker = CentroidTracker(spec)

for frame_idx in range(60):
    raw_frame, sim_metrics = sim.step_raw(DT)
    target_cam = sim_metrics["target_camera_pos"]
    cands, track_res = tracker.detect_and_track_raw(raw_frame, target_cam, DT)
    if "pan_cmd_deg_sec" in track_res:
        sim.apply_gimbal_slew(track_res["pan_cmd_deg_sec"], track_res["tilt_cmd_deg_sec"], DT)
    
    det = track_res.get('detected_centroid')
    err = track_res.get('tracking_error_px')
    st = track_res.get('lock_state')
    if frame_idx % 10 == 0 or frame_idx < 5:
        print(f"Frame {frame_idx:2d}: target_cam={target_cam}, detected={det}, err={err}, state={st}")

summ = sim.get_session_summary()
print("\nSession Summary:")
for k, v in summ.items():
    if k != "state_transitions":
        print(f"  {k}: {v}")
print(f"  transitions count: {summ.get('state_transitions_count')}")
