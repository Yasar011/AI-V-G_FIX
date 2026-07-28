"""
Tests for src/inference.py's detection filtering/sorting - mocks the
YOLO model entirely so these run fast and don't need real weights or
a GPU.
"""
from unittest.mock import MagicMock, patch

import src.inference as inference


def _make_box(cls_id, confidence, bbox):
    # real ultralytics boxes hold torch tensors, whose .tolist() is what
    # the code under test actually calls - a plain list doesn't have that
    bbox_tensor = MagicMock()
    bbox_tensor.tolist.return_value = bbox

    box = MagicMock()
    box.conf = [confidence]
    box.cls = [cls_id]
    box.xywhn = [bbox_tensor]
    return box


def _run_with_mocked_boxes(boxes, names):
    results = MagicMock()
    results.boxes = boxes
    results.names = names

    model = MagicMock()
    model.return_value = [results]

    with patch.object(inference, "_get_model", return_value=model):
        return inference.run_inference("fake_path.jpg")


def test_no_boxes_returns_no_defect():
    result = _run_with_mocked_boxes([], {})
    assert result["defect"] is None
    assert result["confidence"] == 1.0
    assert result["bbox"] is None
    assert result["detections"] == []


def test_none_boxes_returns_no_defect():
    result = _run_with_mocked_boxes(None, {})
    assert result["defect"] is None
    assert result["detections"] == []


def test_single_detection():
    boxes = [_make_box(0, 0.87, [0.5, 0.5, 0.2, 0.2])]
    names = {0: "hole"}
    result = _run_with_mocked_boxes(boxes, names)

    assert result["defect"] == "hole"
    assert result["confidence"] == 0.87
    assert len(result["detections"]) == 1


def test_multiple_detections_sorted_best_first():
    boxes = [
        _make_box(1, 0.4, [0.1, 0.1, 0.1, 0.1]),
        _make_box(0, 0.9, [0.5, 0.5, 0.2, 0.2]),
        _make_box(0, 0.6, [0.3, 0.3, 0.1, 0.1]),
    ]
    names = {0: "hole", 1: "stain"}
    result = _run_with_mocked_boxes(boxes, names)

    # top-level fields reflect the single best detection
    assert result["defect"] == "hole"
    assert result["confidence"] == 0.9

    # all three kept, sorted highest-confidence first
    assert [d["confidence"] for d in result["detections"]] == [0.9, 0.6, 0.4]
    assert [d["defect"] for d in result["detections"]] == ["hole", "hole", "stain"]


def test_low_confidence_detections_filtered_out():
    boxes = [
        _make_box(0, 0.9, [0.5, 0.5, 0.2, 0.2]),
        _make_box(0, 0.1, [0.1, 0.1, 0.1, 0.1]),  # below MIN_DETECTION_CONFIDENCE
    ]
    names = {0: "hole"}
    result = _run_with_mocked_boxes(boxes, names)

    assert len(result["detections"]) == 1
    assert result["detections"][0]["confidence"] == 0.9
