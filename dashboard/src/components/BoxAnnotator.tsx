"use client";

import { useRef, useState } from "react";

/**
 * Lets a reviewer draw the box around a defect, not just name it.
 *
 * Naming alone is not enough to train from: a corrected label attached to
 * a wrongly-placed box teaches the model the wrong location, and a defect
 * the model missed entirely has no box at all — so those pieces were being
 * dropped from the training export, which are precisely the examples it
 * most needs.
 *
 * Boxes are held in YOLO's normalized centre-xywh form so they survive any
 * display size and need no conversion on export.
 */

export interface AnnotatedBox {
  code: string;
  bbox: [number, number, number, number]; // cx, cy, w, h — all 0..1
}

interface Drag {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function BoxAnnotator({
  imageUrl,
  code,
  boxes,
  onChange,
}: {
  imageUrl: string;
  code: string;
  boxes: AnnotatedBox[];
  onChange: (boxes: AnnotatedBox[]) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);

  /** Pointer position as a 0..1 fraction of the displayed image. */
  function fraction(e: React.PointerEvent) {
    const r = frameRef.current!.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!code) return; // pick a defect code first, so the box has a meaning
    const { x, y } = fraction(e);
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag({ x0: x, y0: y, x1: x, y1: y });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const { x, y } = fraction(e);
    setDrag({ ...drag, x1: x, y1: y });
  }

  function onPointerUp() {
    if (!drag) return;
    const w = Math.abs(drag.x1 - drag.x0);
    const h = Math.abs(drag.y1 - drag.y0);
    // ignore stray clicks — anything under ~1% of the frame is not a box
    if (w > 0.012 && h > 0.012) {
      onChange([
        ...boxes,
        {
          code,
          bbox: [
            (drag.x0 + drag.x1) / 2,
            (drag.y0 + drag.y1) / 2,
            w,
            h,
          ],
        },
      ]);
    }
    setDrag(null);
  }

  const pct = (v: number) => `${v * 100}%`;

  return (
    <div>
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 8,
          overflow: "hidden",
          background: "#000",
          cursor: code ? "crosshair" : "not-allowed",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="piece under review"
          draggable={false}
          style={{ width: "100%", display: "block", maxHeight: 380, objectFit: "contain" }}
        />

        {boxes.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: pct(b.bbox[0] - b.bbox[2] / 2),
              top: pct(b.bbox[1] - b.bbox[3] / 2),
              width: pct(b.bbox[2]),
              height: pct(b.bbox[3]),
              border: "2px solid #0ea98f",
              boxShadow: "0 0 0 1px rgba(0,0,0,.35)",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -19,
                left: -2,
                background: "#0ea98f",
                color: "#fff",
                fontSize: 11,
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: 3,
                whiteSpace: "nowrap",
              }}
            >
              {b.code}
            </span>
          </div>
        ))}

        {drag && (
          <div
            style={{
              position: "absolute",
              left: pct(Math.min(drag.x0, drag.x1)),
              top: pct(Math.min(drag.y0, drag.y1)),
              width: pct(Math.abs(drag.x1 - drag.x0)),
              height: pct(Math.abs(drag.y1 - drag.y0)),
              border: "2px dashed #0ea98f",
              background: "rgba(14,169,143,.14)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--text2)" }}>
          {!code
            ? "Choose a defect code first, then drag on the image to mark where it is."
            : boxes.length === 0
            ? `Drag on the image to mark where the ${code} is.`
            : `${boxes.length} box${boxes.length === 1 ? "" : "es"} marked — drag again to add another.`}
        </span>
        {boxes.length > 0 && (
          <>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onChange(boxes.slice(0, -1))}
              type="button"
            >
              Undo last
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onChange([])}
              type="button"
            >
              Clear all
            </button>
          </>
        )}
      </div>
    </div>
  );
}
