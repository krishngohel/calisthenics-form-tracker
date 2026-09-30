"use client";

import { useMemo, useRef } from "react";
import type { Landmark } from "@cft/core";

/** Frames of recent history the rule evaluators can look back over (~1s at 30fps). */
const HISTORY_FRAMES = 30;

export interface FrameHistory {
  push: (body: Record<string, Landmark | null>) => Record<string, Landmark | null>[];
  clear: () => void;
}

/**
 * Ring of recent isotropic bodies, kept in a ref so it never re-renders.
 * The returned object is stable for the component's lifetime, so it is safe
 * to list in effect dependencies.
 */
export function useFrameHistory(): FrameHistory {
  const historyRef = useRef<Record<string, Landmark | null>[]>([]);
  return useMemo<FrameHistory>(
    () => ({
      push: (body) => {
        const history = historyRef.current;
        history.push(body);
        if (history.length > HISTORY_FRAMES) history.shift();
        return history;
      },
      clear: () => {
        historyRef.current = [];
      },
    }),
    []
  );
}
