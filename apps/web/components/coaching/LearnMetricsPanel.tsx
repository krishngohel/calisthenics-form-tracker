"use client";

import type { FormMetric } from "@cft/core";

interface LearnMetricsPanelProps {
  metrics: FormMetric[];
  title?: string;
  footer?: string | null;
}

export function LearnMetricsPanel({ metrics, title = "Form checklist", footer = "White outline = target position. Yellow arrows show what to move." }: LearnMetricsPanelProps) {
  if (metrics.length === 0) return null;

  return (
    <div className="card border-accent/20 p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
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
              {m.passed ? "✓" : "·"}
            </span>
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="ml-1 text-xs text-muted">{m.score}</span>
              {!m.passed && m.cue && (
                <span className="mt-0.5 block text-muted">{m.cue}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-3 text-xs leading-relaxed text-muted">{footer}</p>}
    </div>
  );
}
