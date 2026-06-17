import type { HandLandmarks, Landmark } from "../pose/provider";
import { SKILLS, evaluateSkill } from "./registry";
import type { HoldMode } from "../hold/stateMachine";

export interface SkillDetectionResult {
  skillId: string;
  skillName: string;
  confidence: number;
  holdMatch: boolean;
  formScore: number;
}

const MIN_CONFIDENCE = 45;
const MIN_MARGIN = 6;

const INVERTED_SKILLS = new Set([
  "handstand",
  "handstand-push-ups-90",
  "handstand-push-ups",
  "one-arm-handstand",
  "frog-stand",
  "crow-pose",
]);

const PLANCHE_SKILLS = new Set([
  "planche-lean",
  "pseudo-planche-push-ups",
  "tuck-planche",
  "advanced-tuck-planche",
  "straddle-planche",
  "planche",
]);

const HANG_SKILLS = new Set([
  "dead-hang",
  "scapular-pulls",
  "pull-ups",
  "chin-ups",
  "muscle-up",
]);

const UPRIGHT_PUSH_PULL = new Set([
  "dips",
  "pull-ups",
  "chin-ups",
  "push-ups",
  "muscle-up",
  "plank-hold",
  "pseudo-planche-push-ups",
]);

interface PoseContext {
  inverted: boolean;
  hanging: boolean;
}

function inferPoseContext(
  body: Record<string, Landmark | null>
): PoseContext {
  const nose = body.nose;
  const ankles = [body.leftAnkle, body.rightAnkle].filter(
    (lm): lm is Landmark => !!lm
  );
  const shoulder = body.leftShoulder && body.rightShoulder
    ? { x: (body.leftShoulder.x + body.rightShoulder.x) / 2, y: (body.leftShoulder.y + body.rightShoulder.y) / 2 }
    : body.leftShoulder ?? body.rightShoulder;
  const wrist = body.leftWrist && body.rightWrist
    ? { x: (body.leftWrist.x + body.rightWrist.x) / 2, y: (body.leftWrist.y + body.rightWrist.y) / 2 }
    : body.leftWrist ?? body.rightWrist;

  const inverted =
    !!nose && ankles.length > 0
      ? Math.min(...ankles.map((a) => a.y)) < nose.y - 0.04
      : false;

  const hanging =
    !!shoulder && !!wrist ? wrist.y < shoulder.y - 0.04 : false;

  return { inverted, hanging };
}

function contextBonus(skillId: string, context: PoseContext): number {
  if (context.inverted) {
    if (INVERTED_SKILLS.has(skillId)) return 35;
    if (PLANCHE_SKILLS.has(skillId) || UPRIGHT_PUSH_PULL.has(skillId)) return -50;
  } else if (PLANCHE_SKILLS.has(skillId) && !context.hanging) {
    return 20;
  }
  if (context.hanging) {
    if (HANG_SKILLS.has(skillId)) return 25;
    if (skillId === "plank-hold" || INVERTED_SKILLS.has(skillId)) return -40;
  } else if (HANG_SKILLS.has(skillId)) {
    return -35;
  }
  return 0;
}

interface RankedSkill {
  skillId: string;
  skillName: string;
  holdMatch: boolean;
  formScore: number;
  rankScore: number;
}

/**
 * Guess which calisthenics skill the user is performing from pose geometry.
 * Returns null when confidence is too low to switch skills.
 */
export function detectSkill(
  body: Record<string, Landmark | null>,
  hands: HandLandmarks,
  history: Record<string, Landmark | null>[],
  mode: HoldMode = "hold_only"
): SkillDetectionResult | null {
  const context = inferPoseContext(body);
  const ranked: RankedSkill[] = SKILLS.map((skill) => {
    const evaluation = evaluateSkill(skill.id, body, hands, history, mode);
    if (!evaluation) {
      return {
        skillId: skill.id,
        skillName: skill.name,
        holdMatch: false,
        formScore: 0,
        rankScore: 0,
      };
    }

    const holdMatch =
      mode === "perfect"
        ? evaluation.perfectCriteriaMet
        : evaluation.holdCriteriaMet;

    const rankScore =
      (holdMatch ? 100 + evaluation.formScore : evaluation.formScore) +
      contextBonus(skill.id, context);

    return {
      skillId: skill.id,
      skillName: skill.name,
      holdMatch,
      formScore: evaluation.formScore,
      rankScore,
    };
  }).sort((a, b) => b.rankScore - a.rankScore);

  const holdMatches = ranked.filter((entry) => entry.holdMatch);
  const pool = holdMatches.length > 0 ? holdMatches : ranked;
  const top = pool[0];
  const second = pool[1];

  if (!top || top.rankScore < MIN_CONFIDENCE) return null;

  const margin = top.rankScore - (second?.rankScore ?? 0);
  if (!top.holdMatch && margin < MIN_MARGIN) return null;

  const confidence = top.holdMatch
    ? Math.min(100, Math.round(top.formScore * 0.5 + 50 + margin * 0.3))
    : Math.min(85, Math.round(top.formScore * 0.4 + margin * 0.5));

  return {
    skillId: top.skillId,
    skillName: top.skillName,
    confidence,
    holdMatch: top.holdMatch,
    formScore: top.formScore,
  };
}
