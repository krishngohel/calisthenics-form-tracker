import { beforeEach, describe, expect, it, vi } from "vitest";

/** Minimal localStorage + window for the storage module. */
function installBrowser(opts: { throwOnSet?: boolean } = {}) {
  const store = new Map<string, string>();
  const listeners = new Map<string, Array<(e: Event) => void>>();
  const win = {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        if (opts.throwOnSet) throw new Error("QuotaExceededError");
        store.set(k, v);
      },
      removeItem: (k: string) => void store.delete(k),
    },
    addEventListener: (type: string, fn: (e: Event) => void) => listeners.set(type, [...(listeners.get(type) ?? []), fn]),
    removeEventListener: (type: string, fn: (e: Event) => void) =>
      listeners.set(type, (listeners.get(type) ?? []).filter((f) => f !== fn)),
    dispatchEvent: (e: Event) => {
      (listeners.get(e.type) ?? []).forEach((fn) => fn(e));
      return true;
    },
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("CustomEvent", class extends Event {
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      super(type);
      this.detail = init?.detail;
    }
  });
  return store;
}

describe("storage", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("round-trips JSON and flags", async () => {
    installBrowser();
    const s = await import("../storage");
    s.writeJson(s.STORAGE_KEYS.preferences, { a: 1 });
    expect(s.readJson(s.STORAGE_KEYS.preferences, null)).toEqual({ a: 1 });
    s.writeFlag(s.STORAGE_KEYS.voice, true);
    expect(s.readFlag(s.STORAGE_KEYS.voice)).toBe(true);
    s.writeString(s.STORAGE_KEYS.voice, null);
    expect(s.readFlag(s.STORAGE_KEYS.voice)).toBe(false);
  });

  it("falls back on corrupt JSON and on missing storage", async () => {
    const store = installBrowser();
    const s = await import("../storage");
    store.set(s.STORAGE_KEYS.history, "{not json");
    expect(s.readJson(s.STORAGE_KEYS.history, [])).toEqual([]);
    vi.unstubAllGlobals();
    vi.resetModules();
    const ssr = await import("../storage");
    expect(ssr.readString(ssr.STORAGE_KEYS.theme)).toBeNull();
    expect(() => ssr.writeString(ssr.STORAGE_KEYS.theme, "dark")).not.toThrow();
  });

  it("swallows quota errors", async () => {
    installBrowser({ throwOnSet: true });
    const s = await import("../storage");
    expect(() => s.writeJson(s.STORAGE_KEYS.history, [1])).not.toThrow();
  });

  it("notifies same-tab subscribers for the changed key only", async () => {
    installBrowser();
    const s = await import("../storage");
    const onTheme = vi.fn();
    const onVoice = vi.fn();
    const off = s.subscribe(s.STORAGE_KEYS.theme, onTheme);
    s.subscribe(s.STORAGE_KEYS.voice, onVoice);
    s.writeString(s.STORAGE_KEYS.theme, "dark");
    expect(onTheme).toHaveBeenCalledTimes(1);
    expect(onVoice).not.toHaveBeenCalled();
    off();
    s.writeString(s.STORAGE_KEYS.theme, "light");
    expect(onTheme).toHaveBeenCalledTimes(1);
  });
});
