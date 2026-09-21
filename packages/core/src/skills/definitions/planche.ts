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
];
