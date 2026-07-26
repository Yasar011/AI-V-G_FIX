import { ref, update } from "firebase/database";
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
