"""
Loads the factory's real 60-code defect taxonomy into Firebase.

The AI currently only detects a handful of fabric-surface defects
(hole/stain/thread). This catalogue is what *humans* tag with during
review - so corrections are recorded against real QC codes instead of
the model's generic labels, analytics group by real categories, and the
verified records accumulate into a training set for the codes the model
can't see yet.

Verdicts are a sensible starting point, not gospel - REJECT for damage
that can't be undone, REWORK for anything re-sewable/washable, CHECK
where it depends on severity. Adjust them in Settings.

Run with:  python seed_defect_catalog.py
"""
from src.database import init_firebase, db

CATEGORIES = {
    "S": "Stitching",
    "L": "Label",
    "M": "Measurement",
    "D": "Marks & Stains",
    "E": "Print & Heat Seal",
    "F": "Fabric",
}

# code: (name, verdict)
DEFECTS = {
    # --- Stitching ---
    "S1": ("Broken Stitch", "rework"),
    "S2": ("Cut Damage", "reject"),
    "S3": ("High-Low", "rework"),
    "S4": ("Incorrect Placement", "rework"),
    "S5": ("Insecure Attaching", "rework"),
    "S6": ("Insecure Bar tack", "rework"),
    "S7": ("Joint Stitch", "rework"),
    "S8": ("Looseness", "rework"),
    "S9": ("Lose Tension", "rework"),
    "S10": ("Missing Bar tack", "rework"),
    "S11": ("Missing Stitch", "rework"),
    "S12": ("Needle Holes", "reject"),
    "S13": ("Open Seam", "rework"),
    "S14": ("Out of Shape", "check"),
    "S15": ("Over Tacking", "rework"),
    "S16": ("Pleated", "rework"),
    "S17": ("Poor Tacking", "rework"),
    "S18": ("Puckering", "rework"),
    "S19": ("Raw Edge", "rework"),
    "S20": ("Roping", "rework"),
    "S21": ("Run Off", "rework"),
    "S22": ("Skip Stitch", "rework"),
    "S23": ("Slanted", "rework"),
    "S24": ("Tight Tension", "rework"),
    "S25": ("Twisted Seam", "rework"),
    "S26": ("Twisting", "rework"),
    "S27": ("Unbalanced", "rework"),
    "S28": ("Untrim Thread", "rework"),
    "S29": ("Waviness", "rework"),
    "S30": ("Uneven", "rework"),
    "S31": ("Seam Mismatch", "rework"),
    "S32": ("Loop Missing", "rework"),
    "S33": ("Poor Pressing", "rework"),
    "S34": ("Stripe Mismatch", "check"),
    # --- Label ---
    "L1": ("Incorrect Size Label", "rework"),
    "L2": ("Incorrect Care Label", "rework"),
    "L3": ("Missing Label", "rework"),
    # --- Measurement ---
    "M1": ("Minus Out of Tolerance", "check"),
    "M2": ("Plus Out of Tolerance", "check"),
    # --- Marks & Stains ---
    "D1": ("Oil Mark", "rework"),
    "D2": ("Pen/Pencil Mark", "rework"),
    "D3": ("Chalk Mark", "rework"),
    "D4": ("Dye Patch", "check"),
    "D5": ("Stain Remover Mark", "rework"),
    "D6": ("Unidentified Stain", "rework"),
    "D7": ("Glue Mark", "rework"),
    # --- Print & Heat Seal ---
    "E1": ("Incorrect Heat Seal", "reject"),
    "E2": ("Incorrect Print", "reject"),
    "E3": ("Cracking Heat Seal", "reject"),
    "E4": ("Cracking on Print", "reject"),
    "E5": ("Missing Print", "reject"),
    "E6": ("Smudge Print", "reject"),
    # --- Fabric ---
    "F1": ("Color Shading", "check"),
    "F2": ("Crease Mark", "rework"),
    "F3": ("Fabric Hole", "reject"),
    "F4": ("Foreign Yarn", "check"),
    "F5": ("Missing Yarn", "reject"),
    "F6": ("Slubs", "check"),
    "F7": ("Fabric Runs", "reject"),
    "F8": ("Fabric Stain", "rework"),
}

# Which catalogue code each AI class most closely corresponds to, so a
# model prediction lands on a real code instead of a generic word. Only
# the handful the model can genuinely see - everything else is
# human-tagged for now.
AI_CLASS_TO_CODE = {
    "hole": "F3",
    "stain": "F8",
    "tear": "S2",
    "thread": "S28",
    "defect": "",          # genuinely unknown - reviewer decides
    # older French-named model
    "Cassure": "S2",
    "Tache": "F8",
    "fil tire ou gros": "F4",
    "defaut": "",
}

VERDICT_ACTION = {
    "reject": "Scrap the piece — damage cannot be repaired",
    "rework": "Send for rework, then re-inspect",
    "check": "Supervisor check — depends on severity/tolerance",
}


def main():
    init_firebase()

    catalog = {}
    for code, (name, verdict) in DEFECTS.items():
        catalog[code] = {
            "code": code,
            "name": name,
            "category": CATEGORIES[code[0]],
            "verdict": verdict,
            "action": VERDICT_ACTION[verdict],
        }

    db.reference("config/defectCatalog").set(catalog)
    db.reference("config/defectCategories").set(CATEGORIES)
    db.reference("config/aiClassToCode").set(AI_CLASS_TO_CODE)

    by_cat = {}
    for entry in catalog.values():
        by_cat[entry["category"]] = by_cat.get(entry["category"], 0) + 1

    print(f"Seeded {len(catalog)} defect codes:")
    for cat, count in sorted(by_cat.items()):
        print(f"  {cat}: {count}")
    print("\nAI classes mapped to codes:")
    for ai_class, code in AI_CLASS_TO_CODE.items():
        print(f"  {ai_class} -> {code or '(reviewer decides)'}")


if __name__ == "__main__":
    main()
