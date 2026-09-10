"""
FSOC Virtual Camera Tracking System - FastAPI Backend Server
Implements native WebSocket streaming of base64 JPEG frames + JSON metrics at 30 Hz
and REST configuration endpoints for ISRO / SIH 2024.
Phase 3: Benchmark-2 Video Ingestion (Bypasses PTZ camera, feeds directly to tracker,
evaluates RMSE, acquisition time, lock retention against Ground Truth).
"""

import os
import uuid
import json
import time
import asyncio
import shutil
from typing import Dict, Any, Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from spec import SystemSpec, DEFAULT_SPEC, VideoConfig, GTConfig, BenchmarkMetrics
from simulation import SimulationEngine
from tracker import CentroidTracker
from video_source import VideoSource
from gt_extractor import parse_gt_csv, interpolate_marked_points, extract_auto_gt
from benchmark import BenchmarkAggregator

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="FSOC Virtual Tracking System",
    description="ISRO / SIH 2024 Coarse Alignment Virtual Testbed (Department of Space) - Benchmark-2 Engine",
    version="3.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_spec = DEFAULT_SPEC
simulation = SimulationEngine(current_spec)
tracker = CentroidTracker(current_spec)

# Benchmark-2 Active Video Sessions Store
# video_id -> { "config": VideoConfig, "source": VideoSource, "gt": dict, "is_approximate": bool, "aggregator": BenchmarkAggregator }
video_sessions: Dict[str, Dict[str, Any]] = {}

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "fsoc-coarse-tracking",
        "phase": 3,
        "input_mode": current_spec.input_mode,
        "fps_target": current_spec.camera_update_rate
    }

@app.get("/api/config")
async def get_config():
    return current_spec.__dict__

@app.post("/api/config")
async def update_config(spec_dict: dict):
    global current_spec, simulation, tracker
    for key, value in spec_dict.items():
        if hasattr(current_spec, key):
            setattr(current_spec, key, value)
    simulation.update_spec(current_spec)
    tracker.update_spec(current_spec)
    return {"status": "updated", "config": current_spec.__dict__}

@app.post("/api/reset")
async def reset_simulation():
    global simulation
    simulation.reset()
    return {"status": "reset"}

# ═══════════════════════════════════════════════════════════════════
# BENCHMARK-2 VIDEO INGESTION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.post("/api/video/upload")
async def upload_video(file: UploadFile = File(...)):
    """
    Accepts .mp4, .avi, .mov uploads, verifies resolution and frame rate,
    extracts thumbnail and auto-GT fallback, registers video session.
    """
    filename = file.filename or "uploaded_video.mp4"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".mp4", ".avi", ".mov"]:
        raise HTTPException(status_code=400, detail="Invalid video format. Supported formats: .mp4, .avi, .mov")

    video_id = str(uuid.uuid4())[:8]
    save_path = os.path.join(UPLOAD_DIR, f"{video_id}_{filename}")

    try:
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write video file: {str(e)}")

    try:
        source = VideoSource(save_path)
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=400, detail=f"Invalid or corrupted video file: {str(e)}")

    width, height = source.resolution()
    fps = source.fps()
    duration = source.duration()
    total_frames = source.frame_count()

    # Spec Validation:
    # 1. Resolution must be >= 640x480
    if width < 640 or height < 480:
        source.release()
        raise HTTPException(status_code=400, detail=f"Video resolution {width}x{height} is below minimum requirement (640x480)")

    # 2. Frame rate probe (~30 fps, warn if 25-35)
    fps_warning = None
    if fps < 25.0 or fps > 35.0:
        fps_warning = f"Video frame rate is {fps:.1f} FPS (Target: ~30 FPS). Tracking rate may be scaled."

    thumb_b64 = source.get_thumbnail_b64()

    # Generate initial Auto-GT fallback via offline teacher detector
    auto_gt = extract_auto_gt(save_path, threshold=current_spec.detection_threshold)
    aggregator = BenchmarkAggregator(spec=current_spec, is_approximate_gt=True)

    config = VideoConfig(
        video_id=video_id,
        filename=filename,
        filepath=save_path,
        width=width,
        height=height,
        fps=fps,
        duration_sec=round(duration, 2),
        total_frames=total_frames,
        thumbnail_b64=thumb_b64
    )

    video_sessions[video_id] = {
        "config": config,
        "source": source,
        "gt": auto_gt,
        "is_approximate": True,
        "marked_samples": {},
        "aggregator": aggregator
    }

    return {
        "video_id": video_id,
        "filename": filename,
        "width": width,
        "height": height,
        "fps": round(fps, 1),
        "fps_warning": fps_warning,
        "duration_sec": round(duration, 2),
        "total_frames": total_frames,
        "thumbnail": thumb_b64,
        "auto_gt_count": len(auto_gt),
        "status": "ready"
    }

