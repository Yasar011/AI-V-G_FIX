"""
Trains the S (Stitching) category model.

The 4GB card can only hold one training run, so this waits for any
in-flight run to release the GPU before starting rather than failing on
an out-of-memory error.

Class balance is very uneven by necessity - public data covers S1/S22
well and S8/S13/S18/S28 barely at all - so the per-class metrics printed
at the end matter more than the headline mAP. A class with 30 examples
will score badly and should be treated as "not usable yet", not as a
model failure.

Run with:  python train_stitch.py
"""
import subprocess
import time

from ultralytics import YOLO

DATA = "stitch_dataset/data.yaml"
FREE_VRAM_MB = 1000       # a run in progress holds far more than this
POLL_SECONDS = 60


def gpu_busy():
    try:
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=memory.used", "--format=csv,noheader,nounits"],
            text=True,
        )
        return int(out.strip().splitlines()[0]) > FREE_VRAM_MB
    except Exception:
        return False


def main():
    waited = 0
    while gpu_busy():
        if waited % 600 == 0:
            print(f"GPU busy with another run - waiting ({waited // 60} min so far)", flush=True)
        time.sleep(POLL_SECONDS)
        waited += POLL_SECONDS

    print("GPU free - starting stitching model training", flush=True)
    model = YOLO("yolov8n.pt")
    model.train(
        data=DATA,
        epochs=120,
        imgsz=640,
        batch=16,
        device=0,
        patience=25,
        project="runs_stage1",
        name="train_stitch_S",
    )
    print("TRAINING_DONE", flush=True)


if __name__ == "__main__":
    main()
