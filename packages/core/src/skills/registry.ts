import type { HandLandmarks, Landmark } from "../pose/provider";
import {
  bodyLineDeviation,
  bodyUnit,
  chickenNecking,
  elbowAngle,
  hangDepth,
  hipAngle,
  horizontalBodyScore,
  invertedArch,
  isHanging,
  isHorizontalHold,
  isInverted,
  kneeAngle,
  kneeFlexion,
  landmarkVariance,
  midpoint,
  ramp,
  shoulderLeanOverWrists,
  shoulderStackOffset,
  shouldersShrugged,
  visibilityScore,
  inWeightSupportPosition,
  type Body,
} from "../pose/geometry";
import { computeFormScore } from "../scoring/formScore";
import { getDistanceContext, stableAngle } from "../pose/distance";
import { CUES } from "./formPointers";

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
  /** Raw geometry behind the rules, for tuning against real footage. */
  measures?: RuleMeasures;
}

export interface RuleMeasures {
  /** Torso length in frame units (the body unit every threshold uses). */
  T: number;
  elbow: number;
  knee: number;
  hip: number;
  bodyLine: number;
  horizontal: number;
  hangDepth: number;
  lean: number;
  inverted: boolean;
  support: boolean;
  visibility: number;
}

const MEASURE_KEYS = ["nose", "leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftWrist", "rightWrist", "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle"];

export function measureBody(body: Body): RuleMeasures {
  return {
    T: Math.round(bodyUnit(body) * 1000) / 1000,
    elbow: Math.round(elbowAngle(body)),
    knee: Math.round(kneeAngle(body)),
    hip: Math.round(hipAngle(body)),
    bodyLine: Math.round(bodyLineDeviation(body)),
    horizontal: Math.round(horizontalBodyScore(body) * 100) / 100,
    hangDepth: Math.round(hangDepth(body) * 100) / 100,
    lean: Math.round(shoulderLeanOverWrists(body) * 100) / 100,
    inverted: isInverted(body),
    support: inWeightSupportPosition(body),
    visibility: Math.round(visibilityScore(body, MEASURE_KEYS) * 100) / 100,
  };
}

export interface SkillDefinition {
  id: string;
  name: string;
  category: SkillCategory;
  cameraAngle: CameraAngle;
  cameraGuide: string;
  needsHands: boolean;
  requiredLandmarks: string[];
  /**
   * Rule-based evaluator: pretrained pose landmarks → geometry → cues.
   * Landmarks must be isotropic (see `toIsotropic`); thresholds are in body
   * units (torso lengths) so they hold at any distance or frame size.
   */
  evaluate: (
    body: Body,
    hands: HandLandmarks,
    history: Body[],
    mode: "hold_only" | "perfect"
  ) => SkillEvaluation;
}

import { PUSH_SKILLS } from "./definitions/push";
import { PULL_SKILLS } from "./definitions/pull";
import { HANDSTAND_SKILLS } from "./definitions/handstand";
import { LEVER_SKILLS } from "./definitions/levers";
import { PLANCHE_SKILLS } from "./definitions/planche";
import { CORE_SKILLS } from "./definitions/core";
import { LEG_SKILLS } from "./definitions/legs";

export const SKILLS: SkillDefinition[] = [
  ...PUSH_SKILLS,
  ...PULL_SKILLS,
  ...HANDSTAND_SKILLS,
  ...LEVER_SKILLS,
  ...PLANCHE_SKILLS,
  ...CORE_SKILLS,
  ...LEG_SKILLS,
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
  body: Body,
  hands: HandLandmarks,
  history: Body[],
  mode: "hold_only" | "perfect"
): SkillEvaluation | null {
  const skill = getSkill(skillId);
  if (!skill) return null;
  const evaluation = skill.evaluate(body, hands, history, mode);
  const ctx = getDistanceContext(body);
  return { ...evaluation, farCamera: ctx.isFar, measures: measureBody(body) };
}
