import type { HandLandmarks, Landmark } from "../pose/provider";
import {
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

export type SkillCategory = "upper" | "static" | "bosu" | "legs";
export type CameraAngle = "side" | "front" | "diagonal";

export interface FormMetric {
  id: string;
  label: string;
  score: number;
  passed: boolean;
  cue?: string;
}

export interface SkillEvaluation {
  holdCriteriaMet: boolean;
  perfectCriteriaMet: boolean;
  formScore: number;
  metrics: FormMetric[];
  liveCues: string[];
  visibilityOk: boolean;
  /** Present when the athlete is small in frame (stepped back for FOV). */
  farCamera?: boolean;
  /** Raw geometry behind the rules, for tuning against real footage. */
  measures?: RuleMeasures;
}

export interface RuleMeasures {
  /** Torso length in frame units (the body unit every threshold uses). */
  T: number;
  elbow: number;
  knee: number;
  hip: number;
  bodyLine: number;
  horizontal: number;
  hangDepth: number;
  lean: number;
  inverted: boolean;
  support: boolean;
  visibility: number;
}

const MEASURE_KEYS = ["nose", "leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftWrist", "rightWrist", "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle"];

export function measureBody(body: Body): RuleMeasures {
  return {
    T: Math.round(bodyUnit(body) * 1000) / 1000,
    elbow: Math.round(elbowAngle(body)),
    knee: Math.round(kneeAngle(body)),
    hip: Math.round(hipAngle(body)),
    bodyLine: Math.round(bodyLineDeviation(body)),
    horizontal: Math.round(horizontalBodyScore(body) * 100) / 100,
    hangDepth: Math.round(hangDepth(body) * 100) / 100,
    lean: Math.round(shoulderLeanOverWrists(body) * 100) / 100,
    inverted: isInverted(body),
    support: inWeightSupportPosition(body),
    visibility: Math.round(visibilityScore(body, MEASURE_KEYS) * 100) / 100,
  };
}

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  cameraAngle: CameraAngle;
  cameraGuide: string;
  needsHands: boolean;
  requiredLandmarks: string[];
  /**
   * Rule-based evaluator: pretrained pose landmarks → geometry → cues.
   * Landmarks must be isotropic (see `toIsotropic`); thresholds are in body
   * units (torso lengths) so they hold at any distance or frame size.
   */
  evaluate: (
    body: Body,
    hands: HandLandmarks,
    history: Body[],
    mode: "hold_only" | "perfect"
  ) => SkillEvaluation;
}

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
const LOCKED_ELBOW = 150;
/** Bottom of a pressing rep; photographed push-up bottoms measure 79–103°. */
const DEEP_ELBOW = 110;
/** Top of a pressing rep; photographed lockouts measure 150–170°. */
const TOP_ELBOW = 150;
/** Forearm plank: elbows on the floor, roughly a right angle. */
const FOREARM_ELBOW = [60, 115] as const;
/** Knees considered straight. */
const STRAIGHT_KNEE = 165;

