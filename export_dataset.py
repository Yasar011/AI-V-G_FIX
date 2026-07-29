"""
Builds a YOLO-format dataset from human-verified inspection records
(see review.py), ready to feed into a Colab fine-tuning run.

Class ids are kept stable across runs in classes.json — new defect labels
get appended, existing ones keep their id, so retraining rounds stay
consistent with each other.

Note: box locations come from whatever model was running at capture time.
Until Stage 1 fine-tuning is done, that's the generic COCO-pretrained
model, so boxes may not tightly localize real garment defects yet — the
label (what a human confirmed the defect actually is) is the reliable
part right now, not the box precision.

Run with:  python export_dataset.py [output_dir]
Defaults to ./dataset_export
"""
import json
import os
import random
import sys

import requests
import yaml

from src.database import get_verified_for_export

CLASSES_FILE = "classes.json"
VAL_SPLIT = 0.2


def load_classes():
    if os.path.exists(CLASSES_FILE):
        with open(CLASSES_FILE) as f:
            return json.load(f)
    return {}


def save_classes(classes):
    with open(CLASSES_FILE, "w") as f:
        json.dump(classes, f, indent=2)


def class_id_for(classes, label):
    if label not in classes:
        classes[label] = len(classes)
    return classes[label]


def download_image(url):
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    return resp.content


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else "dataset_export"
    records = get_verified_for_export()
    if not records:
        print("No verified records to export yet — run review.py first.")
        return

    classes = load_classes()
    random.shuffle(records)
    split_idx = max(1, int(len(records) * (1 - VAL_SPLIT))) if len(records) > 1 else len(records)
    splits = {"train": records[:split_idx], "val": records[split_idx:]}

    for split, split_records in splits.items():
        os.makedirs(os.path.join(out_dir, "images", split), exist_ok=True)
        os.makedirs(os.path.join(out_dir, "labels", split), exist_ok=True)

        for piece_id, record in split_records:
            image_bytes = download_image(record["imageUrl"])
            with open(os.path.join(out_dir, "images", split, f"{piece_id}.jpg"), "wb") as f:
                f.write(image_bytes)

            corrected = record.get("correctedDefect")
            # Boxes the reviewer drew win over the model's own. This is what
            # lets a defect the model *missed* become training data: it has
            # no predicted bbox, so relying on record["bbox"] silently
            # dropped exactly the examples worth learning from.
            marked = record.get("correctedBoxes") or []

            label_path = os.path.join(out_dir, "labels", split, f"{piece_id}.txt")
            with open(label_path, "w") as f:
                if corrected == "none":
                    pass  # confirmed clean - a background example
                elif marked:
                    for box in marked:
                        bbox = box.get("bbox")
                        code = box.get("code") or corrected
                        if not bbox or not code:
                            continue
                        class_id = class_id_for(classes, code)
                        f.write(f"{class_id} {bbox[0]} {bbox[1]} {bbox[2]} {bbox[3]}\n")
                elif corrected and record.get("bbox"):
                    # reviewed before box marking existed - fall back to the
                    # model's box, which is better than discarding the record
                    bbox = record["bbox"]
                    class_id = class_id_for(classes, corrected)
                    f.write(f"{class_id} {bbox[0]} {bbox[1]} {bbox[2]} {bbox[3]}\n")
                # otherwise an empty label file: a background image, which
                # still teaches the model what a clean piece looks like

    save_classes(classes)

    data_yaml = {
        "path": os.path.abspath(out_dir),
        "train": "images/train",
        "val": "images/val",
        "names": {v: k for k, v in classes.items()},
    }
    with open(os.path.join(out_dir, "data.yaml"), "w") as f:
        yaml.safe_dump(data_yaml, f, sort_keys=False)

    print(f"Exported {len(records)} piece(s) -> {out_dir}")
    print(f"  train: {len(splits['train'])}, val: {len(splits['val'])}")
    print(f"  classes: {classes}")
    print("  data.yaml written — point your Colab training script at it.")


if __name__ == "__main__":
    main()
