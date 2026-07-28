"""Tests for capture.py's decide() - the PASS/REVIEW/FAIL decision logic."""
from capture import decide


def test_no_defect_is_pass():
    decision, reason = decide(None, 1.0)
    assert decision == "pass"
    assert reason is None


def test_low_confidence_defect_is_review():
    decision, reason = decide("hole", 0.3)
    assert decision == "review"
    assert reason == "hole"


def test_high_confidence_defect_is_fail():
    decision, reason = decide("hole", 0.9)
    assert decision == "fail"
    assert reason == "hole"


def test_confidence_exactly_at_threshold_is_fail():
    # decide() uses `<` not `<=`, so exactly-at-threshold counts as confident enough
    from src.config import CONFIDENCE_THRESHOLD
    decision, reason = decide("stain", CONFIDENCE_THRESHOLD)
    assert decision == "fail"
