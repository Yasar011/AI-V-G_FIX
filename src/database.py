"""
Writes one record per inspected piece into Firebase Realtime Database,
under inspections/<pieceId> — matching the schema from the project plan:
pieceId, timestamp, imageUrl, predictedDefect, confidence, finalDecision,
rejectionReason, humanVerified.

This lives in the SAME Firebase project as the existing GarmentFix QMS —
just a new top-level node, not a new project.
"""
import datetime
import uuid

import firebase_admin
from firebase_admin import credentials, db

from .config import FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_DATABASE_URL

_app = None


def init_firebase():
    global _app
    if _app is None:
        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
        _app = firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DATABASE_URL})
    return _app


def log_inspection(image_url, predicted_defect, confidence, final_decision, rejection_reason=None,
                   bbox=None, detections=None, line=None, floor=None, style=None, operator=None,
                   garment_id=None, view=None, model_version=None, shift=None):
    """
    Writes one inspection record and returns it (including the generated
    pieceId) so the caller can print/display it.

    predictedDefect/confidence/bbox are the single best detection (kept for
    backward compatibility with review.py/export_dataset.py/the dashboard).
    detections is the full list when a piece has more than one defect - see
    src/inference.py.

    line/floor/style/operator tag which production context the piece came
    from, so the dashboard can scope what each user sees to their own line.

    One physical garment is photographed from several angles (Front, Side,
    Back...), so each capture is its own record sharing a garmentId, with
    view naming which angle it is.

    modelVersion records which weights made the call. Without it, records
    from before and after a retrain are indistinguishable - which breaks
    both QC traceability and any honest "did the new model help?"
    comparison. shift lets defect rates be broken down by shift.
    """
    init_firebase()
    ref = db.reference("inspections")
    piece_id = uuid.uuid4().hex[:8]

    record = {
        "pieceId": piece_id,
        "garmentId": garment_id or piece_id,
        "view": view,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
        "imageUrl": image_url,
        "predictedDefect": predicted_defect,
        "confidence": round(confidence, 4),
        "bbox": bbox,
        "detections": detections or [],
        "finalDecision": final_decision,
        "rejectionReason": rejection_reason,
        "line": line,
        "floor": floor,
        "style": style,
        "operator": operator,
        "shift": shift,
        "modelVersion": model_version,
        "humanVerified": False,
        "correctedDefect": None,
        "reviewedAt": None,
        "reviewedBy": None,
    }
    ref.child(piece_id).set(record)
    return record


def get_recent_inspections(limit=20):
    """
    Returns the most recent [(pieceId, record), ...], newest first - used by
    the capture app to repopulate its history panel on startup instead of
    starting blank every time.
    """
    init_firebase()
    all_records = db.reference("inspections").get() or {}
    items = list(all_records.items())
    items.sort(key=lambda item: item[1].get("timestamp", ""), reverse=True)
    return items[:limit]


def get_options(kind):
    """
    Returns the configured list of lines / floors, e.g.
    get_options("lines") -> ["Line 1", "Line 2"]. Managed from the
    dashboard's Settings page.
    """
    init_firebase()
    values = db.reference(f"config/{kind}").get() or []
    if isinstance(values, dict):
        values = list(values.values())
    return values


def get_styles():
    """
    Returns [{"name": "ST-1234", "category": "shorts"}, ...]. A style's
    category decides which views get captured for it (see get_categories).
    """
    init_firebase()
    values = db.reference("config/styles").get() or []
    if isinstance(values, dict):
        values = list(values.values())
    return [v for v in values if isinstance(v, dict)]


def get_categories():
    """
    Returns {"shorts": ["Front", "Side", "Back"], "panty": ["Front", "Back"]}
    - the ordered list of views the operator is walked through for each
    garment of that category.
    """
    init_firebase()
    return db.reference("config/categories").get() or {}


def get_actions():
    """
    Returns {defect_name: {"verdict": "reject"|"rework"|"check",
    "action": "what to do"}} - so the operator is told what to do with
    the piece, not just what's wrong with it.
    """
    init_firebase()
    return db.reference("config/actions").get() or {}


def get_pending_review():
    """
    Returns [(pieceId, record), ...] for every REVIEW/FAIL piece that
    hasn't been human-verified yet, oldest first.
    """
    init_firebase()
    ref = db.reference("inspections")
    all_records = ref.get() or {}

    pending = [
        (piece_id, record)
        for piece_id, record in all_records.items()
        if not record.get("humanVerified") and record.get("finalDecision") in ("review", "fail")
    ]
    pending.sort(key=lambda item: item[1].get("timestamp", ""))
    return pending


def mark_reviewed(piece_id, corrected_defect):
    """
    Records a human's verdict on a piece: the corrected ground-truth label
    ("none" if the flagged defect was a false positive), so it can later be
    pulled into a retraining dataset by export_dataset.py.
    """
    init_firebase()
    ref = db.reference("inspections").child(piece_id)
    ref.update({
        "humanVerified": True,
        "correctedDefect": corrected_defect,
        "reviewedAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace('+00:00', 'Z'),
    })


def get_verified_for_export():
    """Returns [(pieceId, record), ...] for every human-verified piece."""
    init_firebase()
    ref = db.reference("inspections")
    all_records = ref.get() or {}

    return [
        (piece_id, record)
        for piece_id, record in all_records.items()
        if record.get("humanVerified")
    ]


def get_all_inspections():
    """Returns [(pieceId, record), ...] for every inspection, oldest first."""
    init_firebase()
    ref = db.reference("inspections")
    all_records = ref.get() or {}
    items = list(all_records.items())
    items.sort(key=lambda item: item[1].get("timestamp", ""))
    return items


def delete_inspection(piece_id):
    """Permanently removes an inspection record (does not touch Cloudinary)."""
    init_firebase()
    db.reference("inspections").child(piece_id).delete()
