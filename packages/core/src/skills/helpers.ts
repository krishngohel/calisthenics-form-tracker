import type { HandLandmarks, Landmark } from "../pose/provider";
import {
  elbowFlexion,
  bodyLineDeviation,
  bodyUnit,
  chickenNecking,
  elbowAngle,
  hangDepth,
  hipAngle,
  horizontalBodyScore,
  invertedArch,
  isHanging,
  isHorizontalHold,
  isInverted,
  kneeAngle,
  kneeFlexion,
  landmarkVariance,
  midpoint,
  ramp,
  shoulderLeanOverWrists,
  shoulderStackOffset,
  shouldersShrugged,
  visibilityScore,
  inWeightSupportPosition,
  type Body,
} from "../pose/geometry";
import { computeFormScore } from "../scoring/formScore";
import { getDistanceContext, stableAngle } from "../pose/distance";
import { CUES } from "./formPointers";
import type { FormMetric, SkillEvaluation } from "./registry";

/*
 * Threshold reference (body units, T = torso length ≈ 0.3 × height)
 * ------------------------------------------------------------------
 * Upper arm ≈ 0.65T, forearm ≈ 0.5T, full arm ≈ 1.15T, thigh/shank ≈ 0.85T,
 * nose→shoulder ≈ 0.35T. Every constant below is chosen against these.
 */

/**
 * Elbow lockout / straight-arm angle. Reference photos of clean straight-arm
 * holds measure 150–179° (camera perspective rarely shows a true 180°).
 */
export const LOCKED_ELBOW = 150;
/** Bottom of a pressing rep; photographed push-up bottoms measure 79–103°. */
export const DEEP_ELBOW = 110;
/** Top of a pressing rep; photographed lockouts measure 150–170°. */
export const TOP_ELBOW = 150;
/** Forearm plank: elbows on the floor, roughly a right angle. */
export const FOREARM_ELBOW = [60, 115] as const;
/** Knees considered straight. */
export const STRAIGHT_KNEE = 165;

export function baseEval(
  holdMet: boolean,
  perfectMet: boolean,
  metrics: FormMetric[],
  visibilityOk: boolean
): SkillEvaluation {
  const formScore = computeFormScore(holdMet, metrics);
  const liveCues = metrics.filter((m) => !m.passed && m.cue).map((m) => m.cue!);
  return {
    holdCriteriaMet: holdMet && visibilityOk,
    perfectCriteriaMet: perfectMet && visibilityOk,
    formScore,
    metrics,
    liveCues: liveCues.slice(0, 2),
    visibilityOk,
  };
}

/**
 * Visibility gate. Rules name left-side joints, but in a side view the far
 * side is occluded and scores low, so each key counts whichever side of the
 * pair is better seen.
 */
export function vis(body: Body, keys: string[]): boolean {
  const ctx = getDistanceContext(body);
  let total = 0;
  let count = 0;
  for (const key of keys) {
    const mirror = key.startsWith("left") ? `right${key.slice(4)}` : key.startsWith("right") ? `left${key.slice(5)}` : key;
    const a = body[key]?.visibility;
    const b = body[mirror]?.visibility;
    const best = Math.max(a ?? (body[key] ? 0.8 : 0), b ?? (body[mirror] ? 0.8 : 0));
    if (body[key] || body[mirror]) {
      total += best;
      count++;
    }
  }
  return count > 0 && total / count > ctx.visThreshold;
}

/** Median-filtered elbow angle on the visible side. */
export function elbow(body: Body, history: Body[]): number {
  return stableAngle(history, body, elbowAngle);
}

/** Median-filtered knee angle on the visible side. */
export function knee(body: Body, history: Body[]): number {
  return stableAngle(history, body, kneeAngle);
}

export function metric(
  id: string,
  label: string,
  passed: boolean,
  score: number,
  cue?: string
): FormMetric {
  return { id, label, passed, score: Math.round(score), cue };
}

/** Boolean metric with a fixed fail score. */
export function flag(id: string, label: string, passed: boolean, cue?: string, failScore = 45): FormMetric {
  return metric(id, label, passed, passed ? 100 : failScore, cue);
}

export function ankleSpread(body: Body): number {
  const l = body.leftAnkle;
  const r = body.rightAnkle;
  if (!l || !r) return 0;
  return Math.abs(l.x - r.x) / bodyUnit(body);
}

/** Torso is upright: shoulders stacked over hips (offset in body units). */
export function torsoLeanOffset(body: Body): number {
  const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
  const hip = midpoint(body.leftHip, body.rightHip);
  if (!shoulder || !hip) return Infinity;
  return Math.abs(shoulder.x - hip.x) / bodyUnit(body);
}

/**
 * Scapular depression relative to the athlete's own passive hang: the deepest
 * hang seen recently is the baseline, and an active pull shortens it.
 */
export const SCAP_PULL_MIN_FRAMES = 5;
export const SCAP_PULL_LIFT = 0.12;

export function scapularLift(body: Body, history: Body[]): number {
  if (history.length < SCAP_PULL_MIN_FRAMES) return 0;
  let deepest = 0;
  for (const frame of history) deepest = Math.max(deepest, hangDepth(frame));
  return deepest - hangDepth(body);
}

