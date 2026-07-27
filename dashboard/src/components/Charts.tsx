"use client";

import { useMemo } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { InspectionRecord } from "@/lib/types";

const DECISION_COLORS: Record<string, string> = {
  pass: "#0a9d82",
  review: "#c98a00",
  fail: "#e5484d",
};

const AXIS_STYLE = { fill: "#97a1b4", fontSize: 12 };
const TOOLTIP_STYLE = {
  background: "#ffffff",
  border: "1px solid #e4e8f1",
  borderRadius: 8,
  color: "#0f1a2e",
  fontSize: 12,
  boxShadow: "0 1px 3px rgba(15,23,42,.06)",
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
      </div>
      <div className="chart-wrap">{children}</div>
    </div>
  );
}

export function DecisionPie({ records }: { records: InspectionRecord[] }) {
  const data = useMemo(() => {
    const counts = { pass: 0, review: 0, fail: 0 };
    for (const r of records) counts[r.finalDecision]++;
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [records]);

  return (
    <ChartCard title="Decision breakdown">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={DECISION_COLORS[entry.name]} stroke="none" />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#5b6678" }} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function DefectBar({ records }: { records: InspectionRecord[] }) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      if (!r.predictedDefect) continue;
      counts.set(r.predictedDefect, (counts.get(r.predictedDefect) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [records]);

  return (
    <ChartCard title="Most common defects">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" horizontal={false} />
          <XAxis type="number" tick={AXIS_STYLE} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={AXIS_STYLE} width={90} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f4f6fb" }} />
          <Bar dataKey="count" fill="#2f72e6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TrendLine({ records }: { records: InspectionRecord[] }) {
  const data = useMemo(() => {
    const byDay = new Map<string, { date: string; pass: number; review: number; fail: number }>();
    for (const r of records) {
      const date = r.timestamp.split("T")[0];
      if (!byDay.has(date)) byDay.set(date, { date, pass: 0, review: 0, fail: 0 });
      byDay.get(date)![r.finalDecision]++;
    }
    return Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [records]);

  return (
    <ChartCard title="Inspections over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" />
          <XAxis dataKey="date" tick={AXIS_STYLE} />
          <YAxis tick={AXIS_STYLE} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#5b6678" }} />
          <Line type="monotone" dataKey="pass" stroke={DECISION_COLORS.pass} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="review" stroke={DECISION_COLORS.review} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="fail" stroke={DECISION_COLORS.fail} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ConfidenceHistogram({ records }: { records: InspectionRecord[] }) {
  const data = useMemo(() => {
    const buckets = ["<50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"];
    const counts = new Array(buckets.length).fill(0);
    for (const r of records) {
      const pct = r.confidence * 100;
      const idx = pct < 50 ? 0 : Math.min(5, Math.floor((pct - 50) / 10) + 1);
      counts[idx]++;
    }
    return buckets.map((name, i) => ({ name, count: counts[i] }));
  }, [records]);

  return (
    <ChartCard title="Confidence distribution">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e8f1" />
          <XAxis dataKey="name" tick={AXIS_STYLE} />
          <YAxis tick={AXIS_STYLE} allowDecimals={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f4f6fb" }} />
          <Bar dataKey="count" fill="#7c5cff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
