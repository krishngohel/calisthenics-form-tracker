"use client";

import { useCallback, useEffect, useState } from "react";
import { subscribe, type StorageKey } from "@/lib/storage";

/**
 * React binding for a stored value: `read` runs after mount (so the server
 * render and first client paint match) and again whenever the key changes.
 */
export function useStoredValue<T>(key: StorageKey, read: () => T, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => setValue(read()), [read]);

  useEffect(() => {
    refresh();
    setLoaded(true);
    return subscribe(key, refresh);
  }, [key, refresh]);

  return { value, loaded, refresh };
}
