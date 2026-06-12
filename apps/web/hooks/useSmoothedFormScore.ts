"use client";

import { useCallback, useRef } from "react";
import {
  FormScoreSmoother,
  shouldUpdateFormDisplay,
  type HoldState,
} from "@cft/core";

/** Smooth and throttle form score updates for readable UI. */
export function useSmoothedFormScore() {
  const smootherRef = useRef(new FormScoreSmoother());
  const lastUiUpdateRef = useRef(0);

  const process = useCallback(
    (rawScore: number, holdState: HoldState, prevDisplayed: number): number => {
      const active = holdState === "holding";
      const now = performance.now();
      const smoothed = smootherRef.current.update(rawScore, now, active);

      if (
        shouldUpdateFormDisplay(
          prevDisplayed,
          smoothed,
          lastUiUpdateRef.current,
          now
        )
      ) {
        lastUiUpdateRef.current = now;
        return smoothed;
      }
      return prevDisplayed;
    },
    []
  );

  const reset = useCallback(() => {
    smootherRef.current.reset();
    lastUiUpdateRef.current = 0;
  }, []);

  return { process, reset };
}
