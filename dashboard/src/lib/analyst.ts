import type { InspectionRecord } from "@/lib/types";
import { computeAccuracy } from "@/lib/accuracy";

/**
 * Answers questions about inspection data by computing over the records,
 * never by generating text about them.
 *
 * A language model asked "what is the defect rate on Line 2" can produce a
 * confident, plausible, wrong number. On a QC report that is worse than no
 * answer at all, so every figure here comes from the same data the charts
 * use. The cost is that only recognised phrasings get answered — and the
 * assistant says so plainly rather than guessing.
 */

export interface Answer {
  text: string;
  rows?: { label: string; value: string }[];
  note?: string;
}

const WORD = (n: number, s: string) => `${n} ${s}${n === 1 ? "" : "s"}`;
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");

/* ------------------------------------------------------------------ time */

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

interface Period {
  from: Date | null;
  label: string;
}

function detectPeriod(q: string): Period {
  if (/\btoday\b/.test(q)) return { from: startOfToday(), label: "today" };
  if (/\byesterday\b/.test(q)) {
    const d = startOfToday();
    return { from: new Date(d.getTime() - 864e5), label: "since yesterday" };
  }
  if (/\b(this\s+)?week\b|\b7\s*days?\b/.test(q))
    return { from: new Date(Date.now() - 7 * 864e5), label: "in the last 7 days" };
  if (/\b(this\s+)?month\b|\b30\s*days?\b/.test(q))
    return { from: new Date(Date.now() - 30 * 864e5), label: "in the last 30 days" };
  return { from: null, label: "overall" };
}

function inPeriod(records: InspectionRecord[], p: Period) {
  if (!p.from) return records;
  return records.filter((r) => new Date(r.timestamp) >= p.from!);
}

/* --------------------------------------------------------------- helpers */

/** What a piece actually was: the reviewer's code if verified, else the model's. */
function effectiveDefect(r: InspectionRecord) {
  if (r.humanVerified) {
    return r.correctedDefect && r.correctedDefect !== "none" ? r.correctedDefect : null;
  }
  return r.predictedDefect;
}

function tally(records: InspectionRecord[], field: keyof InspectionRecord) {
  const map = new Map<string, { n: number; bad: number }>();
  for (const r of records) {
    const key = (r[field] as string) || "Unassigned";
    const g = map.get(key) || { n: 0, bad: 0 };
    g.n++;
    if (r.finalDecision !== "pass") g.bad++;
    map.set(key, g);
  }
  return Array.from(map.entries())
    .map(([key, g]) => ({ key, ...g, rate: g.n ? g.bad / g.n : 0 }))
    .sort((a, b) => b.rate - a.rate || b.n - a.n);
}

function counts(records: InspectionRecord[]) {
  const c = { pass: 0, review: 0, fail: 0 };
  for (const r of records) c[r.finalDecision]++;
  return c;
}

/* ----------------------------------------------------------- the answers */

export const EXAMPLE_QUESTIONS = [
  "How many pieces today?",
  "What is the defect rate this week?",
  "Which line has the most defects?",
  "What is the most common defect?",
  "How accurate is Febo?",
  "How many are waiting for review?",
  "Which style is worst this month?",
  "Compare the shifts",
];

