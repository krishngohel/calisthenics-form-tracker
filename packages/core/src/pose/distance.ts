import type { Landmark } from "./provider";

/** Normalized nose-to-ankle span in frame (0–1). Smaller = farther from camera. */
export interface DistanceContext {
  bodySpan: number;
  /** Athlete occupies less than ~55% of frame height — typical when stepping back for FOV. */
  isFar: boolean;
  /** Multiply geometric margins by this when comparing landmark positions. */
  marginScale: number;
  /** Minimum average landmark visibility to accept a frame. */
  visThreshold: number;
  /** Max edge length when capturing frames for pose inference. */
  captureMaxEdge: number;
  /** Outlier jump threshold as a ratio of body height. */
  outlierJumpRatio: number;
}

const DEFAULT_CONTEXT: DistanceContext = {
  bodySpan: 0.65,
  isFar: false,
  marginScale: 1,
  visThreshold: 0.4,
  captureMaxEdge: 640,
  outlierJumpRatio: 0.22,
};

export function estimateBodySpan(
  body: Record<string, Landmark | null>
): number {
  const nose = body.nose;
  const lAnkle = body.leftAnkle;
  const rAnkle = body.rightAnkle;
  if (!nose || (!lAnkle && !rAnkle)) return DEFAULT_CONTEXT.bodySpan;
  const ankleY = Math.max(lAnkle?.y ?? -Infinity, rAnkle?.y ?? -Infinity);
  return Math.abs(ankleY - nose.y);
}

/** Bounding-box area of core body landmarks in normalized space. */
export function estimateBodyOccupancy(
  body: Record<string, Landmark | null>
): number {
  const keys = [
    "nose",
    "leftShoulder",
    "rightShoulder",
    "leftHip",
    "rightHip",
    "leftAnkle",
    "rightAnkle",
  ];
  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  let count = 0;
  for (const key of keys) {
    const p = body[key];
    if (!p) continue;
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    count++;
  }
  if (count < 4) return 0.3;
  return (maxX - minX) * (maxY - minY);
}

export function getDistanceContext(
  body: Record<string, Landmark | null>
): DistanceContext {
  const bodySpan = estimateBodySpan(body);
  const occupancy = estimateBodyOccupancy(body);
  const isFar = bodySpan < 0.56 || occupancy < 0.22;

  if (!isFar) return DEFAULT_CONTEXT;

  // Farther away → lower confidence landmarks and noisier geometry.
  const farFactor = Math.max(0.55, Math.min(1, bodySpan / 0.56));

  return {
    bodySpan,
    isFar: true,
    marginScale: 0.72 + farFactor * 0.28,
    visThreshold: bodySpan < 0.42 ? 0.22 : bodySpan < 0.5 ? 0.26 : 0.3,
    captureMaxEdge: bodySpan < 0.42 ? 1280 : bodySpan < 0.5 ? 1024 : 960,
    outlierJumpRatio: 0.32,
  };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Median angle over recent frames to damp jitter when the body is small in frame. */
export function stableAngle(
  history: Record<string, Landmark | null>[],
  body: Record<string, Landmark | null>,
  measure: (frame: Record<string, Landmark | null>) => number
): number {
  const ctx = getDistanceContext(body);
  const current = measure(body);
  if (!ctx.isFar || history.length < 3) return current;

  const window = history.slice(-6).map(measure);
  window.push(current);
  return median(window);
}

export function stableMidpointY(
  history: Record<string, Landmark | null>[],
  body: Record<string, Landmark | null>,
  pick: (frame: Record<string, Landmark | null>) => Landmark | null
): number | null {
  const ctx = getDistanceContext(body);
  const current = pick(body);
  if (!current) return null;
  if (!ctx.isFar || history.length < 3) return current.y;

  const ys = history
    .slice(-6)
    .map((frame) => pick(frame)?.y)
    .filter((y): y is number => y != null);
  ys.push(current.y);
  return median(ys);
}

/** Temporal gate so brief pose glitches do not flip hold state. */
export class HoldCriteriaFilter {
  private recent: boolean[] = [];
  private windowSize = 8;
  private minTrue = 5;

  configure(ctx: DistanceContext): void {
    if (ctx.isFar) {
      this.windowSize = 10;
      this.minTrue = 7;
    } else {
      this.windowSize = 8;
      this.minTrue = 5;
    }
  }

  push(raw: boolean, ctx: DistanceContext): boolean {
    this.configure(ctx);
    this.recent.push(raw);
    while (this.recent.length > this.windowSize) this.recent.shift();
    const trueCount = this.recent.filter(Boolean).length;
    return trueCount >= this.minTrue;
  }

  reset(): void {
    this.recent = [];
  }
}
