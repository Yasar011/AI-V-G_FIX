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
import logging
import os
import sys
import time
import uuid

import cv2
import numpy as np
from PySide6.QtCore import Qt, QTimer, QThread, Signal
from PySide6.QtGui import QImage, QPixmap, QKeySequence, QShortcut
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QLabel, QVBoxLayout,
    QHBoxLayout, QScrollArea, QFrame, QComboBox,
)

from src.config import (
    check_config, CAMERA_INDEX, CONFIDENCE_THRESHOLD, MODEL_PATH,
    AUTO_CAPTURE_MOTION_THRESHOLD, AUTO_CAPTURE_STILL_THRESHOLD,
    AUTO_CAPTURE_STABLE_FRAMES, AUTO_CAPTURE_COOLDOWN_SECONDS, SHIFT_BOUNDARIES,
)
from src.inference import run_inference, model_version
from src.uploader import upload_image
from src.database import (
    log_inspection, get_recent_inspections, get_options, get_styles, get_categories,
    get_actions,
)
from src.logging_setup import setup_logging
from src.paths import app_path

CAPTURE_DIR = app_path("captures")
logger = logging.getLogger("gfixqc")

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


def current_shift():
    """
    Which shift a capture belongs to, from the clock.

    Defaults to a conventional three-shift day; override SHIFT_BOUNDARIES
    in .env as "06:00,14:00,22:00" if the factory runs different hours.
    Recorded so defect rates can be compared across shifts - night-shift
    fatigue is a real and measurable effect.
    """
    now = time.localtime()
    minutes = now.tm_hour * 60 + now.tm_min
    bounds = []
    for part in SHIFT_BOUNDARIES.split(","):
        h, m = part.strip().split(":")
        bounds.append(int(h) * 60 + int(m))

    for i, start in enumerate(bounds):
        end = bounds[(i + 1) % len(bounds)]
        if start < end:
            if start <= minutes < end:
                return f"Shift {i + 1}"
        else:  # wraps past midnight
            if minutes >= start or minutes < end:
                return f"Shift {i + 1}"
    return "Shift 1"


