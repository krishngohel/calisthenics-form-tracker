import type { FormMetric } from "../skills/registry";

/** Max score shown when the athlete is not in the skill hold position. */
const OUT_OF_POSE_CAP = 25;

/**
 * Derive a readable form score from metric breakdown.
 * Scores stay low unless the hold criteria are met and metrics pass.
 */
export function computeFormScore(
  holdMet: boolean,
  metrics: FormMetric[]
): number {
  if (metrics.length === 0) return holdMet ? 100 : 0;

  const avg = metrics.reduce((sum, metric) => sum + metric.score, 0) / metrics.length;
  const passRatio = metrics.filter((metric) => metric.passed).length / metrics.length;

  if (!holdMet) {
    return Math.round(Math.min(avg * 0.25, OUT_OF_POSE_CAP));
  }

  const blended = avg * (0.5 + passRatio * 0.5);
  return Math.round(Math.min(100, Math.max(0, blended)));
}

/** Smooth displayed form score so the UI does not flicker frame-to-frame. */
export class FormScoreSmoother {
  private value = 0;
  private lastTs = 0;

  reset(): void {
    this.value = 0;
    this.lastTs = 0;
  }

  /**
   * @param active True while qualifying or holding — uses faster tracking.
   */
  update(raw: number, timestamp: number, active: boolean): number {
    const tauMs = active ? 550 : 900;
    const dt =
      this.lastTs > 0 ? Math.min(250, Math.max(16, timestamp - this.lastTs)) : 50;
    this.lastTs = timestamp;
    const alpha = 1 - Math.exp(-dt / tauMs);
    this.value += (raw - this.value) * alpha;
    return Math.round(this.value);
  }

  get current(): number {
    return Math.round(this.value);
  }
}

/** Only push form score to React when the change is meaningful. */
export function shouldUpdateFormDisplay(
  prev: number,
  next: number,
  lastUpdateMs: number,
  nowMs: number,
  minDelta = 2,
  minIntervalMs = 280
): boolean {
  return (
    Math.abs(next - prev) >= minDelta || nowMs - lastUpdateMs >= minIntervalMs
  );
}
