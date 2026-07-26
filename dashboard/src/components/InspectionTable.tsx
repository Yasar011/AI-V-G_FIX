"use client";

import { useState } from "react";
import type { Decision, InspectionRecord } from "@/lib/types";
import { ReviewModal } from "@/components/ReviewModal";

const DECISION_COLORS: Record<string, string> = {
  pass: "#22c55e",
  review: "#f59e0b",
  fail: "#ef4444",
};

const FILTERS: (Decision | "all")[] = ["all", "pass", "review", "fail"];

export function InspectionTable({ records }: { records: InspectionRecord[] }) {
  const [filter, setFilter] = useState<Decision | "all">("all");
  const [selected, setSelected] = useState<InspectionRecord | null>(null);

  const filtered = filter === "all" ? records : records.filter((r) => r.finalDecision === filter);

  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <h3 className="text-slate-300 text-sm font-semibold">Inspections ({filtered.length})</h3>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize ${
                filter === f ? "bg-blue-600 text-white" : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-700/50">
        {filtered.length === 0 && (
          <p className="text-slate-500 text-sm p-6 text-center">No inspections yet.</p>
        )}
        {filtered.map((r) => (
          <button
            key={r.pieceId}
            onClick={() => setSelected(r)}
            className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/30 text-left"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.imageUrl} alt={r.pieceId} className="w-12 h-12 rounded object-cover bg-black shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: DECISION_COLORS[r.finalDecision] }}>
                {r.finalDecision.toUpperCase()}
              </p>
              <p className="text-slate-300 text-xs truncate">
                {r.predictedDefect || "no defect"} · {(r.confidence * 100).toFixed(0)}%
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-slate-500 text-xs">{r.timestamp.split("T")[1]?.slice(0, 8)}</p>
              {r.humanVerified ? (
                <p className="text-emerald-400 text-[11px]">verified</p>
              ) : (
                <p className="text-slate-600 text-[11px]">unverified</p>
              )}
            </div>
          </button>
        ))}
      </div>

      {selected && <ReviewModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
