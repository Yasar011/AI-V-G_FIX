export type Decision = "pass" | "review" | "fail";

export interface InspectionRecord {
  pieceId: string;
  timestamp: string;
  imageUrl: string;
  predictedDefect: string | null;
  confidence: number;
  bbox: [number, number, number, number] | null;
  finalDecision: Decision;
  rejectionReason: string | null;
  humanVerified: boolean;
  correctedDefect: string | null;
  reviewedAt: string | null;
}
