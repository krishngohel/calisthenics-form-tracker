import type { Landmark } from "./provider";

/** How long a vanished landmark is carried forward, and how its confidence decays. */
const DEFAULT_MAX_AGE_MS = 160;

/**
 * Bridges brief landmark dropouts. Pose models frequently lose a joint for a
 * frame or two (motion blur, a hand crossing the torso); without this the
 * geometry sees a null, a rule flips, and the hold timer stops. A missing
 * landmark is replaced by its last position with linearly decaying
 * confidence, then dropped for real once it has been gone for `maxAgeMs`.
 */
export class LandmarkPersistence {
  private last = new Map<string, { lm: Landmark; seenAt: number }>();

  constructor(private maxAgeMs = DEFAULT_MAX_AGE_MS) {}

  apply(body: Record<string, Landmark | null>, timestamp: number): Record<string, Landmark | null> {
    const out: Record<string, Landmark | null> = {};
    const keys = new Set([...Object.keys(body), ...Array.from(this.last.keys())]);
    keys.forEach((key) => {
      const lm = body[key] ?? null;
      if (lm) {
        this.last.set(key, { lm, seenAt: timestamp });
        out[key] = lm;
        return;
      }
      const prev = this.last.get(key);
      if (!prev) {
        out[key] = null;
        return;
      }
      const age = timestamp - prev.seenAt;
      if (age > this.maxAgeMs || age < 0) {
        this.last.delete(key);
        out[key] = null;
        return;
      }
      const decay = 1 - age / this.maxAgeMs;
      out[key] = { ...prev.lm, visibility: (prev.lm.visibility ?? 1) * decay };
    });
    return out;
  }

  reset(): void {
    this.last.clear();
  }
}
