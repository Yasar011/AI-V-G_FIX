"""
Wraps YOLOv8 so the rest of the app just calls run_inference(image_path)
and gets back a plain dict — it doesn't need to know anything about
ultralytics internals.

NOTE: MODEL_PATH defaults to the generic pretrained "yolov8n.pt" (trained
on COCO — everyday objects, not garment defects). That's intentional for
now: it proves the whole capture -> inference -> upload -> log pipeline
works end to end before Stage 1 training is finished. Once you've
fine-tuned a model on Colab (Stage 1), point MODEL_PATH in .env at that
.pt file instead and everything downstream keeps working unchanged.
"""
from ultralytics import YOLO
from .config import MODEL_PATH

_model = None

# Floor for what even counts as "a detection worth logging" - well below
# CONFIDENCE_THRESHOLD (which decides PASS/REVIEW/FAIL). This just filters
# out near-noise boxes so a garment with multiple real defects gets all of
# them recorded, not just the single loudest one.
MIN_DETECTION_CONFIDENCE = 0.25


def _get_model():
    global _model
    if _model is None:
        print(f"Loading model: {MODEL_PATH} (first run downloads it automatically)")
        _model = YOLO(MODEL_PATH)
    return _model


def run_inference(image_path):
    """
    Runs the model on one image. A garment can have more than one defect,
    so this returns every detection above MIN_DETECTION_CONFIDENCE, sorted
    highest-confidence first - plus top-level defect/confidence/bbox kept
    as the single best detection, unchanged, so existing code (decide(),
    review.py, export_dataset.py, the dashboard) that only cares about
    "the" defect keeps working without modification.

        {
            "defect": "hole", "confidence": 0.87, "bbox": [cx, cy, w, h],
            "detections": [
                {"defect": "hole", "confidence": 0.87, "bbox": [...]},
                {"defect": "stain", "confidence": 0.41, "bbox": [...]},
            ],
        }

    or, if nothing was detected:
        {"defect": None, "confidence": 1.0, "bbox": None, "detections": []}
    """
    model = _get_model()
    results = model(image_path, verbose=False)[0]

    if results.boxes is None or len(results.boxes) == 0:
        return {"defect": None, "confidence": 1.0, "bbox": None, "detections": []}

    detections = []
    for box in results.boxes:
        confidence = float(box.conf[0])
        if confidence < MIN_DETECTION_CONFIDENCE:
            continue
        detections.append({
            "defect": results.names[int(box.cls[0])],
            "confidence": confidence,
            "bbox": box.xywhn[0].tolist(),
        })
    detections.sort(key=lambda d: d["confidence"], reverse=True)

    if not detections:
        return {"defect": None, "confidence": 1.0, "bbox": None, "detections": []}

    best = detections[0]
    return {"defect": best["defect"], "confidence": best["confidence"], "bbox": best["bbox"], "detections": detections}
