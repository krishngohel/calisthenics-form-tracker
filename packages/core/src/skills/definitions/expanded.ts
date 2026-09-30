import type { SkillDefinition, FormMetric } from "../registry";
import {
  bodyLineDeviation,
  bodyUnit,
  hangDepth,
  hipAngle,
  isHanging,
  kneeFlexion,
  midpoint,
  ramp,
  shoulderLeanOverWrists,
  inWeightSupportPosition,
  type Body,
} from "../../pose/geometry";
import { stableAngle } from "../../pose/distance";
import {
  LOCKED_ELBOW,
  DEEP_ELBOW,
  TOP_ELBOW,
  STRAIGHT_KNEE,
  baseEval,
  vis,
  elbow,
  knee,
  metric,
  flag,
  ankleSpread,
  torsoLeanOffset,
  torsoLevelOffset,
  handsBehindOffset,
  wristSpread,
  kneePair,
  elbowPair,
  above,
  hipsOverShoulders,
  pressingHold,
} from "../helpers";

const sh = (b: Body) => midpoint(b.leftShoulder, b.rightShoulder);
const hip = (b: Body) => midpoint(b.leftHip, b.rightHip);
const ankle = (b: Body) => midpoint(b.leftAnkle, b.rightAnkle);
const wrist = (b: Body) => midpoint(b.leftWrist, b.rightWrist);
const kneeMid = (b: Body) => midpoint(b.leftKnee, b.rightKnee);

/** Shoulder separation in body units (front view). */
function shoulderSpread(b: Body): number {
  const l = b.leftShoulder, r = b.rightShoulder;
  if (!l || !r) return 0;
  return Math.abs(l.x - r.x) / bodyUnit(b);
}

/** Bottom-or-top pressing hold with an extra positional gate. */
function pressBottomOrTop(angle: number): { bottom: boolean; top: boolean } {
  return { bottom: angle < DEEP_ELBOW, top: angle > TOP_ELBOW };
}

function pressMetrics(angle: number, bottom: boolean, top: boolean): FormMetric[] {
  return [
    metric("depth", bottom ? "Bottom position" : top ? "Locked out" : "Bottom or lockout", bottom || top, Math.max(ramp(angle, 140, DEEP_ELBOW), ramp(angle, 120, TOP_ELBOW)), "Lower to a full bottom or press to a full lockout"),
  ];
}

