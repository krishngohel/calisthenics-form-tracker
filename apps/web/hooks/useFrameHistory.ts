"use client";

import { useCallback, useRef } from "react";
import type { Landmark } from "@cft/core";

/** Frames of recent history the rule evaluators can look back over (~1s at 30fps). */
const HISTORY_FRAMES = 30;

/** Ring of recent isotropic bodies, kept in a ref so it never re-renders. */
export function useFrameHistory() {
  const historyRef = useRef<Record<string, Landmark | null>[]>([]);

  const push = useCallback((body: Record<string, Landmark | null>) => {
    const history = historyRef.current;
    history.push(body);
    if (history.length > HISTORY_FRAMES) history.shift();
    return history;
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
  }, []);

  return { push, clear };
}
