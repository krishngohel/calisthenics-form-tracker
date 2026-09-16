"use client";

import { useEffect } from "react";

type WakeLockSentinelLike = { release: () => Promise<void>; addEventListener?: unknown };

/** Keeps the screen on while training (Screen Wake Lock API; no-op elsewhere). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        sentinel = await nav.wakeLock!.request("screen");
      } catch {
        sentinel = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !cancelled) void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
