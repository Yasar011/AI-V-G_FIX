"""
G-FIX QC — desktop capture app.

Live camera feed -> YOLOv8 inference -> Cloudinary upload -> Firebase log.
No button to press: place a piece in frame and hold it still for a
moment, and it captures and inspects itself automatically (see
_check_auto_capture). SPACE still works as a manual override. Each
result appears in the panel on the right with a thumbnail, decision
badge, and confidence — plus running PASS/REVIEW/FAIL counters.

Run with:  python capture.py
"""
import os
import sys
import time

import cv2
import numpy as np
from PySide6.QtCore import Qt, QTimer, QThread, Signal
from PySide6.QtGui import QImage, QPixmap, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QLabel, QVBoxLayout,
    QHBoxLayout, QScrollArea, QFrame,
)

from src.config import (
    check_config, CAMERA_INDEX, CONFIDENCE_THRESHOLD, MODEL_PATH,
    AUTO_CAPTURE_MOTION_THRESHOLD, AUTO_CAPTURE_STILL_THRESHOLD,
    AUTO_CAPTURE_STABLE_FRAMES, AUTO_CAPTURE_COOLDOWN_SECONDS,
)
from src.inference import run_inference
from src.uploader import upload_image
from src.database import log_inspection

CAPTURE_DIR = "captures"

DECISION_COLORS = {
    "pass": "#22c55e",
    "review": "#f59e0b",
    "fail": "#ef4444",
}


def decide(defect, confidence):
    """Mirrors the workflow's decision diamond:
    no defect -> PASS, low-confidence defect -> REVIEW, confident defect -> FAIL."""
    if defect is None:
        return "pass", None
    if confidence < CONFIDENCE_THRESHOLD:
        return "review", defect
    return "fail", defect


class InspectionWorker(QThread):
    """Runs inference + upload + logging off the UI thread so the app never
    freezes while waiting on the Cloudinary/Firebase network calls."""
    done = Signal(dict)
    error = Signal(str)

    def __init__(self, frame):
        super().__init__()
        self.frame = frame

    def run(self):
        try:
            os.makedirs(CAPTURE_DIR, exist_ok=True)
            filename = os.path.join(CAPTURE_DIR, f"piece_{int(time.time())}.jpg")
            cv2.imwrite(filename, self.frame)

            result = run_inference(filename)
            decision, reason = decide(result["defect"], result["confidence"])
            image_url = upload_image(filename)
            record = log_inspection(
                image_url, result["defect"], result["confidence"], decision, reason, bbox=result["bbox"]
            )
            record["localImage"] = filename
            self.done.emit(record)
        except Exception as exc:
            self.error.emit(str(exc))


