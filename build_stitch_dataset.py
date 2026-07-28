"""
Builds a training set for the S (Stitching) defect category from the
public datasets that actually cover it.

Only a handful of the 34 S-codes exist in public data, and coverage is
very uneven - S1/S22 have thousands of examples, S8/S13/S18/S28 have a
few dozen between them. Anything that doesn't map to a specific code
lands in S_OTHER (a generic "stitching is wrong here" class) rather than
being forced into a code it isn't.

Images labelled "good" are kept with no boxes: YOLO treats those as
background examples, which is exactly what stops the model calling every
seam a defect.

Run with:  python build_stitch_dataset.py --api-key YOUR_ROBOFLOW_KEY
"""
import argparse
import os
import shutil

import yaml
from roboflow import Roboflow

# workspace, project, version
SOURCES = [
    ("shamaliperera", "stitch-defect-detection-mfe7g", 4),
    ("nust-uxrul", "fabric-stitch-defect-detection-vd2za", 7),
    ("stitch-detection-8g8jd", "stitch-project-uxlok", 2),
    ("nehrin", "stitch-defects", 2),
    ("siri-n2zae", "stitch-pcscf", 2),
]

# The S-codes we can actually train, in id order.
CLASSES = ["S1", "S8", "S13", "S18", "S22", "S28", "S_OTHER"]

CODE_NAMES = {
    "S1": "Broken Stitch",
    "S8": "Looseness",
    "S13": "Open Seam",
    "S18": "Puckering",
    "S22": "Skip Stitch",
    "S28": "Untrim Thread",
    "S_OTHER": "Stitching defect (unclassified)",
}

# source label (lowercased) -> S-code, or None to drop the box entirely
# (image still ships as a background example)
ALIASES = {
    "broken": "S1",
    "broken-stitch": "S1",
    "skip": "S22",
    "skip stitch": "S22",
    "skipped stitch": "S22",
    "skip-stitch": "S22",
    "pukering": "S18",
    "puckering": "S18",
    "loose stitch": "S8",
    "seam slippage": "S13",
    "knotted thread": "S28",
    "stitch_defect": "S_OTHER",
    "bobbin thread": "S_OTHER",
    "overlap": "S_OTHER",
    "objects": "S_OTHER",
    # deliberately dropped - not stitching defects, or negatives
    "good": None,
    "stain and damage": None,
    "stains-discoloration": None,
    "holes_tears": None,
}

OUT_DIR = "stitch_dataset"


def map_class(name):
    key = name.strip().lower()
    if key in ALIASES:
        return ALIASES[key]
    return "S_OTHER"


def merge_split(src_root, split, names, prefix, stats):
    src_images = os.path.join(src_root, split, "images")
    src_labels = os.path.join(src_root, split, "labels")
    if not os.path.isdir(src_images):
        return

    dst_images = os.path.join(OUT_DIR, split, "images")
    dst_labels = os.path.join(OUT_DIR, split, "labels")
    os.makedirs(dst_images, exist_ok=True)
    os.makedirs(dst_labels, exist_ok=True)

    for filename in os.listdir(src_images):
        stem, ext = os.path.splitext(filename)
        new_stem = f"{prefix}_{stem}"
        shutil.copy2(os.path.join(src_images, filename), os.path.join(dst_images, new_stem + ext))

        label_src = os.path.join(src_labels, stem + ".txt")
        lines_out = []
        if os.path.exists(label_src):
            with open(label_src) as f:
                for line in f:
                    parts = line.split()
                    if not parts:
                        continue
                    old_id = int(parts[0])
                    old_name = names[old_id] if old_id < len(names) else "objects"
                    code = map_class(old_name)
                    if code is None:
                        continue
                    stats[code] = stats.get(code, 0) + 1
                    lines_out.append(" ".join([str(CLASSES.index(code))] + parts[1:]))

        with open(os.path.join(dst_labels, new_stem + ".txt"), "w") as f:
            f.write("\n".join(lines_out))
        stats["_images"] = stats.get("_images", 0) + 1
        if not lines_out:
            stats["_background"] = stats.get("_background", 0) + 1


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-key", required=True)
    args = parser.parse_args()

    if os.path.exists(OUT_DIR):
        shutil.rmtree(OUT_DIR)

    rf = Roboflow(api_key=args.api_key)
    stats = {}

    for i, (workspace, project, version) in enumerate(SOURCES):
        location = os.path.join("raw_datasets", project)
        print(f"\n--- {project} v{version} ---")
        if not os.path.exists(location):
            rf.workspace(workspace).project(project).version(version).download("yolov8", location=location)

        with open(os.path.join(location, "data.yaml")) as f:
            names = yaml.safe_load(f).get("names", [])
        if isinstance(names, dict):
            names = [names[k] for k in sorted(names)]
        print(f"  source: {names}")
        print(f"  mapped: {[map_class(n) or 'DROPPED' for n in names]}")

        for split in ("train", "valid", "test"):
            merge_split(location, split, names, f"s{i}", stats)

    data_yaml = {
        "path": os.path.abspath(OUT_DIR),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": len(CLASSES),
        "names": CLASSES,
    }
    with open(os.path.join(OUT_DIR, "data.yaml"), "w") as f:
        yaml.safe_dump(data_yaml, f, sort_keys=False)

    total = stats.pop("_images", 0)
    background = stats.pop("_background", 0)
    print(f"\nMerged {total} images into {OUT_DIR} ({background} with no defect = background)")
    print("Instances per code:")
    for code in CLASSES:
        count = stats.get(code, 0)
        flag = "  <-- too few to learn reliably" if 0 < count < 100 else ""
        print(f"  {code} {CODE_NAMES[code]}: {count}{flag}")


if __name__ == "__main__":
    main()
