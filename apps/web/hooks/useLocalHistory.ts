"use client";

import { useEffect, useMemo, useState } from "react";
import { computeStats, readHistory, type LocalHold } from "@/lib/localHistory";

/** Reactive view of the on-device hold history. */
export function useLocalHistory() {
  const [history, setHistory] = useState<LocalHold[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => setHistory(readHistory());
    refresh();
    setLoaded(true);
    window.addEventListener("cft:history", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("cft:history", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const stats = useMemo(() => computeStats(history), [history]);
  return { history, stats, loaded };
}
