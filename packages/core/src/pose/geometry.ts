import type { Landmark } from "./provider";
import { getDistanceContext } from "./distance";

export function getLandmark(
  lm: Record<string, Landmark | null>,
  key: string
): Landmark | null {
  return lm[key] ?? null;
}

export function angleAtJoint(
  a: Landmark,
  b: Landmark,
  c: Landmark
): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBa = Math.hypot(ba.x, ba.y);
  const magBc = Math.hypot(bc.x, bc.y);
  if (magBa === 0 || magBc === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magBa * magBc)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function bodyLineDeviation(
  lm: Record<string, Landmark | null>
): number {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const hip = midpoint(lm.leftHip, lm.rightHip);
  const ankle = midpoint(lm.leftAnkle, lm.rightAnkle);
  if (!shoulder || !hip || !ankle) return 180;
  return angleAtJoint(shoulder, hip, ankle);
}

export function isInverted(lm: Record<string, Landmark | null>): boolean {
  const { marginScale: m } = getDistanceContext(lm);
  const ankle = midpoint(lm.leftAnkle, lm.rightAnkle);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  if (!ankle || !wrist || !shoulder) return false;
  return (
    ankle.y < shoulder.y - 0.07 * m &&
    ankle.y < wrist.y - 0.05 * m &&
    wrist.y > shoulder.y - 0.02 * m
  );
}

/** Wrists are below shoulders in frame space (support / dip / push position). */
export function wristsBelowShoulders(
  lm: Record<string, Landmark | null>,
  margin = 0.04
): boolean {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  if (!shoulder || !wrist) return false;
  return wrist.y > shoulder.y + margin;
}

/**
 * True when the athlete is in a loaded support position (dip bar, push-up, etc.),
 * not standing with arms relaxed at the sides.
 */
export function inWeightSupportPosition(
  lm: Record<string, Landmark | null>
): boolean {
  const { marginScale: m, isFar } = getDistanceContext(lm);
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  const hip = midpoint(lm.leftHip, lm.rightHip);
  if (!shoulder || !wrist || !hip) return false;

  const armDrop = wrist.y - shoulder.y;
  if (armDrop < 0.12 * m) return false;

  const hipGap = isFar ? 0.07 : 0.09;
  if (Math.abs(wrist.y - hip.y) < hipGap * m) return false;

  return wrist.y > shoulder.y + 0.1 * m;
}

/** Body is roughly horizontal (plank, lever, push-up hold). */
export function isHorizontalHold(
  lm: Record<string, Landmark | null>,
  threshold = 0.52
): boolean {
  const ctx = getDistanceContext(lm);
  const adjusted = ctx.isFar ? threshold - 0.05 : threshold;
  return horizontalBodyScore(lm) >= adjusted;
}

export function horizontalBodyScore(
  lm: Record<string, Landmark | null>
): number {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const hip = midpoint(lm.leftHip, lm.rightHip);
  const ankle = midpoint(lm.leftAnkle, lm.rightAnkle);
  if (!shoulder || !hip || !ankle) return 0;
  const dx = Math.abs(shoulder.x - ankle.x);
  const dy = Math.abs(shoulder.y - ankle.y);
  if (dx + dy === 0) return 0;
  return dx / (dx + dy);
}

export function kneeFlexion(
  lm: Record<string, Landmark | null>,
  side: "left" | "right"
): number {
  const hip = getLandmark(lm, `${side}Hip`);
  const knee = getLandmark(lm, `${side}Knee`);
  const ankle = getLandmark(lm, `${side}Ankle`);
  if (!hip || !knee || !ankle) return 180;
  return angleAtJoint(hip, knee, ankle);
}

export function elbowFlexion(
  lm: Record<string, Landmark | null>,
  side: "left" | "right"
): number {
  const shoulder = getLandmark(lm, `${side}Shoulder`);
  const elbow = getLandmark(lm, `${side}Elbow`);
  const wrist = getLandmark(lm, `${side}Wrist`);
  if (!shoulder || !elbow || !wrist) return 180;
  return angleAtJoint(shoulder, elbow, wrist);
}

export function landmarkVariance(
  history: Record<string, Landmark | null>[],
  key: string
): number {
  const pts = history
    .map((h) => h[key])
    .filter((p): p is Landmark => p !== null);
  if (pts.length < 2) return 0;
  const avgX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const avgY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return (
    pts.reduce((s, p) => s + (p.x - avgX) ** 2 + (p.y - avgY) ** 2, 0) /
    pts.length
  );
}

export function visibilityScore(
  lm: Record<string, Landmark | null>,
  keys: string[]
): number {
  let total = 0;
  let count = 0;
  for (const key of keys) {
    const p = lm[key];
    if (p) {
      total += p.visibility ?? 0.8;
      count++;
    }
  }
  return count === 0 ? 0 : total / count;
}

export function midpoint(
  a: Landmark | null | undefined,
  b: Landmark | null | undefined
): Landmark | null {
  if (!a || !b) return a ?? b ?? null;
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: ((a.z ?? 0) + (b.z ?? 0)) / 2,
    visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1),
  };
}
