"use client";

import { useEffect, useState } from "react";
import type { CompletedHold } from "@/hooks/useHoldSession";
import { formatMs } from "@/lib/format";

interface HoldResultToastProps {
  hold: CompletedHold | null;
  newBest: boolean;
}

const SHOW_MS = 4500;

/** Result of the last hold, shown over the camera for a few seconds. */
export function HoldResultToast({ hold, newBest }: HoldResultToastProps) {
  const [visible, setVisible] = useState(false);
  const key = hold?.endedAt.getTime() ?? 0;

  useEffect(() => {
    if (!key) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), SHOW_MS);
    return () => window.clearTimeout(t);
  }, [key]);

  if (!hold || !visible) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-4 z-30 flex justify-center top-[calc(max(0.75rem,env(safe-area-inset-top))+7.5rem)]"
      role="status"
      aria-live="assertive"
    >
      <div className={`rounded-2xl px-5 py-3 text-center text-white shadow-lg backdrop-blur-md ${newBest ? "bg-emerald-500/90" : "bg-black/75"}`}>
        {newBest && <div className="text-xs font-bold uppercase tracking-[0.18em] text-black/80">New personal best</div>}
        <div className="font-mono text-3xl font-extrabold tabular-nums leading-none">{formatMs(hold.durationMs)}</div>
        <div className={`mt-1 text-sm font-medium ${newBest ? "text-black/80" : "text-white/80"}`}>Form {hold.formScore}%</div>
      </div>
    </div>
  );
}
