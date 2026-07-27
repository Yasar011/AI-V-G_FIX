"use client";

import { useMemo, useState } from "react";
import { useInspections } from "@/hooks/useInspections";
import { ReviewModal } from "@/components/ReviewModal";
import type { InspectionRecord } from "@/lib/types";

const DECISION_COLORS: Record<string, string> = {
  review: "#f59e0b",
  fail: "#ef4444",
};

export default function ReviewPage() {
  const records = useInspections();
  const [selected, setSelected] = useState<InspectionRecord | null>(null);

  const pending = useMemo(() => {
    if (!records) return null;
    return records.filter((r) => !r.humanVerified && r.finalDecision !== "pass");
  }, [records]);

  return (
    <main className="min-h-screen p-6 sm:p-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Review queue</h1>
          <p className="text-slate-500 text-sm">
            Pieces flagged REVIEW or FAIL that haven&apos;t been confirmed by a human yet
          </p>
        </div>

        {pending === null ? (
          <p className="text-slate-400">Loading…</p>
        ) : pending.length === 0 ? (
          <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 p-10 text-center">
            <p className="text-emerald-400 font-semibold">All caught up</p>
            <p className="text-slate-500 text-sm mt-1">Nothing pending review right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pending.map((r) => (
              <button
                key={r.pieceId}
                onClick={() => setSelected(r)}
                className="text-left bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.imageUrl} alt={r.pieceId} className="w-full h-40 object-cover bg-black" />
                <div className="p-4">
                  <p
                    className="text-sm font-bold mb-1"
                    style={{ color: DECISION_COLORS[r.finalDecision] }}
                  >
                    {r.finalDecision.toUpperCase()}
                  </p>
                  <p className="text-slate-300 text-sm">
                    {r.predictedDefect || "no defect"} · {(r.confidence * 100).toFixed(0)}%
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {r.timestamp.split("T")[0]} {r.timestamp.split("T")[1]?.slice(0, 8)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && <ReviewModal record={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
