"""
Handles pushing a captured image up to Cloudinary and handing back the
public URL that gets stored in Firebase (see database.py).
"""
import cloudinary
import cloudinary.uploader
from .config import CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)


def upload_image(local_path, public_id=None):
    """
    Uploads one image and returns its Cloudinary secure_url.
    Images are auto-compressed on upload (quality/format "auto") to save
    credits on the free plan without a visible quality hit.
    """
    result = cloudinary.uploader.upload(
        local_path,
        folder="ai-vision-qc",
        public_id=public_id,
        quality="auto",
        fetch_format="auto",
    )
    return result["secure_url"]
