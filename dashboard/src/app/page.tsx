"use client";

import Link from "next/link";
import { useInspections } from "@/hooks/useInspections";
import { StatCards } from "@/components/StatCards";
import { DecisionPie, DefectBar, TrendLine, ConfidenceHistogram } from "@/components/Charts";

export default function Home() {
  const records = useInspections();

  return (
    <main className="min-h-screen p-6 sm:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Overview</h1>
            <p className="text-slate-500 text-sm">Live inspection stats, at a glance</p>
          </div>
          <Link
            href="/inspections"
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            View all inspections →
          </Link>
        </div>

        {records === null ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <>
            <StatCards records={records} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DecisionPie records={records} />
              <DefectBar records={records} />
              <TrendLine records={records} />
              <ConfidenceHistogram records={records} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
