"""
Tests for src/database.py's record shape - mocks firebase_admin entirely
so these run without real credentials or a network connection.
"""
from unittest.mock import MagicMock, patch

import src.database as database


def test_log_inspection_record_shape():
    mock_ref = MagicMock()
    mock_child_ref = MagicMock()
    mock_ref.child.return_value = mock_child_ref

    with patch.object(database, "init_firebase"), \
         patch.object(database.db, "reference", return_value=mock_ref):
        record = database.log_inspection(
            image_url="https://example.com/img.jpg",
            predicted_defect="hole",
            confidence=0.87654,
            final_decision="fail",
            rejection_reason="hole",
            bbox=[0.5, 0.5, 0.2, 0.2],
            detections=[{"defect": "hole", "confidence": 0.87654, "bbox": [0.5, 0.5, 0.2, 0.2]}],
        )

    # confidence gets rounded
    assert record["confidence"] == 0.8765
    assert record["predictedDefect"] == "hole"
    assert record["finalDecision"] == "fail"
    assert record["humanVerified"] is False
    assert record["correctedDefect"] is None
    assert len(record["detections"]) == 1
    assert "pieceId" in record and record["pieceId"]
    assert record["timestamp"].endswith("Z")

    # the record actually got written to the right place
    mock_ref.child.assert_called_once_with(record["pieceId"])
    mock_child_ref.set.assert_called_once_with(record)


def test_log_inspection_detections_defaults_to_empty_list():
    mock_ref = MagicMock()
    mock_ref.child.return_value = MagicMock()

    with patch.object(database, "init_firebase"), \
         patch.object(database.db, "reference", return_value=mock_ref):
        record = database.log_inspection(
            image_url="https://example.com/img.jpg",
            predicted_defect=None,
            confidence=1.0,
            final_decision="pass",
        )

    assert record["detections"] == []
    assert record["bbox"] is None
