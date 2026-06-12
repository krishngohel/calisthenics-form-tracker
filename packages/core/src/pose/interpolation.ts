import type { HandLandmarks, Landmark } from "./provider";

export interface InterpolatedFrame {
  landmarks: Record<string, Landmark | null>;
  timestamp: number;
  alpha: number;
}

export interface InterpolateOptions {
  /** Predict slightly ahead of the latest detection to reduce visual lag. */
  extrapolateMs?: number;
}

function lerpLandmark(a: Landmark, b: Landmark, t: number): Landmark {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: (a.z ?? 0) + ((b.z ?? 0) - (a.z ?? 0)) * t,
    visibility:
      (a.visibility ?? 1) + ((b.visibility ?? 1) - (a.visibility ?? 1)) * t,
  };
}

function extrapolateLandmark(prev: Landmark, curr: Landmark, aheadMs: number, spanMs: number): Landmark {
  if (spanMs <= 0) return curr;
  const scale = aheadMs / spanMs;
  return {
    x: curr.x + (curr.x - prev.x) * scale,
    y: curr.y + (curr.y - prev.y) * scale,
    z: (curr.z ?? 0) + ((curr.z ?? 0) - (prev.z ?? 0)) * scale,
    visibility: curr.visibility,
  };
}

function interpolateLandmarkSeries(
  prev: Landmark[] | null,
  curr: Landmark[] | null,
  renderTime: number,
  prevTime: number,
  currTime: number,
  extrapolateMs: number
): Landmark[] | null {
  if (!curr) return null;
  if (!prev || currTime <= prevTime) return curr;

  const span = currTime - prevTime;
  let t = (renderTime - prevTime) / span;

  if (t > 1 && extrapolateMs > 0) {
    const ahead = Math.min(extrapolateMs, (renderTime - currTime));
    const count = Math.min(prev.length, curr.length);
    const out: Landmark[] = [];
    for (let i = 0; i < count; i++) {
      out.push(extrapolateLandmark(prev[i], curr[i], ahead, span));
    }
    return out;
  }

  t = Math.max(0, Math.min(1, t));
  const count = Math.min(prev.length, curr.length);
  const out: Landmark[] = [];
  for (let i = 0; i < count; i++) {
    out.push(lerpLandmark(prev[i], curr[i], t));
  }
  return out;
}

export class LandmarkInterpolator {
  private prev: Record<string, Landmark | null> | null = null;
  private curr: Record<string, Landmark | null> | null = null;
  private prevTime = 0;
  private currTime = 0;

  update(
    landmarks: Record<string, Landmark | null>,
    timestamp: number
  ): void {
    this.prev = this.curr;
    this.prevTime = this.currTime;
    this.curr = landmarks;
    this.currTime = timestamp;
  }

  interpolate(renderTime: number, options: InterpolateOptions = {}): InterpolatedFrame | null {
    const extrapolateMs = options.extrapolateMs ?? 40;
    if (!this.curr) return null;
    if (!this.prev || this.currTime <= this.prevTime) {
      return { landmarks: this.curr, timestamp: renderTime, alpha: 1 };
    }

    const span = this.currTime - this.prevTime;
    let t = (renderTime - this.prevTime) / span;
    const keys = new Set([
      ...Object.keys(this.prev),
      ...Object.keys(this.curr),
    ]);
    const out: Record<string, Landmark | null> = {};

    if (t > 1 && extrapolateMs > 0) {
      const ahead = Math.min(extrapolateMs, renderTime - this.currTime);
      for (const key of Array.from(keys)) {
        const a = this.prev[key];
        const b = this.curr[key];
        if (!a || !b) {
          out[key] = b ?? a ?? null;
        } else {
          out[key] = extrapolateLandmark(a, b, ahead, span);
        }
      }
      return { landmarks: out, timestamp: renderTime, alpha: 1 };
    }

    t = Math.max(0, Math.min(1, t));
    for (const key of Array.from(keys)) {
      const a = this.prev[key];
      const b = this.curr[key];
      if (!a && !b) {
        out[key] = null;
      } else if (!a) {
        out[key] = b;
      } else if (!b) {
        out[key] = a;
      } else {
        out[key] = lerpLandmark(a, b, t);
      }
    }

    return { landmarks: out, timestamp: renderTime, alpha: t };
  }

  reset(): void {
    this.prev = null;
    this.curr = null;
    this.prevTime = 0;
    this.currTime = 0;
  }
}

export class HandInterpolator {
  private prev: HandLandmarks | null = null;
  private curr: HandLandmarks | null = null;
  private prevTime = 0;
  private currTime = 0;

  update(hands: HandLandmarks, timestamp: number): void {
    this.prev = this.curr;
    this.prevTime = this.currTime;
    this.curr = hands;
    this.currTime = timestamp;
  }

  interpolate(renderTime: number, options: InterpolateOptions = {}): HandLandmarks | null {
    const extrapolateMs = options.extrapolateMs ?? 40;
    if (!this.curr) return null;

    return {
      left: interpolateLandmarkSeries(
        this.prev?.left ?? null,
        this.curr.left,
        renderTime,
        this.prevTime,
        this.currTime,
        extrapolateMs
      ),
      right: interpolateLandmarkSeries(
        this.prev?.right ?? null,
        this.curr.right,
        renderTime,
        this.prevTime,
        this.currTime,
        extrapolateMs
      ),
    };
  }

  reset(): void {
    this.prev = null;
    this.curr = null;
    this.prevTime = 0;
    this.currTime = 0;
  }
}
