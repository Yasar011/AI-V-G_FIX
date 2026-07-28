"""
Builds the next fabric dataset, adding stain photographs taken on actual
clothes rather than flat swatches.

Writes to its own folder rather than overwriting merged_dataset/, because
a training run may be reading that one - rebuilding underneath a live run
corrupts it.

Run with:  python build_fabric_v6.py --api-key YOUR_ROBOFLOW_KEY
"""
import argparse
import os
import shutil

import yaml
from roboflow import Roboflow

SOURCES = [
    ("fabric-defect-zpkfr", "fabric-defect-fvlhp", 2),
    ("fabricdefects", "fabric-defect-lk8nb", 4),
    ("azizullohs-workspace", "fabric-defect-35n47", 1),
    ("university-of-engineering-and-technology-lahore-hya19", "fabric-hole-defect-detection", 7),
    ("college-wtlzk", "fabric-stain-detection", 1),
    # ~1.9k stains photographed on garments, not swatches - the single
    # biggest addition available for F8, and closer to real conditions
    ("laundrycareteam1", "clothes-stain", 1),
]

CLASSES = ["hole", "stain", "tear", "thread", "defect"]

ALIASES = {
    "cassure": "tear", "tache": "stain", "defaut": "defect",
    "fil tire ou gros": "thread",
    "lubang": "hole", "noda": "stain", "kusut": "defect",
    "teshik": "hole", "dog": "stain", "oq_dog": "stain",
    "nina_izi": "defect", "ulanish": "defect", "fabric-defect": "defect",
    "hole": "hole", "holes": "hole", "stain": "stain", "stains": "stain",
    "tear": "tear", "cut": "tear", "thread": "thread",
    "threaderror": "thread", "slub": "thread", "knot": "thread",
    "defect": "defect", "objects": "defect",
}

OUT_DIR = "fabric_dataset_v6"


def map_class(name):
    return ALIASES.get(name.strip().lower(), "defect")


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
        shutil.copy2(os.path.join(src_images, filename),
                     os.path.join(dst_images, new_stem + ext))

        label_src = os.path.join(src_labels, stem + ".txt")
        lines_out = []
        if os.path.exists(label_src):
            with open(label_src) as f:
                for line in f:
                    parts = line.split()
                    if not parts:
                        continue
                    old_id = int(parts[0])
                    old_name = names[old_id] if old_id < len(names) else "defect"
                    code = map_class(old_name)
                    stats[code] = stats.get(code, 0) + 1
                    lines_out.append(" ".join([str(CLASSES.index(code))] + parts[1:]))

        with open(os.path.join(dst_labels, new_stem + ".txt"), "w") as f:
            f.write("\n".join(lines_out))
        stats["_images"] = stats.get("_images", 0) + 1


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
        print(f"\n--- {project} v{version} ---", flush=True)
        if not os.path.exists(location):
            rf.workspace(workspace).project(project).version(version).download(
                "yolov8", location=location)

        with open(os.path.join(location, "data.yaml")) as f:
            names = yaml.safe_load(f).get("names", [])
        if isinstance(names, dict):
            names = [names[k] for k in sorted(names)]
        print(f"  {names} -> {[map_class(n) for n in names]}", flush=True)

        for split in ("train", "valid", "test"):
            merge_split(location, split, names, f"f{i}", stats)

    with open(os.path.join(OUT_DIR, "data.yaml"), "w") as f:
        yaml.safe_dump({
            "path": os.path.abspath(OUT_DIR),
            "train": "train/images",
            "val": "valid/images",
            "test": "test/images",
            "nc": len(CLASSES),
            "names": CLASSES,
        }, f, sort_keys=False)

    print(f"\nMerged {stats.pop('_images', 0)} images into {OUT_DIR}")
    for code in CLASSES:
        print(f"  {code}: {stats.get(code, 0)}")


if __name__ == "__main__":
    main()
