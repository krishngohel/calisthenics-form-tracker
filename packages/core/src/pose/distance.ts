import type { Landmark } from "./provider";

/** Normalized nose-to-ankle span in frame (0–1). Smaller = farther from camera. */
export interface DistanceContext {
  bodySpan: number;
  /** False when too few core landmarks are present to reason about distance. */
  bodyDetected: boolean;
  /** Athlete occupies less than ~55% of frame height — typical when stepping back for FOV. */
  isFar: boolean;
  /** Minimum average landmark visibility to accept a frame. */
  visThreshold: number;
  /** Max edge length when capturing frames for pose inference. */
  captureMaxEdge: number;
  /** Outlier jump threshold as a ratio of body height. */
  outlierJumpRatio: number;
}

const NEAR_CONTEXT: Omit<DistanceContext, "bodySpan" | "bodyDetected"> = {
  isFar: false,
  visThreshold: 0.4,
  captureMaxEdge: 640,
  outlierJumpRatio: 0.22,
};

/** Body span assumed when the frame has no usable body landmarks. */
export const FALLBACK_BODY_SPAN = 0.65;

/** Ideal body height in frame — full body visible with room to move. */
export const TARGET_BODY_SPAN = 0.68;
/** Below this the athlete is too small in frame → zoom in / narrower lens. */
export const FRAMING_ZOOM_IN_BODY_SPAN = 0.56;
/** Above this the frame is too tight → zoom out / wider lens. */
export const FRAMING_ZOOM_OUT_BODY_SPAN = 0.76;

export type CameraFacingMode = "user" | "environment";

export interface ZoomRange {
  min: number;
  max: number;
  step: number;
}

/**
 * Compute a new zoom level to frame the full body with movement margin.
 * Returns null when framing is already in the sweet spot or change is negligible.
 */
export function recommendBackCameraZoom(
  bodySpan: number,
  currentZoom: number,
  range: ZoomRange
): number | null {
  if (bodySpan >= FRAMING_ZOOM_IN_BODY_SPAN && bodySpan <= FRAMING_ZOOM_OUT_BODY_SPAN) {
    return null;
  }

  const raw = currentZoom * (TARGET_BODY_SPAN / bodySpan);
  const step = range.step > 0 ? range.step : 0.05;
  const snapped = Math.round(raw / step) * step;
  const next = Math.min(range.max, Math.max(range.min, snapped));

  if (Math.abs(next - currentZoom) < step * 0.5) return null;
  return next;
}

/** Wider lens when zoom is already at minimum but the frame is still too tight. */
export function shouldSwitchToWiderLens(
  bodySpan: number,
  currentZoom: number,
  range: ZoomRange
): boolean {
  return bodySpan > FRAMING_ZOOM_OUT_BODY_SPAN && currentZoom <= range.min + range.step;
}

/** Narrower lens when zoom is already at maximum but the athlete is still too small. */
export function shouldSwitchToNarrowerLens(
  bodySpan: number,
  currentZoom: number,
  range: ZoomRange
): boolean {
  return bodySpan < FRAMING_ZOOM_IN_BODY_SPAN && currentZoom >= range.max - range.step;
}

/** Coaching hint when hardware zoom / lens switching is unavailable (iOS Safari). */
export function recommendFramingGuidance(bodySpan: number): string | null {
  if (bodySpan > FRAMING_ZOOM_OUT_BODY_SPAN) {
    return "Step back — keep your full body in frame with room to move";
  }
  if (bodySpan < FRAMING_ZOOM_IN_BODY_SPAN) {
    return "Move closer or prop the phone farther away";
  }
  return null;
}

/**
 * Nose-to-farthest-ankle distance in normalized frame space, or null when
 * either end is missing. Using the straight-line distance (not just the
 * vertical span) keeps horizontal holds like planks and levers from being
 * mistaken for a distant athlete.
 */
function measureBodySpan(body: Record<string, Landmark | null>): number | null {
  const nose = body.nose;
  const ankles = [body.leftAnkle, body.rightAnkle].filter(
    (a): a is Landmark => !!a
  );
  if (!nose || ankles.length === 0) return null;
  return Math.max(...ankles.map((a) => Math.hypot(a.x - nose.x, a.y - nose.y)));
}

export function estimateBodySpan(
  body: Record<string, Landmark | null>
): number {
  return measureBodySpan(body) ?? FALLBACK_BODY_SPAN;
}

const CORE_KEYS = [
  "nose",
  "leftShoulder",
  "rightShoulder",
  "leftHip",
  "rightHip",
  "leftAnkle",
  "rightAnkle",
];

function countCoreLandmarks(body: Record<string, Landmark | null>): number {
  let count = 0;
  for (const key of CORE_KEYS) if (body[key]) count++;
  return count;
}

/**
 * Skill evaluators and auto-detect call this many times per frame for the
 * same landmark object, so results are memoized per body reference.
 */
const contextCache = new WeakMap<Record<string, Landmark | null>, DistanceContext>();

export function getDistanceContext(
  body: Record<string, Landmark | null>
): DistanceContext {
  const cached = contextCache.get(body);
  if (cached) return cached;
  const ctx = computeDistanceContext(body);
  contextCache.set(body, ctx);
  return ctx;
}

function computeDistanceContext(
  body: Record<string, Landmark | null>
): DistanceContext {
  const measured = measureBodySpan(body);
  const bodyDetected = measured !== null && countCoreLandmarks(body) >= 4;
  const bodySpan = measured ?? FALLBACK_BODY_SPAN;
  const isFar = bodyDetected && bodySpan < FRAMING_ZOOM_IN_BODY_SPAN;

  if (!isFar) return { ...NEAR_CONTEXT, bodySpan, bodyDetected };

  // Farther away → lower confidence landmarks and noisier geometry.
  return {
    bodySpan,
    bodyDetected,
    isFar: true,
    visThreshold: bodySpan < 0.42 ? 0.22 : bodySpan < 0.5 ? 0.26 : 0.3,
    captureMaxEdge: bodySpan < 0.42 ? 1280 : bodySpan < 0.5 ? 1024 : 960,
    outlierJumpRatio: 0.32,
  };
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Frames in the median window when the athlete is close / far. */
const NEAR_MEDIAN_WINDOW = 3;
const FAR_MEDIAN_WINDOW = 7;

/**
 * Median of a measurement over the most recent frames. A short window damps
 * single-frame jitter at ~1 frame of latency; a longer one is used when the
 * body is small in frame and landmarks are noisier.
 */
export function stableAngle(
  history: Record<string, Landmark | null>[],
  body: Record<string, Landmark | null>,
  measure: (frame: Record<string, Landmark | null>) => number
): number {
  const current = measure(body);
  if (history.length < 2) return current;
  const ctx = getDistanceContext(body);
  const window = ctx.isFar ? FAR_MEDIAN_WINDOW : NEAR_MEDIAN_WINDOW;
  const values = history.slice(-(window - 1)).map(measure);
  values.push(current);
  return median(values);
}