// ---------------------------------------------------------------------------

export function pressingHold(
  body: Body,
  history: Body[],
  mode: "hold_only" | "perfect",
  opts: { horizontal: boolean; cues: { bottom: string; top: string } }
): SkillEvaluation {
  const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist"]);
  const angle = elbow(body, history);
  const inSupport = inWeightSupportPosition(body);
  const horiz = !opts.horizontal || isHorizontalHold(body);
  const positioned = inSupport && horiz;
  const atBottom = positioned && angle < DEEP_ELBOW;
  const atTop = positioned && angle > TOP_ELBOW;
  const holdMet = atBottom || atTop;
  const metrics: FormMetric[] = [
    metric(
      "position",
      "Hold position",
      holdMet,
      holdMet ? (atBottom ? 95 : 85) : positioned ? 40 : 20,
      atTop ? opts.cues.top : opts.cues.bottom
    ),
  ];
  if (mode === "perfect") {
    metrics.push(
      metric("depth", "Bottom depth", angle < DEEP_ELBOW, atTop ? 70 : ramp(angle, 150, DEEP_ELBOW), opts.cues.bottom)
    );
  }
  return baseEval(holdMet, holdMet && (angle < DEEP_ELBOW || atTop), metrics, ok);
}

export function plancheHold(
  body: Body,
  history: Body[],
  mode: "hold_only" | "perfect",
  opts: {
    minLean: number;
    minHoriz: number;
    legs: (body: Body, history: Body[]) => { passed: boolean; score: number; metric: Omit<FormMetric, "passed" | "score"> } | null;
    cues: { horizontal: string; lean: string; elbows: string };
    horizontalLabel: string;
  }
): SkillEvaluation {
  const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip"]);
  const lean = shoulderLeanOverWrists(body);
  const horiz = horizontalBodyScore(body);
  const angle = elbow(body, history);
  const locked = angle > LOCKED_ELBOW;
  const leanOk = lean > opts.minLean;
  const horizOk = horiz > opts.minHoriz;
  const legs = opts.legs(body, history);
  const legsOk = legs ? legs.passed : true;
  const holdMet = leanOk && horizOk && legsOk && locked;
  const metrics: FormMetric[] = [
    metric("horizontal", opts.horizontalLabel, horizOk, ramp(horiz, opts.minHoriz - 0.35, opts.minHoriz), opts.cues.horizontal),
    metric("lean", "Shoulder lean", leanOk, ramp(lean, 0, opts.minLean), opts.cues.lean),
  ];
  if (legs) metrics.push({ ...legs.metric, passed: legs.passed, score: Math.round(legs.score) });
  if (mode === "perfect") {
    metrics.push(metric("elbows", "Elbow lock", locked, ramp(angle, 140, LOCKED_ELBOW), opts.cues.elbows));
  }
  return baseEval(holdMet, holdMet, metrics, ok);
}


// ---------------------------------------------------------------------------
// Shared measurements for the expanded skill set.

/** Vertical offset of `a` above `b` in body units (positive = a is higher). */
export function above(a: { y: number } | null, b: { y: number } | null, body: Body): number {
  if (!a || !b) return -Infinity;
  return (b.y - a.y) / bodyUnit(body);
}

/** Torso is horizontal: shoulders and hips at the same height (offset in T). */
export function torsoLevelOffset(body: Body): number {
  const sh = midpoint(body.leftShoulder, body.rightShoulder);
  const hip = midpoint(body.leftHip, body.rightHip);
  if (!sh || !hip) return Infinity;
  return Math.abs(sh.y - hip.y) / bodyUnit(body);
}

/**
 * Where the hands sit along the body axis while hanging: positive when the
 * wrists are displaced from the shoulders toward the hips (hands behind the
 * body, as in a back lever or German hang), ~0 for a front lever or hang.
 */
export function handsBehindOffset(body: Body): number {
  const sh = midpoint(body.leftShoulder, body.rightShoulder);
  const hip = midpoint(body.leftHip, body.rightHip);
  const wrist = midpoint(body.leftWrist, body.rightWrist);
  if (!sh || !hip || !wrist) return 0;
  const T = bodyUnit(body);
  const axisX = hip.x - sh.x;
  const axisY = hip.y - sh.y;
  const len = Math.hypot(axisX, axisY) || 1;
  // Project the shoulder→wrist vector onto the shoulder→hip axis.
  return ((wrist.x - sh.x) * axisX + (wrist.y - sh.y) * axisY) / len / T;
}

/** Horizontal wrist separation in body units (front view). */
export function wristSpread(body: Body): number {
  const l = body.leftWrist;
  const r = body.rightWrist;
  if (!l || !r) return Infinity;
  return Math.abs(l.x - r.x) / bodyUnit(body);
}

/** Per-side knee angles as [smaller, larger]. */
export function kneePair(body: Body): [number, number] {
  const l = kneeFlexion(body, "left");
  const r = kneeFlexion(body, "right");
  return l <= r ? [l, r] : [r, l];
}

/** Per-side elbow angles as [smaller, larger]. */
export function elbowPair(body: Body): [number, number] {
  const l = elbowFlexion(body, "left");
  const r = elbowFlexion(body, "right");
  return l <= r ? [l, r] : [r, l];
}
