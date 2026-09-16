"use client";

import { useMemo } from "react";
import { computeStats, readHistory } from "@/lib/localHistory";
import { STORAGE_KEYS } from "@/lib/storage";
import { useStoredValue } from "./useStoredValue";

const EMPTY: never[] = [];

/** Reactive view of the on-device hold history. */
export function useLocalHistory() {
  const { value: history, loaded } = useStoredValue(STORAGE_KEYS.history, readHistory, EMPTY);
  const stats = useMemo(() => computeStats(history), [history]);
  return { history, stats, loaded };
}
