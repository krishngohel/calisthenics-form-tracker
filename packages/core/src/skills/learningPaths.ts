import { getSkill, SKILL_MAP } from "./registry";

export interface PathGoal {
  /** Hold this long (seconds) before moving to the next step. */
  holdSec?: number;
  /** Rep-based standard, for skills trained as reps outside the app. */
  note?: string;
}

export interface PathStep {
  skillId: string;
  goal: PathGoal;
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  /** Skill ids ordered beginner → advanced (derived from `steps`). */
  skillIds: string[];
  steps: PathStep[];
  /** Where the ladder and standards come from. */
  sources: string[];
}

function path(id: string, name: string, description: string, sources: string[], steps: [string, PathGoal][]): LearningPath {
  return {
    id,
    name,
    description,
    sources,
    steps: steps.map(([skillId, goal]) => ({ skillId, goal })),
    skillIds: steps.map(([skillId]) => skillId),
  };
}

/**
 * Progressive learning paths. Each skill appears once. Orders and hold
 * standards follow the r/bodyweightfitness Recommended Routine, GMB, Cali
 * Move, Antranik and BERG progressions (see `sources`); the standard for a
 * static step is the hold time to reach before the next step.
 */
export const LEARNING_PATHS: LearningPath[] = [
  path(
    "push",
    "Push",
    "Plank → push-up variations → pike pressing. Builds the base for dips, handstand push-ups and planche.",
    ["r/bodyweightfitness Recommended Routine push-up progression", "GMB push-up progression"],
    [
      ["plank-hold", { holdSec: 60 }],
      ["knee-push-ups", { note: "3×8 clean reps" }],
      ["push-ups", { note: "3×8 clean reps" }],
      ["diamond-push-ups", { note: "3×8 clean reps" }],
      ["archer-push-ups", { note: "3×6 each side" }],
      ["pike-push-ups", { note: "3×8; then elevate the feet" }],
      ["pseudo-planche-push-ups", { note: "3×8 with a clear lean" }],
    ]
  ),
  path(
    "dips",
    "Dips",
    "Support hold → dips. The RR dip ladder; a 30 s support hold comes before loaded reps.",
    ["r/bodyweightfitness Recommended Routine dip progression"],
    [
      ["support-hold", { holdSec: 30 }],
      ["dips", { note: "3×8; negatives first if needed" }],
    ]
  ),
  path(
    "pull",
    "Pull",
    "Hang → scapular pulls → negatives → pull-ups and beyond, up to the one-arm pull-up.",
    ["r/bodyweightfitness Recommended Routine pull-up progression", "GMB pull-up progression"],
    [
      ["dead-hang", { holdSec: 30 }],
      ["scapular-pulls", { note: "3×8 controlled pulls" }],
      ["negative-pull-ups", { holdSec: 10, note: "5 s lowering ×5" }],
      ["pull-ups", { note: "3×8 strict" }],
      ["chin-ups", { note: "3×8 strict" }],
      ["l-sit-pull-ups", { note: "3×5 with legs level" }],
      ["archer-pull-ups", { note: "3×5 each side" }],
      ["muscle-up", { note: "3 strict reps" }],
      ["one-arm-pull-ups", { note: "1 clean rep each side" }],
    ]
  ),
  path(
    "handstand",
    "Handstand",
    "Arm balances → handstand → handstand push-ups → one-arm. 30 s on the wall before pressing.",
    ["Calisthenics 101 handstand progression", "caliskills.fit HSPU progression"],
    [
      ["frog-stand", { holdSec: 30 }],
      ["crow-pose", { holdSec: 30 }],
      ["handstand", { holdSec: 30, note: "chest-to-wall first, then free" }],
      ["handstand-push-ups-90", { holdSec: 10 }],
      ["handstand-push-ups", { note: "5 clean wall reps, then freestanding" }],
      ["one-arm-handstand", { holdSec: 10 }],
    ]
  ),
  path(
    "front-lever",
    "Front Lever",
    "Tuck → advanced tuck → one leg → straddle → full. Hold each for 20–30 s before moving on.",
    ["Cali Move front lever progression", "BERG Movement front lever progressions", "Heavyweight Calisthenics front lever guide"],
    [
      ["tuck-front-lever", { holdSec: 30 }],
      ["advanced-tuck-front-lever", { holdSec: 30 }],
      ["one-leg-front-lever", { holdSec: 15 }],
      ["straddle-front-lever", { holdSec: 10 }],
      ["front-lever", { holdSec: 10 }],
    ]
  ),
  path(
    "back-lever",
    "Back Lever",
    "German hang mobility → skin the cat → tuck → advanced tuck → straddle → full back lever.",
    ["BERG Movement back lever tutorial", "bodyweight.fitness back lever progression", "Calisthenics Hub back lever guide"],
    [
      ["german-hang", { holdSec: 15 }],
      ["skin-the-cat", { note: "3×3 slow rotations" }],
      ["tuck-back-lever", { holdSec: 30 }],
      ["advanced-tuck-back-lever", { holdSec: 20 }],
      ["straddle-back-lever", { holdSec: 10 }],
      ["back-lever", { holdSec: 10 }],
    ]
  ),
  path(
    "planche",
    "Planche",
    "Lean → tuck → advanced tuck → straddle → full. Frog stand (handstand path) prepares the wrists.",
    ["GMB planche progression", "Gymless planche tutorial", "Calisthenics Corner straddle planche"],
    [
      ["planche-lean", { holdSec: 30 }],
      ["tuck-planche", { holdSec: 30 }],
      ["advanced-tuck-planche", { holdSec: 15 }],
      ["straddle-planche", { holdSec: 10 }],
      ["planche", { holdSec: 5 }],
    ]
  ),
  path(
    "core",
    "Core & Compression",
    "Hollow body → tuck and L-sit family → hanging raises → V-sit → dragon flag and human flag.",
    ["Antranik L-sit / V-sit / manna progressions", "Fitloop dragon flag progression", "r/bodyweightfitness core work"],
    [
      ["hollow-body-hold", { holdSec: 30 }],
      ["tuck-sit", { holdSec: 30 }],
      ["one-leg-l-sit", { holdSec: 20 }],
      ["l-sit", { holdSec: 30 }],
      ["hanging-knee-raises", { holdSec: 10, note: "or 3×10 reps" }],
      ["hanging-leg-raises", { holdSec: 10, note: "or 3×8 reps" }],
      ["v-sit", { holdSec: 15 }],
      ["dragon-flag", { holdSec: 10 }],
      ["human-flag", { holdSec: 5 }],
    ]
  ),
  path(
    "legs",
    "Legs",
    "Squat → wall sit → split squats → shrimp → pistol → dragon squat; knee-dominant single-leg strength.",
    ["r/bodyweightfitness Recommended Routine squat progression"],
    [
      ["squats", { holdSec: 30, note: "deep squat hold" }],
      ["wall-sit", { holdSec: 60 }],
      ["bulgarian-split-squats", { note: "3×8 each side" }],
      ["shrimp-squats", { note: "3×6 each side" }],
      ["pistol-squats", { note: "3×6 each side" }],
      ["dragon-squats", { note: "3×5 each side" }],
      ["sissy-squats", { note: "3×8" }],
      ["bosu-single-leg-squats", { holdSec: 20 }],
    ]
  ),
  path(
    "posterior",
    "Hinge & Bridge",
    "Glute bridge → single-leg bridge → full bridge; Nordic curls for the hamstrings.",
    ["r/bodyweightfitness Recommended Routine hinge progression"],
    [
      ["glute-bridge", { holdSec: 30 }],
      ["single-leg-glute-bridge", { holdSec: 20, note: "each side" }],
      ["bridge", { holdSec: 30 }],
      ["nordic-curls", { note: "3×5 slow negatives" }],
    ]
  ),
];

export const LEARNING_PATH_MAP = Object.fromEntries(LEARNING_PATHS.map((p) => [p.id, p]));

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

/** 1-based step index within the skill's path, or null if not in a path. */
export function getSkillPathStep(skillId: string): {
  path: LearningPath;
  step: number;
  total: number;
  goal: PathGoal;
} | null {
  const path = getPathForSkill(skillId);
  if (!path) return null;
  const index = path.skillIds.indexOf(skillId);
  if (index < 0) return null;
  return { path, step: index + 1, total: path.skillIds.length, goal: path.steps[index].goal };
}

/** Human-readable goal for a step, e.g. "Hold 30 s" or "3×8 clean reps". */
export function describeGoal(goal: PathGoal): string {
  if (goal.holdSec && goal.note) return `Hold ${goal.holdSec} s · ${goal.note}`;
  if (goal.holdSec) return `Hold ${goal.holdSec} s`;
  return goal.note ?? "";
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
