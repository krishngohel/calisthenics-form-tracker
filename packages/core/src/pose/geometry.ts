import type { Landmark } from "./provider";
import { getDistanceContext } from "./distance";

export type Body = Record<string, Landmark | null>;
export type Side = "left" | "right";

/*
 * Units
 * -----
 * Rules measure positions in **body units**: fractions of the athlete's torso
 * length (shoulder midpoint → hip midpoint), written `T`. That makes every
 * threshold independent of how far the athlete is from the camera, the frame
 * size, and the video aspect ratio.
 *
 * Coordinates must be *isotropic* (see `toIsotropic`) before any angle or
 * distance is computed. Normalized 0–1 landmarks squash the x axis on
 * landscape frames and turn a true 135° elbow into ~150°.
 */

/** Anthropometric fallback: torso ≈ 0.3 × standing height (nose → ankle). */
const TORSO_TO_HEIGHT = 0.3;
/** Last-resort body unit when neither torso nor height is measurable. */
const FALLBACK_BODY_UNIT = 0.2;

/** Scale x by the frame aspect (width / height) so x and y share units. */
export function toIsotropic(body: Body, aspect: number): Body {
  if (!(aspect > 0) || aspect === 1) return body;
  const out: Body = {};
  for (const [key, lm] of Object.entries(body)) {
    out[key] = lm ? { ...lm, x: lm.x * aspect } : null;
  }
  return out;
}

/** Torso length `T` — the body unit every threshold is expressed in. */
export function bodyUnit(lm: Body): number {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const hip = midpoint(lm.leftHip, lm.rightHip);
  if (shoulder && hip) {
    const torso = Math.hypot(shoulder.x - hip.x, shoulder.y - hip.y);
    if (torso > 0.02) return torso;
  }
  const nose = lm.nose;
  const ankle = midpoint(lm.leftAnkle, lm.rightAnkle);
  if (nose && ankle) {
    const height = Math.hypot(nose.x - ankle.x, nose.y - ankle.y);
    if (height > 0.05) return height * TORSO_TO_HEIGHT;
  }
  return FALLBACK_BODY_UNIT;
}

/**
 * Linear score from 0 (at `fail`) to 100 (at `pass`), clamped. Works in
 * either direction, so `ramp(elbow, 120, 165)` and `ramp(elbow, 165, 120)`
 * both make sense.
 */
export function ramp(value: number, fail: number, pass: number): number {
  if (fail === pass) return value === pass ? 100 : 0;
  const t = (value - fail) / (pass - fail);
  return Math.round(100 * Math.max(0, Math.min(1, t)));
}

export function getLandmark(lm: Body, key: string): Landmark | null {
  return lm[key] ?? null;
}

export function angleAtJoint(a: Landmark, b: Landmark, c: Landmark): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };
  const dot = ba.x * bc.x + ba.y * bc.y;
  const magBa = Math.hypot(ba.x, ba.y);
  const magBc = Math.hypot(bc.x, bc.y);
  if (magBa === 0 || magBc === 0) return 0;
  const cos = Math.max(-1, Math.min(1, dot / (magBa * magBc)));
  return (Math.acos(cos) * 180) / Math.PI;
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

function jointConfidence(lm: Body, keys: string[]): number {
  let min = Infinity;
  for (const key of keys) {
    const p = lm[key];
    if (!p) return 0;
    min = Math.min(min, p.visibility ?? 1);
  }
  return min === Infinity ? 0 : min;
}

/** Sides are "equally visible" within this confidence gap. */
const SIDE_TIE_MARGIN = 0.12;

function sideJoints(side: Side, chain: [string, string, string]): string[] {
  return chain.map((name) => `${side}${name}`);
}

/**
 * Joint angle for the side the camera can actually see. In a side view the
 * far-side joints are occluded and hallucinated; averaging or min-ing them
 * with the near side corrupts the measurement. When both sides are equally
 * confident (front view) the smaller angle is returned — the conservative
 * choice for "did the elbow bend enough" style rules.
 */
export function visibleJointAngle(
  lm: Body,
  chain: [string, string, string],
  missing = 180
): number {
  const left = sideJoints("left", chain);
  const right = sideJoints("right", chain);
  const cl = jointConfidence(lm, left);
  const cr = jointConfidence(lm, right);
  const angle = (keys: string[]) =>
    angleAtJoint(lm[keys[0]]!, lm[keys[1]]!, lm[keys[2]]!);

  if (cl === 0 && cr === 0) return missing;
  if (cl === 0) return angle(right);
  if (cr === 0) return angle(left);
  if (Math.abs(cl - cr) > SIDE_TIE_MARGIN) return angle(cl > cr ? left : right);
  return Math.min(angle(left), angle(right));
}

export function elbowFlexion(lm: Body, side: Side): number {
  const shoulder = getLandmark(lm, `${side}Shoulder`);
  const elbow = getLandmark(lm, `${side}Elbow`);
  const wrist = getLandmark(lm, `${side}Wrist`);
  if (!shoulder || !elbow || !wrist) return 180;
  return angleAtJoint(shoulder, elbow, wrist);
}

export function kneeFlexion(lm: Body, side: Side): number {
  const hip = getLandmark(lm, `${side}Hip`);
  const knee = getLandmark(lm, `${side}Knee`);
  const ankle = getLandmark(lm, `${side}Ankle`);
  if (!hip || !knee || !ankle) return 180;
  return angleAtJoint(hip, knee, ankle);
}