def draw_detections(frame, detections):
    """
    Draws a labelled box around every detected defect so the operator can
    see *where* the problem is, not just that there is one. Boxes come
    back from inference as normalized xywh (YOLO's format), so they're
    scaled to pixels here.
    """
    marked = frame.copy()
    height, width = marked.shape[:2]

    for det in detections or []:
        bbox = det.get("bbox")
        if not bbox:
            continue
        cx, cy, bw, bh = bbox
        x1 = int((cx - bw / 2) * width)
        y1 = int((cy - bh / 2) * height)
        x2 = int((cx + bw / 2) * width)
        y2 = int((cy + bh / 2) * height)

        cv2.rectangle(marked, (x1, y1), (x2, y2), (0, 80, 255), 2)

        label = f"{det['defect']} {det['confidence']:.0%}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        # keep the label on-screen when the box sits at the very top
        ty = y1 - 6 if y1 - th - 8 > 0 else y2 + th + 8
        cv2.rectangle(marked, (x1, ty - th - 4), (x1 + tw + 6, ty + 4), (0, 80, 255), -1)
        cv2.putText(marked, label, (x1 + 3, ty), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    return marked


class InspectionWorker(QThread):
    """Runs inference + upload + logging off the UI thread so the app never
    freezes while waiting on the Cloudinary/Firebase network calls."""
    done = Signal(dict)
    error = Signal(str)

    def __init__(self, frame, context):
        super().__init__()
        self.frame = frame
        self.context = context

    def run(self):
        try:
            os.makedirs(CAPTURE_DIR, exist_ok=True)
            stamp = int(time.time())
            filename = os.path.join(CAPTURE_DIR, f"piece_{stamp}.jpg")
            cv2.imwrite(filename, self.frame)

            result = run_inference(filename)
            decision, reason = decide(result["defect"], result["confidence"])

            # Upload the version with the defects boxed on it, so the
            # operator and the dashboard both see *where* the problem is
            # rather than just its name.
            marked = draw_detections(self.frame, result["detections"])
            marked_name = os.path.join(CAPTURE_DIR, f"piece_{stamp}_marked.jpg")
            cv2.imwrite(marked_name, marked)

            image_url = upload_image(marked_name)
            record = log_inspection(
                image_url, result["defect"], result["confidence"], decision, reason,
                bbox=result["bbox"], detections=result["detections"],
                line=self.context.get("line"), floor=self.context.get("floor"),
                style=self.context.get("style"), operator=self.context.get("operator"),
                garment_id=self.context.get("garment_id"), view=self.context.get("view"),
                model_version=model_version(), shift=current_shift(),
            )
            record["localImage"] = marked_name
            self.done.emit(record)
        except Exception as exc:
            logger.exception("Inspection failed")
            self.error.emit(str(exc))


class ResultCard(QFrame):
    """One row in the results panel: thumbnail + decision badge + details."""

    def __init__(self, record):
        super().__init__()
        self.setObjectName("card")
        # older records (and any written before a field existed) may be
        # missing keys, so everything here reads defensively
        decision = record.get("finalDecision") or "review"
        color = DECISION_COLORS.get(decision, "#64748b")
        self.setStyleSheet(f"""
            #card {{ background: #1e293b; border-left: 4px solid {color}; border-radius: 6px; }}
        """)

        thumb = QLabel()
        thumb.setFixedSize(56, 56)
        thumb.setScaledContents(True)
        pixmap = QPixmap(record.get("localImage") or "")
        if not pixmap.isNull():
            thumb.setPixmap(pixmap)

        view = record.get("view")
        decision_label = QLabel(f"{decision.upper()}{f'  ·  {view}' if view else ''}")
        decision_label.setStyleSheet(f"color: {color}; font-weight: 700; font-size: 13px;")

        defect = record.get("predictedDefect") or "no defect"
        extra = len(record.get("detections") or []) - 1
        suffix = f" (+{extra} more)" if extra > 0 else ""
        detail = QLabel(f"{defect} · {record.get('confidence', 0):.0%}{suffix}")
        detail.setStyleSheet("color: #cbd5e1; font-size: 12px;")

        timestamp = record.get("timestamp") or ""
        time_label = QLabel(timestamp.split("T")[1][:8] if "T" in timestamp else "")
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

        # production context + multi-view state (see _current_view)
        self.styles = []
        self.categories = {}
        self.actions = {}
        self.garment_id = None
        self.view_index = 0

        self.cap = cv2.VideoCapture(CAMERA_INDEX)
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open camera at index {CAMERA_INDEX}.")

        self._build_ui()
        self._load_config()
        self._load_history()

        self.timer = QTimer(self)
        self.timer.timeout.connect(self._update_frame)
        self.timer.start(30)

        QShortcut(QKeySequence(Qt.Key_Space), self).activated.connect(self._capture)

    def _load_config(self):
        """Pulls the configured lines/floors/styles/categories from Firebase
        (managed in the dashboard's Settings page) into the dropdowns."""
        try:
            self.styles = get_styles()
            self.categories = get_categories()
            self.actions = get_actions()
            self.line_combo.addItems(get_options("lines") or ["-"])
            self.floor_combo.addItems(get_options("floors") or ["-"])
            self.style_combo.addItems([s["name"] for s in self.styles] or ["-"])
        except Exception:
            logger.exception("Could not load config from Firebase")
        self._reset_garment()

    def _load_history(self):
        """Repopulates the results panel from Firebase so closing and
        reopening the app doesn't look like the data vanished."""
        try:
            for _, record in reversed(get_recent_inspections(15)):
                record.setdefault("localImage", "")
                self.history_container.insertWidget(0, ResultCard(record))
                decision = record.get("finalDecision")
                if decision in self.stats:
                    self.stats[decision] += 1
            for key, label in self.stat_labels.items():
                label.setText(str(self.stats[key]))
        except Exception:
            logger.exception("Could not load inspection history")

    def _views_for_current_style(self):
        """The ordered views (Front/Side/Back...) for the selected style's
        category. Falls back to a single unnamed view if nothing configured."""
        name = self.style_combo.currentText()
        style = next((s for s in self.styles if s.get("name") == name), None)
        if not style:
            return [None]
        return self.categories.get(style.get("category")) or [None]

    def _current_view(self):
        views = self._views_for_current_style()
        return views[self.view_index % len(views)]

    def _reset_garment(self):
        """Starts a fresh garment - new id, back to the first view."""
        self.garment_id = uuid.uuid4().hex[:8]
        self.view_index = 0
        self._update_view_prompt()

    def _update_view_prompt(self):
        views = self._views_for_current_style()
        view = self._current_view()
        if view is None:
            self.view_label.setText("Place a piece in frame")
        else:
            self.view_label.setText(f"Show the {view.upper()}  ({self.view_index + 1} of {len(views)})")

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

        # --- production context: which line/floor/style is being inspected ---
        combo_style = """
            QComboBox { background: #1e293b; color: #e2e8f0; border: 1px solid #334155;
                        border-radius: 6px; padding: 5px 8px; font-size: 12px; }
            QComboBox QAbstractItemView { background: #1e293b; color: #e2e8f0;
                        selection-background-color: #3b82f6; }
        """
        context_row = QHBoxLayout()
        self.line_combo = QComboBox()
        self.floor_combo = QComboBox()
        self.style_combo = QComboBox()
        for label_text, combo in (("Line", self.line_combo), ("Floor", self.floor_combo), ("Style", self.style_combo)):
            lbl = QLabel(label_text)
            lbl.setStyleSheet("color: #64748b; font-size: 11px;")
            combo.setStyleSheet(combo_style)
            context_row.addWidget(lbl)
            context_row.addWidget(combo)
        context_row.addStretch()
        self.style_combo.currentTextChanged.connect(lambda _: self._reset_garment())
        left.addLayout(context_row)

        self.feed_label = QLabel()
        self.feed_label.setFixedSize(720, 440)
        self.feed_label.setStyleSheet("background: black; border-radius: 8px;")
        self.feed_label.setAlignment(Qt.AlignCenter)
        left.addWidget(self.feed_label)

        self.view_label = QLabel("Place a piece in frame")
        self.view_label.setStyleSheet("font-size: 17px; font-weight: 700; color: #60a5fa; padding: 4px 6px;")
        left.addWidget(self.view_label)

        self.status_label = QLabel("Waiting for a piece — place one in frame and hold still")
        self.status_label.setStyleSheet("font-size: 14px; font-weight: 600; padding: 6px;")
        left.addWidget(self.status_label)

        # what to actually DO with the piece - the bit the operator acts on
        self.action_label = QLabel("")
        self.action_label.setWordWrap(True)
        self.action_label.setStyleSheet("font-size: 15px; font-weight: 700; padding: 8px; border-radius: 6px;")
        self.action_label.hide()
        left.addWidget(self.action_label)

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

        context = {
            "line": self.line_combo.currentText(),
            "floor": self.floor_combo.currentText(),
            "style": self.style_combo.currentText(),
            "operator": None,
            "garment_id": self.garment_id,
            "view": self._current_view(),
        }
        self.worker = InspectionWorker(self.current_frame.copy(), context)
        self.worker.done.connect(self._on_result)
        self.worker.error.connect(self._on_error)
        self.worker.start()

    def _on_result(self, record):
        decision = record["finalDecision"]
        color = DECISION_COLORS[decision]
        defect = record["predictedDefect"] or "no defect"
        extra = len(record.get("detections") or []) - 1
        suffix = f" — {extra} more defect(s) found" if extra > 0 else ""
        self.status_label.setText(f"{decision.upper()} — {defect} ({record['confidence']:.0%}){suffix}")
        self.status_label.setStyleSheet(f"font-size: 14px; font-weight: 700; padding: 6px; color: {color};")

        self._show_action(record)

        self.stats[decision] += 1
        self.stat_labels[decision].setText(str(self.stats[decision]))

        self.history_container.insertWidget(0, ResultCard(record))
        self.cooldown_until = time.time() + AUTO_CAPTURE_COOLDOWN_SECONDS

        # advance to the next view of this garment, or start a fresh one
        self.view_index += 1
        if self.view_index >= len(self._views_for_current_style()):
            self._reset_garment()
        else:
            self._update_view_prompt()

    def _show_action(self, record):
        """Turns a defect name into an instruction the operator can act on -
        scrap it, send it for rework, or get a supervisor to look."""
        VERDICT_STYLE = {
            "reject": ("#ef4444", "REJECT"),
            "rework": ("#f59e0b", "REWORK"),
            "check": ("#60a5fa", "CHECK"),
        }
        defect = record.get("predictedDefect")
        if not defect:
            self.action_label.setText("✓  ACCEPT — no defect found, pass this piece")
            self.action_label.setStyleSheet(
                "font-size: 15px; font-weight: 700; padding: 8px; border-radius: 6px;"
                "color: #22c55e; background: rgba(34,197,94,0.12);"
            )
            self.action_label.show()
            return

        entry = self.actions.get(defect) or {}
        verdict = entry.get("verdict", "check")
        action = entry.get("action") or f"'{defect}' found — no action configured, check manually"
        color, label = VERDICT_STYLE.get(verdict, VERDICT_STYLE["check"])

        self.action_label.setText(f"{label} — {action}")
        self.action_label.setStyleSheet(
            f"font-size: 15px; font-weight: 700; padding: 8px; border-radius: 6px;"
            f"color: {color}; background: rgba(148,163,184,0.12);"
        )
        self.action_label.show()

    def _on_error(self, message):
        self.status_label.setText(f"Error: {message}")
        self.status_label.setStyleSheet("font-size: 14px; font-weight: 700; padding: 6px; color: #ef4444;")

    def closeEvent(self, event):
        self.timer.stop()
        self.cap.release()
        super().closeEvent(event)


def main():
    setup_logging()
    logger.info("G-FIX QC starting up")
    check_config()
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
