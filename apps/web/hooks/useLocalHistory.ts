"use client";

import { useMemo } from "react";
import type { BestHolds, BestReps } from "@cft/core";
import { computeStats, readHistory } from "@/lib/localHistory";
import { STORAGE_KEYS } from "@/lib/storage";
import { useStoredValue } from "./useStoredValue";

const EMPTY: never[] = [];

/** Reactive view of the on-device history, plus the bests in the shape the progression tree consumes. */
export function useLocalHistory() {
  const { value: history, loaded } = useStoredValue(STORAGE_KEYS.history, readHistory, EMPTY);
  const stats = useMemo(() => computeStats(history), [history]);
  const bests = useMemo<BestHolds>(() => Object.fromEntries(Object.entries(stats.bestBySkill).map(([id, h]) => [id, h.durationMs])), [stats.bestBySkill]);
  const reps = useMemo<BestReps>(() => stats.bestRepsBySkill, [stats.bestRepsBySkill]);
  return { history, stats, loaded, bests, reps };
}
