"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PREFERENCES, readPreferences, writePreferences, type Preferences } from "@/lib/preferences";

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const refresh = () => setPrefs(readPreferences());
    refresh();
    setLoaded(true);
    window.addEventListener("cft:preferences", refresh);
    return () => window.removeEventListener("cft:preferences", refresh);
  }, []);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs(writePreferences(patch));
  }, []);

  return { prefs, update, loaded };
}
