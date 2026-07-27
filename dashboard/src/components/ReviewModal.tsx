"use client";

import { useState } from "react";
import type { InspectionRecord } from "@/lib/types";
import { deleteInspection, markReviewed } from "@/lib/review";

const DECISION_COLORS: Record<string, string> = {
  pass: "#22c55e",
  review: "#f59e0b",
  fail: "#ef4444",
};

export function ReviewModal({
  record,
  onClose,
}: {
  record: InspectionRecord;
  onClose: () => void;
}) {
  const [correction, setCorrection] = useState(record.predictedDefect || "");
  const [saving, setSaving] = useState(false);

  async function save(value: string) {
    setSaving(true);
    await markReviewed(record.pieceId, value);
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!confirm(`Delete piece ${record.pieceId} permanently? This can't be undone.`)) return;
    setSaving(true);
    await deleteInspection(record.pieceId);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-lg w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Review piece {record.pieceId}</h3>
            <p className="text-sm" style={{ color: DECISION_COLORS[record.finalDecision] }}>
              {record.finalDecision.toUpperCase()} — predicted &quot;{record.predictedDefect || "no defect"}&quot;
              {" "}({(record.confidence * 100).toFixed(0)}%)
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={record.imageUrl} alt={record.pieceId} className="w-full rounded-lg mb-4 max-h-72 object-contain bg-black" />

        <label className="text-slate-300 text-sm block mb-1">Ground-truth label</label>
        <input
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          placeholder="e.g. hole, stain, none"
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 mb-4"
        />

        <div className="flex gap-2 flex-wrap items-center">
          <button
            disabled={saving}
            onClick={handleDelete}
            title="Delete this record permanently (e.g. demo/test captures)"
            className="px-3 py-2 rounded-lg bg-red-950 hover:bg-red-900 text-red-400 text-sm font-medium disabled:opacity-50 border border-red-900"
          >
            Delete
          </button>
          <button
            disabled={saving}
            onClick={() => save(record.predictedDefect || "none")}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium disabled:opacity-50"
          >
            Confirm predicted
          </button>
          <button
            disabled={saving}
            onClick={() => save("none")}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-medium disabled:opacity-50"
          >
            No defect (false positive)
          </button>
          <button
            disabled={saving || !correction.trim()}
            onClick={() => save(correction.trim())}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50 ml-auto"
          >
            {saving ? "Saving…" : "Save correction"}
          </button>
        </div>
      </div>
    </div>
  );
}
