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

function formatSec(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

export function SkillProgressChart({ data, skillName }: SkillProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl bg-surface text-muted">
        No sessions yet for {skillName}
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    bestHoldSec: d.bestHoldMs / 1000,
  }));

  return (
    <div className="rounded-xl bg-surface p-4">
      <h3 className="mb-4 font-semibold">{skillName} — hold progress</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
          <XAxis dataKey="date" stroke="#8aa0b2" fontSize={12} />
          <YAxis stroke="#8aa0b2" fontSize={12} unit="s" />
          <Tooltip
            contentStyle={{ background: "#121a22", border: "1px solid #ffffff20" }}
            formatter={(value: number, name: string) => {
              if (name === "bestHoldSec") return [formatSec(value * 1000), "Best hold"];
              if (name === "avgFormScore") return [`${value}%`, "Form score"];
              return [value, name];
            }}
          />
          <Line
            type="monotone"
            dataKey="bestHoldSec"
            stroke="#22d3a7"
            strokeWidth={2}
            dot={{ fill: "#22d3a7" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
