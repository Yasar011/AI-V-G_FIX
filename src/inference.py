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


def _get_model():
    global _model
    if _model is None:
        print(f"Loading model: {MODEL_PATH} (first run downloads it automatically)")
        _model = YOLO(MODEL_PATH)
    return _model


def run_inference(image_path):
    """
    Runs the model on one image and returns the single highest-confidence
    detection, e.g.:
        {"defect": "hole", "confidence": 0.87, "bbox": [cx, cy, w, h]}
    (bbox is normalized xywh, same format YOLO label files use) or, if
    nothing was detected:
        {"defect": None, "confidence": 1.0, "bbox": None}
    """
    model = _get_model()
    results = model(image_path, verbose=False)[0]

    if results.boxes is None or len(results.boxes) == 0:
        return {"defect": None, "confidence": 1.0, "bbox": None}

    best_box = max(results.boxes, key=lambda b: float(b.conf[0]))
    label = results.names[int(best_box.cls[0])]
    confidence = float(best_box.conf[0])
    bbox = best_box.xywhn[0].tolist()
    return {"defect": label, "confidence": confidence, "bbox": bbox}
