import type { Landmark } from "./provider";

/**
 * Pose models (MoveNet in particular) always emit every keypoint, even when a
 * joint is out of frame or occluded — those points carry a very low score and
 * an essentially random position. Geometry rules must not see them.
 */
export const MIN_GEOMETRY_CONFIDENCE = 0.15;

/** Null out landmarks whose confidence is below `min`. Returns a new object. */
export function dropLowConfidence(
  body: Record<string, Landmark | null>,
  min = MIN_GEOMETRY_CONFIDENCE
): Record<string, Landmark | null> {
  const out: Record<string, Landmark | null> = {};
  for (const [key, lm] of Object.entries(body)) {
    out[key] = lm && (lm.visibility ?? 1) >= min ? lm : null;
  }
  return out;
}
