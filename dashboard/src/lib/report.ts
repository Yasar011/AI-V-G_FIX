import type { InspectionRecord } from "@/lib/types";
import { computeAccuracy } from "@/lib/accuracy";

/**
 * Builds a printable QC report and hands it to the browser's print dialogue,
 * where "Save as PDF" produces the file.
 *
 * Deliberately not a PDF library: the report is a table of numbers that the
 * browser already renders and paginates correctly, and shipping a PDF
 * engine to the client to redraw the same thing would add a megabyte of
 * JavaScript for no gain.
 */

export type Period = "today" | "week" | "month" | "all";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
  all: "All time",
};

function cutoff(period: Period): Date | null {
  const now = new Date();
  if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") return new Date(now.getTime() - 7 * 864e5);
  if (period === "month") return new Date(now.getTime() - 30 * 864e5);
  return null;
}

export function filterByPeriod(records: InspectionRecord[], period: Period) {
  const from = cutoff(period);
  if (!from) return records;
  return records.filter((r) => new Date(r.timestamp) >= from);
}

const esc = (s: unknown) =>
  String(s ?? "—").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));

function groupRows(records: InspectionRecord[], field: keyof InspectionRecord) {
  const map = new Map<string, { n: number; pass: number; review: number; fail: number }>();
  for (const r of records) {
    const key = (r[field] as string) || "Unassigned";
    const g = map.get(key) || { n: 0, pass: 0, review: 0, fail: 0 };
    g.n++;
    g[r.finalDecision]++;
    map.set(key, g);
  }
  return Array.from(map.entries())
    .map(([key, g]) => ({
      key,
      ...g,
      rate: g.n ? ((g.review + g.fail) / g.n) * 100 : 0,
    }))
    .sort((a, b) => b.n - a.n);
}

function table(title: string, head: string[], rows: string[][]) {
  if (!rows.length) return "";
  return `
    <h2>${esc(title)}</h2>
    <table>
      <thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>`;
}