class GTUpdateRequest(BaseModel):
    mode: str # "csv" | "click" | "auto"
    csv_text: Optional[str] = None
    marked_samples: Optional[Dict[int, list]] = None # frame_idx -> [x, y]

@app.post("/api/video/{video_id}/gt")
async def update_ground_truth(video_id: str, req: GTUpdateRequest):
    if video_id not in video_sessions:
        raise HTTPException(status_code=404, detail="Video session not found")

    session = video_sessions[video_id]
    total_frames = session["config"].total_frames

    if req.mode == "csv" and req.csv_text:
        gt_map = parse_gt_csv(req.csv_text)
        session["gt"] = gt_map
        session["is_approximate"] = False
        session["aggregator"].is_approximate_gt = False
        return {"status": "csv_applied", "points_count": len(gt_map), "is_approximate": False}

    elif req.mode == "click" and req.marked_samples:
        clean_samples = {int(k): (float(v[0]), float(v[1])) for k, v in req.marked_samples.items()}
        interpolated = interpolate_marked_points(clean_samples, total_frames)
        session["gt"] = interpolated
        session["marked_samples"] = clean_samples
        session["is_approximate"] = False
        session["aggregator"].is_approximate_gt = False
        return {
            "status": "interpolated",
            "marked_samples_count": len(clean_samples),
            "interpolated_frames": len(interpolated),
            "is_approximate": False
        }

    elif req.mode == "auto":
        auto_gt = extract_auto_gt(session["config"].filepath, threshold=current_spec.detection_threshold)
        session["gt"] = auto_gt
        session["is_approximate"] = True
        session["aggregator"].is_approximate_gt = True
        return {"status": "auto_gt_recalculated", "points_count": len(auto_gt), "is_approximate": True}

    raise HTTPException(status_code=400, detail="Invalid Ground Truth configuration request")

@app.get("/api/video/{video_id}/session")
async def get_session_data(video_id: str):
    if video_id in video_sessions:
        agg = video_sessions[video_id]["aggregator"]
        filepath = agg.save_session(video_id)
        data = BenchmarkAggregator.get_session(video_id)
        if data:
            return data
    
    # Try loading persisted file directly
    data = BenchmarkAggregator.get_session(video_id)
    if data:
        return data

    raise HTTPException(status_code=404, detail=f"No telemetry session found for video {video_id}")

