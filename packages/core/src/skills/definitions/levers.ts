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
  torsoLevelOffset,
  handsBehindOffset,
  kneePair,
} from "../helpers";

export const LEVER_SKILLS: SkillDefinition[] = [
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
    id: "tuck-front-lever",
    name: "Tuck Front Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view under the bar; knees pulled to the chest, back level.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.25;
      const levelOff = torsoLevelOffset(body);
      const level = levelOff < 0.45;
      const front = handsBehindOffset(body) < 0.3;
      const legs = ((b: Body, h: Body[]) => { const k = knee(b, h); return { passed: k < 100, score: ramp(k, 160, 100) }; })(body, history);
      const holdMet = hanging && level && front && legs.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("horizontal", "Torso level", hanging && level, hanging ? ramp(levelOff, 1.2, 0.45) : 20, CUES.frontLever.horizontal),
        metric("leg_extension", "Tight tuck", legs.passed, legs.score, "Pull the knees to the chest"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), CUES.frontLever.straight));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "advanced-tuck-front-lever",
    name: "Advanced Tuck Front Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; knees bent but hips open so the back is flat.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.25;
      const levelOff = torsoLevelOffset(body);
      const level = levelOff < 0.45;
      const front = handsBehindOffset(body) < 0.3;
      const legs = ((b: Body, h: Body[]) => { const k = knee(b, h); const hip = hipAngle(b); const passed = k >= 90 && k <= 140 && hip > 110; return { passed, score: passed ? 100 : Math.min(ramp(Math.abs(k - 115), 70, 25), ramp(hip, 70, 110)) }; })(body, history);
      const holdMet = hanging && level && front && legs.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("horizontal", "Torso level", hanging && level, hanging ? ramp(levelOff, 1.2, 0.45) : 20, CUES.frontLever.horizontal),
        metric("leg_extension", "Open hips, knees bent", legs.passed, legs.score, "Open the hips until the back is flat"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), CUES.frontLever.straight));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "one-leg-front-lever",
    name: "One-Leg Front Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; one leg straight and level, the other tucked.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.25;
      const levelOff = torsoLevelOffset(body);
      const level = levelOff < 0.45;
      const front = handsBehindOffset(body) < 0.3;
      const legs = ((b: Body, _h: Body[]) => { const [bent, straight] = kneePair(b); const passed = bent < 120 && straight > 150; return { passed, score: Math.min(ramp(bent, 170, 120), ramp(straight, 100, 150)) }; })(body, history);
      const holdMet = hanging && level && front && legs.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("horizontal", "Torso level", hanging && level, hanging ? ramp(levelOff, 1.2, 0.45) : 20, CUES.frontLever.horizontal),
        metric("leg_extension", "One leg extended", legs.passed, legs.score, "Extend one leg fully, keep the other tucked"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), CUES.frontLever.straight));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "straddle-front-lever",
    name: "Straddle Front Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Front-diagonal view; legs straight and wide, body level.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.25;
      const levelOff = torsoLevelOffset(body);
      const level = levelOff < 0.45;
      const front = handsBehindOffset(body) < 0.3;
      const legs = ((b: Body, h: Body[]) => { const spread = ankleSpread(b); const k = knee(b, h); const passed = spread > 0.5 && k > 140; return { passed, score: Math.min(ramp(spread, 0, 0.5), ramp(k, 90, 140)) }; })(body, history);
      const holdMet = hanging && level && front && legs.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("horizontal", "Torso level", hanging && level, hanging ? ramp(levelOff, 1.2, 0.45) : 20, CUES.frontLever.horizontal),
        metric("leg_extension", "Straddle", legs.passed, legs.score, "Spread the legs wide with knees locked"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), CUES.frontLever.straight));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "german-hang",
    name: "German Hang",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; hang below the bar with the arms behind you, body vertical.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.2;
      const behind = handsBehindOffset(body);
      const handsBack = behind > 0.25;
      const shape = ((b: Body, _h: Body[]) => { const h = horizontalBodyScore(b); return { passed: h < 0.35, score: ramp(h, 0.8, 0.35) }; })(body, history);
      const holdMet = hanging && handsBack && shape.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("hands", "Hands behind the body", hanging && handsBack, hanging ? ramp(behind, -0.2, 0.25) : 20, "Hang with the bar behind you"),
        metric("position", "Body hanging vertical", shape.passed, shape.score, "Let the body hang straight down"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), "Lock the elbows"));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "tuck-back-lever",
    name: "Tuck Back Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; face down under the bar, knees tucked, back level.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.2;
      const behind = handsBehindOffset(body);
      const handsBack = behind > 0.25;
      const shape = ((b: Body, h: Body[]) => { const level = torsoLevelOffset(b) < 0.45; const k = knee(b, h); const passed = level && k < 100; return { passed, score: Math.min(ramp(torsoLevelOffset(b), 1.2, 0.45), ramp(k, 160, 100)) }; })(body, history);
      const holdMet = hanging && handsBack && shape.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("hands", "Hands behind the body", hanging && handsBack, hanging ? ramp(behind, -0.2, 0.25) : 20, "Hang with the bar behind you"),
        metric("horizontal", "Level tuck", shape.passed, shape.score, "Lift the hips until the back is level"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), "Lock the elbows"));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "advanced-tuck-back-lever",
    name: "Advanced Tuck Back Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; back level, hips open, knees bent.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.2;
      const behind = handsBehindOffset(body);
      const handsBack = behind > 0.25;
      const shape = ((b: Body, h: Body[]) => { const level = torsoLevelOffset(b) < 0.45; const k = knee(b, h); const hip = hipAngle(b); const passed = level && k >= 90 && k <= 140 && hip > 110; return { passed, score: passed ? 100 : Math.min(ramp(torsoLevelOffset(b), 1.2, 0.45), ramp(hip, 70, 110)) }; })(body, history);
      const holdMet = hanging && handsBack && shape.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("hands", "Hands behind the body", hanging && handsBack, hanging ? ramp(behind, -0.2, 0.25) : 20, "Hang with the bar behind you"),
        metric("horizontal", "Open hips, level back", shape.passed, shape.score, "Open the hips, keep the back flat"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), "Lock the elbows"));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "straddle-back-lever",
    name: "Straddle Back Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Front-diagonal view; body level, legs straight and wide.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.2;
      const behind = handsBehindOffset(body);
      const handsBack = behind > 0.25;
      const shape = ((b: Body, h: Body[]) => { const level = torsoLevelOffset(b) < 0.45; const spread = ankleSpread(b); const k = knee(b, h); const passed = level && spread > 0.5 && k > 140; return { passed, score: Math.min(ramp(torsoLevelOffset(b), 1.2, 0.45), ramp(spread, 0, 0.5), ramp(k, 90, 140)) }; })(body, history);
      const holdMet = hanging && handsBack && shape.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("hands", "Hands behind the body", hanging && handsBack, hanging ? ramp(behind, -0.2, 0.25) : 20, "Hang with the bar behind you"),
        metric("horizontal", "Level straddle", shape.passed, shape.score, "Spread the legs wide, body level"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), "Lock the elbows"));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
  {
    id: "back-lever",
    name: "Back Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; body level and straight, face down, hands behind.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = hangDepth(body) > 0.2;
      const behind = handsBehindOffset(body);
      const handsBack = behind > 0.25;
      const shape = ((b: Body, h: Body[]) => { const hz = horizontalBodyScore(b); const line = bodyLineDeviation(b); const k = knee(b, h); const passed = hz > 0.7 && line > 155 && k > 150; return { passed, score: Math.min(ramp(hz, 0.3, 0.7), ramp(line, 120, 155), ramp(k, 110, 150)) }; })(body, history);
      const holdMet = hanging && handsBack && shape.passed;
      const angle = elbow(body, history);
      const straightArms = angle > 150;
      const metrics: FormMetric[] = [
        metric("hands", "Hands behind the body", hanging && handsBack, hanging ? ramp(behind, -0.2, 0.25) : 20, "Hang with the bar behind you"),
        metric("horizontal", "Straight, level body", shape.passed, shape.score, "Squeeze everything and keep the body level"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("elbows", "Straight arms", straightArms, ramp(angle, 110, 150), "Lock the elbows"));
      }
      return baseEval(holdMet, holdMet && straightArms, metrics, ok);
    },
  },
];
