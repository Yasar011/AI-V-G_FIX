"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { InspectionRecord } from "@/lib/types";

const COLORS = { pass: "#0a9d82", review: "#c98a00", fail: "#e5484d" };
const AXIS_STYLE = { fill: "#97a1b4", fontSize: 12 };
const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #e4e8f1",
  borderRadius: 8,
  color: "#0f1a2e",
  fontSize: 12,
  boxShadow: "0 1px 3px rgba(15,23,42,.06)",
};

type Field = "line" | "floor" | "style";

function useGrouped(records: InspectionRecord[], field: Field) {
  return useMemo(() => {
    const groups = new Map<string, { name: string; pass: number; review: number; fail: number; total: number }>();
    for (const r of records) {
      const key = (r[field] as string) || "Unassigned";
      if (!groups.has(key)) groups.set(key, { name: key, pass: 0, review: 0, fail: 0, total: 0 });
      const g = groups.get(key)!;
      g[r.finalDecision]++;
      g.total++;
    }
    return Array.from(groups.values()).sort((a, b) => b.total - a.total);
  }, [records, field]);
}

export function BreakdownChart({
  records,
  field,
  title,
}: {
  records: InspectionRecord[];
  field: Field;
  title: string;
}) {
  const data = useGrouped(records, field);

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      {data.length === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: 13 }}>No data yet.</p>
      ) : (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" />
              <XAxis dataKey="name" tick={AXIS_STYLE} />
              <YAxis tick={AXIS_STYLE} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f4f6fb" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#5b6678" }} />
              <Bar dataKey="pass" stackId="a" fill={COLORS.pass} />
              <Bar dataKey="review" stackId="a" fill={COLORS.review} />
              <Bar dataKey="fail" stackId="a" fill={COLORS.fail} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Sortable table of defect rate per line/floor/style - the "which line is worst" view. */
export function BreakdownTable({
  records,
  field,
  title,
}: {
  records: InspectionRecord[];
  field: Field;
  title: string;
}) {
  const data = useGrouped(records, field);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="card-header" style={{ padding: "16px 20px 0" }}>
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>{field}</th>
              <th>Inspected</th>
              <th>Pass</th>
              <th>Review</th>
              <th>Fail</th>
              <th>Defect rate</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr><td colSpan={6} style={{ color: "var(--text3)", textAlign: "center", padding: 20 }}>No data yet.</td></tr>
            ) : (
              data.map((g) => {
                const defectRate = g.total ? Math.round(((g.fail + g.review) / g.total) * 100) : 0;
                return (
                  <tr key={g.name}>
                    <td style={{ fontWeight: 600 }}>{g.name}</td>
                    <td style={{ fontFamily: "var(--mono)" }}>{g.total}</td>
                    <td style={{ color: COLORS.pass }}>{g.pass}</td>
                    <td style={{ color: COLORS.review }}>{g.review}</td>
                    <td style={{ color: COLORS.fail }}>{g.fail}</td>
                    <td>
                      <span className={`badge ${defectRate > 30 ? "badge-red" : defectRate > 10 ? "badge-yellow" : "badge-green"}`}>
                        {defectRate}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Top defect types overall - "what's actually going wrong most". */
export function TopDefects({ records }: { records: InspectionRecord[] }) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      for (const d of r.detections?.length ? r.detections : r.predictedDefect ? [{ defect: r.predictedDefect }] : []) {
        counts.set(d.defect, (counts.get(d.defect) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [records]);

  const max = data[0]?.count || 1;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Top defects</h3>
      </div>
      {data.length === 0 ? (
        <p style={{ color: "var(--text3)", fontSize: 13 }}>No defects recorded yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((d) => (
            <div key={d.name}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>{d.name}</span>
                <span style={{ fontFamily: "var(--mono)", color: "var(--text2)" }}>{d.count}</span>
              </div>
              <div className="progress">
                <div className="progress-fill" style={{ width: `${(d.count / max) * 100}%`, background: "var(--purple)" }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
