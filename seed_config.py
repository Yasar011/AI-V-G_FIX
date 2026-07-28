"""
Seeds the lines / floors / garment categories / styles that the capture
app's dropdowns and the dashboard's filters read from. Safe to re-run -
it only fills in what's missing, it won't overwrite existing config.

Edit the values below to match your actual factory, or manage them from
the dashboard's Settings page once seeded.

Run with:  python seed_config.py
"""
from src.database import init_firebase, db

DEFAULTS = {
    "lines": ["Line 1", "Line 2", "Line 3"],
    "floors": ["Floor 1", "Floor 2"],
    # each category lists the views the operator gets walked through,
    # in order, for one garment
    "categories": {
        "shorts": ["Front", "Side", "Back"],
        "panty": ["Front", "Back"],
        "tshirt": ["Front", "Back", "Left sleeve", "Right sleeve"],
    },
    "styles": [
        {"name": "ST-1001", "category": "shorts"},
        {"name": "ST-1002", "category": "panty"},
        {"name": "ST-1003", "category": "tshirt"},
    ],
    # what the operator should actually DO when each defect is found -
    # a defect name alone doesn't tell anyone whether to repair, wash or
    # scrap the piece. "verdict" drives the colour/wording shown.
    "actions": {
        "hole": {"verdict": "reject", "action": "Fabric is holed — cannot repair, scrap the piece"},
        "tear": {"verdict": "reject", "action": "Fabric torn — scrap unless within seam allowance"},
        "Cassure": {"verdict": "reject", "action": "Fabric torn — scrap unless within seam allowance"},
        "stain": {"verdict": "rework", "action": "Send to spotting/washing, then re-inspect"},
        "Tache": {"verdict": "rework", "action": "Send to spotting/washing, then re-inspect"},
        "thread": {"verdict": "rework", "action": "Trim loose/pulled thread and re-inspect"},
        "fil tire ou gros": {"verdict": "rework", "action": "Trim loose/pulled thread and re-inspect"},
        "defect": {"verdict": "check", "action": "Unclear defect — manual check by supervisor"},
        "defaut": {"verdict": "check", "action": "Unclear defect — manual check by supervisor"},
    },
}


def main():
    init_firebase()
    for key, value in DEFAULTS.items():
        ref = db.reference(f"config/{key}")
        if ref.get():
            print(f"config/{key} already set — leaving it alone")
            continue
        ref.set(value)
        print(f"seeded config/{key}")


if __name__ == "__main__":
    main()
