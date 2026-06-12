"use client";

import { useCallback, useRef, useState } from "react";

export interface PersistedCue {
  id: string;
  text: string;
  since: number;
}

/** Cues stay visible until the athlete dismisses them manually. */
export function usePersistentCues() {
  const [cues, setCues] = useState<PersistedCue[]>([]);
  const dismissedRef = useRef(new Set<string>());

  const ingest = useCallback((incoming: string[]) => {
    if (incoming.length === 0) return;
    setCues((prev) => {
      const known = new Set(prev.map((c) => c.text));
      const added: PersistedCue[] = [];
      for (const text of incoming) {
        if (dismissedRef.current.has(text) || known.has(text)) continue;
        added.push({ id: `${text}-${Date.now()}`, text, since: Date.now() });
      }
      if (added.length === 0) return prev;
      return [...prev, ...added].slice(-6);
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setCues((prev) => {
      const target = prev.find((c) => c.id === id);
      if (target) dismissedRef.current.add(target.text);
      return prev.filter((c) => c.id !== id);
    });
  }, []);

  const dismissAll = useCallback(() => {
    setCues((prev) => {
      for (const cue of prev) dismissedRef.current.add(cue.text);
      return [];
    });
  }, []);

  const reset = useCallback(() => {
    setCues([]);
    dismissedRef.current.clear();
  }, []);

  return { cues, ingest, dismiss, dismissAll, reset };
}
