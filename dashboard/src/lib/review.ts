import { ref, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";

export interface CorrectedBox {
  code: string;
  bbox: [number, number, number, number];
}

/**
 * Records a human's verdict on a piece, mirroring review.py's mark_reviewed
 * so both the CLI tool and this dashboard write the same shape of record.
 *
 * correctedBoxes carries where the reviewer says the defects actually are.
 * The export prefers these over the model's own boxes, which is what makes
 * a missed defect usable as training data — previously a piece with no
 * predicted box was skipped entirely.
 */
export async function markReviewed(
  pieceId: string,
  correctedDefect: string,
  correctedBoxes?: CorrectedBox[],
) {
  await update(ref(db, `inspections/${pieceId}`), {
    humanVerified: true,
    correctedDefect,
    correctedBoxes: correctedBoxes?.length ? correctedBoxes : null,
    reviewedAt: new Date().toISOString(),
  });
}

/**
 * Permanently removes an inspection record (e.g. demo/test captures that
 * were never a real garment). Does not touch the Cloudinary image.
 */
export async function deleteInspection(pieceId: string) {
  await remove(ref(db, `inspections/${pieceId}`));
}
