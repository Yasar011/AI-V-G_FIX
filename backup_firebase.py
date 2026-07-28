"""
Exports the /inspections and /users Firebase RTDB nodes to a timestamped
local JSON file. There's no automatic backup of inspection data
otherwise - if the Firebase project were ever lost or corrupted, this is
the only way to get it back.

Doesn't touch the actual images (those live on Cloudinary and aren't
going anywhere as long as that account exists) - just the structured
records: predictions, decisions, human corrections, user accounts.

Run manually whenever, or schedule it (e.g. Windows Task Scheduler
running `python backup_firebase.py` daily) for ongoing protection.

Run with:  python backup_firebase.py [output_dir]
Defaults to ./backups
"""
import datetime
import json
import os
import sys

from src.database import init_firebase, db

BACKUP_DIR = "backups"


def main():
    out_dir = sys.argv[1] if len(sys.argv) > 1 else BACKUP_DIR
    os.makedirs(out_dir, exist_ok=True)

    init_firebase()
    inspections = db.reference("inspections").get() or {}
    users = db.reference("users").get() or {}

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    out_path = os.path.join(out_dir, f"firebase_backup_{timestamp}.json")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"inspections": inspections, "users": users}, f, indent=2)

    print(f"Backed up {len(inspections)} inspection(s) and {len(users)} user(s) -> {out_path}")


if __name__ == "__main__":
    main()
