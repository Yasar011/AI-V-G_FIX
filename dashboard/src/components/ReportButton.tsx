"use client";

import { useState } from "react";
import { openReport, filterByPeriod, type Period } from "@/lib/report";
import { getSession } from "@/lib/auth";
import type { InspectionRecord } from "@/lib/types";

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

export function ReportButton({ records }: { records: InspectionRecord[] }) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("week");

  const count = filterByPeriod(records, period).length;

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Download report
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Download report</h3>
              <button className="btn-icon" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="form-group">
              <label className="form-label">Period</label>
              <select
                className="form-input"
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
              >
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: 12.5, color: "var(--text2)" }}>
              {count === 0
                ? "No inspections in this period — the report would be empty."
                : `${count} inspection${count === 1 ? "" : "s"} will be included, with breakdowns
                   by line, style and shift, plus accuracy measured from human review.`}
            </p>
            <p style={{ fontSize: 12, color: "var(--text3)" }}>
              Opens a print view — choose <b>Save as PDF</b> as the destination.
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={count === 0}
                onClick={() => {
                  openReport(records, period, getSession()?.name || "Unknown");
                  setOpen(false);
                }}
              >
                Open report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
