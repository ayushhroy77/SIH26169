import cv2
import numpy as np

width, height, fps, seconds = 640, 480, 30, 5
out = cv2.VideoWriter(
    "beacon_test.mp4",
    cv2.VideoWriter_fourcc(*"mp4v"),
    fps,
    (width, height),
)

rng = np.random.default_rng(42)
total_frames = fps * seconds

for i in range(total_frames):
    frame = np.full((height, width, 3), 40, dtype=np.uint8)
    noise = rng.integers(0, 30, (height, width, 3), dtype=np.uint8)
    frame = cv2.add(frame, noise)

    t = i / total_frames
    cx = int(width / 2 + 200 * np.sin(2 * np.pi * t))
    cy = int(height / 2 + 120 * np.sin(4 * np.pi * t))
    cv2.circle(frame, (cx, cy), 8, (255, 255, 255), -1)
    cv2.circle(frame, (cx, cy), 12, (200, 200, 200), 1)

    out.write(frame)

out.release()
print("Wrote beacon_test.mp4")