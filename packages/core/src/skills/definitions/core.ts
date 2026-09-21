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
  torsoLevelOffset,
} from "../helpers";

export const CORE_SKILLS: SkillDefinition[] = [
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
    id: "hollow-body-hold",
    name: "Hollow Body Hold",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view, lying on the back; shoulders and straight legs off the floor.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip", "leftKnee", "leftAnkle"]);
      const sh = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const ankle = midpoint(body.leftAnkle, body.rightAnkle);
      const shouldersUp = above(sh, hip, body) > 0.15;
      const legsUp = above(ankle, hip, body) > 0.2;
      const flat = horizontalBodyScore(body) > 0.6;
      const kneeAng = knee(body, history);
      const legsStraight = kneeAng > 150;
      const holdMet = shouldersUp && legsUp && flat && legsStraight && !isInverted(body);
      const metrics: FormMetric[] = [
        metric("hollow", "Shoulders off the floor", shouldersUp, ramp(above(sh, hip, body), -0.2, 0.15), "Lift the shoulders, ribs down"),
        metric("leg_extension", "Legs off the floor, straight", legsUp && legsStraight, Math.min(ramp(above(ankle, hip, body), -0.2, 0.2), ramp(kneeAng, 110, 150)), "Legs long and lifted, toes pointed"),
      ];
      if (mode === "perfect") {
        metrics.push(metric("horizontal", "Low and level", flat, ramp(horizontalBodyScore(body), 0.3, 0.6), "Keep the hold low; lower back pressed down"));
      }
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "tuck-sit",
    name: "Tuck Sit",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view on the floor or parallettes; knees pulled up, feet off the ground.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "leftWrist", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftHip", "leftWrist", "leftKnee", "leftAnkle"]);
      const hip = midpoint(body.leftHip, body.rightHip);
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const ankle = midpoint(body.leftAnkle, body.rightAnkle);
      const hipUp = above(hip, wrist, body) > -0.25;
      const kneeAng = knee(body, history);
      const tucked = kneeAng < 100;
      const feetUp = above(ankle, hip, body) > -0.35;
      const holdMet = hipUp && tucked && feetUp && !isInverted(body);
      const metrics: FormMetric[] = [
        metric("hip_height", "Hips lifted", hipUp, ramp(above(hip, wrist, body), -1, -0.25), CUES.lSit.hipHeight),
        metric("depth", "Knees tucked, feet up", tucked && feetUp, Math.min(ramp(kneeAng, 160, 100), ramp(above(ankle, hip, body), -1, -0.35)), "Pull the knees up and lift the feet"),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_depression", "Shoulders down", !shouldersShrugged(body), CUES.lSit.scapDepression));
      }
      return baseEval(holdMet, holdMet && !shouldersShrugged(body), metrics, ok);
    },
  },
  {
    id: "one-leg-l-sit",
    name: "One-Leg L-Sit",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; one leg straight and level, the other tucked.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "leftWrist", "leftKnee", "rightKnee"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftHip", "leftWrist", "leftKnee", "rightKnee"]);
      const hip = midpoint(body.leftHip, body.rightHip);
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const hipUp = above(hip, wrist, body) > -0.25;
      const [bent, straight] = kneePair(body);
      const split = bent < 120 && straight > 150;
      const holdMet = hipUp && split && !isInverted(body);
      const metrics: FormMetric[] = [
        metric("hip_height", "Hips lifted", hipUp, ramp(above(hip, wrist, body), -1, -0.25), CUES.lSit.hipHeight),
        metric("leg_extension", "One leg extended", split, Math.min(ramp(bent, 170, 120), ramp(straight, 100, 150)), "Extend one leg level, keep the other tucked"),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_depression", "Shoulders down", !shouldersShrugged(body), CUES.lSit.scapDepression));
      }
      return baseEval(holdMet, holdMet && !shouldersShrugged(body), metrics, ok);
    },
  },
  {
    id: "v-sit",
    name: "V-Sit",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; straight legs raised above hip height.",
    needsHands: false,
    requiredLandmarks: ["leftHip", "leftWrist", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftHip", "leftWrist", "leftKnee", "leftAnkle"]);
      const hip = midpoint(body.leftHip, body.rightHip);
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const ankle = midpoint(body.leftAnkle, body.rightAnkle);
      const hipUp = above(hip, wrist, body) > -0.25;
      const kneeAng = knee(body, history);
      const straight = kneeAng > 145;
      const feetHigh = above(ankle, hip, body) > 0.5;
      const hipAng = hipAngle(body);
      const compressed = hipAng < 70;
      const holdMet = hipUp && straight && feetHigh && compressed && !isInverted(body);
      const metrics: FormMetric[] = [
        metric("hip_height", "Hips lifted", hipUp, ramp(above(hip, wrist, body), -1, -0.25), CUES.lSit.hipHeight),
        metric("hip_angle", "Legs above the hips", feetHigh && compressed, Math.min(ramp(above(ankle, hip, body), -0.2, 0.5), ramp(hipAng, 120, 70)), "Compress: raise the feet above hip height"),
        metric("leg_extension", "Knees locked", straight, ramp(kneeAng, 100, 145), CUES.lSit.legExtension),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "hanging-knee-raises",
    name: "Hanging Knee Raise Hold",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; hang and hold the knees above hip height.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee"]);
      const hanging = isHanging(body);
      const kneePt = midpoint(body.leftKnee, body.rightKnee);
      const hip = midpoint(body.leftHip, body.rightHip);
      const kneesUp = above(kneePt, hip, body) > 0;
      const kneeAng = knee(body, history);
      const tucked = kneeAng < 110;
      const holdMet = hanging && kneesUp && tucked;
      const metrics: FormMetric[] = [
        metric("hang_position", "Hanging", hanging, ramp(hangDepth(body), 0, 0.5), CUES.basics.deadHang),
        metric("depth", "Knees above the hips", kneesUp && tucked, Math.min(ramp(above(kneePt, hip, body), -0.8, 0), ramp(kneeAng, 170, 110)), "Curl the knees up past hip height"),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_depression", "Packed shoulders", !shouldersShrugged(body), CUES.pullUps.scapInit));
      }
      return baseEval(holdMet, holdMet && !shouldersShrugged(body), metrics, ok);
    },
  },
  {
    id: "hanging-leg-raises",
    name: "Hanging Leg Raise Hold",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; hang with straight legs held above hip height.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"]);
      const hanging = isHanging(body);
      const ankle = midpoint(body.leftAnkle, body.rightAnkle);
      const hip = midpoint(body.leftHip, body.rightHip);
      const feetUp = above(ankle, hip, body) > 0;
      const kneeAng = knee(body, history);
      const straight = kneeAng > 145;
      const holdMet = hanging && feetUp && straight;
      const metrics: FormMetric[] = [
        metric("hang_position", "Hanging", hanging, ramp(hangDepth(body), 0, 0.5), CUES.basics.deadHang),
        metric("leg_extension", "Straight legs above the hips", feetUp && straight, Math.min(ramp(above(ankle, hip, body), -1, 0), ramp(kneeAng, 100, 145)), "Raise straight legs past hip height"),
      ];
      if (mode === "perfect") {
        metrics.push(flag("scap_depression", "Packed shoulders", !shouldersShrugged(body), CUES.pullUps.scapInit));
      }
      return baseEval(holdMet, holdMet && !shouldersShrugged(body), metrics, ok);
    },
  },
  {
    id: "dragon-flag",
    name: "Dragon Flag",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view on a bench; only the shoulders touch, body straight and raised.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftAnkle"]);
      const sh = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const ankle = midpoint(body.leftAnkle, body.rightAnkle);
      const raised = above(hip, sh, body) > 0.3 && above(ankle, hip, body) > 0.2;
      const line = bodyLineDeviation(body);
      const straight = line > 155;
      const hz = horizontalBodyScore(body);
      const angled = hz > 0.2 && hz < 0.9;
      const kneeAng = knee(body, history);
      const holdMet = raised && straight && angled && kneeAng > 145 && !isHanging(body);
      const metrics: FormMetric[] = [
        metric("position", "Body raised on the shoulders", raised && angled, raised ? 100 : ramp(above(hip, sh, body), -0.3, 0.3), "Lift from the shoulders, body off the bench"),
        metric("straight", "Rigid straight line", straight && kneeAng > 145, Math.min(ramp(line, 120, 155), ramp(kneeAng, 100, 145)), "No pike: squeeze glutes and legs"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "bridge",
    name: "Bridge",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view; hands and feet on the floor, hips pressed high into an arch.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip", "leftKnee", "leftAnkle"]);
      const sh = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const kneePt = midpoint(body.leftKnee, body.rightKnee);
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const hipsHigh = above(hip, sh, body) > 0.2 && above(hip, kneePt, body) > 0.05;
      const handsDown = above(wrist, hip, body) < -0.4;
      const line = bodyLineDeviation(body);
      const arched = line < 150;
      const holdMet = hipsHigh && handsDown && arched;
      const metrics: FormMetric[] = [
        metric("hip_height", "Hips pressed up", hipsHigh, ramp(above(hip, sh, body), -0.3, 0.2), "Push the hips to the ceiling"),
        metric("arch", "Full arch", arched && handsDown, ramp(line, 175, 150), "Push through the hands; open the shoulders"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
  {
    id: "glute-bridge",
    name: "Glute Bridge",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view lying on the back; hips lifted so shoulders, hips and knees line up.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftKnee", "leftAnkle"],
    evaluate(body, _hands, history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip", "leftKnee", "leftAnkle"]);
      const sh = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const kneeAng = knee(body, history);
      const kneesBent = kneeAng < 120;
      const hipAng = hipAngle(body);
      const hipsOpen = hipAng > 150;
      const lifted = above(hip, sh, body) > 0.05;
      const holdMet = kneesBent && hipsOpen && lifted && !isInverted(body);
      const metrics: FormMetric[] = [
        metric("hips", "Hips fully extended", hipsOpen && lifted, Math.min(ramp(hipAng, 110, 150), ramp(above(hip, sh, body), -0.3, 0.05)), "Squeeze the glutes and lift the hips"),
        metric("depth", "Knees bent, feet flat", kneesBent, ramp(kneeAng, 170, 120), "Heels close to the hips"),
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
    },
  },
];
