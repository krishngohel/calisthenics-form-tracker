"use client";

import { useEffect, useRef, useState } from "react";
import type { HoldState, TrainMode } from "@cft/core";

interface HoldTimerProps {
  state: HoldState;
  holdStartTime: number | null;
  lastHoldMs: number;
  bestHoldMs: number;
  formScore: number;
  mode: TrainMode;
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
  const isLearn = mode === "learn";
  const isActive = state === "holding";
  const showForm = isLearn || isActive || formScore > 0;

  return (
    <div className="card flex flex-col items-center gap-2 p-6">
      <div
        className={`text-sm font-semibold uppercase tracking-widest ${
          isLearn
            ? "text-warning"
            : state === "holding"
              ? "text-accent"
              : "text-muted"
        }`}
      >
        {isLearn ? "Learn" : STATE_LABELS[state]}
      </div>
      {!isLearn && (
        <div
          className={`font-mono text-4xl font-bold tabular-nums sm:text-5xl ${
            state === "holding" ? "text-accent" : "text-foreground"
          }`}
        >
          {formatMs(displayMs)}
        </div>
      )}
      {isLearn && (
        <div className="text-center text-sm leading-relaxed text-muted">
          Match the ghost pose — follow the yellow arrows
        </div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
        <span>Form {showForm ? `${formScore}%` : "—"}</span>
        <span className="capitalize">{mode.replace("_", " ")}</span>
        {!isLearn && bestHoldMs > 0 && <span>Best {formatMs(bestHoldMs)}</span>}
      </div>
      {(isActive || isLearn) && (
        <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-accent-soft">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${formScore}%` }}
          />
        </div>
      )}
    </div>
  );
}
