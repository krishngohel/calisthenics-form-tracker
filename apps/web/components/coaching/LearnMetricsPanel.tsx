"use client";

import type { FormMetric } from "@cft/core";

interface LearnMetricsPanelProps {
  metrics: FormMetric[];
}

export function LearnMetricsPanel({ metrics }: LearnMetricsPanelProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="card border-accent/20 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent-hover">
        Form checklist
      </h3>
      <ul className="space-y-2">
        {metrics.map((m) => (
          <li
            key={m.id}
            className={`flex items-start gap-2 text-sm ${
              m.passed ? "text-accent-hover" : "text-foreground"
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                m.passed
                  ? "bg-accent-soft text-accent-hover"
                  : "bg-warning-soft text-warning"
              }`}
            >
              {m.passed ? "✓" : "→"}
            </span>
            <span>
              <span className="font-medium">{m.label}</span>
              {!m.passed && m.cue && (
                <span className="mt-0.5 block text-muted">{m.cue}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        White outline = target position. Yellow arrows show what to move.
      </p>
    </div>
  );
}
