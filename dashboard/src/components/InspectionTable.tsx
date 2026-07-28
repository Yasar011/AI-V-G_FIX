"use client";

import { useState } from "react";
import type { Decision, InspectionRecord } from "@/lib/types";
import { ReviewModal } from "@/components/ReviewModal";

const DECISION_BADGE: Record<string, string> = {
  pass: "badge-green",
  review: "badge-yellow",
  fail: "badge-red",
};

const FILTERS: (Decision | "all")[] = ["all", "pass", "review", "fail"];

export function InspectionTable({ records }: { records: InspectionRecord[] }) {
  const [filter, setFilter] = useState<Decision | "all">("all");
  const [selected, setSelected] = useState<InspectionRecord | null>(null);

  const filtered = filter === "all" ? records : records.filter((r) => r.finalDecision === filter);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="card-header" style={{ padding: "16px 20px 0" }}>
        <h3 className="card-title">Inspections ({filtered.length})</h3>
        <div style={{ display: "flex", gap: 6 }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={f === filter ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
              style={{ textTransform: "capitalize" }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Decision</th>
              <th>Defect</th>
              <th>Confidence</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--text3)", textAlign: "center", padding: 24 }}>No inspections yet.</td></tr>
            )}
            {filtered.map((r) => (
              <tr key={r.pieceId} onClick={() => setSelected(r)} style={{ cursor: "pointer" }}>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.imageUrl} alt={r.pieceId} style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", background: "#000" }} />
                </td>
                <td><span className={`badge ${DECISION_BADGE[r.finalDecision]}`}>{r.finalDecision.toUpperCase()}</span></td>
                <td>
                  {r.predictedDefect || "no defect"}
                  {(r.detections?.length || 0) > 1 && (
                    <span className="badge badge-gray" style={{ marginLeft: 6 }}>
                      +{r.detections!.length - 1} more
                    </span>
                  )}
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>{(r.confidence * 100).toFixed(0)}%</td>
                <td style={{ color: "var(--text3)" }}>{r.timestamp.split("T")[1]?.slice(0, 8)}</td>
                <td>
                  {r.humanVerified ? (
                    <span className="badge badge-blue">verified</span>
                  ) : (
                    <span className="badge badge-gray">unverified</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && <ReviewModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
