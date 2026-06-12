"use client";

import { useEffect, useRef, useState } from "react";
import type { HoldState } from "@cft/core";

interface HoldTimerProps {
  state: HoldState;
  /** performance.now() timestamp when the hold started (null when not holding). */
  holdStartTime: number | null;
  lastHoldMs: number;
  bestHoldMs: number;
  formScore: number;
  mode: "hold_only" | "perfect";
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${s}.${cs.toString().padStart(2, "0")}s`;
}

const STATE_LABELS: Record<HoldState, string> = {
  idle: "Ready",
  qualifying: "Hold steady…",
  holding: "HOLD",
  dropped: "Dropped",
};

export function HoldTimer({
  state,
  holdStartTime,
  lastHoldMs,
  bestHoldMs,
  formScore,
  mode,
}: HoldTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const rafRef = useRef(0);

  // Self-animating elapsed time — smooth at display refresh rate regardless
  // of how often pose detection results arrive.
  useEffect(() => {
    if (state !== "holding" || holdStartTime === null) {
      cancelAnimationFrame(rafRef.current);
      if (state !== "holding") {
        setElapsedMs(0);
      }
      return;
    }
    const tick = () => {
      setElapsedMs(performance.now() - holdStartTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    setElapsedMs(performance.now() - holdStartTime);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [state, holdStartTime]);

  const displayMs =
    state === "holding" ? elapsedMs : state === "dropped" ? lastHoldMs : 0;
  const isActive = state === "holding";
  const showForm = isActive || formScore > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`text-sm font-medium uppercase tracking-widest ${
          state === "holding" ? "text-accent" : "text-muted"
        }`}
      >
        {STATE_LABELS[state]}
      </div>
      <div
        className={`font-mono text-4xl font-bold tabular-nums sm:text-5xl ${
          state === "holding" ? "text-accent" : "text-white"
        }`}
      >
        {formatMs(displayMs)}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>
          Form {showForm ? `${formScore}%` : "—"}
        </span>
        <span className="capitalize">{mode.replace("_", " ")}</span>
        {bestHoldMs > 0 && <span>Best {formatMs(bestHoldMs)}</span>}
      </div>
      {isActive && (
        <div className="h-1 w-full max-w-48 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${formScore}%` }}
          />
        </div>
      )}
    </div>
  );
}
