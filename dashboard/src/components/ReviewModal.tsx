"use client";

import { useState } from "react";
import type { InspectionRecord } from "@/lib/types";
import { deleteInspection, markReviewed } from "@/lib/review";

const DECISION_COLORS: Record<string, string> = {
  pass: "var(--green)",
  review: "var(--yellow)",
  fail: "var(--red)",
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Review piece {record.pieceId}</h3>
            <p style={{ fontSize: 13, marginTop: 4, color: DECISION_COLORS[record.finalDecision], fontWeight: 600 }}>
              {record.finalDecision.toUpperCase()} — predicted &quot;{record.predictedDefect || "no defect"}&quot;
              {" "}({(record.confidence * 100).toFixed(0)}%)
            </p>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={record.imageUrl} alt={record.pieceId} style={{ width: "100%", borderRadius: 8, marginBottom: 16, maxHeight: 280, objectFit: "contain", background: "#000" }} />

        <div className="form-group">
          <label className="form-label">Ground-truth label</label>
          <input
            className="form-input"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
            placeholder="e.g. hole, stain, none"
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            disabled={saving}
            onClick={handleDelete}
            title="Delete this record permanently (e.g. demo/test captures)"
            className="btn btn-danger btn-sm"
          >
            Delete
          </button>
          <button disabled={saving} onClick={() => save(record.predictedDefect || "none")} className="btn btn-ghost">
            Confirm predicted
          </button>
          <button disabled={saving} onClick={() => save("none")} className="btn btn-ghost">
            No defect (false positive)
          </button>
          <button
            disabled={saving || !correction.trim()}
            onClick={() => save(correction.trim())}
            className="btn btn-primary"
            style={{ marginLeft: "auto" }}
          >
            {saving ? "Saving…" : "Save correction"}
          </button>
        </div>
      </div>
    </div>
  );
}