export function buildReportHtml(all: InspectionRecord[], period: Period, author: string) {
  const records = filterByPeriod(all, period);
  const n = records.length;
  const counts = { pass: 0, review: 0, fail: 0 };
  for (const r of records) counts[r.finalDecision]++;
  const defectRate = n ? ((counts.review + counts.fail) / n) * 100 : 0;

  const acc = computeAccuracy(records);
  const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);

  // what the pieces actually turned out to be, per reviewer
  const defectCounts = new Map<string, number>();
  for (const r of records) {
    const code = r.correctedDefect && r.correctedDefect !== "none"
      ? r.correctedDefect
      : r.humanVerified ? null : r.predictedDefect;
    if (code) defectCounts.set(code, (defectCounts.get(code) || 0) + 1);
  }
  const topDefects = Array.from(defectCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  const byLine = groupRows(records, "line");
  const byStyle = groupRows(records, "style");
  const byShift = groupRows(records, "shift");

  const modelsUsed = Array.from(new Set(records.map((r) => r.modelVersion).filter(Boolean)));

  return `<!doctype html><html><head><meta charset="utf-8">
<title>G-FIX QC report — ${esc(PERIOD_LABEL[period])}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
         color: #16202f; font-size: 11pt; line-height: 1.5; margin: 0; }
  header { border-bottom: 2.5px solid #16202f; padding-bottom: 10px; margin-bottom: 6px; }
  h1 { font-size: 22pt; margin: 0 0 2px; letter-spacing: -.4px; }
  .sub { color: #5b6678; font-size: 10pt; }
  .meta { display: flex; gap: 26px; flex-wrap: wrap; color: #7d8798;
          font-size: 8.5pt; padding: 8px 0 22px; }
  h2 { font-size: 12pt; margin: 24px 0 8px; padding-bottom: 4px;
       border-bottom: 1px solid #dde3ec; }
  .cards { display: flex; gap: 10px; flex-wrap: wrap; }
  .card { flex: 1 1 110px; border: 1px solid #dde3ec; border-radius: 5px; padding: 10px 12px; }
  .v { font-size: 17pt; font-weight: 600; font-variant-numeric: tabular-nums; }
  .k { font-size: 7.5pt; text-transform: uppercase; letter-spacing: .5px;
       color: #7d8798; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; font-size: 7.5pt; text-transform: uppercase;
       letter-spacing: .5px; color: #7d8798; padding: 6px 8px;
       border-bottom: 1px solid #dde3ec; background: #f5f7fa; }
  td { padding: 5px 8px; border-bottom: 1px solid #eef1f6; }
  td.n { font-variant-numeric: tabular-nums; text-align: right; }
  .green { color: #0b7f6c; } .amber { color: #9a6a00; } .red { color: #c8353a; }
  .note { font-size: 8.5pt; color: #5b6678; border-left: 3px solid #dde3ec;
          padding: 4px 0 4px 10px; margin: 10px 0 0; }
  footer { margin-top: 26px; padding-top: 8px; border-top: 1px solid #dde3ec;
           font-size: 8pt; color: #7d8798; }
  tr, table { page-break-inside: avoid; }
</style></head><body>

<header>
  <h1>G-FIX QC — Inspection Report</h1>
  <div class="sub">${esc(PERIOD_LABEL[period])}</div>
</header>
<div class="meta">
  <span>Generated ${new Date().toLocaleString()}</span>
  <span>By ${esc(author)}</span>
  <span>Model: ${modelsUsed.length ? modelsUsed.map(esc).join(", ") : "not recorded"}</span>
</div>

<h2>Summary</h2>
<div class="cards">
  <div class="card"><div class="v">${n}</div><div class="k">Inspected</div></div>
  <div class="card"><div class="v green">${counts.pass}</div><div class="k">Pass</div></div>
  <div class="card"><div class="v amber">${counts.review}</div><div class="k">Review</div></div>
  <div class="card"><div class="v red">${counts.fail}</div><div class="k">Fail</div></div>
  <div class="card"><div class="v">${defectRate.toFixed(1)}%</div><div class="k">Defect rate</div></div>
</div>

${table("By line", ["Line", "Inspected", "Pass", "Review", "Fail", "Defect rate"],
  byLine.map((g) => [esc(g.key), `<span class="n">${g.n}</span>`, `<span class="n">${g.pass}</span>`,
    `<span class="n">${g.review}</span>`, `<span class="n">${g.fail}</span>`,
    `<span class="n">${g.rate.toFixed(1)}%</span>`]))}

${table("By style", ["Style", "Inspected", "Pass", "Review", "Fail", "Defect rate"],
  byStyle.map((g) => [esc(g.key), `<span class="n">${g.n}</span>`, `<span class="n">${g.pass}</span>`,
    `<span class="n">${g.review}</span>`, `<span class="n">${g.fail}</span>`,
    `<span class="n">${g.rate.toFixed(1)}%</span>`]))}

${table("By shift", ["Shift", "Inspected", "Pass", "Review", "Fail", "Defect rate"],
  byShift.map((g) => [esc(g.key), `<span class="n">${g.n}</span>`, `<span class="n">${g.pass}</span>`,
    `<span class="n">${g.review}</span>`, `<span class="n">${g.fail}</span>`,
    `<span class="n">${g.rate.toFixed(1)}%</span>`]))}

${table("Most frequent defects", ["Defect", "Count", "Share of inspected"],
  topDefects.map(([code, c]) => [esc(code), `<span class="n">${c}</span>`,
    `<span class="n">${n ? ((c / n) * 100).toFixed(1) : "0.0"}%</span>`]))}

<h2>Model performance, measured against human review</h2>
${acc.reviewed === 0
  ? `<p class="note">No pieces were reviewed in this period, so no accuracy can be
     measured. These figures come from human corrections, not a benchmark.</p>`
  : `<div class="cards">
      <div class="card"><div class="v">${pct(acc.accuracy)}</div><div class="k">Agreed with reviewer</div></div>
      <div class="card"><div class="v amber">${pct(acc.falseAlarmRate)}</div><div class="k">False alarms</div></div>
      <div class="card"><div class="v">${acc.misclassified}</div><div class="k">Wrong defect named</div></div>
      <div class="card"><div class="v">${acc.reviewed}</div><div class="k">Reviewed</div></div>
     </div>
     ${acc.reviewed < 30
       ? `<p class="note">Based on ${acc.reviewed} reviewed piece${acc.reviewed === 1 ? "" : "s"}
          — too few to draw conclusions from. Treat as indicative only.</p>` : ""}`}

<footer>
  G-FIX QC · figures cover ${esc(PERIOD_LABEL[period].toLowerCase())} and reflect records at the
  time of generation. Accuracy is measured only on pieces a human has reviewed;
  unreviewed pieces are excluded rather than assumed correct.
</footer>
</body></html>`;
}

/** Opens the report in a print window, where the user chooses "Save as PDF". */
export function openReport(records: InspectionRecord[], period: Period, author: string) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Your browser blocked the report window. Allow pop-ups for this site and try again.");
    return;
  }
  w.document.write(buildReportHtml(records, period, author));
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 250);
}
