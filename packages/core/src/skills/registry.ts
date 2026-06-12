import type { HandLandmarks, Landmark } from "../pose/provider";
import {
  bodyLineDeviation,
  elbowFlexion,
  horizontalBodyScore,
  isHorizontalHold,
  isInverted,
  kneeFlexion,
  landmarkVariance,
  midpoint,
  visibilityScore,
  wristsBelowShoulders,
  inWeightSupportPosition,
} from "../pose/geometry";
import { computeFormScore } from "../scoring/formScore";
import { getDistanceContext, stableAngle } from "../pose/distance";

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
}

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  cameraAngle: CameraAngle;
  cameraGuide: string;
  needsHands: boolean;
  requiredLandmarks: string[];
  evaluate: (
    body: Record<string, Landmark | null>,
    hands: HandLandmarks,
    history: Record<string, Landmark | null>[],
    mode: "hold_only" | "perfect"
  ) => SkillEvaluation;
}

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

function vis(body: Record<string, Landmark | null>, keys: string[]): boolean {
  const ctx = getDistanceContext(body);
  return visibilityScore(body, keys) > ctx.visThreshold;
}

export const SKILLS: SkillDefinition[] = [
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
      const elbow = stableAngle(history, body, (frame) =>
        Math.min(elbowFlexion(frame, "left"), elbowFlexion(frame, "right"))
      );
      const nose = body.nose;
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const chinAbove = nose && wrist ? nose.y < wrist.y + 0.05 : false;
      const holdMet = elbow < 120 && chinAbove;
      const bodyLine = bodyLineDeviation(body);
      const hollow = bodyLine > 155;
      const metrics: FormMetric[] = [
        {
          id: "chin_height",
          label: "Chin above bar",
          score: chinAbove ? 100 : 30,
          passed: !!chinAbove,
          cue: "Pull chin above wrist line",
        },
        {
          id: "elbow_bend",
          label: "Elbow flexion",
          score: elbow < 120 ? 100 : Math.max(0, 100 - (elbow - 120)),
          passed: elbow < 120,
          cue: "Bend elbows more at top",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "hollow",
          label: "Hollow body",
          score: hollow ? 100 : 50,
          passed: hollow,
          cue: "Keep ribs down, hollow body",
        });
      }
      return baseEval(holdMet, holdMet && hollow, metrics, ok);
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
      const elbow = stableAngle(history, body, (frame) =>
        Math.min(elbowFlexion(frame, "left"), elbowFlexion(frame, "right"))
      );
      const nose = body.nose;
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const chinAbove = nose && wrist ? nose.y < wrist.y + 0.05 : false;
      const holdMet = elbow < 120 && chinAbove;
      const variance =
        history.length > 5
          ? landmarkVariance(history.slice(-10), "leftHip")
          : 0;
      const noSwing = variance < 0.002;
      const metrics: FormMetric[] = [
        {
          id: "top_position",
          label: "Top hold",
          score: holdMet ? 100 : 40,
          passed: holdMet,
          cue: "Hold chin above bar",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "no_swing",
          label: "Minimal swing",
          score: noSwing ? 100 : 55,
          passed: noSwing,
          cue: "Control momentum, no kip",
        });
      }
      return baseEval(holdMet, holdMet && noSwing, metrics, ok);
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
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist"]);
      const elbow = stableAngle(history, body, (frame) =>
        Math.min(elbowFlexion(frame, "left"), elbowFlexion(frame, "right"))
      );
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      const elbowPt = midpoint(body.leftElbow, body.rightElbow);
      const inSupport = inWeightSupportPosition(body);
      const atBottom = inSupport && elbow < 100;
      const atTop = inSupport && elbow > 160;
      const holdMet = atBottom || atTop;
      const depth = elbow < 100;
      const metrics: FormMetric[] = [
        {
          id: "position",
          label: "Hold position",
          score: holdMet ? (atBottom ? 95 : 85) : 20,
          passed: holdMet,
          cue: atTop ? "Lock arms at top" : "Lower to 90° bottom",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "depth",
          label: "Bottom depth",
          score: depth ? 100 : atTop ? 70 : 40,
          passed: depth,
          cue: "Reach 90° at bottom",
        });
      }
      return baseEval(holdMet, holdMet && (depth || atTop), metrics, ok);
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
      const ok = vis(body, ["leftShoulder", "leftElbow", "leftWrist"]);
      const elbow = stableAngle(history, body, (frame) =>
        Math.min(elbowFlexion(frame, "left"), elbowFlexion(frame, "right"))
      );
      const horiz = isHorizontalHold(body);
      const inSupport = inWeightSupportPosition(body);
      const atBottom = horiz && inSupport && elbow < 100;
      const atTop = horiz && inSupport && elbow > 160;
      const holdMet = atBottom || atTop;
      const depth = elbow < 100;
      const metrics: FormMetric[] = [
        {
          id: "position",
          label: "Hold position",
          score: holdMet ? (atBottom ? 95 : 85) : 20,
          passed: holdMet,
          cue: atTop ? "Lock arms at top" : "Lower to 90° bottom",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "depth",
          label: "Bottom depth",
          score: depth ? 100 : atTop ? 70 : 40,
          passed: depth,
          cue: "Reach 90° at bottom",
        });
      }
      return baseEval(holdMet, holdMet && (depth || atTop), metrics, ok);
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
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      const transition =
        wrist && shoulder ? wrist.y < shoulder.y + 0.03 : false;
      const holdMet = transition;
      const elbow = stableAngle(history, body, (frame) =>
        Math.min(elbowFlexion(frame, "left"), elbowFlexion(frame, "right"))
      );
      const lowKip = elbow > 80;
      const metrics: FormMetric[] = [
        {
          id: "transition",
          label: "Transition hold",
          score: transition ? 100 : 25,
          passed: transition,
          cue: "Hold at transition over bar",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "control",
          label: "Controlled transition",
          score: lowKip ? 100 : 55,
          passed: lowKip,
          cue: "Avoid excessive kip",
        });
      }
      return baseEval(holdMet, holdMet && lowKip, metrics, ok);
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
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftHip", "leftWrist", "leftAnkle"]);
      const hip = midpoint(body.leftHip, body.rightHip);
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const hipUp = hip && wrist ? hip.y < wrist.y + 0.04 : false;
      const knee = Math.max(kneeFlexion(body, "left"), kneeFlexion(body, "right"));
      const legsForward = knee > 150;
      const holdMet = hipUp && legsForward;
      const kneesLocked = knee > 165;
      const metrics: FormMetric[] = [
        {
          id: "hip_height",
          label: "Hips elevated",
          score: hipUp ? 100 : 40,
          passed: hipUp,
          cue: "Press hips above wrists",
        },
        {
          id: "leg_extension",
          label: "Legs extended",
          score: legsForward ? 100 : 50,
          passed: legsForward,
          cue: "Extend legs forward",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "knees_locked",
          label: "Knees locked",
          score: kneesLocked ? 100 : 55,
          passed: kneesLocked,
          cue: "Lock knees and point toes",
        });
      }
      return baseEval(holdMet, holdMet && kneesLocked, metrics, ok);
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
      const knee = midpoint(body.leftKnee, body.rightKnee);
      const elbow = midpoint(body.leftElbow, body.rightElbow);
      const nearArms = knee && elbow ? Math.abs(knee.y - elbow.y) < 0.12 : false;
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const handsDown = wrist ? wrist.y > 0.35 : false;
      const holdMet = nearArms && handsDown;
      const sway =
        history.length > 8
          ? landmarkVariance(history.slice(-12), "leftHip")
          : 0;
      const stable = sway < 0.0015;
      const metrics: FormMetric[] = [
        {
          id: "knee_stack",
          label: "Knees on arms",
          score: nearArms ? 100 : 45,
          passed: nearArms,
          cue: "Rest knees on upper arms",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "stability",
          label: "Stable hold",
          score: stable ? 100 : 50,
          passed: stable,
          cue: "Minimize sway",
        });
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
      const knee = midpoint(body.leftKnee, body.rightKnee);
      const elbow = midpoint(body.leftElbow, body.rightElbow);
      const stacked = knee && elbow ? Math.abs(knee.y - elbow.y) < 0.1 : false;
      const holdMet = stacked;
      const elbowAng = Math.min(
        elbowFlexion(body, "left"),
        elbowFlexion(body, "right")
      );
      const straightArms = elbowAng > 150;
      const metrics: FormMetric[] = [
        {
          id: "stack",
          label: "Knee stack",
          score: stacked ? 100 : 40,
          passed: stacked,
          cue: "Stack knees on upper arms",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "arms",
          label: "Arm extension",
          score: straightArms ? 100 : 60,
          passed: straightArms,
          cue: "Straighten arms optional",
        });
      }
      return baseEval(holdMet, holdMet, metrics, ok);
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
      const holdMet = inverted;
      const line = bodyLineDeviation(body);
      const straight = line > 165;
      const metrics: FormMetric[] = [
        {
          id: "inverted",
          label: "Inverted hold",
          score: inverted ? 100 : 20,
          passed: inverted,
          cue: "Stack ankles above shoulders",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "body_line",
          label: "Straight body line",
          score: straight ? 100 : 50,
          passed: straight,
          cue: "Ribs in, straight line shoulder-hip-ankle",
        });
      }
      return baseEval(holdMet, holdMet && straight, metrics, ok);
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
      const inverted = isInverted(body);
      const leftW = body.leftWrist;
      const rightW = body.rightWrist;
      let handOff = false;
      if (leftW && rightW) {
        const yDiff = Math.abs(leftW.y - rightW.y);
        handOff = yDiff > 0.08;
      }
      // If hand tracking is active and only one hand is detected, the other
      // is likely tucked/off the floor — corroborates the wrist-height check.
      const handCount = (hands.left ? 1 : 0) + (hands.right ? 1 : 0);
      if (handCount === 1) handOff = true;
      const holdMet = inverted && handOff;
      const line = bodyLineDeviation(body);
      const straight = line > 160;
      const metrics: FormMetric[] = [
        {
          id: "inverted",
          label: "Inverted",
          score: inverted ? 100 : 25,
          passed: inverted,
          cue: "Hold inversion",
        },
        {
          id: "hand_off",
          label: "Free hand off ground",
          score: handOff ? 100 : 30,
          passed: handOff,
          cue: "Lift free hand off floor",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "line",
          label: "Stacked line",
          score: straight ? 100 : 50,
          passed: straight,
          cue: "Stack over support hand",
        });
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
      const horiz = horizontalBodyScore(body);
      const holdMet = horiz > 0.55;
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const controlled =
        shoulder && hip ? Math.abs(shoulder.y - hip.y) < 0.15 : false;
      const metrics: FormMetric[] = [
        {
          id: "arc",
          label: "Arc phase hold",
          score: holdMet ? 100 : 35,
          passed: holdMet,
          cue: "Hold through rotation phase",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "control",
          label: "Controlled tempo",
          score: controlled ? 100 : 55,
          passed: controlled,
          cue: "Move slowly through range",
        });
      }
      return baseEval(holdMet, holdMet && controlled, metrics, ok);
    },
  },
  {
    id: "front-lever",
    name: "Front Lever",
    category: "static",
    cameraAngle: "side",
    cameraGuide: "Side view, body horizontal.",
    needsHands: false,
    requiredLandmarks: ["leftShoulder", "leftHip", "leftAnkle"],
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftShoulder", "leftHip", "leftAnkle"]);
      const horiz = horizontalBodyScore(body);
      const holdMet = horiz > 0.7;
      const line = bodyLineDeviation(body);
      const straight = line > 160;
      const metrics: FormMetric[] = [
        {
          id: "horizontal",
          label: "Horizontal body",
          score: horiz > 0.7 ? 100 : Math.round(horiz * 100),
          passed: horiz > 0.7,
          cue: "Keep body parallel to ground",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "straight",
          label: "Straight body",
          score: straight ? 100 : 50,
          passed: straight,
          cue: "Protract shoulders, straight line",
        });
      }
      return baseEval(holdMet, holdMet && straight, metrics, ok);
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
      const ok = vis(body, ["leftShoulder", "leftWrist", "leftHip"]);
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      const wrist = midpoint(body.leftWrist, body.rightWrist);
      const forward =
        shoulder && wrist ? shoulder.x > wrist.x + 0.02 || shoulder.x < wrist.x - 0.02 : false;
      const horiz = horizontalBodyScore(body);
      const holdMet = horiz > 0.65 && forward;
      const elbow = stableAngle(history, body, (frame) =>
        Math.min(elbowFlexion(frame, "left"), elbowFlexion(frame, "right"))
      );
      const locked = elbow > 165;
      const metrics: FormMetric[] = [
        {
          id: "horizontal",
          label: "Body horizontal",
          score: horiz > 0.65 ? 100 : Math.round(horiz * 90),
          passed: horiz > 0.65,
          cue: "Keep body level",
        },
        {
          id: "lean",
          label: "Shoulders forward",
          score: forward ? 100 : 40,
          passed: forward,
          cue: "Lean shoulders past wrists",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "elbows",
          label: "Elbow lock",
          score: locked ? 100 : 55,
          passed: locked,
          cue: "Lock elbows out",
        });
      }
      return baseEval(holdMet, holdMet && locked, metrics, ok);
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
      const singleLeg = lKnee < 100 && rKnee > 140;
      const holdMet = singleLeg;
      const sway =
        history.length > 8
          ? landmarkVariance(history.slice(-10), "leftHip")
          : 0;
      const stable = sway < 0.002;
      const metrics: FormMetric[] = [
        {
          id: "single_leg",
          label: "Single leg depth",
          score: singleLeg ? 100 : 40,
          passed: singleLeg,
          cue: "Deep flexion on support leg",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "balance",
          label: "Balance control",
          score: stable ? 100 : 55,
          passed: stable,
          cue: "Reduce sway on Bosu",
        });
      }
      return baseEval(holdMet, holdMet && stable, metrics, ok);
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
      const pistol =
        (lKnee < 90 && rKnee > 150) || (rKnee < 90 && lKnee > 150);
      const holdMet = pistol;
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      const hip = midpoint(body.leftHip, body.rightHip);
      const upright =
        shoulder && hip ? Math.abs(shoulder.x - hip.x) < 0.08 : false;
      const metrics: FormMetric[] = [
        {
          id: "depth",
          label: "Pistol depth",
          score: pistol ? 100 : 35,
          passed: pistol,
          cue: "Bottom of pistol hold",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "upright",
          label: "Upright torso",
          score: upright ? 100 : 55,
          passed: upright,
          cue: "Keep chest up",
        });
      }
      return baseEval(holdMet, holdMet && upright, metrics, ok);
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
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftKnee", "rightKnee"]);
      const lKnee = kneeFlexion(body, "left");
      const rKnee = kneeFlexion(body, "right");
      const deep = Math.min(lKnee, rKnee) < 70;
      const holdMet = deep;
      const metrics: FormMetric[] = [
        {
          id: "depth",
          label: "Rear knee depth",
          score: deep ? 100 : 45,
          passed: deep,
          cue: "Lower rear knee toward floor",
        },
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
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
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftKnee", "rightKnee"]);
      const lKnee = kneeFlexion(body, "left");
      const rKnee = kneeFlexion(body, "right");
      const deep = Math.min(lKnee, rKnee) < 80;
      const holdMet = deep;
      const metrics: FormMetric[] = [
        {
          id: "depth",
          label: "Deep front leg flexion",
          score: deep ? 100 : 40,
          passed: deep,
          cue: "Hold deep dragon squat",
        },
      ];
      return baseEval(holdMet, holdMet, metrics, ok);
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
    evaluate(body, _hands, _history, mode) {
      const ok = vis(body, ["leftKnee", "leftAnkle"]);
      const knee = midpoint(body.leftKnee, body.rightKnee);
      const ankle = midpoint(body.leftAnkle, body.rightAnkle);
      const forward = knee && ankle ? knee.x > ankle.x + 0.02 || knee.x < ankle.x - 0.02 : false;
      const lKnee = Math.min(kneeFlexion(body, "left"), kneeFlexion(body, "right"));
      const deep = lKnee < 110;
      const holdMet = forward && deep;
      const metrics: FormMetric[] = [
        {
          id: "lean",
          label: "Knees forward lean",
          score: forward ? 100 : 45,
          passed: forward,
          cue: "Lean back, knees forward",
        },
        {
          id: "depth",
          label: "Quad flexion",
          score: deep ? 100 : 50,
          passed: deep,
          cue: "Hold deep sissy position",
        },
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
      const knee = midpoint(body.leftKnee, body.rightKnee);
      const hip = midpoint(body.leftHip, body.rightHip);
      const shoulder = midpoint(body.leftShoulder, body.rightShoulder);
      const lowering =
        knee && hip && shoulder
          ? shoulder.y > hip.y && hip.y >= knee.y - 0.05
          : false;
      const holdMet = lowering;
      const line = bodyLineDeviation(body);
      const hipsExtended = line > 150;
      const metrics: FormMetric[] = [
        {
          id: "lowering",
          label: "Lowering hold",
          score: lowering ? 100 : 35,
          passed: lowering,
          cue: "Hold controlled lowering phase",
        },
      ];
      if (mode === "perfect") {
        metrics.push({
          id: "hips",
          label: "Hips extended",
          score: hipsExtended ? 100 : 55,
          passed: hipsExtended,
          cue: "Keep hips open, no break",
        });
      }
      return baseEval(holdMet, holdMet && hipsExtended, metrics, ok);
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
  body: Record<string, Landmark | null>,
  hands: HandLandmarks,
  history: Record<string, Landmark | null>[],
  mode: "hold_only" | "perfect"
): SkillEvaluation | null {
  const skill = getSkill(skillId);
  if (!skill) return null;
  const evaluation = skill.evaluate(body, hands, history, mode);
  const ctx = getDistanceContext(body);
  return { ...evaluation, farCamera: ctx.isFar };
}
