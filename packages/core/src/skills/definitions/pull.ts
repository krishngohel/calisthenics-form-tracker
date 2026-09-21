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
  elbowPair,
} from "../helpers";

export const PULL_SKILLS: SkillDefinition[] = [
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
    id: "negative-pull-ups",
    name: "Negative Pull-Up Hold",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view; hold the halfway point of the lowering phase.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "nose"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "nose"]);
      const angle = elbow(body, history);
      const hanging = hangDepth(body) > 0.2;
      const midRange = angle > 70 && angle < 140;
      const holdMet = hanging && midRange;
      const packed = !shouldersShrugged(body);
      const metrics: FormMetric[] = [
        metric("hang_position", "On the bar", hanging, ramp(hangDepth(body), -0.2, 0.2), CUES.basics.deadHang),
        metric("elbow_bend", "Halfway hold", midRange, midRange ? 100 : ramp(Math.abs(angle - 105), 70, 35), "Hold with elbows around ninety degrees"),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_init", "Packed shoulders", packed, CUES.pullUps.scapInit));
      }
      return baseEval(holdMet, holdMet && packed, metrics, ok);
    },
  },
  {
    id: "l-sit-pull-ups",
    name: "L-Sit Pull-Ups",
    category: "upper",
    cameraAngle: "side",
    cameraGuide: "Side view, legs held out level while pulling chin over the bar.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "nose", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "nose", "leftHip", "leftKnee"]);
      const T = bodyUnit(body);
      const angle = elbow(body, history);
      const nose = body.nose;
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const chinRise = nose && wrist ? (wrist.y - nose.y) / T : -Infinity;
      const top = angle < 120 && chinRise > -0.15;
      const hipAng = hipAngle(body);
      const kneeAng = knee(body, history);
      const legsL = hipAng > 55 && hipAng < 125 && kneeAng > 140;
      const holdMet = top && legsL;
      const metrics: FormMetric[] = [
        metric("chin_height", "Chin over bar", top, top ? 100 : Math.min(ramp(angle, 175, 120), ramp(chinRise, -1, -0.15)) * 0.6, CUES.pullUps.chinHeight),
        metric("hip_angle", "Legs held level", legsL, Math.min(ramp(Math.abs(hipAng - 90), 60, 30), ramp(kneeAng, 90, 140)), CUES.lSit.legExtension),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_init", "Packed shoulders", !shouldersShrugged(body), CUES.pullUps.scapInit));
      }
      return baseEval(holdMet, holdMet && !shouldersShrugged(body), metrics, ok);
    },
  },
  {
    id: "archer-pull-ups",
    name: "Archer Pull-Ups",
    category: "upper",
    cameraAngle: "front",
    cameraGuide: "Front view: chin to one hand while the other arm stays straight.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftElbow", "leftWrist", "rightElbow", "rightWrist", "nose"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist", "rightElbow", "rightWrist", "nose"]);
      const T = bodyUnit(body);
      const [bent, straight] = elbowPair(body);
      const nose = body.nose;
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const chinRise = nose && wrist ? (wrist.y - nose.y) / T : -Infinity;
      const chinUp = chinRise > -0.3;
      const asymmetric = bent < 100 && straight > 150;
      const holdMet = hangDepth(body) > -0.2 && chinUp && asymmetric;
      const metrics: FormMetric[] = [
        metric("chin_height", "Chin to the working hand", chinUp, ramp(chinRise, -1, -0.3), CUES.pullUps.chinHeight),
        metric("arms", "One arm straight", asymmetric, Math.min(ramp(bent, 160, 100), ramp(straight, 110, 150)), "Keep the far arm straight and locked"),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_init", "Packed shoulders", !shouldersShrugged(body), CUES.pullUps.scapInit));
      }
      return baseEval(holdMet, holdMet && !shouldersShrugged(body), metrics, ok);
    },
  },
  {
    id: "one-arm-pull-ups",
    name: "One-Arm Pull-Up",
    category: "upper",
    cameraAngle: "front",
    cameraGuide: "Front view; only one hand on the bar, chin at hand height.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "rightWrist", "nose"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "rightWrist", "nose"]);
      const T = bodyUnit(body);
      const sh = midpoint(body.leftShoulder, body.rightShoulder);
      const lw = body.leftWrist;
      const rw = body.rightWrist;
      if (!sh || !lw || !rw) return baseEval(false, false, [flag("hang_position", "One hand on the bar", false, "Hang from one hand")], ok);
      const high = lw.y < rw.y ? lw : rw;
      const low = lw.y < rw.y ? rw : lw;
      const oneHanded = (sh.y - high.y) / T > 0.15 && (low.y - sh.y) / T > -0.1;
      const nose = body.nose;
      const chinRise = nose ? (high.y - nose.y) / T : -Infinity;
      const chinUp = chinRise > -0.35;
      const holdMet = oneHanded && chinUp;
      const metrics: FormMetric[] = [
        metric("hang_position", "One hand on the bar", oneHanded, oneHanded ? 100 : 30, "Hang from one hand, other hand free"),
        metric("chin_height", "Chin at the hand", chinUp, ramp(chinRise, -1.2, -0.35), CUES.pullUps.chinHeight),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "human-flag",
    name: "Human Flag",
    category: "static",
    cameraAngle: "front",
    cameraGuide: "Face the pole side-on to the camera; body level, one hand high, one low.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "rightWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "rightWrist", "leftHip", "leftAnkle"]);
      const T = bodyUnit(body);
      const lw = body.leftWrist;
      const rw = body.rightWrist;
      const gap = lw && rw ? Math.abs(lw.y - rw.y) / T : 0;
      const stacked = gap > 0.9;
      const horiz = horizontalBodyScore(body);
      const level = horiz > 0.65;
      const line = bodyLineDeviation(body);
      const straight = line > 155;
      const holdMet = stacked && level;
      const metrics: FormMetric[] = [
        metric("hands", "Hands stacked on the pole", stacked, ramp(gap, 0.2, 0.9), "One hand high, one low, arms locked"),
        metric("horizontal", "Body level", level, ramp(horiz, 0.3, 0.65), "Drive the hips up until the body is level"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("straight", "Straight body", straight, ramp(line, 120, 155), "Squeeze glutes and legs together"));
      }
      return baseEval(holdMet, holdMet && straight, metrics, ok);
    },
  },
];
