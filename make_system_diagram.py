"""System architecture diagram for G-FIX QC, in the academic-paper style."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyArrowPatch, Rectangle, Ellipse, Circle, Polygon

INK = "#1A2436"
NAVY = "#3B4A6B"
GREY = "#5B6678"
LIGHT = "#8A93A3"
TEAL = "#0B7F6C"
RED = "#C8353A"
AMBER = "#9A6A00"
BLUE = "#2A5FB8"

fig, ax = plt.subplots(figsize=(14.5, 9.6))
ax.set_xlim(0, 145)
ax.set_ylim(0, 96)
ax.axis("off")
ax.set_aspect("equal")

# outer frame, as in the reference
ax.add_patch(Rectangle((1.5, 1.5), 142, 93, fill=False, ec="#D5DAE3", lw=1.2))


def box(x, y, w, h, label, sub=None, ec=NAVY, lw=1.3, fs=9.5, subfs=8, fc="white"):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec, lw=lw))
    if sub:
        ax.text(x + w / 2, y + h * 0.62, label, ha="center", va="center",
                fontsize=fs, color=INK)
        ax.text(x + w / 2, y + h * 0.28, sub, ha="center", va="center",
                fontsize=subfs, color=GREY)
    else:
        ax.text(x + w / 2, y + h / 2, label, ha="center", va="center",
                fontsize=fs, color=INK)


def arrow(x1, y1, x2, y2, label=None, lx=None, ly=None, col=INK, fs=8.5, lw=1.1):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle="-|>",
                                 mutation_scale=10, lw=lw, color=col,
                                 shrinkA=0, shrinkB=0))
    if label:
        ax.text(lx if lx is not None else (x1 + x2) / 2,
                ly if ly is not None else (y1 + y2) / 2 + 1.6,
                label, ha="center", va="bottom", fontsize=fs, color=INK)


def elbow(pts, label=None, lx=None, ly=None, col=INK, lw=1.1):
    for a, b in zip(pts, pts[1:-1]):
        ax.plot([a[0], b[0]], [a[1], b[1]], color=col, lw=lw)
    arrow(pts[-2][0], pts[-2][1], pts[-1][0], pts[-1][1], col=col, lw=lw)
    if label:
        ax.text(lx, ly, label, ha="center", va="bottom", fontsize=8.5, color=INK)


# ---------------------------------------------------------------- sources
for i, (y, name) in enumerate([(80, "Public fabric\ndatasets"),
                               (66, "Public stitching\ndatasets"),
                               (48, "Your own\ngarment photos")]):
    box(5, y, 20, 10, name, fs=9)
    if i < 2:
        elbow([(25, y + 5), (34, y + 5), (34, 70)], None)

ax.text(15, 60.5, "⋮", ha="center", fontsize=13, color=LIGHT)
arrow(25, 53, 34, 53, None)
ax.plot([34, 34], [53, 62], color=INK, lw=1.1)

ax.text(29.5, 86, "Data collection", fontsize=8.5, color=INK, ha="center")
ax.text(15, 44.5, "collected through the review loop", fontsize=7.6,
        color=TEAL, ha="center", style="italic")

# ---------------------------------------------------------------- dataset store
cx, cy, cw, ch = 36, 60, 17, 13
ax.add_patch(Rectangle((cx, cy), cw, ch, facecolor="white", edgecolor=INK, lw=1.3))
ax.add_patch(Ellipse((cx + cw / 2, cy + ch), cw, 3.6, facecolor="white",
                     edgecolor=INK, lw=1.3))
ax.add_patch(Ellipse((cx + cw / 2, cy), cw, 3.6, facecolor="white",
                     edgecolor=INK, lw=1.3))
ax.text(cx + cw / 2, cy + ch / 2 + 1, "Training", ha="center", fontsize=9, color=INK)
ax.text(cx + cw / 2, cy + ch / 2 - 2.4, "image set", ha="center", fontsize=9, color=INK)

# ---------------------------------------------------------------- annotation
arrow(53, 66.5, 62, 66.5, "Annotation", 57.5, 68)
box(62, 58, 26, 17, "", None)
ax.text(75, 77, "Labelled data", ha="center", fontsize=8.5, color=INK)
for r in range(2):
    for c in range(4):
        x = 63.5 + c * 6.1
        y = 68.5 - r * 8
        ax.add_patch(Rectangle((x, y), 5.2, 6.6, facecolor="#EDF0F5",
                               edgecolor=LIGHT, lw=0.7))
        ax.add_patch(Rectangle((x + 1.4, y + 1.8), 2.2, 2.4, fill=False,
                               edgecolor=RED, lw=1.0))

# ---------------------------------------------------------------- training
arrow(88, 66.5, 97, 66.5, "Training", 92.5, 68)
box(97, 60, 17, 13, "Febo", "trained model", ec=TEAL, lw=1.8, fs=11)
ax.add_patch(Rectangle((94.6, 63), 2.4, 7, facecolor="white", edgecolor=TEAL, lw=1.4))
ax.add_patch(Rectangle((114, 63), 2.4, 7, facecolor="white", edgecolor=TEAL, lw=1.4))
ax.text(105.5, 56.5, "one file · ~6 MB", ha="center", fontsize=7.6,
        color=TEAL, style="italic")

# ---------------------------------------------------------------- deploy
elbow([(105.5, 60), (105.5, 47), (98, 47)], "Deploy to stations", 108, 48.5,
      col=TEAL)

# ---------------------------------------------------------------- station app
box(58, 34, 40, 20, "", None)
ax.text(78, 51.4, "Inspection station  (Raspberry Pi)", ha="center",
        fontsize=8.5, color=INK)

# little neural-net glyph
nx, ny = 66, 44
for (dx, dy) in [(0, 0), (0, 4), (0, -4)]:
    ax.add_patch(Circle((nx, ny + dy), 1.05, color=BLUE))
for (dx, dy) in [(5, 2), (5, -2)]:
    ax.add_patch(Circle((nx + dx, ny + dy), 1.05, color=BLUE))
ax.add_patch(Circle((nx + 10, ny), 1.05, color=BLUE))
for a in [(0, 0), (0, 4), (0, -4)]:
    for b in [(5, 2), (5, -2)]:
        ax.plot([nx + a[0], nx + b[0]], [ny + a[1], ny + b[1]], color=BLUE, lw=0.6)
for b in [(5, 2), (5, -2)]:
    ax.plot([nx + b[0], nx + 10], [ny + b[1], ny], color=BLUE, lw=0.6)
ax.text(71, 36.5, "Febo running on-device", ha="center", fontsize=7.6, color=GREY)

# garment photo stack going in
for i in range(3):
    ax.add_patch(Rectangle((84 + i * 1.3, 40 - i * 1.1), 10, 9,
                           facecolor="#EDF0F5", edgecolor=LIGHT, lw=0.7))
arrow(84, 44.5, 79, 44.5, None)

# ---------------------------------------------------------------- operator
ax.add_patch(Circle((128, 40), 3.2, color="#5EA9DA"))
ax.add_patch(Polygon([[122.5, 30], [133.5, 30], [131.5, 36.5], [124.5, 36.5]],
                     closed=True, color="#5EA9DA"))
ax.text(128, 26.5, "Operator", ha="center", fontsize=9, color=INK)
arrow(121, 40, 98, 42, "Places a garment", 110, 43.5)

# ---------------------------------------------------------------- verdict
elbow([(78, 34), (78, 26)], "Inference", 82.5, 29)
box(52, 12, 40, 14, "", None)
ax.text(72, 23.6, "Verdict shown at the station", ha="center", fontsize=8.5, color=INK)
ax.add_patch(Rectangle((54.5, 18.4), 9, 4.6, facecolor="#EDF0F5",
                       edgecolor=LIGHT, lw=0.7))
ax.text(78, 20.7, "PASS", fontsize=10, color=TEAL, va="center", weight="bold")
ax.add_patch(Rectangle((54.5, 12.9), 9, 4.6, facecolor="#EDF0F5",
                       edgecolor=LIGHT, lw=0.7))
ax.add_patch(Rectangle((56.5, 14.1), 2.4, 2.2, fill=False, edgecolor=RED, lw=1.0))
ax.text(78, 15.2, "REJECT / REWORK", fontsize=10, color=RED, va="center",
        weight="bold")

# ---------------------------------------------------------------- decision
arrow(52, 19, 45, 19, "Defect?", 48.5, 20.5)
dcx, dcy = 34, 19
ax.add_patch(Polygon([[dcx, dcy + 7], [dcx + 10, dcy], [dcx, dcy - 7],
                      [dcx - 10, dcy]], closed=True, fill=False,
                     edgecolor=AMBER, lw=1.4))
ax.text(dcx, dcy + 1.4, "Confident", ha="center", fontsize=8.5, color=INK)
ax.text(dcx, dcy - 2, "enough?", ha="center", fontsize=8.5, color=INK)

# no -> human review
arrow(34, 12, 34, 6.5, "No", 36.5, 8)
box(18, 1.5, 32, 5, "Human review  →  assigns the true defect code",
    None, ec=BLUE, lw=1.5, fs=8.5)

# yes -> record
arrow(24, 19, 16, 19, "Yes", 20, 20.5)

# ---------------------------------------------------------------- storage
box(3, 12, 12, 14, "Record +\nphoto", "logged", fs=8.5, subfs=7.5)
elbow([(9, 26), (9, 33), (16, 33)], None)
box(16, 28, 26, 10, "Dashboard", "live results, analytics, review queue",
    ec=BLUE, lw=1.5, fs=9, subfs=7.4)

# review feeds back into the dataset
elbow([(50, 4), (100, 4), (100, 10)], None, col=TEAL)
ax.plot([100, 132], [10, 10], color=TEAL, lw=1.1, ls=(0, (4, 3)))
ax.plot([132, 132], [10, 53], color=TEAL, lw=1.1, ls=(0, (4, 3)))
ax.plot([132, 44.5], [53, 53], color=TEAL, lw=1.1, ls=(0, (4, 3)))
ax.add_patch(FancyArrowPatch((44.5, 53), (44.5, 59.5), arrowstyle="-|>",
                             mutation_scale=10, lw=1.1, color=TEAL,
                             linestyle=(0, (4, 3))))
ax.text(88, 5.4, "verified corrections become new training data  —  the loop that makes Febo better",
        ha="center", fontsize=8, color=TEAL, style="italic")

fig.savefig("system_diagram.png", dpi=200, bbox_inches="tight",
            facecolor="white", pad_inches=0.15)
print("system_diagram.png")
