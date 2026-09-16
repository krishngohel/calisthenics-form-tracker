"use client";

import Link from "next/link";
import type { CompletedHold, SaveState } from "@/hooks/useHoldSession";
import { formatMs } from "@/lib/format";

interface HoldSummaryCardProps {
  hold: CompletedHold;
  skillName?: string;
  saveState: SaveState;
  cloudConfigured: boolean;
  signedIn: boolean;
  onClear?: () => void;
}

function saveLabel(saveState: SaveState, cloudConfigured: boolean, signedIn: boolean) {
  switch (saveState.status) {
    case "saving":
      return { text: "Saving…", tone: "text-muted" };
    case "saved":
      return { text: "Saved to your dashboard", tone: "text-accent" };
    case "error":
      return { text: `Not saved: ${saveState.message}`, tone: "text-danger" };
    case "local":
      if (!cloudConfigured) return { text: "Cloud sync is not configured", tone: "text-muted" };
      if (!signedIn) return { text: "Sign in to save your progress", tone: "text-muted" };
      return { text: "Not saved", tone: "text-muted" };
    default:
      return null;
  }
}

export function HoldSummaryCard({
  hold,
  skillName,
  saveState,
  cloudConfigured,
  signedIn,
  onClear,
}: HoldSummaryCardProps) {
  const label = saveLabel(saveState, cloudConfigured, signedIn);
  return (
    <div className="card border-accent/25 bg-accent-soft/30 p-4" role="status">
      <h3 className="mb-2 font-semibold text-accent">Hold complete</h3>
      <p className="text-sm text-foreground">
        {skillName ? `${skillName} · ` : ""}
        {formatMs(hold.durationMs)} · Form {hold.formScore}%
      </p>
      {label && (
        <p className={`mt-1 text-xs ${label.tone}`}>
          {label.text}
          {saveState.status === "local" && cloudConfigured && !signedIn && (
            <>
              {" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      )}
      <p className="mt-2 text-xs text-muted">Get back into position to start the next hold.</p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 text-sm text-accent hover:underline"
        >
          Clear session
        </button>
      )}
    </div>
  );
}
