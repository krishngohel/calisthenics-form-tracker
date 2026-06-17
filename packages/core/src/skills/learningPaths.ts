import { getSkill, SKILL_MAP } from "./registry";

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  /** Skill ids ordered beginner → advanced. */
  skillIds: string[];
}

/**
 * Progressive learning paths — each skill appears once, ordered by difficulty
 * within its track. Rule-based coaching applies at every step; no extra training data.
 */
export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "push",
    name: "Push Strength",
    description:
      "Plank → pressing → dips → planche lean through full planche.",
    skillIds: [
      "plank-hold",
      "push-ups",
      "dips",
      "planche-lean",
      "pseudo-planche-push-ups",
      "tuck-planche",
      "advanced-tuck-planche",
      "straddle-planche",
      "planche",
    ],
  },
  {
    id: "pull",
    name: "Pull Strength",
    description:
      "Hang basics → chin-ups → pull-ups → muscle-up → front lever.",
    skillIds: [
      "dead-hang",
      "scapular-pulls",
      "chin-ups",
      "pull-ups",
      "muscle-up",
      "skin-the-cat",
      "front-lever",
    ],
  },
  {
    id: "handstand",
    name: "Handstand Line",
    description:
      "Arm balances → handstand line → bent-arm strength → one-arm line.",
    skillIds: [
      "frog-stand",
      "crow-pose",
      "handstand",
      "handstand-push-ups-90",
      "handstand-push-ups",
      "one-arm-handstand",
    ],
  },
  {
    id: "static-strength",
    name: "Static Strength",
    description: "Compression and hip flexor strength — master the L-sit hold.",
    skillIds: ["l-sit"],
  },
  {
    id: "legs",
    name: "Leg Mastery",
    description:
      "Single-leg strength, deep flexion, and balance on unstable surfaces.",
    skillIds: [
      "pistol-squats",
      "shrimp-squats",
      "dragon-squats",
      "sissy-squats",
      "nordic-curls",
      "bosu-single-leg-squats",
    ],
  },
];

export const LEARNING_PATH_MAP = Object.fromEntries(
  LEARNING_PATHS.map((p) => [p.id, p])
);

/** Resolve a path with full skill definitions (skips unknown ids). */
export function getLearningPath(pathId: string): (LearningPath & {
  skills: NonNullable<ReturnType<typeof getSkill>>[];
}) | undefined {
  const path = LEARNING_PATH_MAP[pathId];
  if (!path) return undefined;
  const skills = path.skillIds
    .map((id) => getSkill(id))
    .filter((s): s is NonNullable<typeof s> => !!s);
  return { ...path, skills };
}

export function getPathForSkill(skillId: string): LearningPath | undefined {
  return LEARNING_PATHS.find((p) => p.skillIds.includes(skillId));
}

/** 1-based step index within the skill's path, or 0 if not in a path. */
export function getSkillPathStep(skillId: string): {
  path: LearningPath;
  step: number;
  total: number;
} | null {
  const path = getPathForSkill(skillId);
  if (!path) return null;
  const index = path.skillIds.indexOf(skillId);
  if (index < 0) return null;
  return { path, step: index + 1, total: path.skillIds.length };
}

/** Validate every registered skill is assigned to exactly one path. */
export function validateLearningPaths(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const path of LEARNING_PATHS) {
    for (const id of path.skillIds) {
      if (!SKILL_MAP[id]) errors.push(`Unknown skill "${id}" in path "${path.id}"`);
      if (seen.has(id)) errors.push(`Skill "${id}" appears in multiple paths`);
      seen.add(id);
    }
  }

  for (const id of Object.keys(SKILL_MAP)) {
    if (!seen.has(id)) errors.push(`Skill "${id}" is not in any learning path`);
  }

  return errors;
}
