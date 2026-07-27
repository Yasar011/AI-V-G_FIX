"""
Removes demo/test inspection records left over from testing the pipeline
before Stage 1 fine-tuning - back when MODEL_PATH was still the generic
COCO-pretrained yolov8n.pt, so "defects" were things like scissors, a
person, a dog, etc. instead of real fabric defects.

Identifies them by predictedDefect not being one of the real fabric
defect classes the fine-tuned model actually knows about, then asks for
confirmation before deleting anything.

Run with:  python clear_demo_data.py
"""
from src.database import get_all_inspections, delete_inspection

REAL_DEFECT_CLASSES = {"Cassure", "Tache", "defaut", "fil tire ou gros", None}


def main():
    records = get_all_inspections()
    demo = [(pid, r) for pid, r in records if r.get("predictedDefect") not in REAL_DEFECT_CLASSES]

    if not demo:
        print("No demo/test records found — nothing to clean up.")
        return

    print(f"Found {len(demo)} demo/test record(s) (not real fabric defect classes):\n")
    for piece_id, record in demo:
        print(f"  {piece_id}  {record.get('predictedDefect')!r}  "
              f"{record.get('finalDecision')}  {record.get('timestamp')}")

    confirm = input(f"\nDelete all {len(demo)} of these permanently? [y/N] ").strip().lower()
    if confirm != "y":
        print("Cancelled — nothing deleted.")
        return

    for piece_id, _ in demo:
        delete_inspection(piece_id)
    print(f"Deleted {len(demo)} record(s).")


if __name__ == "__main__":
    main()