/** Elbow angle on the visible side (see `visibleJointAngle`). */
export function elbowAngle(lm: Body): number {
  return visibleJointAngle(lm, ["Shoulder", "Elbow", "Wrist"]);
}

/** Knee angle on the visible side (see `visibleJointAngle`). */
export function kneeAngle(lm: Body): number {
  return visibleJointAngle(lm, ["Hip", "Knee", "Ankle"]);
}

/** Hip angle (shoulder–hip–knee) on the visible side. */
export function hipAngle(lm: Body): number {
  return visibleJointAngle(lm, ["Shoulder", "Hip", "Knee"]);
}

/** Shoulder–hip–ankle angle; 180 = perfectly straight body. */
export function bodyLineDeviation(lm: Body): number {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const hip = midpoint(lm.leftHip, lm.rightHip);
  const ankle = midpoint(lm.leftAnkle, lm.rightAnkle);
  if (!shoulder || !hip || !ankle) return 180;
  return angleAtJoint(shoulder, hip, ankle);
}

/** Feet above shoulders and above hands, hands roughly at or below shoulders. */
export function isInverted(lm: Body): boolean {
  const T = bodyUnit(lm);
  const ankle = midpoint(lm.leftAnkle, lm.rightAnkle);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  if (!ankle || !wrist || !shoulder) return false;
  return (
    ankle.y < shoulder.y - 0.25 * T &&
    ankle.y < wrist.y - 0.2 * T &&
    wrist.y > shoulder.y - 0.1 * T
  );
}

/**
 * True when the athlete is in a loaded support position (dip bar, push-up,
 * planche lean), not standing with arms relaxed at the sides.
 */
export function inWeightSupportPosition(lm: Body): boolean {
  const T = bodyUnit(lm);
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  const hip = midpoint(lm.leftHip, lm.rightHip);
  if (!shoulder || !wrist || !hip) return false;

  // Hands well below the shoulders …
  if (wrist.y - shoulder.y < 0.4 * T) return false;
  // … and not simply dangling at hip height like relaxed standing arms.
  if (Math.abs(wrist.y - hip.y) < 0.3 * T) return false;
  return true;
}

/** Fraction of the shoulder→ankle line that is horizontal (0 vertical, 1 flat). */
export function horizontalBodyScore(lm: Body): number {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const ankle = midpoint(lm.leftAnkle, lm.rightAnkle);
  if (!shoulder || !ankle) return 0;
  const dx = Math.abs(shoulder.x - ankle.x);
  const dy = Math.abs(shoulder.y - ankle.y);
  if (dx + dy === 0) return 0;
  return dx / (dx + dy);
}

/** Body is roughly horizontal (plank, lever, push-up hold). */
export function isHorizontalHold(lm: Body, threshold = 0.52): boolean {
  const ctx = getDistanceContext(lm);
  const adjusted = ctx.isFar ? threshold - 0.05 : threshold;
  return horizontalBodyScore(lm) >= adjusted;
}

/** Horizontal offset of the shoulders from the wrists, in body units (≥ 0). */
export function shoulderLeanOverWrists(lm: Body): number {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  if (!shoulder || !wrist) return 0;
  return Math.abs(shoulder.x - wrist.x) / bodyUnit(lm);
}

/** Vertical hang depth: how far the shoulders sit below the wrists, in body units. */
export function hangDepth(lm: Body): number {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  if (!shoulder || !wrist) return 0;
  return (shoulder.y - wrist.y) / bodyUnit(lm);
}

/** Straight-arm hang: shoulders well below the hands. */
export function isHanging(lm: Body): boolean {
  return hangDepth(lm) > 0.6;
}

/** Mean squared displacement of a landmark over `history`, in body units². */
export function landmarkVariance(history: Body[], key: string): number {
  const pts = history.map((h) => h[key]).filter((p): p is Landmark => p !== null && p !== undefined);
  if (pts.length < 2) return 0;
  const T = bodyUnit(history[history.length - 1]);
  const avgX = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const avgY = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const variance =
    pts.reduce((s, p) => s + (p.x - avgX) ** 2 + (p.y - avgY) ** 2, 0) / pts.length;
  return variance / (T * T);
}

export function visibilityScore(lm: Body, keys: string[]): number {
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

/** Shoulders elevated toward the ears — poor scapular depression. */
export function shouldersShrugged(lm: Body): boolean {
  const nose = lm.nose;
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  if (!nose || !shoulder) return false;
  return shoulder.y - nose.y < 0.2 * bodyUnit(lm);
}

/** Chin clears the bar but the chest stayed low — "chicken necking". */
export function chickenNecking(lm: Body): boolean {
  const T = bodyUnit(lm);
  const nose = lm.nose;
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  if (!nose || !shoulder || !wrist) return false;
  const chinAbove = nose.y < wrist.y + 0.15 * T;
  const chestLow = shoulder.y > wrist.y - 0.15 * T;
  return chinAbove && chestLow;
}

/** Excessive arch when inverted (banana handstand). */
export function invertedArch(lm: Body): boolean {
  if (!isInverted(lm)) return false;
  return bodyLineDeviation(lm) < 158;
}

/** Shoulders stacked over the hands when inverted, in body units of offset. */
export function shoulderStackOffset(lm: Body): number {
  const shoulder = midpoint(lm.leftShoulder, lm.rightShoulder);
  const wrist = midpoint(lm.leftWrist, lm.rightWrist);
  if (!shoulder || !wrist) return Infinity;
  return Math.abs(shoulder.x - wrist.x) / bodyUnit(lm);
}
