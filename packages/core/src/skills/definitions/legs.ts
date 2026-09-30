import type { SkillDefinition, FormMetric } from "../registry";
import {
  bodyLineDeviation,
  bodyUnit,
  chickenNecking,
  hangDepth,
  hipAngle,
  horizontalBodyScore,
  invertedArch,
  isHanging,
  isHorizontalHold,
  isInverted,
  kneeFlexion,
  landmarkVariance,
  midpoint,
  ramp,
  shoulderLeanOverWrists,
  shoulderStackOffset,
  shouldersShrugged,
  inWeightSupportPosition,
  type Body,
} from "../../pose/geometry";
import { stableAngle } from "../../pose/distance";
import { CUES } from "../formPointers";
import {
  LOCKED_ELBOW,
  DEEP_ELBOW,
  TOP_ELBOW,
  FOREARM_ELBOW,
  STRAIGHT_KNEE,
  SCAP_PULL_LIFT,
  baseEval,
  vis,
  elbow,
  knee,
  metric,
  flag,
  ankleSpread,
  torsoLeanOffset,
  scapularLift,
  pressingHold,
  plancheHold,
  above,
  kneePair,
} from "../helpers";

export const LEG_SKILLS: SkillDefinition[] = [
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
  {
    id: "squats",
    name: "Deep Squat Hold",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view; sit into the bottom of a squat, heels down, chest up.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "leftKnee", "leftAnkle", "leftShoulder"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftHip", "leftKnee", "leftAnkle", "leftShoulder"]);
      const [k1, k2] = kneePair(body);
      const deep = k1 < 100 && k2 < 120;
      const lean = torsoLeanOffset(body);
      const upright = lean < 0.7;
      const holdMet = deep && upright && !isInverted(body);
      const metrics: FormMetric[] = [
        metric("depth", "Squat depth", deep, ramp(k2, 160, 100), "Sit lower: hips below the knees"),
        metric("upright", "Chest up", upright, ramp(lean, 1.2, 0.7), CUES.pistolSquats.upright),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view; back flat on the wall, thighs level, shins vertical.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "leftKnee", "leftAnkle", "leftShoulder"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftHip", "leftKnee", "leftAnkle", "leftShoulder"]);
      const kneeAng = knee(body, history);
      const rightAngleKnee = kneeAng > 70 && kneeAng < 110;
      const hipAng = hipAngle(body);
      const rightAngleHip = hipAng > 70 && hipAng < 115;
      const lean = torsoLeanOffset(body);
      const upright = lean < 0.3;
      const holdMet = rightAngleKnee && rightAngleHip && upright;
      const metrics: FormMetric[] = [
        metric("depth", "Thighs level", rightAngleKnee && rightAngleHip, Math.min(ramp(Math.abs(kneeAng - 90), 60, 20), ramp(Math.abs(hipAng - 90), 60, 25)), "Slide down until the thighs are level"),
        metric("upright", "Back on the wall", upright, ramp(lean, 0.9, 0.3), "Keep the back flat against the wall"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "bulgarian-split-squats",
    name: "Bulgarian Split Squat",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view; rear foot elevated, front knee bent deep.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "leftKnee", "leftAnkle", "rightKnee", "rightAnkle"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftHip", "leftKnee", "leftAnkle", "rightKnee", "rightAnkle"]);
      const [front, rear] = kneePair(body);
      const deep = front < 105 && rear < 140;
      const la = body.leftAnkle;
      const ra = body.rightAnkle;
      const elevated = la && ra ? Math.abs(la.y - ra.y) / bodyUnit(body) > 0.3 : false;
      const lean = torsoLeanOffset(body);
      const upright = lean < 0.6;
      const holdMet = deep && elevated && !isInverted(body);
      const metrics: FormMetric[] = [
        metric("depth", "Front knee deep", deep, ramp(front, 160, 105), "Lower until the front thigh is level"),
        metric("position", "Rear foot elevated", elevated, elevated ? 100 : 30, "Rear foot up on a bench behind you"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("upright", "Upright torso", upright, ramp(lean, 1.2, 0.6), CUES.pistolSquats.upright));
      }
      return baseEval(holdMet, holdMet && upright, metrics, ok);
    },
  },
  {
    id: "single-leg-glute-bridge",
    name: "Single-Leg Glute Bridge",
    category: "legs",
    cameraAngle: "side",
    cameraGuide: "Side view; hips lifted on one leg, the other leg extended.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftKnee", "rightKnee"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip", "leftKnee", "rightKnee"]);
      const sh = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const [bent, straight] = kneePair(body);
      const oneLeg = bent < 120 && straight > 150;
      const hipAng = hipAngle(body);
      const hipsOpen = hipAng > 150;
      const lifted = above(hip, sh, body) > 0.05;
      const holdMet = oneLeg && hipsOpen && lifted && !isInverted(body);
      const metrics: FormMetric[] = [
        metric("hips", "Hips fully extended", hipsOpen && lifted, Math.min(ramp(hipAng, 110, 150), ramp(above(hip, sh, body), -0.3, 0.05)), "Squeeze the glute and lift the hips"),
        metric("leg_extension", "Free leg extended", oneLeg, Math.min(ramp(bent, 170, 120), ramp(straight, 100, 150)), "Extend the free leg in line with the body"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
];