class ResultCard(QFrame):
    """One row in the results panel: thumbnail + decision badge + details."""

    def __init__(self, record):
        super().__init__()
        self.setObjectName("card")
        color = DECISION_COLORS[record["finalDecision"]]
        self.setStyleSheet(f"""
            #card {{ background: #1e293b; border-left: 4px solid {color}; border-radius: 6px; }}
        """)

        thumb = QLabel()
        thumb.setFixedSize(56, 56)
        thumb.setScaledContents(True)
        pixmap = QPixmap(record["localImage"])
        if not pixmap.isNull():
            thumb.setPixmap(pixmap)

        decision_label = QLabel(record["finalDecision"].upper())
        decision_label.setStyleSheet(f"color: {color}; font-weight: 700; font-size: 13px;")

        defect = record["predictedDefect"] or "no defect"
        detail = QLabel(f"{defect} · {record['confidence']:.0%}")
        detail.setStyleSheet("color: #cbd5e1; font-size: 12px;")

        time_label = QLabel(record["timestamp"].split("T")[1][:8])
        time_label.setStyleSheet("color: #64748b; font-size: 11px;")

        text_col = QVBoxLayout()
        text_col.setSpacing(2)
        text_col.addWidget(decision_label)
        text_col.addWidget(detail)
        text_col.addWidget(time_label)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 8, 10, 8)
        layout.addWidget(thumb)
        layout.addLayout(text_col)
        layout.addStretch()


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("G-FIX QC")
        self.resize(1100, 650)
        self.setStyleSheet("QMainWindow { background: #0f172a; } QLabel { color: #e2e8f0; }")

        self.stats = {"pass": 0, "review": 0, "fail": 0}
        self.worker = None
        self.current_frame = None

        # auto-capture state (see _check_auto_capture)
        self.prev_gray_small = None
        self.seen_motion = False
        self.stable_count = 0
        self.cooldown_until = 0.0

        self.cap = cv2.VideoCapture(CAMERA_INDEX)
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open camera at index {CAMERA_INDEX}.")

        self._build_ui()

        self.timer = QTimer(self)
        self.timer.timeout.connect(self._update_frame)
        self.timer.start(30)

        QShortcut(QKeySequence(Qt.Key_Space), self).activated.connect(self._capture)

    def _build_ui(self):
        central = QWidget()
        self.setCentralWidget(central)
        root = QHBoxLayout(central)
        root.setContentsMargins(16, 16, 16, 16)
        root.setSpacing(16)

        # --- left: camera feed + controls ---
        left = QVBoxLayout()
        title = QLabel("G-FIX QC")
        title.setStyleSheet("font-size: 20px; font-weight: 700;")
        subtitle = QLabel(f"Model: {MODEL_PATH}")
        subtitle.setStyleSheet("color: #64748b; font-size: 12px;")
        left.addWidget(title)
        left.addWidget(subtitle)

        self.feed_label = QLabel()
        self.feed_label.setFixedSize(720, 480)
        self.feed_label.setStyleSheet("background: black; border-radius: 8px;")
        self.feed_label.setAlignment(Qt.AlignCenter)
        left.addWidget(self.feed_label)

        self.status_label = QLabel("Waiting for a piece — place one in frame and hold still")
        self.status_label.setStyleSheet("font-size: 14px; font-weight: 600; padding: 6px;")
        left.addWidget(self.status_label)

        hint = QLabel("Auto-captures when the frame settles. Press SPACE to force a capture.")
        hint.setStyleSheet("color: #64748b; font-size: 11px; padding: 0 6px;")
        left.addWidget(hint)

        root.addLayout(left)

        # --- right: stats + results history ---
        right = QVBoxLayout()
        right.setSpacing(10)

        stats_row = QHBoxLayout()
        self.stat_labels = {}
        for key in ("pass", "review", "fail"):
            box = QVBoxLayout()
            count = QLabel("0")
            count.setStyleSheet(f"font-size: 22px; font-weight: 700; color: {DECISION_COLORS[key]};")
            count.setAlignment(Qt.AlignCenter)
            name = QLabel(key.upper())
            name.setStyleSheet("color: #64748b; font-size: 11px;")
            name.setAlignment(Qt.AlignCenter)
            box.addWidget(count)
            box.addWidget(name)
            self.stat_labels[key] = count
            stats_row.addLayout(box)
        right.addLayout(stats_row)

        history_title = QLabel("Recent inspections")
        history_title.setStyleSheet("color: #94a3b8; font-size: 12px; font-weight: 600; margin-top: 8px;")
        right.addWidget(history_title)

        self.history_container = QVBoxLayout()
        self.history_container.addStretch()
        history_widget = QWidget()
        history_widget.setLayout(self.history_container)

        scroll = QScrollArea()
        scroll.setWidget(history_widget)
        scroll.setWidgetResizable(True)
        scroll.setFixedWidth(320)
        scroll.setStyleSheet("QScrollArea { border: none; }")
        right.addWidget(scroll)

        root.addLayout(right)

    def _update_frame(self):
        ok, frame = self.cap.read()
        if not ok:
            return
        self.current_frame = frame
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = rgb.shape
        qimg = QImage(rgb.data, w, h, ch * w, QImage.Format_RGB888)
        pixmap = QPixmap.fromImage(qimg).scaled(
            self.feed_label.width(), self.feed_label.height(), Qt.KeepAspectRatio
        )
        self.feed_label.setPixmap(pixmap)

        self._check_auto_capture(frame)

    def _check_auto_capture(self, frame):
        """Watches for a hand placing a piece (motion) followed by it
        settling (stillness) and triggers a capture automatically - no
        button/keypress needed. State machine per instance, ticked every
        frame: idle -> motion seen -> stable -> capture -> cooldown."""
        small = cv2.resize(frame, (160, 120))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)

        if self.prev_gray_small is None:
            self.prev_gray_small = gray
            return
        diff = float(np.mean(np.abs(gray - self.prev_gray_small)))
        self.prev_gray_small = gray

        now = time.time()
        if now < self.cooldown_until:
            remaining = self.cooldown_until - now
            self.status_label.setText(f"Remove the piece... ready again in {remaining:.0f}s")
            self.status_label.setStyleSheet("font-size: 14px; font-weight: 600; padding: 6px; color: #64748b;")
            return

        if self.worker is not None and self.worker.isRunning():
            return

        if diff > AUTO_CAPTURE_MOTION_THRESHOLD:
            self.seen_motion = True
            self.stable_count = 0
            self.status_label.setText("Detecting piece...")
            self.status_label.setStyleSheet("font-size: 14px; font-weight: 600; padding: 6px; color: #60a5fa;")
        elif self.seen_motion and diff < AUTO_CAPTURE_STILL_THRESHOLD:
            self.stable_count += 1
            if self.stable_count >= AUTO_CAPTURE_STABLE_FRAMES:
                self.seen_motion = False
                self.stable_count = 0
                self._capture()
        else:
            self.stable_count = 0

    def _capture(self):
        if self.current_frame is None:
            return
        if self.worker is not None and self.worker.isRunning():
            return
        self.status_label.setText("Inspecting...")
        self.status_label.setStyleSheet("font-size: 14px; font-weight: 600; padding: 6px; color: #94a3b8;")

        self.worker = InspectionWorker(self.current_frame.copy())
        self.worker.done.connect(self._on_result)
        self.worker.error.connect(self._on_error)
        self.worker.start()

    def _on_result(self, record):
        decision = record["finalDecision"]
        color = DECISION_COLORS[decision]
        defect = record["predictedDefect"] or "no defect"
        self.status_label.setText(f"{decision.upper()} — {defect} ({record['confidence']:.0%})")
        self.status_label.setStyleSheet(f"font-size: 14px; font-weight: 700; padding: 6px; color: {color};")

        self.stats[decision] += 1
        self.stat_labels[decision].setText(str(self.stats[decision]))

        self.history_container.insertWidget(0, ResultCard(record))
        self.cooldown_until = time.time() + AUTO_CAPTURE_COOLDOWN_SECONDS

    def _on_error(self, message):
        self.status_label.setText(f"Error: {message}")
        self.status_label.setStyleSheet("font-size: 14px; font-weight: 700; padding: 6px; color: #ef4444;")

    def closeEvent(self, event):
        self.timer.stop()
        self.cap.release()
        super().closeEvent(event)


def main():
    check_config()
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
