export type Decision = "pass" | "review" | "fail";

export interface Detection {
  defect: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface InspectionRecord {
  pieceId: string;
  timestamp: string;
  imageUrl: string;
  predictedDefect: string | null;
  confidence: number;
  bbox: [number, number, number, number] | null;
  detections?: Detection[];
  finalDecision: Decision;
  rejectionReason: string | null;
  humanVerified: boolean;
  correctedDefect: string | null;
  reviewedAt: string | null;
}
