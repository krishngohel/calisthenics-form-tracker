import { beforeEach, describe, expect, it, vi } from "vitest";

describe("preferences", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns defaults during SSR and merges stored partials on the client", async () => {
    const ssr = await import("../preferences");
    expect(ssr.readPreferences()).toEqual(ssr.DEFAULT_PREFERENCES);

    vi.resetModules();
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => true,
    });
    vi.stubGlobal("CustomEvent", class extends Event {});
    const client = await import("../preferences");
    client.writePreferences({ experience: "advanced" });
    expect(client.readPreferences()).toEqual({ ...client.DEFAULT_PREFERENCES, experience: "advanced" });
    expect(client.STARTER_SKILL.advanced).toBe("tuck-planche");
  });
});
