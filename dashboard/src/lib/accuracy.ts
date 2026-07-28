import type { InspectionRecord } from "@/lib/types";

/**
 * Real-world accuracy, measured from human review rather than a benchmark.
 *
 * Every benchmark figure (mAP50 and friends) comes from public datasets
 * photographed elsewhere. The only measure of whether the system helps on
 * *this* line is what happens when a person checks its work — and that is
 * already being recorded every time someone works the review queue.
 *
 * Only human-verified records count. Anything unreviewed is unknown, not
 * correct, and is excluded rather than assumed either way.
 */

export interface AccuracyStats {
  reviewed: number;          // records a human has verified
  correct: number;           // model agreed with the human
  falseAlarms: number;       // model flagged a defect, human found none
  misclassified: number;     // defect was real, model named the wrong one
  accuracy: number | null;   // correct / reviewed
  falseAlarmRate: number | null;
  byCode: CodeAccuracy[];
  byModel: ModelAccuracy[];
}

export interface CodeAccuracy {
  code: string;
  reviewed: number;
  correct: number;
  accuracy: number;
}

export interface ModelAccuracy {
  version: string;
  reviewed: number;
  accuracy: number;
}

/** A human marking "no defect" is recorded as "none" (see review.py). */
const NO_DEFECT = new Set(["none", "no defect", ""]);

function isNoDefect(value: string | null | undefined) {
  return !value || NO_DEFECT.has(value.trim().toLowerCase());
}

/**
 * Did the model's call match the human's? Compared case-insensitively,
 * because the model emits class names while reviewers pick catalogue codes
 * and the mapping between them is configured, not guaranteed identical.
 */
function agrees(predicted: string | null, corrected: string | null) {
  if (isNoDefect(corrected)) return isNoDefect(predicted);
  if (isNoDefect(predicted)) return false;
  return predicted!.trim().toLowerCase() === corrected!.trim().toLowerCase();
}

export function computeAccuracy(records: InspectionRecord[]): AccuracyStats {
  const verified = records.filter((r) => r.humanVerified);

  let correct = 0;
  let falseAlarms = 0;
  let misclassified = 0;

  const codeMap = new Map<string, { reviewed: number; correct: number }>();
  const modelMap = new Map<string, { reviewed: number; correct: number }>();

  for (const r of verified) {
    const ok = agrees(r.predictedDefect, r.correctedDefect);
    if (ok) correct++;
    else if (isNoDefect(r.correctedDefect)) falseAlarms++;
    else misclassified++;

    // grouped by what the piece *actually* was, so a code's score reflects
    // how well the model handles that defect
    const code = isNoDefect(r.correctedDefect) ? "No defect" : r.correctedDefect!.trim();
    const c = codeMap.get(code) || { reviewed: 0, correct: 0 };
    c.reviewed++;
    if (ok) c.correct++;
    codeMap.set(code, c);

    const version = r.modelVersion || "unrecorded";
    const m = modelMap.get(version) || { reviewed: 0, correct: 0 };
    m.reviewed++;
    if (ok) m.correct++;
    modelMap.set(version, m);
  }

  const reviewed = verified.length;

  return {
    reviewed,
    correct,
    falseAlarms,
    misclassified,
    accuracy: reviewed ? correct / reviewed : null,
    falseAlarmRate: reviewed ? falseAlarms / reviewed : null,
    byCode: Array.from(codeMap.entries())
      .map(([code, v]) => ({ code, ...v, accuracy: v.correct / v.reviewed }))
      .sort((a, b) => b.reviewed - a.reviewed),
    byModel: Array.from(modelMap.entries())
      .map(([version, v]) => ({ version, reviewed: v.reviewed, accuracy: v.correct / v.reviewed }))
      .sort((a, b) => b.reviewed - a.reviewed),
  };
}
