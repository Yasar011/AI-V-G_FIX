"""
Resumes the interrupted merged-dataset training run from its last
checkpoint.

The __main__ guard is required, not stylistic: YOLO spawns dataloader
worker processes, and on Windows each worker re-imports this module.
Without the guard the workers re-run training on import and the whole
thing dies with a multiprocessing freeze_support error.
"""
from ultralytics import YOLO

CHECKPOINT = "runs/detect/runs_stage1/train_v5_merged/weights/last.pt"


def main():
    model = YOLO(CHECKPOINT)
    model.train(resume=True)
    print("TRAINING_DONE")


if __name__ == "__main__":
    main()
