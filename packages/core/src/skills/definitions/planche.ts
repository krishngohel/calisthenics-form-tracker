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
} from "../helpers";

export const PLANCHE_SKILLS: SkillDefinition[] = [
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
    id: "tuck-planche-push-ups",
    name: "Tuck Planche Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; tuck planche held while the elbows bend and press.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"]);
      const angle = elbow(body, history);
      const lean = shoulderLeanOverWrists(body);
      const leanOk = lean > 0.15;
      const horiz = horizontalBodyScore(body);
      const horizOk = horiz > 0.4;
      const legs = ((b: Body, h: Body[]) => { const k = knee(b, h); return { passed: k < 100, score: ramp(k, 160, 100) }; })(body, history);
      const bottom = angle < 110;
      const top = angle > LOCKED_ELBOW;
      const holdMet = leanOk && horizOk && legs.passed && (bottom || top);
      const metrics: FormMetric[] = [
        metric("lean", "Lean held through the rep", leanOk, ramp(lean, 0, 0.15), CUES.pseudoPlanche.lean),
        metric("horizontal", "Body level", horizOk, ramp(horiz, 0.05, 0.4), CUES.planche.horizontal),
        metric("depth", "Knee tuck", legs.passed, legs.score, "Keep the knees tight to the chest"),
        metric("position", "Bottom or lockout", bottom || top, bottom ? 95 : top ? 88 : 30, "Lower with the lean, then press to lockout"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "straddle-planche-push-ups",
    name: "Straddle Planche Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side-diagonal view; straddle planche held through the press.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"]);
      const angle = elbow(body, history);
      const lean = shoulderLeanOverWrists(body);
      const leanOk = lean > 0.15;
      const horiz = horizontalBodyScore(body);
      const horizOk = horiz > 0.55;
      const legs = ((b: Body, h: Body[]) => { const spread = ankleSpread(b); const k = knee(b, h); const passed = spread > 0.45 && k > 140; return { passed, score: Math.min(ramp(spread, 0, 0.45), ramp(k, 90, 140)) }; })(body, history);
      const bottom = angle < 110;
      const top = angle > LOCKED_ELBOW;
      const holdMet = leanOk && horizOk && legs.passed && (bottom || top);
      const metrics: FormMetric[] = [
        metric("lean", "Lean held through the rep", leanOk, ramp(lean, 0, 0.15), CUES.pseudoPlanche.lean),
        metric("horizontal", "Body level", horizOk, ramp(horiz, 0.2, 0.55), CUES.planche.horizontal),
        metric("depth", "Straddle", legs.passed, legs.score, "Legs straight and wide"),
        metric("position", "Bottom or lockout", bottom || top, bottom ? 95 : top ? 88 : 30, "Lower with the lean, then press to lockout"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "planche-push-ups",
    name: "Planche Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; full planche held while the elbows bend and press.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"]);
      const angle = elbow(body, history);
      const lean = shoulderLeanOverWrists(body);
      const leanOk = lean > 0.2;
      const horiz = horizontalBodyScore(body);
      const horizOk = horiz > 0.6;
      const legs = ((b: Body, h: Body[]) => { const k = knee(b, h); const line = bodyLineDeviation(b); const passed = k > 150 && line > 150; return { passed, score: Math.min(ramp(k, 110, 150), ramp(line, 110, 150)) }; })(body, history);
      const bottom = angle < 110;
      const top = angle > LOCKED_ELBOW;
      const holdMet = leanOk && horizOk && legs.passed && (bottom || top);
      const metrics: FormMetric[] = [
        metric("lean", "Lean held through the rep", leanOk, ramp(lean, 0, 0.2), CUES.pseudoPlanche.lean),
        metric("horizontal", "Body level", horizOk, ramp(horiz, 0.25, 0.6), CUES.planche.horizontal),
        metric("depth", "Straight body", legs.passed, legs.score, "Squeeze everything; no pike"),
        metric("position", "Bottom or lockout", bottom || top, bottom ? 95 : top ? 88 : 30, "Lower with the lean, then press to lockout"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
];
