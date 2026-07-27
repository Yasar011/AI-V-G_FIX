"use client";

import { useInspections } from "@/hooks/useInspections";
import { InspectionTable } from "@/components/InspectionTable";

export default function InspectionsPage() {
  const records = useInspections();

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "var(--text2)", fontSize: 13 }}>Every piece the system has inspected</p>

      {records === null ? (
        <p style={{ color: "var(--text3)" }}>Loading…</p>
      ) : (
        <InspectionTable records={records} />
      )}
    </div>
  );
}
