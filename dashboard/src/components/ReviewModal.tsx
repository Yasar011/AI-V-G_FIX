"use client";

import { useEffect, useState } from "react";
import type { InspectionRecord } from "@/lib/types";
import { deleteInspection, markReviewed } from "@/lib/review";
import { getDefectCatalog, getAiClassToCode, type DefectCode } from "@/lib/config";

const DECISION_COLORS: Record<string, string> = {
  pass: "var(--green)",
  review: "var(--yellow)",
  fail: "var(--red)",
};

const VERDICT_BADGE: Record<string, string> = {
  reject: "badge-red",
  rework: "badge-yellow",
  check: "badge-blue",
};

export function ReviewModal({
  record,
  onClose,
}: {
  record: InspectionRecord;
  onClose: () => void;
}) {
  const [correction, setCorrection] = useState(record.correctedDefect || "");
  const [catalog, setCatalog] = useState<DefectCode[]>([]);
  const [saving, setSaving] = useState(false);

  // Reviewers tag with the factory's real codes (S13 Open Seam, F3 Fabric
  // Hole...), not the model's generic words. The model's prediction is
  // mapped to its closest code as a starting point where one exists.
  useEffect(() => {
    (async () => {
      const [codes, mapping] = await Promise.all([getDefectCatalog(), getAiClassToCode()]);
      setCatalog(codes);
      if (!record.correctedDefect && record.predictedDefect) {
        const suggested = mapping[record.predictedDefect];
        if (suggested) setCorrection(suggested);
      }
    })();
  }, [record.predictedDefect, record.correctedDefect]);

  const selected = catalog.find((d) => d.code === correction);

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
            {(record.detections?.length || 0) > 1 && (
              <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 4 }}>
                Also detected: {record.detections!.slice(1).map((d) => `${d.defect} (${(d.confidence * 100).toFixed(0)}%)`).join(", ")}
              </p>
            )}
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={record.imageUrl} alt={record.pieceId} style={{ width: "100%", borderRadius: 8, marginBottom: 16, maxHeight: 280, objectFit: "contain", background: "#000" }} />

        <div className="form-group">
          <label className="form-label">Defect code (ground truth)</label>
          <select
            className="form-input"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
          >
            <option value="">— select the actual defect —</option>
            {Object.entries(
              catalog.reduce<Record<string, DefectCode[]>>((groups, d) => {
                (groups[d.category] ||= []).push(d);
                return groups;
              }, {})
            ).map(([category, codes]) => (
              <optgroup key={category} label={category}>
                {codes.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {selected && (
            <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 8 }}>
              <span className={`badge ${VERDICT_BADGE[selected.verdict]}`}>
                {selected.verdict.toUpperCase()}
              </span>{" "}
              {selected.action}
            </p>
          )}
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
