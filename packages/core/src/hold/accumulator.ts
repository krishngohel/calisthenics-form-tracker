import type { FormMetric } from "../skills/registry";

export interface HoldSummaryMetrics {
  /** Mean raw form score across every frame of the hold. */
  formScore: number;
  /** Per-metric averages; `passed` reflects the pass rate over the hold. */
  metrics: FormMetric[];
  frames: number;
}

interface MetricTally {
  label: string;
  cue?: string;
  scoreSum: number;
  passCount: number;
  frames: number;
}

/** A metric counts as passed for the hold when it passed on most frames. */
const PASS_RATE_THRESHOLD = 0.7;

/**
 * Aggregates per-frame evaluations across a single hold so the saved session
 * and coaching plan reflect the whole hold — not just the frame it ended on,
 * which by definition is the frame where form broke down.
 */
export class HoldMetricsAccumulator {
  private tallies = new Map<string, MetricTally>();
  private scoreSum = 0;
  private frames = 0;

  push(formScore: number, metrics: FormMetric[]): void {
    this.frames++;
    this.scoreSum += formScore;
    for (const metric of metrics) {
      let tally = this.tallies.get(metric.id);
      if (!tally) {
        tally = { label: metric.label, cue: metric.cue, scoreSum: 0, passCount: 0, frames: 0 };
        this.tallies.set(metric.id, tally);
      }
      tally.frames++;
      tally.scoreSum += metric.score;
      if (metric.passed) tally.passCount++;
      if (!metric.passed && metric.cue) tally.cue = metric.cue;
    }
  }

  get frameCount(): number {
    return this.frames;
  }

  summarize(): HoldSummaryMetrics {
    const metrics: FormMetric[] = [];
    this.tallies.forEach((tally, id) => {
      metrics.push({
        id,
        label: tally.label,
        score: Math.round(tally.scoreSum / tally.frames),
        passed: tally.passCount / tally.frames >= PASS_RATE_THRESHOLD,
        cue: tally.cue,
      });
    });
    return {
      formScore: this.frames > 0 ? Math.round(this.scoreSum / this.frames) : 0,
      metrics,
      frames: this.frames,
    };
  }

  reset(): void {
    this.tallies.clear();
    this.scoreSum = 0;
    this.frames = 0;
  }
}
