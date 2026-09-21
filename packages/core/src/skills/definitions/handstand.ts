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

export const HANDSTAND_SKILLS: SkillDefinition[] = [
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
];
