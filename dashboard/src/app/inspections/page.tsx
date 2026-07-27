"use client";

import { useInspections } from "@/hooks/useInspections";
import { InspectionTable } from "@/components/InspectionTable";

export default function InspectionsPage() {
  const records = useInspections();

  return (
    <main className="min-h-screen p-6 sm:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Inspections</h1>
          <p className="text-slate-500 text-sm">Every piece the system has inspected</p>
        </div>

        {records === null ? (
          <p className="text-slate-400">Loading…</p>
        ) : (
          <InspectionTable records={records} />
        )}
      </div>
    </main>
  );
}
