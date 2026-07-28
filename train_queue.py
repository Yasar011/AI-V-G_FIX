"""
Runs the remaining training jobs back to back, unattended.

Each job waits for the GPU to be free before starting, so they queue
behind whatever is already running instead of failing on out-of-memory.
The whole thing is a detached process: it keeps going if the session that
launched it goes away.

Progress is appended to logs/train_queue.log so it can be read afterwards.

Run with:  python train_queue.py
"""
import datetime
import os
import subprocess
import sys
import time

from src.paths import app_path

FREE_VRAM_MB = 1000
POLL_SECONDS = 60
LOG = app_path("logs", "train_queue.log")
LOCK = app_path("logs", "gpu.lock")

# name, dataset, run name, epochs
# Both jobs live here rather than in separate scripts: two independent
# waiters is exactly what let them collide on the GPU in the first place.
JOBS = [
    ("Stitching S", "stitch_dataset/data.yaml",
     "train_stitch_S", 120),
    ("Fabric v6 (with clothes-stain)", "fabric_dataset_v6/data.yaml",
     "train_v6_fabric_clothes", 120),
]


def log(msg):
    line = f"{datetime.datetime.now():%Y-%m-%d %H:%M:%S}  {msg}"
    print(line, flush=True)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def gpu_busy():
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.used",
             "--format=csv,noheader,nounits"], text=True)
        return int(out.strip().splitlines()[0]) > FREE_VRAM_MB
    except Exception:
        return False


def take_lock():
    """
    Claims the GPU atomically.

    Polling free VRAM alone is not enough: two waiting jobs can both see the
    card free in the same window and both launch, and on a 4 GB card the
    second one dies with a segfault. O_CREAT|O_EXCL either creates the file
    or fails, so exactly one process can win.
    """
    os.makedirs(os.path.dirname(LOCK), exist_ok=True)
    try:
        fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return False
    with os.fdopen(fd, "w") as f:
        f.write(str(os.getpid()))
    return True


def release_lock():
    try:
        os.remove(LOCK)
    except OSError:
        pass


def lock_is_stale():
    """A lock left behind by a crashed run would block everything forever."""
    if not os.path.exists(LOCK):
        return False
    try:
        with open(LOCK) as f:
            pid = int(f.read().strip())
    except (OSError, ValueError):
        return True
    out = subprocess.run(["tasklist", "/FI", f"PID eq {pid}"],
                         capture_output=True, text=True).stdout
    return str(pid) not in out


def wait_for_gpu(label):
    """Waits for both the card and the lock, then claims the lock."""
    waited = 0
    while True:
        if lock_is_stale():
            log(f"[{label}] clearing a stale lock from a crashed run")
            release_lock()
        if not gpu_busy() and take_lock():
            return
        if waited % 900 == 0:
            log(f"[{label}] GPU busy — waiting ({waited // 60} min)")
        time.sleep(POLL_SECONDS)
        waited += POLL_SECONDS


def main():
    from ultralytics import YOLO

    for label, data, name, epochs in JOBS:
        if not os.path.exists(app_path(data)):
            log(f"[{label}] dataset missing at {data} — skipping")
            continue

        wait_for_gpu(label)
        log(f"[{label}] starting — {epochs} epochs on {data}")
        try:
            model = YOLO("yolov8n.pt")
            model.train(data=data, epochs=epochs, imgsz=640, batch=16,
                        device=0, patience=25, workers=4, project="runs_stage1", name=name)
            log(f"[{label}] finished — weights in runs/detect/runs_stage1/{name}/weights/")
        except Exception as exc:
            log(f"[{label}] FAILED: {exc}")
        finally:
            release_lock()

    log("queue complete")


if __name__ == "__main__":
    main()
