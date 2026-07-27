"""
Central place all other modules pull settings from.
Everything here is read from .env (see .env.example) so no secrets
ever get hardcoded or committed.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# --- Cloudinary ---
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# --- Firebase ---
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "firebase-service-account.json")
FIREBASE_DATABASE_URL = os.getenv("FIREBASE_DATABASE_URL")

# --- Inspection behaviour ---
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.6"))
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
MODEL_PATH = os.getenv("MODEL_PATH", "yolov8n.pt")

# --- Auto-capture (no button/keypress needed - triggers when a piece is
# placed in frame and holds still) ---
# Mean frame-to-frame pixel difference above this = something is moving
# (a hand placing/removing a piece).
AUTO_CAPTURE_MOTION_THRESHOLD = float(os.getenv("AUTO_CAPTURE_MOTION_THRESHOLD", "12.0"))
# Below this = the frame is considered still.
AUTO_CAPTURE_STILL_THRESHOLD = float(os.getenv("AUTO_CAPTURE_STILL_THRESHOLD", "4.0"))
# Consecutive still frames required (after motion was seen) before capturing.
AUTO_CAPTURE_STABLE_FRAMES = int(os.getenv("AUTO_CAPTURE_STABLE_FRAMES", "15"))
# Seconds to wait after a capture before auto-capture can trigger again.
AUTO_CAPTURE_COOLDOWN_SECONDS = float(os.getenv("AUTO_CAPTURE_COOLDOWN_SECONDS", "4.0"))


def check_config():
    """Called at startup so missing credentials fail loudly and early,
    instead of halfway through processing a piece."""
    missing = []
    for name in ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET", "FIREBASE_DATABASE_URL"]:
        if not globals()[name]:
            missing.append(name)
    if missing:
        raise RuntimeError(
            f"Missing required settings in .env: {', '.join(missing)}\n"
            f"Copy .env.example to .env and fill these in first."
        )
