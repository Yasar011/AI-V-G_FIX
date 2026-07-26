"use client";

import { useMemo } from "react";
import type { InspectionRecord } from "@/lib/types";

const DECISION_COLORS: Record<string, string> = {
  pass: "#22c55e",
  review: "#f59e0b",
  fail: "#ef4444",
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
    { label: "Total inspected", value: stats.total, color: "#e2e8f0" },
    { label: "Pass", value: `${stats.counts.pass} (${pct(stats.counts.pass)}%)`, color: DECISION_COLORS.pass },
    { label: "Review", value: `${stats.counts.review} (${pct(stats.counts.review)}%)`, color: DECISION_COLORS.review },
    { label: "Fail", value: `${stats.counts.fail} (${pct(stats.counts.fail)}%)`, color: DECISION_COLORS.fail },
    { label: "Human-verified", value: `${stats.verified}/${stats.total}`, color: "#60a5fa" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-xs mb-1">{c.label}</p>
          <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
