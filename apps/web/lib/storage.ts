/**
 * All on-device persistence goes through here. localStorage can be absent
 * (SSR), disabled (private mode), or full, so every access is guarded and
 * every key lives in one place.
 */
export const STORAGE_KEYS = {
  onboarded: "cft-onboarded",
  preferences: "cft-preferences",
  history: "cft-history",
  theme: "cft-theme",
  voice: "cft-voice",
  bodyProvider: "cft-body-provider",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/** Fired on `window` whenever a key changes in this tab (the native
 * `storage` event only fires in *other* tabs). */
export const STORAGE_EVENT = "cft:storage";

export interface StorageChange {
  key: StorageKey;
}

function available(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readString(key: StorageKey): string | null {
  if (!available()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: StorageKey, value: string | null): void {
  if (!available()) return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent<StorageChange>(STORAGE_EVENT, { detail: { key } }));
  } catch {
    // Quota exceeded / private mode: the in-memory state is still correct.
  }
}

export function readJson<T>(key: StorageKey, fallback: T): T {
  const raw = readString(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: StorageKey, value: T): void {
  writeString(key, JSON.stringify(value));
}

export function readFlag(key: StorageKey): boolean {
  return readString(key) === "1";
}

export function writeFlag(key: StorageKey, value: boolean): void {
  writeString(key, value ? "1" : "0");
}

/**
 * Subscribe to changes of one key, from this tab or another. Returns an
 * unsubscribe function. Safe to call during SSR (no-op).
 */
export function subscribe(key: StorageKey, listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onLocal = (e: Event) => {
    if ((e as CustomEvent<StorageChange>).detail?.key === key) listener();
  };
  const onRemote = (e: StorageEvent) => {
    if (e.key === null || e.key === key) listener();
  };
  window.addEventListener(STORAGE_EVENT, onLocal);
  window.addEventListener("storage", onRemote);
  return () => {
    window.removeEventListener(STORAGE_EVENT, onLocal);
    window.removeEventListener("storage", onRemote);
  };
}
