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
