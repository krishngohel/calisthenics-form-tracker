"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatSec } from "@/lib/format";

export interface ProgressPoint {
  date: string;
  bestHoldMs: number;
  avgFormScore: number;
  sessionCount: number;
}

interface SkillProgressChartProps {
  data: ProgressPoint[];
  skillName: string;
}

const GRID = "var(--border)";
const AXIS = "var(--muted)";
const ACCENT = "var(--accent)";

export function SkillProgressChart({ data, skillName }: SkillProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="card flex h-48 items-center justify-center text-muted">
        No sessions yet for {skillName}
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    bestHoldSec: d.bestHoldMs / 1000,
  }));

  return (
    <div className="card p-5">
      <h3 className="mb-4 font-semibold text-foreground">
        {skillName} — hold progress
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="date" stroke={AXIS} fontSize={12} />
          <YAxis stroke={AXIS} fontSize={12} unit="s" />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: 12,
            }}
            labelStyle={{ color: "var(--muted)" }}
            formatter={(value: number, name: string) => {
              if (name === "bestHoldSec") return [formatSec(value * 1000), "Best hold"];
              if (name === "avgFormScore") return [`${value}%`, "Form score"];
              return [value, name];
            }}
          />
          <Line
            type="monotone"
            dataKey="bestHoldSec"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ fill: ACCENT, strokeWidth: 0, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
