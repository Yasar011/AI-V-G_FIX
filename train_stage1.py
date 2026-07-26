"""
Stage 1 fine-tuning: adapt YOLOv8 from generic COCO pretraining to real
fabric/garment defect detection, using a public Roboflow dataset as a
proof-of-concept training set (before real captured garment data exists).

Requires a free Roboflow account + API key:
  https://app.roboflow.com -> sign up -> Settings -> API Keys

Find a dataset on https://universe.roboflow.com, open it, and read the
workspace/project slugs from its URL:
  https://universe.roboflow.com/<workspace>/<project>

Run with:
  python train_stage1.py --api-key YOUR_KEY --workspace WORKSPACE --project PROJECT --version 1
"""
import argparse
from pathlib import Path

import torch
from roboflow import Roboflow
from ultralytics import YOLO


def download_dataset(api_key, workspace, project, version):
    rf = Roboflow(api_key=api_key)
    dataset = rf.workspace(workspace).project(project).version(version).download(
        "yolov8", location="stage1_dataset"
    )
    return dataset.location


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--api-key", required=True, help="Roboflow API key (from account settings)")
    parser.add_argument("--workspace", required=True, help="Roboflow workspace slug, from the dataset URL")
    parser.add_argument("--project", required=True, help="Roboflow project slug, from the dataset URL")
    parser.add_argument("--version", type=int, default=1, help="Dataset version number")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--batch", type=int, default=16, help="Lower this if you hit out-of-memory on the 4GB 1650 Ti")
    parser.add_argument("--base-model", default="yolov8n.pt", help="Starting weights to fine-tune from")
    args = parser.parse_args()

    device = 0 if torch.cuda.is_available() else "cpu"
    print(f"Training device: {'GPU (' + torch.cuda.get_device_name(0) + ')' if device == 0 else 'CPU'}")

    print(f"Downloading dataset {args.workspace}/{args.project} v{args.version}...")
    data_yaml = Path(download_dataset(args.api_key, args.workspace, args.project, args.version)) / "data.yaml"

    print(f"Fine-tuning {args.base_model} for {args.epochs} epochs...")
    model = YOLO(args.base_model)
    model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=device,
        project="runs_stage1",
    )

    print("\nDone. Best weights are under runs_stage1/train/weights/best.pt")
    print("Point MODEL_PATH in .env at that file to use the fine-tuned model in capture.py.")


if __name__ == "__main__":
    main()
