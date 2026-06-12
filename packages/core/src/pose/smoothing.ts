import type { HandLandmarks, Landmark } from "./provider";
import { getDistanceContext } from "./distance";

class LowPassFilter {
  private initialized = false;
  private value = 0;

  filter(x: number, alpha: number): number {
    if (!this.initialized) {
      this.initialized = true;
      this.value = x;
      return x;
    }
    this.value = alpha * x + (1 - alpha) * this.value;
    return this.value;
  }

  get last(): number {
    return this.value;
  }

  get hasValue(): boolean {
    return this.initialized;
  }

  reset(): void {
    this.initialized = false;
    this.value = 0;
  }
}

function smoothingAlpha(cutoff: number, dtSec: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dtSec);
}

/**
 * One Euro Filter (Casiez et al. 2012) for a single scalar channel.
 * Low speed → heavy smoothing (stable holds); high speed → light smoothing
 * (responsive transitions). The derivative itself is low-passed, which is
 * what distinguishes this from plain adaptive EMA.
 */
class OneEuroChannel {
  private x = new LowPassFilter();
  private dx = new LowPassFilter();

  constructor(
    private minCutoff: number,
    private beta: number,
    private dCutoff: number
  ) {}

  filter(value: number, dtSec: number): number {
    const rawDeriv = this.x.hasValue ? (value - this.x.last) / dtSec : 0;
    const smoothDeriv = this.dx.filter(
      rawDeriv,
      smoothingAlpha(this.dCutoff, dtSec)
    );
    const cutoff = this.minCutoff + this.beta * Math.abs(smoothDeriv);
    return this.x.filter(value, smoothingAlpha(cutoff, dtSec));
  }

  reset(): void {
    this.x.reset();
    this.dx.reset();
  }
}

export class OneEuroFilter {
  private xChannel: OneEuroChannel;
  private yChannel: OneEuroChannel;
  private lastTime = 0;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.xChannel = new OneEuroChannel(minCutoff, beta, dCutoff);
    this.yChannel = new OneEuroChannel(minCutoff, beta, dCutoff);
  }

  filter(value: Landmark, timestamp: number): Landmark {
    const dtSec =
      this.lastTime === 0
        ? 1 / 30
        : Math.max((timestamp - this.lastTime) / 1000, 1 / 120);
    this.lastTime = timestamp;

    return {
      x: this.xChannel.filter(value.x, dtSec),
      y: this.yChannel.filter(value.y, dtSec),
      z: value.z,
      visibility: value.visibility,
    };
  }

  reset(): void {
    this.lastTime = 0;
    this.xChannel.reset();
    this.yChannel.reset();
  }
}

export interface SmootherTuning {
  minCutoff?: number;
  beta?: number;
  dCutoff?: number;
}

export class PoseSmoother {
  private filters = new Map<string, OneEuroFilter>();
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  constructor(tuning: SmootherTuning = {}) {
    this.minCutoff = tuning.minCutoff ?? 1.0;
    this.beta = tuning.beta ?? 0.007;
    this.dCutoff = tuning.dCutoff ?? 1.0;
  }

  smoothLandmarks(
    landmarks: Record<string, Landmark | null>,
    timestamp: number
  ): Record<string, Landmark | null> {
    const out: Record<string, Landmark | null> = {};

    for (const [key, lm] of Object.entries(landmarks)) {
      if (!lm) {
        out[key] = null;
        this.filters.delete(key);
        continue;
      }

      let filter = this.filters.get(key);
      if (!filter) {
        filter = new OneEuroFilter(this.minCutoff, this.beta, this.dCutoff);
        this.filters.set(key, filter);
      }
      out[key] = filter.filter(lm, timestamp);
    }

    return out;
  }

  smoothHands(hands: HandLandmarks, timestamp: number): HandLandmarks {
    return {
      left: hands.left
        ? this.smoothPointSeries("left", hands.left, timestamp)
        : null,
      right: hands.right
        ? this.smoothPointSeries("right", hands.right, timestamp)
        : null,
    };
  }

  private smoothPointSeries(
    side: "left" | "right",
    points: Landmark[],
    timestamp: number
  ): Landmark[] {
    return points.map((point, index) => {
      const key = `${side}_${index}`;
      let filter = this.filters.get(key);
      if (!filter) {
        filter = new OneEuroFilter(this.minCutoff, this.beta, this.dCutoff);
        this.filters.set(key, filter);
      }
      return filter.filter(point, timestamp);
    });
  }

  reset(): void {
    this.filters.clear();
  }
}

/** True when any joint jumps more than maxJumpRatio of body height in one frame. */
export function rejectOutliers(
  prev: Record<string, Landmark | null> | null,
  curr: Record<string, Landmark | null>,
  maxJumpRatio?: number
): boolean {
  if (!prev) return false;

  const ctx = getDistanceContext(curr);
  const jumpRatio = maxJumpRatio ?? ctx.outlierJumpRatio;

  const bodyHeight = estimateBodyHeight(curr);
  if (bodyHeight <= 0) return false;

  for (const key of Object.keys(curr)) {
    const a = prev[key];
    const b = curr[key];
    if (!a || !b) continue;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    if (dist / bodyHeight > jumpRatio) return true;
  }
  return false;
}

function estimateBodyHeight(lm: Record<string, Landmark | null>): number {
  const nose = lm.nose;
  const lAnkle = lm.leftAnkle;
  const rAnkle = lm.rightAnkle;
  if (!nose || (!lAnkle && !rAnkle)) return 0;
  const ankleY = Math.max(lAnkle?.y ?? -Infinity, rAnkle?.y ?? -Infinity);
  return Math.abs(ankleY - nose.y);
}
