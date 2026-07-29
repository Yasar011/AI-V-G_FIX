"use client";

import Link from "next/link";
import { useInspections } from "@/hooks/useInspections";
import { StatCards } from "@/components/StatCards";
import { DecisionPie, DefectBar, TrendLine, ConfidenceHistogram } from "@/components/Charts";
import { ReportButton } from "@/components/ReportButton";

export default function Home() {
  const records = useInspections();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card-header">
        <div>
          <p style={{ color: "var(--text2)", fontSize: 13 }}>Live inspection stats, at a glance</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {records && <ReportButton records={records} />}
          <Link href="/inspections" className="btn btn-ghost btn-sm">
            View all inspections →
          </Link>
        </div>
      </div>

      {records === null ? (
        <p style={{ color: "var(--text3)" }}>Loading…</p>
      ) : (
        <>
          <StatCards records={records} />
          <div className="grid-2">
            <DecisionPie records={records} />
            <DefectBar records={records} />
            <TrendLine records={records} />
            <ConfidenceHistogram records={records} />
          </div>
        </>
      )}
    </div>
  );
}
