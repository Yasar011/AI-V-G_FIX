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


def log_inspection(image_url, predicted_defect, confidence, final_decision, rejection_reason=None, bbox=None):
    """
    Writes one inspection record and returns it (including the generated
    pieceId) so the caller can print/display it.
    """
    init_firebase()
    ref = db.reference("inspections")
    piece_id = uuid.uuid4().hex[:8]

    record = {
        "pieceId": piece_id,
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        "imageUrl": image_url,
        "predictedDefect": predicted_defect,
        "confidence": round(confidence, 4),
        "bbox": bbox,
        "finalDecision": final_decision,
        "rejectionReason": rejection_reason,
        "humanVerified": False,
        "correctedDefect": None,
        "reviewedAt": None,
    }
    ref.child(piece_id).set(record)
    return record


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
        "reviewedAt": datetime.datetime.utcnow().isoformat() + "Z",
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
