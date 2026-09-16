"use client";

import { useEffect, useRef } from "react";
import type { HoldState, TrainMode } from "@cft/core";
import { formatMs } from "@/lib/format";

interface HoldHudProps {
  state: HoldState;
  holdStartTime: number | null;
  lastHoldMs: number;
  bestHoldMs: number;
  formScore: number;
  mode: TrainMode;
  /** Auto-detect: skill name to show, or null while scanning. */
  skillLabel?: string | null;
  /** Bigger type for focus mode. */
  large?: boolean;
}

const STATE_LABELS: Record<HoldState, string> = {
  idle: "Ready",
  qualifying: "Hold steady",
  holding: "Hold",
  dropped: "Dropped",
};

const STATE_COLORS: Record<HoldState, string> = {
  idle: "bg-white/15 text-white",
  qualifying: "bg-amber-400 text-black",
  holding: "bg-emerald-400 text-black",
  dropped: "bg-rose-500 text-white",
};

/**
 * Heads-up display drawn over the camera. The timer writes straight to the
 * DOM so the 60fps clock never re-renders React. Everything here is sized to
 * be readable from the floor two metres away.
 */
export function HoldHud({
  state,
  holdStartTime,
  lastHoldMs,
  bestHoldMs,
  formScore,
  mode,
  skillLabel,
  large = false,
}: HoldHudProps) {
  const clockRef = useRef<HTMLDivElement>(null);
  const isLearn = mode === "learn";

  useEffect(() => {
    const el = clockRef.current;
    if (!el) return;
    if (state !== "holding" || holdStartTime === null) {
      el.textContent = formatMs(state === "dropped" ? lastHoldMs : 0);
      return;
    }
    let raf = 0;
    const tick = () => {
      el.textContent = formatMs(performance.now() - holdStartTime);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [state, holdStartTime, lastHoldMs]);

  const ring = Math.max(0, Math.min(100, formScore));
  const ringSize = large ? 84 : 64;
  const stroke = large ? 7 : 6;
  const radius = (ringSize - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 pr-16 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="hud-panel min-w-0" aria-live="polite">
        {skillLabel !== undefined && (
          <div className="truncate text-xs font-semibold uppercase tracking-widest text-white/80">
            {skillLabel ?? "Scanning…"}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-widest ${
              isLearn ? "bg-amber-400 text-black" : STATE_COLORS[state]
            }`}
          >
            {isLearn ? "Learn" : STATE_LABELS[state]}
          </span>
          {!isLearn && bestHoldMs > 0 && (
            <span className="text-xs font-medium text-white/80">Best {formatMs(bestHoldMs)}</span>
          )}
        </div>
        {isLearn ? (
          <div className={`mt-1 font-semibold leading-snug text-white ${large ? "text-lg" : "text-sm"}`}>
            Match the ghost pose
          </div>
        ) : (
          <div
            ref={clockRef}
            className={`mt-0.5 font-mono font-extrabold tabular-nums leading-none ${
              state === "holding" ? "text-emerald-300" : "text-white"
            } ${large ? "text-6xl" : "text-4xl sm:text-5xl"}`}
          >
            {formatMs(state === "dropped" ? lastHoldMs : 0)}
          </div>
        )}
      </div>

      <div
        className="hud-panel flex shrink-0 flex-col items-center justify-center"
        role="meter"
        aria-label="Form score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={ring}
      >
        <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden>
          <circle cx={ringSize / 2} cy={ringSize / 2} r={radius} stroke="rgba(255,255,255,0.18)" strokeWidth={stroke} fill="none" />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            stroke={ring >= 80 ? "#34d399" : ring >= 50 ? "#fbbf24" : "#fb7185"}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ring / 100)}
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
            style={{ transition: "stroke-dashoffset 400ms ease-out, stroke 400ms" }}
          />
          <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#fff" fontSize={large ? 24 : 18} fontWeight={800}>
            {ring}
          </text>
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/80">Form</span>
      </div>
    </div>
  );
}
