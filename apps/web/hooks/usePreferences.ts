"use client";

import { useCallback } from "react";
import { DEFAULT_PREFERENCES, readPreferences, writePreferences, type Preferences } from "@/lib/preferences";
import { STORAGE_KEYS } from "@/lib/storage";
import { useStoredValue } from "./useStoredValue";

export function usePreferences() {
  const { value: prefs, loaded } = useStoredValue(STORAGE_KEYS.preferences, readPreferences, DEFAULT_PREFERENCES);
  const update = useCallback((patch: Partial<Preferences>) => {
    writePreferences(patch);
  }, []);
  return { prefs, update, loaded };
}
