"use client";

import Link from "next/link";
import type { CoachingPlan } from "@cft/core";
import type { CompletedHold, SaveState } from "@/hooks/useHoldSession";
import type { ClipSaveState } from "@/hooks/useHoldRecorder";
import { formatMs } from "@/lib/format";

interface PostHoldSheetProps {
  hold: CompletedHold;
  newBest: boolean;
  plan: CoachingPlan | null;
  saveState: SaveState;
  next?: { href: string; label: string } | null;
  skillName?: string;
  onAgain: () => void;
  /** Present when a video of this hold was captured. */
  video?: { onSave: () => void; state: ClipSaveState } | null;
}

/**
 * What you see the moment a hold ends: the number, whether it was a best,
 * the one or two things to fix, and where to go next. Rises from the bottom
 * of the camera stage; dismissing it leaves you ready for the next attempt.
 */
export function PostHoldSheet({ hold, newBest, plan, saveState, next, skillName, onAgain, video }: PostHoldSheetProps) {
  const weak = plan?.weakPoints.slice(0, 2) ?? [];
  const drills = plan?.recommendedDrills.slice(0, 2) ?? [];
  return (
    <div className="sheet-inline" role="status" aria-live="polite">
      <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-fill" aria-hidden />
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className={`text-sm ${newBest ? "font-semibold text-success" : "text-muted"}`}>{newBest ? "Personal best" : skillName ?? "Hold"}</div>
          <div className="font-mono text-4xl font-bold tabular-nums leading-none text-foreground">{formatMs(hold.durationMs)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Form</div>
          <div className="text-2xl font-bold text-foreground">{hold.formScore}%</div>
        </div>
      </div>

      {weak.length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Work on: <span className="text-foreground">{weak.join(" · ")}</span>
        </p>
      )}
      {drills.length > 0 && (
        <ul className="mt-2 space-y-1">
          {drills.map((d) => (
            <li key={d.id} className="text-sm text-foreground">
              <span className="font-medium">{d.name}</span>
              <span className="text-muted">
                {" "}
                · {d.sets ? `${d.sets} sets` : ""}
                {d.reps ? ` × ${d.reps}` : ""}
                {d.targetHoldSec ? ` · ${d.targetHoldSec}s` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      {saveState.status === "error" && <p className="mt-2 text-xs text-danger">Not saved: {saveState.message}</p>}

      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onAgain} className="btn-primary flex-1">
          Again
        </button>
        {next && (
          <Link href={next.href} className="btn-secondary flex-1 truncate">
            {next.label}
          </Link>
        )}
      </div>
      {video && (
        <button
          type="button"
          onClick={video.onSave}
          disabled={video.state === "saving"}
          className="btn-ghost mt-1 w-full disabled:opacity-60"
        >
          {video.state === "saving" ? "Saving video…" : video.state === "saved" ? "Video saved" : video.state === "error" ? "Could not save video — try again" : "Save video with timer"}
        </button>
      )}
    </div>
  );
}
