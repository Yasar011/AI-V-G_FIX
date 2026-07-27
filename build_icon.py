"""
Generates assets/icon.ico for the G-FIX QC packaged app (taskbar/exe icon)
and assets/logo.png (for README/dashboard use) from the same drawn mark:
a magnifier ring with a checkmark, over a stitched thread arc.

Run with: python build_icon.py
"""
import os
from PIL import Image, ImageDraw

SIZE = 512
OUT_DIR = "assets"


def draw_logo():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # background rounded square
    d.rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=112, fill=(15, 23, 42, 255))
    d.rounded_rectangle([8, 8, SIZE - 9, SIZE - 9], radius=104, outline=(51, 65, 85, 255), width=4)

    # stitched thread arc
    bbox = [100 - 20, 380 - 320, 412 + 20, 380 + 220]
    d.arc([100 - 20, 160, 432, 600], start=200, end=340, fill=(71, 85, 105, 255), width=6)

    # magnifier ring
    ring_bbox = [256 - 118, 220 - 118, 256 + 118, 220 + 118]
    d.ellipse(ring_bbox, outline=(59, 130, 246, 255), width=22)
    d.line([338, 302, 392, 356], fill=(59, 130, 246, 255), width=26, joint="curve")

    # checkmark
    d.line([196, 224, 236, 268, 322, 172], fill=(34, 197, 94, 255), width=26, joint="curve")

    return img


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    logo = draw_logo()
    logo.save(os.path.join(OUT_DIR, "logo.png"))

    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    logo.save(os.path.join(OUT_DIR, "icon.ico"), sizes=icon_sizes)

    print(f"Wrote {OUT_DIR}/logo.png and {OUT_DIR}/icon.ico")


if __name__ == "__main__":
    main()
