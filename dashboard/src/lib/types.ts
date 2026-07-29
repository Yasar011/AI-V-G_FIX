export type Decision = "pass" | "review" | "fail";

export interface Detection {
  defect: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface InspectionRecord {
  pieceId: string;
  garmentId?: string;
  view?: string | null;
  timestamp: string;
  imageUrl: string;
  predictedDefect: string | null;
  confidence: number;
  bbox: [number, number, number, number] | null;
  detections?: Detection[];
  finalDecision: Decision;
  rejectionReason: string | null;
  line?: string | null;
  floor?: string | null;
  style?: string | null;
  operator?: string | null;
  shift?: string | null;
  /** which weights made this call — lets accuracy be compared across retrains */
  modelVersion?: string | null;
  humanVerified: boolean;
  correctedDefect: string | null;
  /** where the reviewer says the defects actually are — preferred over the
   *  model's own boxes when building a training set */
  correctedBoxes?: { code: string; bbox: [number, number, number, number] }[] | null;
  reviewedAt: string | null;
  reviewedBy?: string | null;
}