# ═══════════════════════════════════════════════════════════════════
# WEBSOCKET STREAMING ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    """
    Live Simulation mode stream:
    Renders 2000x2000 scene, projects virtual PTZ camera, injects disturbances,
    runs tracker + servo, and broadcasts metrics at 30 Hz.
    """
    await websocket.accept()
    dt = 1.0 / max(1, current_spec.camera_update_rate)
    try:
        while True:
            t0 = time.perf_counter()
            frame_jpeg_b64, sim_metrics = simulation.step(dt)
            detected_centroid, track_metrics = tracker.process_frame(
                frame_jpeg_b64,
                sim_metrics["target_camera_pos"]
            )
            sim_metrics.update(track_metrics)

            payload = {
                "timestamp": int(time.time() * 1000),
                "frame": frame_jpeg_b64,
                "metrics": sim_metrics
            }
            await websocket.send_text(json.dumps(payload))

            try:
                client_msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                data = json.loads(client_msg)
                if data.get("type") == "update_spec":
                    for k, v in data.get("payload", {}).items():
                        if hasattr(current_spec, k):
                            setattr(current_spec, k, v)
                    simulation.update_spec(current_spec)
                    tracker.update_spec(current_spec)
            except (asyncio.TimeoutError, json.JSONDecodeError):
                pass

            elapsed = time.perf_counter() - t0
            sleep_time = max(0.001, dt - elapsed)
            await asyncio.sleep(sleep_time)
    except WebSocketDisconnect:
        pass

@app.websocket("/ws/video/{video_id}")
async def websocket_video_benchmark(websocket: WebSocket, video_id: str):
    """
    Benchmark-2 Video Ingestion Stream:
    Bypasses virtual PTZ camera & scene renderer. Feeds video frames directly
    into tracker.detect() and tracker.track(). Evaluates against Ground Truth.
    """
    await websocket.accept()

    if video_id not in video_sessions:
        await websocket.send_text(json.dumps({"error": "Video session not found"}))
        await websocket.close()
        return

    session = video_sessions[video_id]
    source: VideoSource = session["source"]
    source.reset()
    
    aggregator: BenchmarkAggregator = session["aggregator"]
    aggregator.reset()

    fps = source.fps() or 30.0
    dt = 1.0 / fps
    is_paused = False

    try:
        while True:
            t0 = time.perf_counter()

            # Process inbound controls from client (play/pause/step/seek/reset)
            try:
                client_msg = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                cmd_data = json.loads(client_msg)
                action = cmd_data.get("action")
                if action == "pause":
                    is_paused = True
                elif action == "play":
                    is_paused = False
                elif action == "step":
                    is_paused = True
                    # Allow one single step forward
                elif action == "seek":
                    target_frame = int(cmd_data.get("frame_idx", 0))
                    source.seek(target_frame)
                elif action == "reset":
                    source.reset()
                    aggregator.reset()
                    is_paused = False
            except (asyncio.TimeoutError, json.JSONDecodeError):
                pass

            if is_paused:
                await asyncio.sleep(0.05)
                continue

            frame_idx = source.current_frame_idx()
            b64_frame, raw_frame, timestamp_s = source.read_jpeg_b64()

            if b64_frame is None or raw_frame is None:
                # Video reached EOF: persist session and broadcast completed state
                aggregator.save_session(video_id)
                await websocket.send_text(json.dumps({
                    "type": "eof",
                    "status": "completed",
                    "video_id": video_id
                }))
                is_paused = True
                await asyncio.sleep(0.1)
                continue

            # Ingest frame directly into coarse-pointing tracker (bypassing virtual PTZ camera)
            t_det_0 = time.perf_counter()
            detected_pt, detected_bbox = tracker.detect(raw_frame)
            track_res = tracker.track(detected_pt, dt)
            processing_ms = (time.perf_counter() - t_det_0) * 1000.0

            # Fetch Ground Truth coordinate for this frame
            gt_dict = session["gt"]
            gt_pt = gt_dict.get(frame_idx, None)

            # Aggregate Benchmark-2 telemetry
            bench_metrics = aggregator.update(
                frame_idx=frame_idx,
                timestamp_s=timestamp_s,
                detected_centroid=detected_pt,
                detected_bbox=detected_bbox,
                gt_centroid=gt_pt,
                processing_time_ms=processing_ms
            )

            # Format wire payload identical to frontend contract
            payload = {
                "type": "frame",
                "timestamp": int(time.time() * 1000),
                "frame_idx": frame_idx,
                "total_frames": source.frame_count(),
                "frame": b64_frame,
                "detected": {"x": detected_pt[0], "y": detected_pt[1]} if detected_pt else None,
                "detected_bbox": detected_bbox,
                "gt": {"x": gt_pt[0], "y": gt_pt[1]} if gt_pt else None,
                "boresight": track_res["boresight"],
                "is_approximate_gt": session["is_approximate"],
                "metrics": bench_metrics.__dict__
            }

            await websocket.send_text(json.dumps(payload))

            elapsed = time.perf_counter() - t0
            sleep_time = max(0.001, dt - elapsed)
            await asyncio.sleep(sleep_time)

    except WebSocketDisconnect:
        aggregator.save_session(video_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
