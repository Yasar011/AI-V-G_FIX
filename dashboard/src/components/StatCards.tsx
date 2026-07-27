"use client";

import { useMemo } from "react";
import type { InspectionRecord } from "@/lib/types";

const DECISION_COLORS: Record<string, string> = {
  pass: "var(--green)",
  review: "var(--yellow)",
  fail: "var(--red)",
};

export function StatCards({ records }: { records: InspectionRecord[] }) {
  const stats = useMemo(() => {
    const total = records.length;
    const counts = { pass: 0, review: 0, fail: 0 };
    let verified = 0;
    for (const r of records) {
      counts[r.finalDecision]++;
      if (r.humanVerified) verified++;
    }
    return { total, counts, verified };
  }, [records]);

  const pct = (n: number) => (stats.total ? Math.round((n / stats.total) * 100) : 0);

  const cards = [
    { label: "Total inspected", value: stats.total, color: "var(--text)" },
    { label: "Pass", value: `${stats.counts.pass} (${pct(stats.counts.pass)}%)`, color: DECISION_COLORS.pass },
    { label: "Review", value: `${stats.counts.review} (${pct(stats.counts.review)}%)`, color: DECISION_COLORS.review },
    { label: "Fail", value: `${stats.counts.fail} (${pct(stats.counts.fail)}%)`, color: DECISION_COLORS.fail },
    { label: "Human-verified", value: `${stats.verified}/${stats.total}`, color: "var(--accent2)" },
  ];

  return (
    <div className="grid-4" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
      {cards.map((c) => (
        <div key={c.label} className="card card-sm">
          <div className="metric-val" style={{ color: c.color }}>{c.value}</div>
          <div className="metric-label">{c.label}</div>
        </div>
      ))}
    </div>
  );
}
