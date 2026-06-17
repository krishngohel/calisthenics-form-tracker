"use client";

import type { ProgressionDrill } from "@cft/core";
import type { PersistedCue } from "@/hooks/usePersistentCues";

interface CoachingPanelProps {
  /** Active cues pinned until dismissed (mirrors camera overlay). */
  pinnedCues?: PersistedCue[];
  onDismissCue?: (id: string) => void;
  drills?: ProgressionDrill[];
  weakPoints?: string[];
}

export function CoachingPanel({
  pinnedCues = [],
  onDismissCue,
  drills,
  weakPoints,
}: CoachingPanelProps) {
  return (
    <div className="space-y-4">
      {pinnedCues.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Active cues
          </p>
          {pinnedCues.map((cue) => (
            <div
              key={cue.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-accent/25 bg-accent-soft/50 p-3"
            >
              <p className="text-sm font-medium leading-snug">{cue.text}</p>
              {onDismissCue && (
                <button
                  type="button"
                  onClick={() => onDismissCue(cue.id)}
                  className="shrink-0 text-xs font-semibold text-accent hover:underline"
                >
                  Got it
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {weakPoints && weakPoints.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Focus areas</h3>
          <ul className="space-y-1 text-sm">
            {weakPoints.map((w) => (
              <li key={w} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {drills && drills.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Recommended drills</h3>
          <div className="space-y-2">
            {drills.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-border-subtle bg-surface-muted p-3 text-sm"
              >
                <p className="font-medium">{d.name}</p>
                <p className="text-muted">{d.description}</p>
                {(d.targetHoldSec || d.sets) && (
                  <p className="mt-1 text-xs text-accent">
                    {d.sets && `${d.sets} sets`}
                    {d.reps && ` × ${d.reps} reps`}
                    {d.targetHoldSec && ` · ${d.targetHoldSec}s hold`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
