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
  wristSpread,
  elbowPair,
  torsoLevelOffset,
} from "../helpers";

export const PUSH_SKILLS: SkillDefinition[] = [
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
    id: "knee-push-ups",
    name: "Knee Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view, knees on the floor, straight line from head to knees.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftKnee"]);
      const angle = elbow(body, history);
      const inSupport = inWeightSupportPosition(body);
      const kneePt = midpoint(body.leftKnee, body.rightKnee);
      const anklePt = midpoint(body.leftAnkle, body.rightAnkle);
      // Shins on the floor: the ankles sit above the knees.
      const kneesDown = above(anklePt, kneePt, body) > 0.1;
      const positioned = inSupport && kneesDown && horizontalBodyScore(body) > 0.4;
      const atBottom = positioned && angle < DEEP_ELBOW;
      const atTop = positioned && angle > TOP_ELBOW;
      const holdMet = atBottom || atTop;
      const metrics: FormMetric[] = [
        metric("position", "Knee push-up position", holdMet, holdMet ? (atBottom ? 95 : 85) : positioned ? 40 : 20, atTop ? CUES.pushUps.topLockout : CUES.pushUps.bottomDepth),
      ];
      if (mode === "perfect") {
        metrics.push(metric("depth", "Bottom depth", angle < DEEP_ELBOW, atTop ? 70 : ramp(angle, 150, DEEP_ELBOW), CUES.pushUps.bottomDepth));
      }
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "diamond-push-ups",
    name: "Diamond Push-Ups",
    category: "upper",
    cameraAngle: "front",
    cameraGuide: "Front-diagonal view so both hands are visible close together.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "rightWrist"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "rightWrist"]);
      const angle = elbow(body, history);
      const inSupport = inWeightSupportPosition(body);
      const spread = wristSpread(body);
      const narrow = spread < 0.45;
      const atBottom = inSupport && angle < DEEP_ELBOW;
      const atTop = inSupport && angle > TOP_ELBOW;
      const holdMet = narrow && (atBottom || atTop);
      const metrics: FormMetric[] = [
        metric("hands", "Hands together", narrow, ramp(spread, 1.2, 0.45), "Bring your hands together under your chest"),
        metric("position", "Push position", atBottom || atTop, atBottom || atTop ? 95 : inSupport ? 40 : 20, atTop ? CUES.pushUps.topLockout : CUES.pushUps.bottomDepth),
      ];
      if (mode === "perfect") {
        metrics.push(metric("plank_line", "Body line", bodyLineDeviation(body) > 160, ramp(bodyLineDeviation(body), 130, 160), CUES.basics.plank));
      }
      return baseEval(holdMet, holdMet && bodyLineDeviation(body) > 160, metrics, ok);
    },
  },
  {
    id: "archer-push-ups",
    name: "Archer Push-Ups",
    category: "upper",
    cameraAngle: "front",
    cameraGuide: "Front view: one arm bends deep while the other stays straight.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "rightElbow", "rightWrist"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "rightElbow", "rightWrist"]);
      const [bent, straight] = elbowPair(body);
      const inSupport = inWeightSupportPosition(body);
      const asymmetric = bent < DEEP_ELBOW && straight > 150;
      const holdMet = inSupport && asymmetric;
      const metrics: FormMetric[] = [
        metric("depth", "Working arm depth", bent < DEEP_ELBOW, ramp(bent, 160, DEEP_ELBOW), "Lower fully onto the working arm"),
        metric("arms", "Support arm straight", straight > 150, ramp(straight, 110, 150), "Keep the other arm straight"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("plank_line", "Body line", bodyLineDeviation(body) > 160, ramp(bodyLineDeviation(body), 130, 160), CUES.basics.plank));
      }
      return baseEval(holdMet, holdMet && bodyLineDeviation(body) > 160, metrics, ok);
    },
  },
  {
    id: "pike-push-ups",
    name: "Pike Push-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view, hips high, head lowering between the hands.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip"]);
      const angle = elbow(body, history);
      const sh = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const hipsHigh = above(hip, sh, body) > 0.4;
      const handsDown = hangDepth(body) < -0.4;
      const hipAng = hipAngle(body);
      const piked = hipAng < 120;
      const positioned = hipsHigh && handsDown && piked;
      const atBottom = positioned && angle < DEEP_ELBOW;
      const atTop = positioned && angle > TOP_ELBOW;
      const holdMet = atBottom || atTop;
      const metrics: FormMetric[] = [
        metric("pike", "Hips high, folded", positioned, positioned ? 100 : Math.min(ramp(above(hip, sh, body), -0.2, 0.4), ramp(hipAng, 170, 120)), "Push the hips up and fold at the waist"),
        metric("position", "Press position", holdMet, holdMet ? (atBottom ? 95 : 85) : 30, atTop ? CUES.pushUps.topLockout : "Lower the head toward the floor"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("depth", "Bottom depth", angle < DEEP_ELBOW, atTop ? 70 : ramp(angle, 150, DEEP_ELBOW), "Lower the head toward the floor"));
      }
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "support-hold",
    name: "Support Hold",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view on parallel bars or rings, arms locked, body upright.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "leftHip"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "leftHip"]);
      const angle = elbow(body, history);
      const locked = angle > LOCKED_ELBOW;
      const upright = horizontalBodyScore(body) < 0.35 && torsoLevelOffset(body) > 0.6;
      const handsLow = hangDepth(body) < -0.6;
      const holdMet = locked && upright && handsLow;
      const depressed = !shouldersShrugged(body);
      const metrics: FormMetric[] = [
        metric("elbow_bend", "Locked arms", locked, ramp(angle, 120, LOCKED_ELBOW), CUES.dips.topLockout),
        metric("position", "Upright support", upright && handsLow, upright && handsLow ? 100 : 30, "Press down through straight arms"),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_depression", "Shoulders down", depressed, CUES.lSit.scapDepression));
      }
      return baseEval(holdMet, holdMet && depressed, metrics, ok);
    },
  },
];
