"use client";

import { useMemo } from "react";
import { computeAccuracy } from "@/lib/accuracy";
import type { InspectionRecord } from "@/lib/types";

const pct = (v: number | null) => (v === null ? "—" : `${(v * 100).toFixed(0)}%`);

export function AccuracyPanel({ records }: { records: InspectionRecord[] }) {
  const stats = useMemo(() => computeAccuracy(records), [records]);

  if (stats.reviewed === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Real-world accuracy</h3>
        </div>
        <p style={{ color: "var(--text2)", fontSize: 13, margin: 0 }}>
          Nothing reviewed yet. These figures are measured from human corrections,
          so they appear once the review queue has been worked — unlike the
          benchmark score, they reflect performance on your own garments.
        </p>
      </div>
    );
  }

  const accuracyColor =
    stats.accuracy === null ? "var(--text)"
      : stats.accuracy >= 0.8 ? "var(--green)"
      : stats.accuracy >= 0.6 ? "var(--yellow)"
      : "var(--red)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid-4">
        <div className="card card-sm">
          <div className="metric-val" style={{ color: accuracyColor }}>{pct(stats.accuracy)}</div>
          <div className="metric-label">Agreed with reviewer</div>
        </div>
        <div className="card card-sm">
          <div className="metric-val" style={{ color: "var(--yellow)" }}>{pct(stats.falseAlarmRate)}</div>
          <div className="metric-label">False alarms</div>
        </div>
        <div className="card card-sm">
          <div className="metric-val">{stats.misclassified}</div>
          <div className="metric-label">Wrong defect named</div>
        </div>
        <div className="card card-sm">
          <div className="metric-val">{stats.reviewed}</div>
          <div className="metric-label">Pieces reviewed</div>
        </div>
      </div>

      {stats.reviewed < 30 && (
        <p style={{ color: "var(--text3)", fontSize: 12, margin: 0 }}>
          Based on {stats.reviewed} reviewed piece{stats.reviewed === 1 ? "" : "s"} —
          too few to draw conclusions from. Treat these as indicative until several
          hundred have been reviewed.
        </p>
      )}

      <div className="grid-2">
        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: "16px 20px 0" }}>
            <h3 className="card-title">Accuracy by actual defect</h3>
          </div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr><th>What it actually was</th><th>Reviewed</th><th>Model right</th></tr>
              </thead>
              <tbody>
                {stats.byCode.slice(0, 10).map((c) => (
                  <tr key={c.code}>
                    <td>{c.code}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>{c.reviewed}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>{pct(c.accuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div className="card-header" style={{ padding: "16px 20px 0" }}>
            <h3 className="card-title">Accuracy by model version</h3>
          </div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr><th>Model</th><th>Reviewed</th><th>Right</th></tr>
              </thead>
              <tbody>
                {stats.byModel.map((m) => (
                  <tr key={m.version}>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{m.version}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>{m.reviewed}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>{pct(m.accuracy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ color: "var(--text3)", fontSize: 11.5, padding: "0 20px 16px", margin: 0 }}>
            After a retrain, compare rows here to see whether the new model
            genuinely improved on real pieces.
          </p>
        </div>
      </div>
    </div>
  );
}