function baseEval(
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
function vis(body: Body, keys: string[]): boolean {
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
function elbow(body: Body, history: Body[]): number {
  return stableAngle(history, body, elbowAngle);
}

/** Median-filtered knee angle on the visible side. */
function knee(body: Body, history: Body[]): number {
  return stableAngle(history, body, kneeAngle);
}

function metric(
  id: string,
  label: string,
  passed: boolean,
  score: number,
  cue?: string
): FormMetric {
  return { id, label, passed, score: Math.round(score), cue };
}

/** Boolean metric with a fixed fail score. */
function flag(id: string, label: string, passed: boolean, cue?: string, failScore = 45): FormMetric {
  return metric(id, label, passed, passed ? 100 : failScore, cue);
}

function ankleSpread(body: Body): number {
  const l = body.leftAnkle;
  const r = body.rightAnkle;
  if (!l || !r) return 0;
  return Math.abs(l.x - r.x) / bodyUnit(body);
}

/** Torso is upright: shoulders stacked over hips (offset in body units). */
function torsoLeanOffset(body: Body): number {
  const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
  const hip = midpoint(body.leftHip, body.rightHip);
  if (!shoulder || !hip) return Infinity;
  return Math.abs(shoulder.x - hip.x) / bodyUnit(body);
}

/**
 * Scapular depression relative to the athlete's own passive hang: the deepest
 * hang seen recently is the baseline, and an active pull shortens it.
 */
const SCAP_PULL_MIN_FRAMES = 5;
const SCAP_PULL_LIFT = 0.12;

function scapularLift(body: Body, history: Body[]): number {
  if (history.length < SCAP_PULL_MIN_FRAMES) return 0;
  let deepest = 0;
  for (const frame of history) deepest = Math.max(deepest, hangDepth(frame));
  return deepest - hangDepth(body);
}

// ---------------------------------------------------------------------------

function pressingHold(
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

function plancheHold(
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

export const SKILLS: SkillDefinition[] = [
  {
    id: "dead-hang",
    name: "Dead Hang",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view, full hang with straight arms and relaxed shoulders.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "nose"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "nose"]);
      const angle = elbow(body, history);
      const depth = hangDepth(body);
      const hanging = isHanging(body);
      const straightArms = angle > LOCKED_ELBOW;
      const depressed = !shouldersShrugged(body);
      const holdMet = hanging && straightArms;
      const metrics: FormMetric[] = [
        metric("hang_position", "Active hang", hanging, ramp(depth, 0, 0.6), CUES.basics.deadHang),
        metric("elbow_bend", "Straight arms", straightArms, ramp(angle, 120, LOCKED_ELBOW), CUES.basics.deadHang),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_depression", "Shoulders packed", depressed, CUES.basics.deadHang));
      }
      return baseEval(holdMet, holdMet && depressed, metrics, ok);
    },
  },
  {
    id: "scapular-pulls",
    name: "Scapular Pulls",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Hang passively first, then pull shoulders down without bending elbows.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "nose"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "nose"]);
      const angle = elbow(body, history);
      const hanging = isHanging(body);
      const straightArms = angle > LOCKED_ELBOW;
      const lift = scapularLift(body, history);
      const activeScap = lift >= SCAP_PULL_LIFT;
      const holdMet = hanging && straightArms && activeScap;
      const metrics: FormMetric[] = [
        metric("hang_position", "Hang setup", hanging, ramp(hangDepth(body), 0, 0.6), CUES.basics.scapPull),
        metric("elbow_bend", "Straight elbows", straightArms, ramp(angle, 120, LOCKED_ELBOW), CUES.basics.scapPull),
        metric("active_scap", "Scapular depression", activeScap, ramp(lift, 0, SCAP_PULL_LIFT), CUES.basics.scapPull),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_depression", "No shrug", !shouldersShrugged(body), CUES.basics.scapPull));
      }
      return baseEval(holdMet, holdMet && !shouldersShrugged(body), metrics, ok);
    },
  },
  {
    id: "plank-hold",
    name: "Plank Hold",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view, straight line from head to heels.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip"]);
      const angle = elbow(body, history);
      const horiz = isHorizontalHold(body);
      const inSupport = inWeightSupportPosition(body);
      const line = bodyLineDeviation(body);
      // Reference planks: body line 168–179° for a straight plank; sagging/piked ones sit below 160°.
      const straightLine = line > 160;
      const lockedElbows = angle > LOCKED_ELBOW;
      const forearm = angle >= FOREARM_ELBOW[0] && angle <= FOREARM_ELBOW[1];
      const armsOk = lockedElbows || forearm;
      const holdMet = horiz && inSupport && armsOk;
      const metrics: FormMetric[] = [
        metric("horizontal", "Plank position", horiz && inSupport, horiz && inSupport ? 100 : ramp(horizontalBodyScore(body), 0.1, 0.52) * 0.6, CUES.basics.plank),
        metric("plank_line", "Body line", straightLine, ramp(line, 135, 160), CUES.basics.plank),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbow_bend", "Arms set", armsOk, armsOk ? 100 : 50, CUES.pushUps.topLockout));
      }
      return baseEval(holdMet, holdMet && straightLine, metrics, ok);
    },
  },
  {
    id: "pull-ups",
    name: "Pull-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Stand sideways, full body in frame, chin to bar visible.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "nose"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "nose"]);
      const T = bodyUnit(body);
      const angle = elbow(body, history);
      const nose = body.nose;
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const chinRise = nose && wrist ? (wrist.y - nose.y) / T : -Infinity; // > 0 when chin above hands
      const chinAbove = chinRise > -0.15;
      const flexed = angle < 120;
      const holdMet = flexed && chinAbove;
      const line = bodyLineDeviation(body);
      const hollow = line > 155;
      const packedShoulders = !shouldersShrugged(body);
      const noNeckReach = !chickenNecking(body);
      const metrics: FormMetric[] = [
        metric("chin_height", "Chin above bar", chinAbove, ramp(chinRise, -1, -0.15), CUES.pullUps.chinHeight),
        metric("elbow_bend", "Elbow flexion", flexed, ramp(angle, 175, 120), CUES.pullUps.elbowFlex),
      ];
      if (mode === "perfect") {
        metrics.push(
          metric("hollow", "Hollow body", hollow, ramp(line, 120, 155), CUES.pullUps.hollow),
          flag("scap_init", "Scapular depression", packedShoulders, CUES.pullUps.scapInit),
          flag("no_chicken_neck", "Chest-driven top", noNeckReach, CUES.pullUps.chinHeight, 40)
        );
      }
      return baseEval(holdMet, holdMet && hollow && packedShoulders && noNeckReach, metrics, ok);
    },
  },
  {
    id: "chin-ups",
    name: "Chin-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Same as pull-ups; select chin-up variant in setup.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "nose"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "nose"]);
      const T = bodyUnit(body);
      const angle = elbow(body, history);
      const nose = body.nose;
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const chinRise = nose && wrist ? (wrist.y - nose.y) / T : -Infinity;
      const holdMet = angle < 120 && chinRise > -0.15;
      const sway = history.length > 5 ? landmarkVariance(history.slice(-10), "leftHip") : 0;
      const noSwing = sway < 0.02;
      const packedShoulders = !shouldersShrugged(body);
      const metrics: FormMetric[] = [
        metric("top_position", "Top hold", holdMet, holdMet ? 100 : Math.min(ramp(angle, 175, 120), ramp(chinRise, -1, -0.15)) * 0.6, CUES.chinUps.topHold),
      ];
      if (mode === "perfect") {
        metrics.push(
          metric("no_swing", "Minimal swing", noSwing, ramp(sway, 0.08, 0.02), CUES.chinUps.noKip),
          flag("scap_init", "Packed shoulders", packedShoulders, CUES.chinUps.scapInit)
        );
      }
      return baseEval(holdMet, holdMet && noSwing && packedShoulders, metrics, ok);
    },
  },
  {
    id: "dips",
    name: "Dips",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view, shoulders and elbows visible.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    evaluate(body, _hands, history, mode) {
      return pressingHold(body, history, mode, {
        horizontal: false,
        cues: { bottom: CUES.dips.bottomDepth, top: CUES.dips.topLockout },
      });
    },
  },
  {
    id: "push-ups",
    name: "Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view, shoulders and elbows visible.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    evaluate(body, _hands, history, mode) {
      return pressingHold(body, history, mode, {
        horizontal: true,
        cues: { bottom: CUES.pushUps.bottomDepth, top: CUES.pushUps.topLockout },
      });
    },
  },
  {
    id: "muscle-up",
    name: "Muscle-Up",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view for transition phase detection.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftElbow"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist"]);
      const T = bodyUnit(body);
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      // Chest at bar height: wrists roughly level with the shoulders, well below a hang.
      const rel = wrist && shoulder ? (shoulder.y - wrist.y) / T : Infinity;
      const transition = rel > -0.15 && rel < 0.5;
      const angle = elbow(body, history);
      const lowKip = angle > 80;
      const metrics: FormMetric[] = [
        metric("transition", "Transition hold", transition, transition ? 100 : ramp(Math.abs(rel - 0.15), 1.2, 0.35), CUES.muscleUp.transition),
      ];
      if (mode === "perfect") {
        metrics.push(flag("control", "Controlled transition", lowKip, CUES.muscleUp.noKip, 55));
      }
      return baseEval(transition, transition && lowKip, metrics, ok);
    },
  },
  {
    id: "l-sit",
    name: "L-Sit",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view, hips and legs visible.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "leftWrist", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftHip", "leftWrist", "leftAnkle"]);
      const T = bodyUnit(body);
      const hip = midpoint(body.leftHip, body.rightHip);
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const hipLift = hip && wrist ? (wrist.y - hip.y) / T : -Infinity;
      const hipUp = hipLift > -0.15;
      const kneeAng = knee(body, history);
      // Reference L-sits: knee 163–173°, hip 86–99°; allow a slightly low leg line.
      const legsForward = kneeAng > 140;
      const hipAng = stableAngle(history, body, hipAngle);
      const lShape = hipAng > 55 && hipAng < 125;
      const holdMet = hipUp && legsForward && lShape;
      const kneesLocked = kneeAng > STRAIGHT_KNEE;
      const scapDepressed = !shouldersShrugged(body);
      const metrics: FormMetric[] = [
        metric("hip_height", "Hips elevated", hipUp, ramp(hipLift, -1, -0.15), CUES.lSit.hipHeight),
        metric("hip_angle", "90° hip angle", lShape, ramp(Math.abs(hipAng - 90), 60, 30), CUES.lSit.posteriorTilt),
        metric("leg_extension", "Legs extended", legsForward, ramp(kneeAng, 90, 150), CUES.lSit.legExtension),
        flag("scap_depression", "Scapular depression", scapDepressed, CUES.lSit.scapDepression),
      ];
      if (mode === "perfect") {
        metrics.push(metric("knees_locked", "Knees locked", kneesLocked, ramp(kneeAng, 140, STRAIGHT_KNEE), CUES.lSit.legExtension));
      }
      return baseEval(holdMet, holdMet && kneesLocked && scapDepressed, metrics, ok);
    },
  },
  {
    id: "frog-stand",
    name: "Frog Stand",
    category: "static",
    cameraAngle: "diagonal",
    cameraGuide: "Front-diagonal, hands and knees visible.",
    needsHands: true,
    requiredLandmarks: ["leftWrist", "leftKnee", "leftElbow"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftWrist", "leftKnee", "leftElbow"]);
      const T = bodyUnit(body);
      const kneePt = midpoint(body.leftKnee, body.rightKnee);
      const elbowPt = midpoint(body.leftElbow, body.rightElbow);
      const kneeGap = kneePt && elbowPt ? Math.abs(kneePt.y - elbowPt.y) / T : Infinity;
      const nearArms = kneeGap < 0.4;
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const hip = midpoint(body.leftHip, body.rightHip);
      // Hands planted below the hips — rules out standing with hands raised.
      const handsDown = wrist && hip ? wrist.y > hip.y + 0.2 * T : false;
      const holdMet = nearArms && handsDown;
      const sway = history.length > 8 ? landmarkVariance(history.slice(-12), "leftHip") : 0;
      const stable = sway < 0.01;
      const metrics: FormMetric[] = [
        metric("knee_stack", "Knees on arms", nearArms, ramp(kneeGap, 1.2, 0.4), CUES.frogStand.kneeStack),
      ];
      if (mode === "perfect") {
        metrics.push(metric("stability", "Stable hold", stable, ramp(sway, 0.05, 0.01), CUES.frogStand.stability));
      }
      return baseEval(holdMet, holdMet && stable, metrics, ok);
    },
  },
  {
    id: "crow-pose",
    name: "Crow Pose",
    category: "static",
    cameraAngle: "front",
    cameraGuide: "Front view, hands planted, knees on arms.",
    needsHands: true,
    requiredLandmarks: ["leftWrist", "leftKnee", "leftElbow"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftWrist", "leftKnee"]);
      const T = bodyUnit(body);
      const kneePt = midpoint(body.leftKnee, body.rightKnee);
      const elbowPt = midpoint(body.leftElbow, body.rightElbow);
      const kneeGap = kneePt && elbowPt ? Math.hypot(kneePt.x - elbowPt.x, kneePt.y - elbowPt.y) / T : Infinity;
      // Reference crows: hands planted (shoulders 0.7–1.2 T above the wrists),
      // knees tucked (44–80°), hips deeply flexed (15–35°), knees on the arms.
      const planted = hangDepth(body) < -0.5;
      const kneeAng = knee(body, history);
      const tucked = kneeAng < 100;
      const hipAng = hipAngle(body);
      const folded = hipAng < 70;
      const stacked = kneeGap < 0.7;
      const holdMet = planted && tucked && folded && stacked;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("stack", "Knees on arms", stacked, ramp(kneeGap, 1.5, 0.7), CUES.crowPose.kneeStack),
        metric("depth", "Tuck", tucked && folded, Math.min(ramp(kneeAng, 150, 100), ramp(hipAng, 120, 70)), CUES.crowPose.kneeStack),
      ];
      if (mode === "perfect") {
        metrics.push(metric("arms", "Arm extension", straightArms, ramp(angle, 90, 150), CUES.crowPose.arms));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "handstand",
    name: "Handstand",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view, full body vertical.",
    needsHands: false,
    requiredLandmarks: ["leftAnkle", "leftShoulder", "leftWrist"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftAnkle", "leftShoulder", "leftWrist"]);
      const inverted = isInverted(body);
      const line = bodyLineDeviation(body);
      const straight = line > 165;
      const noBanana = !invertedArch(body);
      const stackOffset = shoulderStackOffset(body);
      const stacked = stackOffset < 0.3;
      const metrics: FormMetric[] = [flag("inverted", "Inverted hold", inverted, CUES.handstand.inverted, 20)];
      if (mode === "perfect") {
        metrics.push(
          metric("stacked", "Shoulders over hands", stacked, ramp(stackOffset, 0.9, 0.3), CUES.handstand.inverted),
          metric("body_line", "Straight body line", straight, ramp(line, 130, 165), CUES.handstand.bodyLine),
          flag("no_banana", "Hollow line", noBanana, CUES.handstand.noBanana)
        );
      }
      return baseEval(inverted, inverted && stacked && straight && noBanana, metrics, ok);
    },
  },
  {
    id: "handstand-push-ups-90",
    name: "90° Handstand Push-Ups",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view — hold the bottom position with elbows at ~90°.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftAnkle"]);
      const inverted = isInverted(body);
      const angle = elbow(body, history);
      const at90 = angle >= 75 && angle <= 105;
      const holdMet = inverted && at90;
      const line = bodyLineDeviation(body);
      const stackedLine = line > 155;
      const metrics: FormMetric[] = [
        flag("inverted", "Inverted hold", inverted, CUES.hspu90.inverted, 20),
        metric("depth", "90° elbow bend", at90, ramp(Math.abs(angle - 90), 60, 15), CUES.hspu90.elbow90),
      ];
      if (mode === "perfect") {
        metrics.push(metric("body_line", "Stacked line", stackedLine, ramp(line, 120, 155), CUES.hspu90.bodyLine));
      }
      return baseEval(holdMet, holdMet && stackedLine, metrics, ok);
    },
  },
  {
    id: "handstand-push-ups",
    name: "Handstand Push-Ups",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view — hold bottom or top of the HSPU range.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftAnkle"]);
      const inverted = isInverted(body);
      const angle = elbow(body, history);
      const atBottom = angle < DEEP_ELBOW;
      const atTop = angle > 155;
      const holdMet = inverted && (atBottom || atTop);
      const line = bodyLineDeviation(body);
      const stackedLine = line > 155;
      const metrics: FormMetric[] = [
        flag("inverted", "Inverted position", inverted, CUES.hspu.inverted, 20),
        metric("position", "ROM hold", holdMet, holdMet ? (atBottom ? 95 : 90) : 25, atTop ? CUES.hspu.topLockout : CUES.hspu.bottomDepth),
      ];
      if (mode === "perfect") {
        metrics.push(metric("body_line", "Stacked line", stackedLine, ramp(line, 120, 155), CUES.hspu.bodyLine));
      }
      return baseEval(holdMet, holdMet && stackedLine, metrics, ok);
    },
  },
  {
    id: "one-arm-handstand",
    name: "One-Arm Handstand",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; free hand must leave ground.",
    needsHands: true,
    requiredLandmarks: ["leftAnkle", "leftWrist", "rightWrist"],
    evaluate(body, hands, _history, mode) {
      const ok = vis(body, ["leftAnkle", "leftWrist"]);
      const T = bodyUnit(body);
      const inverted = isInverted(body);
      const leftW = body.leftWrist;
      const rightW = body.rightWrist;
      const wristGap = leftW && rightW ? Math.abs(leftW.y - rightW.y) / T : 0;
      let handOff = wristGap > 0.3;
      // With hand tracking on, a single detected hand corroborates the free hand being tucked.
      const handCount = (hands.left ? 1 : 0) + (hands.right ? 1 : 0);
      if (handCount === 1) handOff = true;
      const holdMet = inverted && handOff;
      const line = bodyLineDeviation(body);
      const straight = line > 160;
      const metrics: FormMetric[] = [
        flag("inverted", "Inverted", inverted, CUES.oneArmHandstand.inverted, 25),
        metric("hand_off", "Free hand off ground", handOff, handOff ? 100 : ramp(wristGap, 0, 0.3) * 0.5, CUES.oneArmHandstand.handOff),
      ];
      if (mode === "perfect") {
        metrics.push(metric("line", "Stacked line", straight, ramp(line, 125, 160), CUES.oneArmHandstand.bodyLine));
      }
      return baseEval(holdMet, holdMet && straight, metrics, ok);
    },
  },
  {
    id: "skin-the-cat",
    name: "Skin the Cat",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view for rotational arc phases.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftAnkle"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip"]);
      const T = bodyUnit(body);
      const horiz = horizontalBodyScore(body);
      const holdMet = horiz > 0.55;
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const level = shoulder && hip ? Math.abs(shoulder.y - hip.y) / T : Infinity;
      const controlled = level < 0.5;
      const metrics: FormMetric[] = [
        metric("arc", "Arc phase hold", holdMet, ramp(horiz, 0.2, 0.55), CUES.skinTheCat.arc),
      ];
      if (mode === "perfect") {
        metrics.push(metric("control", "Controlled tempo", controlled, ramp(level, 1, 0.5), CUES.skinTheCat.control));
      }
      return baseEval(holdMet, holdMet && controlled, metrics, ok);
    },
  },
  {
    id: "front-lever",
    name: "Front Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view, body horizontal, arms straight.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip", "leftAnkle"]);
      const horiz = horizontalBodyScore(body);
      const holdMet = horiz > 0.7;
      const line = bodyLineDeviation(body);
      const straight = line > 160;
      const angle = elbow(body, history);
      const straightArms = angle > 160;
      const metrics: FormMetric[] = [
        metric("horizontal", "Horizontal body", holdMet, ramp(horiz, 0.3, 0.7), CUES.frontLever.horizontal),
      ];
      if (mode === "perfect") {
        metrics.push(
          metric("straight", "Straight body", straight, ramp(line, 120, 160), CUES.frontLever.straight),
          metric("elbows", "Straight arms", straightArms, ramp(angle, 120, 160), CUES.frontLever.straight)
        );
      }
      return baseEval(holdMet, holdMet && straight && straightArms, metrics, ok);
    },
  },
  {
    id: "planche-lean",
    name: "Planche Lean",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view — lean shoulders past wrists with locked elbows.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftElbow", "leftHip"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftElbow"]);
      const inSupport = inWeightSupportPosition(body);
      const lean = shoulderLeanOverWrists(body);
      const leanOk = lean > 0.12;
      const angle = elbow(body, history);
      const locked = angle > LOCKED_ELBOW;
      const horiz = horizontalBodyScore(body);
      const line = bodyLineDeviation(body);
      const rigid = line > 160;
      const holdMet = inSupport && leanOk && locked && horiz > 0.38;
      const metrics: FormMetric[] = [
        metric("lean", "Forward lean", leanOk, ramp(lean, 0, 0.12), CUES.plancheLean.lean),
        metric("elbow_bend", "Locked elbows", locked, ramp(angle, 130, LOCKED_ELBOW), CUES.plancheLean.elbows),
      ];
      if (mode === "perfect") {
        metrics.push(metric("plank_line", "Rigid plank line", rigid, ramp(line, 125, 160), CUES.plancheLean.line));
      }
      return baseEval(holdMet, holdMet && horiz > 0.42 && rigid, metrics, ok);
    },
  },
  {
    id: "pseudo-planche-push-ups",
    name: "Pseudo Planche Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view — push-up with planche lean at top or bottom.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist"]);
      const inSupport = inWeightSupportPosition(body);
      const lean = shoulderLeanOverWrists(body);
      const leanOk = lean > 0.1;
      const angle = elbow(body, history);
      const atBottom = inSupport && leanOk && angle < 105;
      const atTop = inSupport && leanOk && angle > 155;
      const holdMet = atBottom || atTop;
      const line = bodyLineDeviation(body);
      const rigid = line > 155;
      const metrics: FormMetric[] = [
        metric("lean", "Planche lean", leanOk, ramp(lean, 0, 0.1), CUES.pseudoPlanche.lean),
        metric("position", "Push position", holdMet, holdMet ? (atBottom ? 95 : 88) : 25, atTop ? CUES.pseudoPlanche.topLockout : CUES.pseudoPlanche.bottomDepth),
      ];
      if (mode === "perfect") {
        metrics.push(metric("plank_line", "Body line", rigid, ramp(line, 120, 155), CUES.pseudoPlanche.line));
      }
      return baseEval(holdMet, holdMet && rigid, metrics, ok);
    },
  },
  {
    id: "tuck-planche",
    name: "Tuck Planche",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view — knees tucked, shoulders forward of wrists.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      return plancheHold(body, history, mode, {
        minLean: 0.15,
        minHoriz: 0.48,
        horizontalLabel: "Lifted tuck",
        legs: (b, h) => {
          const k = knee(b, h);
          return { passed: k < 95, score: ramp(k, 150, 95), metric: { id: "depth", label: "Knee tuck", cue: CUES.tuckPlanche.tuck } };
        },
        cues: CUES.tuckPlanche,
      });
    },
  },
  {
    id: "advanced-tuck-planche",
    name: "Advanced Tuck Planche",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view — open the tuck, hips extended, knees still bent.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      return plancheHold(body, history, mode, {
        minLean: 0.15,
        minHoriz: 0.54,
        horizontalLabel: "Horizontal body",
        legs: (b, h) => {
          const k = knee(b, h);
          const passed = k >= 95 && k <= 135;
          return { passed, score: passed ? 100 : ramp(Math.abs(k - 115), 60, 20), metric: { id: "depth", label: "Advanced tuck", cue: CUES.advTuckPlanche.tuck } };
        },
        cues: CUES.advTuckPlanche,
      });
    },
  },
  {
    id: "straddle-planche",
    name: "Straddle Planche",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view — legs straddled wide, body level.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      return plancheHold(body, history, mode, {
        minLean: 0.15,
        minHoriz: 0.6,
        horizontalLabel: "Level body",
        legs: (b, h) => {
          const spread = ankleSpread(b);
          const open = knee(b, h) > 140;
          const passed = spread > 0.5 && open;
          return { passed, score: Math.min(ramp(spread, 0, 0.5), ramp(knee(b, h), 90, 140)), metric: { id: "leg_extension", label: "Straddle width", cue: CUES.straddlePlanche.straddle } };
        },
        cues: CUES.straddlePlanche,
      });
    },
  },
  {
    id: "planche",
    name: "Planche",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view, shoulders forward of wrists.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip"],
    evaluate(body, _hands, history, mode) {
      return plancheHold(body, history, mode, {
        minLean: 0.2,
        minHoriz: 0.65,
        horizontalLabel: "Body horizontal",
        legs: () => null,
        cues: CUES.planche,
      });
    },
  },
  {
    id: "bosu-single-leg-squats",
    name: "Bosu Ball Single-Leg Squats",
    category: "bosu",
    cameraAngle: "front",
    cameraGuide: "Front view, one leg squat depth visible.",
    needsHands: false,
    requiredLandmarks: ["leftKnee", "leftHip", "rightKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftKnee", "leftHip", "rightKnee"]);
      const lKnee = kneeFlexion(body, "left");
      const rKnee = kneeFlexion(body, "right");
      const bent = Math.min(lKnee, rKnee);
      const free = Math.max(lKnee, rKnee);
      const singleLeg = bent < 100 && free > 140;
      const sway = history.length > 8 ? landmarkVariance(history.slice(-10), "leftHip") : 0;
      const stable = sway < 0.02;
      const metrics: FormMetric[] = [
        metric("single_leg", "Single leg depth", singleLeg, Math.min(ramp(bent, 160, 100), ramp(free, 100, 140)), "Deep flexion on support leg"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("balance", "Balance control", stable, ramp(sway, 0.08, 0.02), "Reduce sway on Bosu"));
      }
      return baseEval(singleLeg, singleLeg && stable, metrics, ok);
    },
  },
  {
    id: "pistol-squats",
    name: "Pistol Squats",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side or front, support leg and extended leg visible.",
    needsHands: false,
    requiredLandmarks: ["leftKnee", "leftHip", "rightKnee"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftKnee", "leftHip", "rightKnee"]);
      const lKnee = kneeFlexion(body, "left");
      const rKnee = kneeFlexion(body, "right");
      const bent = Math.min(lKnee, rKnee);
      const free = Math.max(lKnee, rKnee);
      const pistol = bent < 90 && free > 150;
      const lean = torsoLeanOffset(body);
      const upright = lean < 0.35;
      const metrics: FormMetric[] = [
        metric("depth", "Pistol depth", pistol, Math.min(ramp(bent, 150, 90), ramp(free, 100, 150)), "Bottom of pistol hold"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("upright", "Upright torso", upright, ramp(lean, 0.9, 0.35), CUES.pistolSquats.upright));
      }
      return baseEval(pistol, pistol && upright, metrics, ok);
    },
  },
  {
    id: "shrimp-squats",
    name: "Shrimp Squats",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view, rear knee low.",
    needsHands: false,
    requiredLandmarks: ["leftKnee", "rightKnee", "leftHip"],
    evaluate(body, _hands, history) {
      const ok = vis(body, ["leftKnee", "rightKnee"]);
      const k = knee(body, history);
      const deep = k < 70;
      const metrics: FormMetric[] = [
        metric("depth", "Rear knee depth", deep, ramp(k, 140, 70), "Lower rear knee toward floor"),
      ];
      return baseEval(deep, deep, metrics, ok);
    },
  },
  {
    id: "dragon-squats",
    name: "Dragon Squats",
    category: "legs",
    cameraAngle: "front",
    cameraGuide: "Front view, crossed rear leg visible.",
    needsHands: false,
    requiredLandmarks: ["leftKnee", "rightKnee", "leftHip"],
    evaluate(body, _hands, history) {
      const ok = vis(body, ["leftKnee", "rightKnee"]);
      const k = knee(body, history);
      const deep = k < 80;
      const metrics: FormMetric[] = [
        metric("depth", "Deep front leg flexion", deep, ramp(k, 150, 80), "Hold deep dragon squat"),
      ];
      return baseEval(deep, deep, metrics, ok);
    },
  },
  {
    id: "sissy-squats",
    name: "Sissy Squats",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view, knees forward of toes.",
    needsHands: false,
    requiredLandmarks: ["leftKnee", "leftAnkle", "leftHip"],
    evaluate(body, _hands, history) {
      const ok = vis(body, ["leftKnee", "leftAnkle"]);
      const T = bodyUnit(body);
      const kneePt = midpoint(body.leftKnee, body.rightKnee);
      const ankle = midpoint(body.leftAnkle, body.rightAnkle);
      const kneeTravel = kneePt && ankle ? Math.abs(kneePt.x - ankle.x) / T : 0;
      const forward = kneeTravel > 0.12;
      const k = knee(body, history);
      const deep = k < 110;
      const holdMet = forward && deep;
      const metrics: FormMetric[] = [
        metric("lean", "Knees forward lean", forward, ramp(kneeTravel, 0, 0.12), "Lean back, knees forward"),
        metric("depth", "Quad flexion", deep, ramp(k, 170, 110), "Hold deep sissy position"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "nordic-curls",
    name: "Nordic Curls",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view, kneeling anchor, lowering phase.",
    needsHands: false,
    requiredLandmarks: ["leftKnee", "leftHip", "leftShoulder"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftKnee", "leftHip", "leftShoulder"]);
      const T = bodyUnit(body);
      const kneePt = midpoint(body.leftKnee, body.rightKnee);
      const hip = midpoint(body.leftHip, body.rightHip);
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      const lowering =
        kneePt && hip && shoulder ? shoulder.y > hip.y && hip.y >= kneePt.y - 0.2 * T : false;
      const line = bodyLineDeviation(body);
      const hipsExtended = line > 150;
      const metrics: FormMetric[] = [
        flag("lowering", "Lowering hold", lowering, "Hold controlled lowering phase", 35),
      ];
      if (mode === "perfect") {
        metrics.push(metric("hips", "Hips extended", hipsExtended, ramp(line, 110, 150), CUES.nordicCurls.hips));
      }
      return baseEval(lowering, lowering && hipsExtended, metrics, ok);
    },
  },
];

export const SKILL_MAP = Object.fromEntries(SKILLS.map((s) => [s.id, s]));

export const SKILLS_BY_CATEGORY = SKILLS.reduce(
  (acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  },
  {} as Record<SkillCategory, SkillDefinition[]>
);

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILL_MAP[id];
}

export function evaluateSkill(
  skillId: string,
  body: Body,
  hands: HandLandmarks,
  history: Body[],
  mode: "hold_only" | "perfect"
): SkillEvaluation | null {
  const skill = getSkill(skillId);
  if (!skill) return null;
  const evaluation = skill.evaluate(body, hands, history, mode);
  const ctx = getDistanceContext(body);
  return { ...evaluation, farCamera: ctx.isFar, measures: measureBody(body) };
}
