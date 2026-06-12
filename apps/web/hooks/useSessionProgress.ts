"use client";

import { useCallback, useRef, useState } from "react";
import type { HoldState } from "@cft/core";

export interface SessionProgressPoint {
  elapsedSec: number;
  formScore: number;
}

const SAMPLE_INTERVAL_MS = 450;

/** Records form score over the session for a live progress chart. */
export function useSessionProgress() {
  const [points, setPoints] = useState<SessionProgressPoint[]>([]);
  const sessionStartRef = useRef<number | null>(null);
  const lastSampleRef = useRef(0);

  const record = useCallback((formScore: number, state: HoldState) => {
    const now = performance.now();
    if (!sessionStartRef.current) sessionStartRef.current = now;

    if (state !== "holding") return;
    if (now - lastSampleRef.current < SAMPLE_INTERVAL_MS) return;
    lastSampleRef.current = now;

    const elapsedSec = Math.round((now - sessionStartRef.current) / 100) / 10;
    setPoints((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.elapsedSec === elapsedSec &&
        last.formScore === formScore
      ) {
        return prev;
      }
      return [...prev, { elapsedSec, formScore }].slice(-120);
    });
  }, []);

  const reset = useCallback(() => {
    setPoints([]);
    sessionStartRef.current = null;
    lastSampleRef.current = 0;
  }, []);

  return { points, record, reset };
}
