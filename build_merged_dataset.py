"""
Builds one larger training set by merging several public Roboflow
fabric-defect datasets.

The single dataset Stage 1 trained on (1.9k images) plateaued around
mAP50 0.578. These datasets are labelled in different languages
(French, Indonesian, English) with overlapping meanings, so each source
class is mapped onto one shared taxonomy before merging - otherwise the
model would learn "Lubang" and "hole" as unrelated things.

Run with:  python build_merged_dataset.py --api-key YOUR_ROBOFLOW_KEY
"""
import argparse
import os
import shutil

import yaml
from roboflow import Roboflow

# workspace, project, version
SOURCES = [
    ("fabric-defect-zpkfr", "fabric-defect-fvlhp", 2),
    ("fabricdefects", "fabric-defect-lk8nb", 4),
    ("azizullohs-workspace", "fabric-defect-35n47", 1),
    ("university-of-engineering-and-technology-lahore-hya19", "fabric-hole-defect-detection", 7),
    ("college-wtlzk", "fabric-stain-detection", 1),
]

# one shared vocabulary, in id order
CLASSES = ["hole", "stain", "tear", "thread", "defect"]

# source label (lowercased) -> shared class. Anything unrecognised falls
# back to the generic "defect" rather than being silently dropped.
ALIASES = {
    # French (fabric-defect-fvlhp)
    "cassure": "tear",
    "tache": "stain",
    "defaut": "defect",
    "fil tire ou gros": "thread",
    # Indonesian (fabric-defect-lk8nb)
    "lubang": "hole",
    "noda": "stain",
    "kusut": "defect",
    # Uzbek (fabric-defect-35n47). teshik=hole and dog'=stain are
    # unambiguous; nina_izi (needle mark) and ulanish (join/seam) have no
    # clean equivalent here so they stay generic.
    "teshik": "hole",
    "dog": "stain",
    "oq_dog": "stain",
    "nina_izi": "defect",
    "ulanish": "defect",
    "fabric-defect": "defect",
    # English
    "hole": "hole",
    "holes": "hole",
    "stain": "stain",
    "stains": "stain",
    "tear": "tear",
    "cut": "tear",
    "thread": "thread",
    "threaderror": "thread",
    "slub": "thread",
    "knot": "thread",
    "defect": "defect",
    "objects": "defect",
}

OUT_DIR = "merged_dataset"


def map_class(name):
    return ALIASES.get(name.strip().lower(), "defect")


def merge_split(src_root, split, names, prefix, stats):
    """Copies one split's images across and rewrites label class ids onto
    the shared taxonomy."""
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
        # prefix keeps filenames unique across datasets
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
                    old_name = names[old_id] if old_id < len(names) else "defect"
                    new_name = map_class(old_name)
                    stats[new_name] = stats.get(new_name, 0) + 1
                    lines_out.append(" ".join([str(CLASSES.index(new_name))] + parts[1:]))

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
        print(f"\n--- {project} v{version} ---")
        if not os.path.exists(location):
            rf.workspace(workspace).project(project).version(version).download("yolov8", location=location)

        with open(os.path.join(location, "data.yaml")) as f:
            names = yaml.safe_load(f).get("names", [])
        if isinstance(names, dict):
            names = [names[k] for k in sorted(names)]
        print(f"  source classes: {names}")
        print(f"  mapped to: {[map_class(n) for n in names]}")

        for split in ("train", "valid", "test"):
            merge_split(location, split, names, f"d{i}", stats)

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

    print(f"\nMerged {stats.pop('_images', 0)} images into {OUT_DIR}")
    print("Instances per class:")
    for name in CLASSES:
        print(f"  {name}: {stats.get(name, 0)}")


if __name__ == "__main__":
    main()
