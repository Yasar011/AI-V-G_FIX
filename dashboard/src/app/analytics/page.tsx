"use client";

import { useInspections } from "@/hooks/useInspections";
import { BreakdownChart, BreakdownTable, TopDefects } from "@/components/BreakdownCharts";
import { AccuracyPanel } from "@/components/AccuracyPanel";

export default function AnalyticsPage() {
  const records = useInspections();

  if (records === null) {
    return <p style={{ color: "var(--text3)" }}>Loading…</p>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "var(--text2)", fontSize: 13 }}>
        Where defects are actually coming from — by line, floor, and style
      </p>

      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>
          How well the model is really doing
        </h2>
        <p style={{ color: "var(--text2)", fontSize: 13, margin: "0 0 14px" }}>
          Measured from human corrections on your own garments — not a benchmark score.
        </p>
        <AccuracyPanel records={records} />
      </div>

      <div className="grid-2">
        <BreakdownChart records={records} field="line" title="By line" />
        <BreakdownChart records={records} field="floor" title="By floor" />
      </div>

      <div className="grid-2">
        <BreakdownChart records={records} field="style" title="By style" />
        <TopDefects records={records} />
      </div>

      <BreakdownTable records={records} field="line" title="Line performance" />
      <BreakdownTable records={records} field="style" title="Style performance" />
    </div>
  );
}
