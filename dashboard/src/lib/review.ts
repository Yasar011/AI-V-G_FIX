import { ref, remove, update } from "firebase/database";
import { db } from "@/lib/firebase";

/**
 * Records a human's verdict on a piece, mirroring review.py's mark_reviewed
 * so both the CLI tool and this dashboard write the same shape of record.
 */
export async function markReviewed(pieceId: string, correctedDefect: string) {
  await update(ref(db, `inspections/${pieceId}`), {
    humanVerified: true,
    correctedDefect,
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
