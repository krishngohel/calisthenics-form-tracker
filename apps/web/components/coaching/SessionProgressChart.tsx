"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SessionProgressPoint } from "@/hooks/useSessionProgress";

interface SessionProgressChartProps {
  points: SessionProgressPoint[];
}

const GRID = "var(--border)";
const AXIS = "var(--muted)";
const ACCENT = "var(--accent)";

export function SessionProgressChart({ points }: SessionProgressChartProps) {
  const latest = points[points.length - 1]?.formScore;

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted">Session progress</h3>
        {latest != null && (
          <span className="text-sm tabular-nums font-medium text-accent">
            {latest}% form
          </span>
        )}
      </div>

      {points.length < 2 ? (
        <p className="py-8 text-center text-sm text-muted">
          Hold a skill to see live form progression
        </p>
      ) : (
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
              <XAxis
                dataKey="elapsedSec"
                tick={{ fill: AXIS, fontSize: 11 }}
                tickFormatter={(v) => `${v}s`}
                stroke={GRID}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: AXIS, fontSize: 11 }}
                tickFormatter={(v) => `${v}%`}
                stroke={GRID}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted)" }}
                labelFormatter={(v) => `${v}s into session`}
                formatter={(value: number) => [`${value}%`, "Form"]}
              />
              <Line
                type="monotone"
                dataKey="formScore"
                stroke={ACCENT}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