export function ask(question: string, all: InspectionRecord[]): Answer {
  const q = question.toLowerCase().trim();
  const period = detectPeriod(q);
  const records = inPeriod(all, period);
  const n = records.length;

  if (!all.length) {
    return { text: "There are no inspections recorded yet, so there is nothing to report." };
  }

  /* --- accuracy --------------------------------------------------- */
  if (/\baccurac|how good|how well|reliab|trust|febo\b/.test(q)) {
    const a = computeAccuracy(records);
    if (a.reviewed === 0) {
      return {
        text: `No pieces have been reviewed ${period.label}, so real accuracy cannot be measured.`,
        note: "Accuracy is calculated from human corrections, not from a benchmark. Work the review queue and it will appear here.",
      };
    }
    return {
      text: `On the ${WORD(a.reviewed, "piece")} reviewed ${period.label}, Febo agreed with the reviewer ${pct(a.correct, a.reviewed)} of the time.`,
      rows: [
        { label: "Agreed with reviewer", value: pct(a.correct, a.reviewed) },
        { label: "False alarms (flagged a clean piece)", value: pct(a.falseAlarms, a.reviewed) },
        { label: "Named the wrong defect", value: String(a.misclassified) },
        { label: "Pieces reviewed", value: String(a.reviewed) },
      ],
      note: a.reviewed < 30
        ? `Based on only ${a.reviewed} reviewed pieces — too few to draw firm conclusions from.`
        : undefined,
    };
  }

  /* --- review backlog --------------------------------------------- */
  if (/\bwaiting|pending|backlog|to review|need.*review|unverified\b/.test(q)) {
    const pending = records.filter((r) => !r.humanVerified && r.finalDecision !== "pass");
    return {
      text: pending.length === 0
        ? `Nothing is waiting for review ${period.label} — the queue is clear.`
        : `${WORD(pending.length, "piece")} ${pending.length === 1 ? "is" : "are"} waiting for review ${period.label}.`,
      note: pending.length > 0
        ? "Each one reviewed becomes labelled training data, so this queue is what makes Febo improve."
        : undefined,
    };
  }

  /* --- most common defect ----------------------------------------- */
  if (/\b(most common|top|frequent|biggest|main).*(defect|problem|issue)|what defect\b/.test(q)) {
    const map = new Map<string, number>();
    for (const r of records) {
      const d = effectiveDefect(r);
      if (d) map.set(d, (map.get(d) || 0) + 1);
    }
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return { text: `No defects were found ${period.label}.` };
    return {
      text: `The most common defect ${period.label} is ${sorted[0][0]}, on ${WORD(sorted[0][1], "piece")}.`,
      rows: sorted.slice(0, 6).map(([d, c]) => ({ label: d, value: `${c}  (${pct(c, n)})` })),
    };
  }

  /* --- worst line / floor / style / shift -------------------------- */
  const groupMatch =
    /\bline\b/.test(q) ? "line" :
    /\bfloor\b/.test(q) ? "floor" :
    /\bstyle\b/.test(q) ? "style" :
    /\bshift\b/.test(q) ? "shift" : null;

  if (groupMatch) {
    const rows = tally(records, groupMatch as keyof InspectionRecord);
    if (!rows.length) return { text: `No inspections recorded ${period.label}.` };
    const worst = rows[0];
    const asking = /\bworst|most|highest|problem|bad\b/.test(q);
    return {
      text: asking
        ? `${worst.key} has the highest defect rate ${period.label} — ${pct(worst.bad, worst.n)} of ${WORD(worst.n, "piece")}.`
        : `Breakdown by ${groupMatch} ${period.label}:`,
      rows: rows.map((r) => ({
        label: r.key,
        value: `${r.n} inspected · ${pct(r.bad, r.n)} defect rate`,
      })),
      note: rows.length > 1 && rows[0].n < 20
        ? "Small numbers — differences between groups may be noise rather than a real pattern."
        : undefined,
    };
  }

  /* --- defect rate ------------------------------------------------- */
  if (/\bdefect rate|reject rate|fail rate|pass rate|quality\b/.test(q)) {
    const c = counts(records);
    const bad = c.review + c.fail;
    return {
      text: `The defect rate ${period.label} is ${pct(bad, n)} — ${bad} of ${WORD(n, "piece")} flagged.`,
      rows: [
        { label: "Pass", value: `${c.pass}  (${pct(c.pass, n)})` },
        { label: "Review", value: `${c.review}  (${pct(c.review, n)})` },
        { label: "Fail", value: `${c.fail}  (${pct(c.fail, n)})` },
      ],
    };
  }

  /* --- how many / summary ------------------------------------------ */
  if (/\bhow many|how much|count|total|summary|overview|how.*(doing|going)\b/.test(q)) {
    const c = counts(records);
    if (n === 0) return { text: `No pieces were inspected ${period.label}.` };
    return {
      text: `${WORD(n, "piece")} inspected ${period.label}.`,
      rows: [
        { label: "Pass", value: `${c.pass}  (${pct(c.pass, n)})` },
        { label: "Review", value: `${c.review}  (${pct(c.review, n)})` },
        { label: "Fail", value: `${c.fail}  (${pct(c.fail, n)})` },
        { label: "Defect rate", value: pct(c.review + c.fail, n) },
      ],
    };
  }

  /* --- not understood ---------------------------------------------- */
  return {
    text: "I could not work out what to calculate from that.",
    note: "I answer by computing over the inspection records rather than guessing, so I only handle questions I recognise. Try one of the examples below.",
  };
}
