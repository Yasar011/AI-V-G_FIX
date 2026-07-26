"""
Interactive review tool — the human half of the self-learning loop.

For every REVIEW/FAIL piece that hasn't been human-verified yet, shows the
captured image with its predicted defect + box, and asks you to confirm or
correct the label. The result gets written back to Firebase as ground
truth, ready to be pulled into a retraining dataset by export_dataset.py.

Run with:  python review.py
"""
import cv2
import numpy as np
import requests

from src.database import get_pending_review, mark_reviewed


def load_image(url):
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    arr = np.frombuffer(resp.content, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def draw_box(img, bbox, label):
    if bbox is None:
        return img
    h, w = img.shape[:2]
    cx, cy, bw, bh = bbox
    x1, y1 = int((cx - bw / 2) * w), int((cy - bh / 2) * h)
    x2, y2 = int((cx + bw / 2) * w), int((cy + bh / 2) * h)
    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 165, 255), 2)
    cv2.putText(img, label, (x1, max(y1 - 10, 15)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
    return img


def main():
    records = get_pending_review()
    if not records:
        print("Nothing pending review — all caught up.")
        return

    print(f"{len(records)} piece(s) pending review.")
    verified = 0

    for piece_id, record in records:
        img = load_image(record["imageUrl"])
        label = f"{record['predictedDefect']} ({record['confidence']:.2f})"
        display = draw_box(img.copy(), record.get("bbox"), label)
        cv2.imshow("Review - see terminal for options", display)
        cv2.waitKey(1)

        print(f"\nPiece {piece_id} — predicted: {record['predictedDefect']} "
              f"(confidence {record['confidence']:.2f}, decision {record['finalDecision'].upper()})")
        print("  [Enter] confirm predicted label")
        print("  [type a label] correct it, e.g. 'hole'")
        print("  [n] no defect — false positive")
        print("  [s] skip for now")
        print("  [q] quit")
        choice = input("> ").strip()

        if choice.lower() == "q":
            break
        if choice.lower() == "s":
            continue

        if choice.lower() == "n":
            corrected = "none"
        elif choice == "":
            corrected = record["predictedDefect"]
        else:
            corrected = choice

        mark_reviewed(piece_id, corrected)
        verified += 1
        print(f"  -> saved as '{corrected}'")

    cv2.destroyAllWindows()
    print(f"\nDone — verified {verified} piece(s) this session.")


if __name__ == "__main__":
    main()
