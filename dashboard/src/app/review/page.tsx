"use client";

import { useMemo, useState } from "react";
import { useInspections } from "@/hooks/useInspections";
import { ReviewModal } from "@/components/ReviewModal";
import type { InspectionRecord } from "@/lib/types";

const DECISION_COLORS: Record<string, string> = {
  review: "var(--yellow)",
  fail: "var(--red)",
};

export default function ReviewPage() {
  const records = useInspections();
  const [selected, setSelected] = useState<InspectionRecord | null>(null);

  const pending = useMemo(() => {
    if (!records) return null;
    return records.filter((r) => !r.humanVerified && r.finalDecision !== "pass");
  }, [records]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ color: "var(--text2)", fontSize: 13 }}>
        Pieces flagged REVIEW or FAIL that haven&apos;t been confirmed by a human yet
      </p>

      {pending === null ? (
        <p style={{ color: "var(--text3)" }}>Loading…</p>
      ) : pending.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--accent)", fontWeight: 600 }}>All caught up</p>
          <p style={{ color: "var(--text3)", fontSize: 13, marginTop: 4 }}>Nothing pending review right now.</p>
        </div>
      ) : (
        <div className="module-grid">
          {pending.map((r) => (
            <button key={r.pieceId} onClick={() => setSelected(r)} className="module-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.imageUrl} alt={r.pieceId} style={{ width: "100%", height: 140, objectFit: "cover", borderRadius: 6, marginBottom: 10, background: "#000" }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: DECISION_COLORS[r.finalDecision], marginBottom: 4 }}>
                {r.finalDecision.toUpperCase()}
              </p>
              <p style={{ fontSize: 13, color: "var(--text)" }}>
                {r.predictedDefect || "no defect"} · {(r.confidence * 100).toFixed(0)}%
              </p>
              <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 4 }}>
                {r.timestamp.split("T")[0]} {r.timestamp.split("T")[1]?.slice(0, 8)}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && <ReviewModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