export const EXPANDED_SKILLS: SkillDefinition[] = [
  // ---------------- Push regressions and variations
  {
    id: "wall-push-ups",
    name: "Wall Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; hands on the wall at shoulder height, body straight.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"]);
      const s = sh(body), w = wrist(body), a = ankle(body), h = hip(body);
      const handsAtShoulder = s && w ? Math.abs(w.y - s.y) / bodyUnit(body) < 0.35 : false;
      const standing = h && a ? above(h, a, body) > 0.8 : false;
      const line = bodyLineDeviation(body);
      const straight = line > 155;
      const angle = elbow(body, history);
      const { bottom, top } = pressBottomOrTop(angle);
      const holdMet = handsAtShoulder && standing && straight && (bottom || top);
      const metrics: FormMetric[] = [
        flag("hands", "Hands at shoulder height on the wall", handsAtShoulder, "Place the hands at shoulder height"),
        ...pressMetrics(angle, bottom, top),
        metric("body_line", "Straight body", straight, ramp(line, 120, 155), "Squeeze the glutes; move as one plank"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "incline-push-ups",
    name: "Incline Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; hands on a bench or step, feet on the floor.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"]);
      const w = wrist(body), a = ankle(body);
      const handsRaised = w && a ? above(w, a, body) > 0.25 : false;
      const support = hangDepth(body) < -0.2; // shoulders above the hands
      const line = bodyLineDeviation(body);
      const straight = line > 155;
      const angle = elbow(body, history);
      const { bottom, top } = pressBottomOrTop(angle);
      const holdMet = handsRaised && support && straight && (bottom || top);
      const metrics: FormMetric[] = [
        flag("hands", "Hands raised, shoulders over them", handsRaised && support, "Hands on the bench, shoulders over the hands"),
        ...pressMetrics(angle, bottom, top),
        metric("body_line", "Straight body", straight, ramp(line, 120, 155), "Hips in line; no sag"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "wide-push-ups",
    name: "Wide Push-Ups",
    category: "upper",
    cameraAngle: "front",
    cameraGuide: "Camera in front, low; hands well outside the shoulders.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist", "leftElbow"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist", "leftElbow"]);
      const spread = wristSpread(body);
      const shoulders = shoulderSpread(body);
      const wide = shoulders > 0 && spread > shoulders * 1.5;
      const support = inWeightSupportPosition(body);
      const angle = elbow(body, history);
      const { bottom, top } = pressBottomOrTop(angle);
      const holdMet = wide && support && (bottom || top);
      const metrics: FormMetric[] = [
        metric("hands", "Hands wide", wide, ramp(shoulders > 0 ? spread / shoulders : 0, 1.0, 1.5), "Move the hands out to about 1.5× shoulder width"),
        ...pressMetrics(angle, bottom, top),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "decline-push-ups",
    name: "Decline Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; feet on a box or bench, hands on the floor.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"]);
      const a = ankle(body), h = hip(body);
      const feetUp = a && h ? above(a, h, body) > -0.25 : false;
      const support = inWeightSupportPosition(body);
      const line = bodyLineDeviation(body);
      const straight = line > 155;
      const angle = elbow(body, history);
      const { bottom, top } = pressBottomOrTop(angle);
      const holdMet = feetUp && support && straight && (bottom || top);
      const metrics: FormMetric[] = [
        metric("hip_height", "Feet elevated", feetUp, ramp(a && h ? above(a, h, body) : -1, -0.8, -0.25), "Put the feet on the box"),
        ...pressMetrics(angle, bottom, top),
        metric("body_line", "Straight body", straight, ramp(line, 120, 155), "Ribs down; no pike"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "bench-dips",
    name: "Bench Dips",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; hands on a bench behind you, legs out in front.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"]);
      const behind = handsBehindOffset(body) > 0.25;
      const hipsLow = hipsOverShoulders(body) < -0.4; // hips below the shoulders
      const legsOut = knee(body, history) > 130;
      const angle = elbow(body, history);
      const { bottom, top } = pressBottomOrTop(angle);
      const holdMet = behind && hipsLow && legsOut && (bottom || top);
      const metrics: FormMetric[] = [
        flag("hands", "Hands behind on the bench", behind && hipsLow, "Hands on the bench behind the hips"),
        ...pressMetrics(angle, bottom, top),
        metric("leg_extension", "Legs out", legsOut, ramp(knee(body, history), 90, 130), "Walk the feet further out"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "straight-bar-dips",
    name: "Straight Bar Dips",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view on a single bar; lean forward over the bar.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    evaluate(body, hands, history, mode) {
      const base = pressingHold(body, history, mode, { horizontal: false, cues: { bottom: "Shoulder below the elbow", top: "Lock out over the bar" } });
      const lean = shoulderLeanOverWrists(body);
      const leaning = lean > 0.12;
      const metrics = [...base.metrics, metric("lean", "Leaning over the bar", leaning, ramp(lean, 0, 0.12), "Lean the chest forward over the bar")];
      return baseEval(base.holdCriteriaMet && leaning, base.perfectCriteriaMet && leaning, metrics, base.visibilityOk);
    },
  },

  // ---------------- Handstand family
  {
    id: "headstand",
    name: "Headstand",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; head and hands on the floor, body vertical.",
    needsHands: false,
    requiredLandmarks: ["nose", "leftShoulder", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["nose", "leftShoulder", "leftWrist", "leftHip", "leftAnkle"]);
      const T = bodyUnit(body);
      const s = sh(body), w = wrist(body), n = body.nose, a = ankle(body), h = hip(body);
      const headDown = n && s ? n.y > s.y + 0.1 * T : false;
      const handsByHead = n && w ? Math.abs(n.y - w.y) / T < 0.35 : false;
      const stacked = hipsOverShoulders(body) > 0.6 && (a && h ? above(a, h, body) > 0.5 : false);
      const angle = elbow(body, history);
      const bent = angle < 125;
      const holdMet = headDown && handsByHead && stacked && bent;
      const metrics: FormMetric[] = [
        flag("inverted", "Head and hands on the floor", headDown && handsByHead, "Crown of the head down, hands beside it"),
        metric("stacked", "Hips and feet stacked", stacked, Math.min(ramp(hipsOverShoulders(body), 0, 0.6), ramp(a && h ? above(a, h, body) : -1, -0.5, 0.5)), "Stack the hips over the shoulders, then the feet"),
        metric("elbow_bend", "Elbows bent, hands pushing", bent, ramp(angle, 170, 125), "Push the hands into the floor"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "wall-handstand",
    name: "Chest-to-Wall Handstand",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; walk the feet up the wall until the body is vertical.",
    needsHands: false,
    requiredLandmarks: ["leftAnkle", "leftShoulder", "leftWrist", "leftElbow"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftAnkle", "leftShoulder", "leftWrist", "leftElbow"]);
      const a = ankle(body), s = sh(body), w = wrist(body);
      const inverted = a && s && w ? above(a, s, body) > 0.8 && above(a, w, body) > 1.0 : false;
      const angle = elbow(body, history);
      const straightArms = angle > LOCKED_ELBOW;
      const line = bodyLineDeviation(body);
      const straight = line > 160;
      const holdMet = inverted && straightArms;
      const metrics: FormMetric[] = [
        flag("inverted", "Inverted on the wall", inverted, "Walk the feet up until the body is vertical", 20),
        metric("elbow_bend", "Arms locked", straightArms, ramp(angle, 120, LOCKED_ELBOW), "Push tall; lock the elbows"),
      ];
      if (mode === "perfect") metrics.push(metric("body_line", "Straight line", straight, ramp(line, 130, 160), "Ribs down; toes to the wall"));
      return baseEval(holdMet, holdMet && straight, metrics, ok);
    },
  },
  {
    id: "straddle-handstand",
    name: "Straddle Handstand",
    category: "static",
    cameraAngle: "front",
    cameraGuide: "Camera in front; handstand with the legs wide.",
    needsHands: false,
    requiredLandmarks: ["leftAnkle", "rightAnkle", "leftShoulder", "leftWrist"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftAnkle", "rightAnkle", "leftShoulder", "leftWrist"]);
      const a = ankle(body), s = sh(body);
      const inverted = a && s ? above(a, s, body) > 0.8 : false;
      const spread = ankleSpread(body);
      const wide = spread > 0.9;
      const angle = elbow(body, history);
      const straightArms = angle > LOCKED_ELBOW;
      const holdMet = inverted && wide && straightArms;
      const metrics: FormMetric[] = [
        flag("inverted", "Inverted", inverted, "Kick up to a handstand", 20),
        metric("straddle", "Legs wide", wide, ramp(spread, 0.3, 0.9), "Open the legs into a straddle"),
        metric("elbow_bend", "Arms locked", straightArms, ramp(angle, 120, LOCKED_ELBOW), "Push the floor away"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },

  // ---------------- Pull: rows and hangs
  {
    id: "incline-rows",
    name: "Incline Rows",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; hang under a high bar with the feet on the floor, body at an angle.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"]);
      const s = sh(body), h = hip(body);
      const underBar = hangDepth(body) > 0.1;
      const angled = s && h ? above(s, h, body) > 0.4 : false;
      const line = bodyLineDeviation(body);
      const straight = line > 155;
      const angle = elbow(body, history);
      const pulled = angle < 100;
      const holdMet = underBar && angled && straight && pulled;
      const metrics: FormMetric[] = [
        flag("hang_position", "Hanging under the bar at an angle", underBar && angled, "Hang under the bar with the feet on the floor"),
        metric("elbow_bend", "Chest to the bar", pulled, ramp(angle, 170, 100), "Pull until the chest reaches the bar"),
        metric("body_line", "Straight body", straight, ramp(line, 120, 155), "Squeeze the glutes; one line from heels to head"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "bodyweight-rows",
    name: "Bodyweight Rows",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; body horizontal under a low bar, heels on the floor.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"]);
      const underBar = hangDepth(body) > 0.1;
      const level = torsoLevelOffset(body) < 0.35;
      const line = bodyLineDeviation(body);
      const straight = line > 155;
      const angle = elbow(body, history);
      const pulled = angle < 100;
      const holdMet = underBar && level && straight && pulled;
      const metrics: FormMetric[] = [
        metric("horizontal", "Body horizontal under the bar", underBar && level, ramp(torsoLevelOffset(body), 0.9, 0.35), "Lower the bar or walk the feet out until the body is level"),
        metric("elbow_bend", "Chest to the bar", pulled, ramp(angle, 170, 100), "Pull the elbows back past the ribs"),
        metric("body_line", "Straight body", straight, ramp(line, 120, 155), "Hips up; no sag"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "feet-elevated-rows",
    name: "Feet-Elevated Rows",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; feet on a box at bar height, body level.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"]);
      const a = ankle(body), s = sh(body);
      const underBar = hangDepth(body) > 0.1;
      const feetUp = a && s ? above(a, s, body) > -0.3 : false;
      const line = bodyLineDeviation(body);
      const straight = line > 155;
      const angle = elbow(body, history);
      const pulled = angle < 100;
      const holdMet = underBar && feetUp && straight && pulled;
      const metrics: FormMetric[] = [
        metric("hip_height", "Feet at shoulder height", feetUp, ramp(a && s ? above(a, s, body) : -1, -1, -0.3), "Raise the feet onto the box"),
        metric("elbow_bend", "Chest to the bar", pulled, ramp(angle, 170, 100), "Pull all the way up"),
        metric("body_line", "Straight body", straight, ramp(line, 120, 155), "Squeeze the glutes"),
      ];
      return baseEval(holdMet, holdMet && underBar, metrics, ok);
    },
  },
  {
    id: "archer-rows",
    name: "Archer Rows",
    category: "upper",
    cameraAngle: "front",
    cameraGuide: "Camera at the feet looking along the body; one arm pulls, the other stays straight.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftWrist", "rightWrist"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftWrist", "rightWrist"]);
      const [bent, straightArm] = elbowPair(body);
      const archer = bent < 100 && straightArm > 150;
      const underBar = hangDepth(body) > 0.1;
      const holdMet = archer && underBar;
      const metrics: FormMetric[] = [
        metric("arms", "One arm pulled, one straight", archer, Math.min(ramp(bent, 160, 100), ramp(straightArm, 110, 150)), "Pull to one hand while the other arm straightens"),
        flag("hang_position", "Hanging under the bar", underBar, "Hang under the bar"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "one-arm-rows",
    name: "One-Arm Rows",
    category: "upper",
    cameraAngle: "front",
    cameraGuide: "Camera at the feet; one hand on the bar, the free hand on the chest.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist", "leftElbow", "rightElbow"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist", "leftElbow", "rightElbow"]);
      const T = bodyUnit(body);
      const s = sh(body);
      const lw = body.leftWrist, rw = body.rightWrist;
      const highest = lw && rw ? Math.min(lw.y, rw.y) : Infinity;
      const lowest = lw && rw ? Math.max(lw.y, rw.y) : -Infinity;
      const oneOnBar = s ? highest < s.y - 0.2 * T && lowest > s.y - 0.1 * T : false;
      const [bent] = elbowPair(body);
      const pulled = bent < 100;
      const holdMet = oneOnBar && pulled;
      const metrics: FormMetric[] = [
        flag("hands", "One hand on the bar", oneOnBar, "Grip with one hand; rest the other on the chest"),
        metric("elbow_bend", "Pulled to the bar", pulled, ramp(bent, 170, 100), "Pull the chest to the hand"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "wide-pull-ups",
    name: "Wide Pull-Ups",
    category: "upper",
    cameraAngle: "front",
    cameraGuide: "Camera in front; grip well outside the shoulders, chin over the bar.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist", "nose", "leftElbow"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist", "nose", "leftElbow"]);
      const T = bodyUnit(body);
      const spread = wristSpread(body);
      const shoulders = shoulderSpread(body);
      const wide = shoulders > 0 && spread > shoulders * 1.5;
      const hanging = hangDepth(body) > 0.2;
      const n = body.nose, w = wrist(body);
      const chinRise = n && w ? (w.y - n.y) / T : -Infinity;
      const chinAbove = chinRise > -0.15;
      const angle = elbow(body, history);
      const flexed = angle < 120;
      const holdMet = wide && hanging && chinAbove && flexed;
      const metrics: FormMetric[] = [
        metric("hands", "Wide grip", wide, ramp(shoulders > 0 ? spread / shoulders : 0, 1.0, 1.5), "Move the hands out to about 1.5× shoulder width"),
        metric("chin_height", "Chin above the bar", chinAbove && hanging, ramp(chinRise, -1, -0.15), "Pull the elbows down until the chin clears the bar"),
        metric("elbow_bend", "Elbow flexion", flexed, ramp(angle, 175, 120), "Keep pulling"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "one-arm-dead-hang",
    name: "One-Arm Dead Hang",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side or front view; hang from one hand with the other arm free.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist", "leftElbow", "rightElbow"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist"]);
      const T = bodyUnit(body);
      const s = sh(body);
      const lw = body.leftWrist, rw = body.rightWrist;
      const highest = lw && rw ? Math.min(lw.y, rw.y) : Infinity;
      const lowest = lw && rw ? Math.max(lw.y, rw.y) : -Infinity;
      const oneHigh = s ? highest < s.y - 0.6 * T : false;
      const otherFree = lowest > highest + 0.4 * T;
      const [, straightArm] = elbowPair(body);
      const locked = straightArm > LOCKED_ELBOW;
      const holdMet = oneHigh && otherFree && locked;
      const metrics: FormMetric[] = [
        flag("hang_position", "Hanging from one hand", oneHigh && otherFree, "Let go with one hand"),
        metric("elbow_bend", "Straight hanging arm", locked, ramp(straightArm, 120, LOCKED_ELBOW), "Relax into a straight arm"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "inverted-hang",
    name: "Inverted Hang",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view on a bar or rings; body vertical, head down, hands at the hips.",
    needsHands: false,
    requiredLandmarks: ["nose", "leftShoulder", "leftHip", "leftAnkle", "leftWrist"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["nose", "leftShoulder", "leftHip", "leftAnkle", "leftWrist"]);
      const T = bodyUnit(body);
      const s = sh(body), h = hip(body), a = ankle(body), w = wrist(body), n = body.nose;
      const upsideDown = s && h && a && n ? above(a, h, body) > 0.8 && above(h, s, body) > 0.6 && n.y > s.y : false;
      const vertical = s && h && a ? Math.abs(s.x - h.x) / T < 0.35 && Math.abs(h.x - a.x) / T < 0.6 : false;
      const handsAtHips = w && h && s ? w.y < s.y + 0.2 * T && w.y > h.y - 0.6 * T : false;
      const angle = elbow(body, history);
      const straightArms = angle > 140;
      const holdMet = upsideDown && vertical && handsAtHips && straightArms;
      const metrics: FormMetric[] = [
        flag("inverted", "Upside down, feet to the ceiling", upsideDown, "Tuck and rotate until the feet point up", 20),
        metric("body_line", "Body vertical", vertical, ramp(s && h ? Math.abs(s.x - h.x) / T : 1, 0.9, 0.35), "Stack the hips over the shoulders"),
        metric("hands", "Hands by the hips, arms straight", handsAtHips && straightArms, ramp(angle, 100, 140), "Keep the arms straight along the body"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },

  // ---------------- Core
  {
    id: "side-plank",
    name: "Side Plank",
    category: "static",
    cameraAngle: "front",
    cameraGuide: "Camera facing your chest; forearm under the shoulder, hips lifted.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftAnkle", "leftElbow"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip", "leftAnkle", "leftElbow"]);
      const T = bodyUnit(body);
      const s = sh(body), h = hip(body), a = ankle(body);
      const line = bodyLineDeviation(body);
      const straight = line > 160;
      const raised = s && a ? above(s, a, body) > 0.4 : false;
      const hipsUp = h && a ? above(h, a, body) > 0.15 : false;
      const le = body.leftElbow, re = body.rightElbow, lw = body.leftWrist, rw = body.rightWrist;
      const supports = [le, re, lw, rw].filter((p): p is NonNullable<typeof p> => !!p);
      const supported = s ? supports.some((p) => p.y > s.y + 0.2 * T && Math.abs(p.x - s.x) / T < 0.4) : false;
      const holdMet = straight && raised && hipsUp && supported;
      const metrics: FormMetric[] = [
        metric("body_line", "Straight line, hips lifted", straight && hipsUp, Math.min(ramp(line, 130, 160), ramp(h && a ? above(h, a, body) : -1, -0.2, 0.15)), "Lift the hips until the body is one line"),
        flag("hands", "Elbow or hand under the shoulder", supported && raised, "Stack the elbow under the shoulder"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "reverse-plank",
    name: "Reverse Plank",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; face up, hands behind you, body straight from heels to shoulders.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftAnkle"]);
      const T = bodyUnit(body);
      const h = hip(body), a = ankle(body), s = sh(body), w = wrist(body);
      // Hands on the floor on the far side of the shoulders from the hips (a front plank has them underneath).
      const behind = s && h && w ? Math.sign(w.x - s.x) === -Math.sign(h.x - s.x) && Math.abs(w.x - s.x) / T > 0.15 && w.y > s.y + 0.2 * T : false;
      const line = bodyLineDeviation(body);
      const straight = line > 160;
      const hipsUp = h && a ? above(h, a, body) > 0.1 : false;
      const shouldersUp = s && h ? above(s, h, body) > 0.2 : false;
      const angle = elbow(body, history);
      const straightArms = angle > LOCKED_ELBOW;
      const holdMet = behind && straight && hipsUp && shouldersUp && straightArms;
      const metrics: FormMetric[] = [
        flag("hands", "Hands behind, arms locked", behind && straightArms, "Hands behind the hips, fingers forward, elbows locked"),
        metric("body_line", "Hips up, straight line", straight && hipsUp, Math.min(ramp(line, 130, 160), ramp(h && a ? above(h, a, body) : -1, -0.3, 0.1)), "Squeeze the glutes and lift the hips"),
      ];
      return baseEval(holdMet, holdMet && shouldersUp, metrics, ok);
    },
  },
  {
    id: "arch-hold",
    name: "Arch Hold",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; lying face down, chest and legs lifted off the floor.",
    needsHands: false,
    requiredLandmarks: ["nose", "leftShoulder", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["nose", "leftShoulder", "leftHip", "leftKnee", "leftAnkle"]);
      const T = bodyUnit(body);
      const s = sh(body), h = hip(body), a = ankle(body), n = body.nose;
      const chestUp = s && h ? above(s, h, body) > 0.12 : false;
      const legsUp = a && h ? above(a, h, body) > 0.12 : false;
      const kneeAng = knee(body, history);
      const legsStraight = kneeAng > 150;
      // Face down: the nose sits ahead of the shoulders, away from the hips.
      const faceDown = n && s && h ? Math.sign(n.x - s.x) === Math.sign(s.x - h.x) && Math.abs(n.x - s.x) / T > 0.12 : false;
      const holdMet = chestUp && legsUp && legsStraight && faceDown;
      const metrics: FormMetric[] = [
        metric("arch", "Chest off the floor", chestUp, ramp(s && h ? above(s, h, body) : -1, -0.2, 0.12), "Lift the chest; look forward"),
        metric("leg_extension", "Legs lifted and straight", legsUp && legsStraight, Math.min(ramp(a && h ? above(a, h, body) : -1, -0.2, 0.12), ramp(kneeAng, 110, 150)), "Squeeze the glutes and lift straight legs"),
        flag("position", "Face down", faceDown, "Lie on the front, eyes forward"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "l-hang",
    name: "L-Hang",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; hanging from the bar with straight legs held horizontal.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"]);
      const hanging = isHanging(body);
      const hipAng = stableAngle(history, body, hipAngle);
      const lShape = hipAng > 55 && hipAng < 125;
      const kneeAng = knee(body, history);
      const legsStraight = kneeAng > 140;
      const a = ankle(body), h = hip(body);
      const legsLevel = a && h ? above(a, h, body) > -0.35 : false;
      const holdMet = hanging && lShape && legsStraight && legsLevel;
      const metrics: FormMetric[] = [
        flag("hang_position", "Hanging", hanging, "Hang from the bar with straight arms"),
        metric("hip_angle", "Legs at 90°", lShape && legsLevel, Math.min(ramp(Math.abs(hipAng - 90), 60, 30), ramp(a && h ? above(a, h, body) : -1, -1, -0.35)), "Lift the legs to horizontal"),
        metric("leg_extension", "Knees locked", legsStraight, ramp(kneeAng, 90, 140), "Straighten the knees; point the toes"),
      ];
      if (mode === "perfect") metrics.push(flag("knees_locked", "Fully locked knees", kneeAng > STRAIGHT_KNEE, "Lock the knees"));
      return baseEval(holdMet, holdMet && kneeAng > STRAIGHT_KNEE, metrics, ok);
    },
  },
  {
    id: "toes-to-bar",
    name: "Toes to Bar",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; from a hang, straight legs rise until the feet reach the bar.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"]);
      const hanging = hangDepth(body) > 0.3;
      const a = ankle(body), w = wrist(body);
      const feetHigh = a && w ? above(a, w, body) > -0.45 : false;
      const kneeAng = knee(body, history);
      const legsStraight = kneeAng > 140;
      const holdMet = hanging && feetHigh && legsStraight;
      const metrics: FormMetric[] = [
        flag("hang_position", "Hanging", hanging, "Hang with the arms straight"),
        metric("hip_height", "Feet up to the bar", feetHigh, ramp(a && w ? above(a, w, body) : -2, -1.6, -0.45), "Fold and bring the feet to the hands"),
        metric("leg_extension", "Straight legs", legsStraight, ramp(kneeAng, 90, 140), "Keep the knees locked"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "ab-wheel-kneeling",
    name: "Kneeling Ab Wheel",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; kneeling rollout held at full extension, hips open.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const T = bodyUnit(body);
      const s = sh(body), w = wrist(body), k = kneeMid(body), h = hip(body);
      const reach = s && w ? Math.abs(w.x - s.x) / T : 0;
      const extended = reach > 0.7;
      const handsLow = s && w ? above(s, w, body) > 0.3 : false;
      const hipAng = stableAngle(history, body, hipAngle);
      const hipsOpen = hipAng > 145;
      const kneeling = k && h ? above(h, k, body) > 0.2 : false;
      const angle = elbow(body, history);
      const straightArms = angle > LOCKED_ELBOW;
      const holdMet = extended && handsLow && hipsOpen && kneeling && straightArms;
      const metrics: FormMetric[] = [
        metric("lean", "Rolled out to full reach", extended && handsLow, ramp(reach, 0.2, 0.7), "Roll the wheel further out"),
        metric("hip_angle", "Hips open, no pike", hipsOpen, ramp(hipAng, 100, 145), "Squeeze the glutes; do not fold at the hips"),
        metric("elbow_bend", "Arms straight", straightArms, ramp(angle, 120, LOCKED_ELBOW), "Lock the elbows"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "ab-wheel-standing",
    name: "Standing Ab Wheel",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; standing rollout held at full extension, legs straight.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"]);
      const T = bodyUnit(body);
      const s = sh(body), w = wrist(body), k = kneeMid(body), a = ankle(body);
      const reach = s && w ? Math.abs(w.x - s.x) / T : 0;
      const extended = reach > 0.8;
      const handsLow = s && w ? above(s, w, body) > 0.2 : false;
      const hipAng = stableAngle(history, body, hipAngle);
      const hipsOpen = hipAng > 145;
      const kneeAng = knee(body, history);
      const legsStraight = kneeAng > 150;
      const kneesUp = k && a ? above(k, a, body) > 0.3 : false;
      const holdMet = extended && handsLow && hipsOpen && legsStraight && kneesUp;
      const metrics: FormMetric[] = [
        metric("lean", "Rolled out to full reach", extended && handsLow, ramp(reach, 0.3, 0.8), "Roll out further"),
        metric("hip_angle", "Hips open", hipsOpen, ramp(hipAng, 100, 145), "Body in one line; glutes tight"),
        metric("leg_extension", "Legs straight, knees off the floor", legsStraight && kneesUp, Math.min(ramp(kneeAng, 110, 150), ramp(k && a ? above(k, a, body) : -1, -0.2, 0.3)), "Keep the legs straight"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },

  // ---------------- Legs
  {
    id: "lunges",
    name: "Lunges",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view; long split stance, both knees at about 90° at the bottom.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "leftKnee", "leftAnkle", "rightKnee", "rightAnkle"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftHip", "leftKnee", "leftAnkle", "rightKnee", "rightAnkle"]);
      const [k1, k2] = kneePair(body);
      const bothBent = k1 > 60 && k1 < 120 && k2 > 60 && k2 < 125;
      const split = ankleSpread(body) > 0.5;
      const lean = torsoLeanOffset(body);
      const upright = lean < 0.35;
      const holdMet = bothBent && split;
      const metrics: FormMetric[] = [
        metric("depth", "Both knees at 90°", bothBent, Math.min(ramp(Math.abs(k1 - 90), 60, 30), ramp(Math.abs(k2 - 90), 60, 35)), "Drop the back knee toward the floor"),
        metric("stance", "Long split stance", split, ramp(ankleSpread(body), 0.1, 0.5), "Take a longer step"),
      ];
      if (mode === "perfect") metrics.push(metric("upright", "Upright torso", upright, ramp(lean, 0.9, 0.35), "Chest up, hips under"));
      return baseEval(holdMet, holdMet && upright, metrics, ok);
    },
  },
  {
    id: "cossack-squats",
    name: "Cossack Squats",
    category: "legs",
    cameraAngle: "front",
    cameraGuide: "Camera in front; wide stance, sit fully onto one leg with the other straight.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle"]);
      const [bent, straightLeg] = kneePair(body);
      const oneDeep = bent < 100 && straightLeg > 150;
      const wide = ankleSpread(body) > 1.2;
      const h = hip(body), k = kneeMid(body);
      const low = h && k ? above(h, k, body) < 0.45 : false;
      const holdMet = oneDeep && wide && low;
      const metrics: FormMetric[] = [
        metric("depth", "Deep on one leg, other straight", oneDeep, Math.min(ramp(bent, 150, 100), ramp(straightLeg, 110, 150)), "Sit all the way down on one side"),
        metric("stance", "Wide stance", wide, ramp(ankleSpread(body), 0.6, 1.2), "Step the feet wider"),
        flag("hips", "Hips low", low, "Sink the hips to the heel"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "single-leg-rdl",
    name: "Single-Leg RDL",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view; hinge on one leg until the torso and back leg are level.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftKnee", "leftAnkle", "rightAnkle"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip", "leftKnee", "leftAnkle", "rightAnkle"]);
      const level = torsoLevelOffset(body);
      const torsoFlat = level < 0.4;
      const h = hip(body);
      const la = body.leftAnkle, ra = body.rightAnkle;
      const freeLift = h && la && ra ? Math.max(above(la, h, body), above(ra, h, body)) : -Infinity;
      const standDrop = h && la && ra ? Math.min(above(la, h, body), above(ra, h, body)) : Infinity;
      const legUp = freeLift > -0.45 && standDrop < -0.8;
      const [, straightLeg] = kneePair(body);
      const backLegStraight = straightLeg > 150;
      const holdMet = torsoFlat && legUp && backLegStraight;
      const metrics: FormMetric[] = [
        metric("horizontal", "Torso level", torsoFlat, ramp(level, 1, 0.4), "Hinge until the chest faces the floor"),
        metric("single_leg", "Back leg level and straight", legUp && backLegStraight, Math.min(ramp(freeLift, -1.2, -0.45), ramp(straightLeg, 110, 150)), "Reach the free leg back and up"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "natural-leg-extensions",
    name: "Natural Leg Extensions",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view; kneeling with the hips open, lean the whole body back.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip", "leftKnee", "leftAnkle"]);
      const k = kneeMid(body), a = ankle(body);
      const kneeling = k && a ? Math.abs(above(k, a, body)) < 0.3 : false;
      const hipAng = stableAngle(history, body, hipAngle);
      const hipsOpen = hipAng > 150;
      const lean = torsoLeanOffset(body);
      const leaningBack = lean > 0.3;
      const holdMet = kneeling && hipsOpen && leaningBack;
      const metrics: FormMetric[] = [
        flag("knee_stack", "Kneeling, shins down", kneeling, "Kneel with the feet anchored"),
        metric("hip_angle", "Hips open", hipsOpen, ramp(hipAng, 110, 150), "Squeeze the glutes; do not fold"),
        metric("lean", "Leaning back", leaningBack, ramp(lean, 0, 0.3), "Lean the whole body back from the knees"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
];
