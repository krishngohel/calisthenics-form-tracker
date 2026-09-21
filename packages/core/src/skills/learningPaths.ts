import { getSkill, SKILL_MAP } from "./registry";

export interface PathGoal {
  /** Hold this long (seconds) before moving to the next step. */
  holdSec?: number;
  /** Rep-based standard, for skills trained as reps outside the app. */
  note?: string;
}

/**
 * Difficulty bands from Overcoming Gravity's 16-level charts:
 * 1–4 beginner, 5–8 intermediate, 9–12 advanced, 13–16 elite.
 */
export type Band = "beginner" | "intermediate" | "advanced" | "elite";

export function bandForLevel(level: number): Band {
  if (level <= 4) return "beginner";
  if (level <= 8) return "intermediate";
  if (level <= 12) return "advanced";
  return "elite";
}

export interface PathStep {
  skillId: string;
  /** Overcoming Gravity chart level (1–16). Where the chart has no entry, the nearest equivalent. */
  level: number;
  goal: PathGoal;
  /** Skills (in any path) whose goal should be met first. */
  prerequisites?: string[];
  /** One-line technique focus for the step. */
  focus?: string;
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

type StepTuple = [skillId: string, level: number, goal: PathGoal, extra?: { prerequisites?: string[]; focus?: string }];

function path(id: string, name: string, description: string, sources: string[], steps: StepTuple[]): LearningPath {
  return {
    id,
    name,
    description,
    sources,
    steps: steps.map(([skillId, level, goal, extra]) => ({ skillId, level, goal, ...extra })),
    skillIds: steps.map(([skillId]) => skillId),
  };
}

const OG = "Overcoming Gravity 2nd ed. progression charts (Steven Low)";
const RR = "r/bodyweightfitness Recommended Routine";

/**
 * Progressive learning paths. Every skill appears exactly once. Levels and
 * order follow the Overcoming Gravity charts; hold standards follow the
 * chart's conventions and the cited tutorials. A static step's goal is the
 * hold time to reach before the next step.
 */
export const LEARNING_PATHS: LearningPath[] = [
  path(
    "push",
    "Push-Ups",
    "Regular → diamond → archer → pseudo planche → one-arm. Horizontal pressing from the floor.",
    [OG, RR, "GMB push-up progression"],
    [
      ["plank-hold", 1, { holdSec: 60 }, { focus: "Straight line, ribs down" }],
      ["knee-push-ups", 1, { note: "3×8 clean reps" }],
      ["push-ups", 1, { note: "3×8 clean reps" }, { focus: "Elbows ~45°, chest to floor" }],
      ["diamond-push-ups", 2, { note: "3×8 clean reps" }],
      ["archer-push-ups", 6, { note: "3×6 each side" }, { focus: "Support arm locked, hips square" }],
      ["pseudo-planche-push-ups", 7, { note: "3×8 with a clear lean" }, { prerequisites: ["planche-lean"], focus: "Keep the lean at the bottom" }],
      ["one-arm-push-ups", 8, { note: "3×5 each side" }, { prerequisites: ["archer-push-ups"], focus: "Feet wide, hips square, no twist" }],
      ["maltese", 13, { holdSec: 5 }, { prerequisites: ["planche", "iron-cross"], focus: "Arms wide at hip height; elite ring strength" }],
    ]
  ),
  path(
    "dips",
    "Dips",
    "Support hold → dips → L-dips → Korean dips. Vertical pressing on bars.",
    [OG, RR, "Caliverse Korean dips guide"],
    [
      ["support-hold", 1, { holdSec: 30 }, { focus: "Shoulders down, elbows locked" }],
      ["dips", 3, { note: "3×8; negatives first if needed" }, { focus: "Shoulder below elbow at the bottom" }],
      ["l-dips", 4, { note: "3×6 with legs level" }, { prerequisites: ["l-sit"] }],
      ["korean-dips", 8, { note: "3×6 controlled" }, { prerequisites: ["dips", "german-hang"], focus: "Bar at the hips, chest up" }],
    ]
  ),
  path(
    "pull",
    "Pull-Ups",
    "Hang → scapular pulls → negatives → pull-ups → L, archer, muscle-up, one-arm.",
    [OG, RR, "GMB pull-up progression"],
    [
      ["dead-hang", 1, { holdSec: 30 }],
      ["scapular-pulls", 1, { note: "3×8 controlled pulls" }, { focus: "Straight arms; shoulders down" }],
      ["negative-pull-ups", 2, { holdSec: 10, note: "5 s lowering ×5" }],
      ["pull-ups", 3, { note: "3×8 strict" }, { focus: "Chest to bar, no kip" }],
      ["chin-ups", 3, { note: "3×8 strict" }],
      ["l-sit-pull-ups", 4, { note: "3×5 with legs level" }, { prerequisites: ["l-sit"] }],
      ["archer-pull-ups", 7, { note: "3×5 each side" }],
      ["muscle-up", 7, { note: "3 strict reps" }, { prerequisites: ["dips", "pull-ups"], focus: "High pull, quick transition, no kip" }],
      ["one-arm-pull-ups", 9, { note: "1 clean rep each side" }, { prerequisites: ["archer-pull-ups"] }],
    ]
  ),
  path(
    "handstand",
    "Handstand",
    "Arm balances → handstand → one-arm handstand. Skill work: fixed 3×30 s targets.",
    [OG, "Calisthenics 101 handstand progression", "BodyTree isometric programming"],
    [
      ["frog-stand", 3, { holdSec: 30 }, { focus: "Wrist prep; knees on the arms" }],
      ["crow-pose", 3, { holdSec: 30 }],
      ["elbow-lever", 5, { holdSec: 20 }, { focus: "Elbows into the hip bones" }],
      ["handstand", 4, { holdSec: 30, note: "chest-to-wall first, then free" }, { focus: "Stack shoulders over hands; hollow" }],
      ["one-arm-handstand", 10, { holdSec: 10 }, { prerequisites: ["handstand"] }],
    ]
  ),
  path(
    "hspu",
    "Handstand Push-Ups",
    "Pike → elevated pike → wall → freestanding → deficit. 30 s wall handstand before pressing.",
    [OG, "caliskills.fit HSPU progression"],
    [
      ["pike-push-ups", 1, { note: "3×8" }, { focus: "Hips high, head to the floor" }],
      ["elevated-pike-push-ups", 2, { note: "3×8 with feet at hip height" }],
      ["handstand-push-ups-90", 5, { holdSec: 10 }, { prerequisites: ["handstand"], focus: "Elbows at 90°, ribs down" }],
      ["handstand-push-ups", 5, { note: "5 clean wall reps, then freestanding" }, { prerequisites: ["handstand"] }],
      ["deficit-handstand-push-ups", 7, { note: "3×5 head below the hands" }, { prerequisites: ["handstand-push-ups"] }],
    ]
  ),
  path(
    "press",
    "Press to Handstand",
    "Straight-arm presses: straddle lift-off → pike lift-off → L-sit family. Bent-arm press as a strength variant.",
    [OG, "BERG Movement press handstand", "Handstand Factory press program", "Antranik L/V/manna progressions"],
    [
      ["bent-arm-press", 5, { holdSec: 5 }, { prerequisites: ["handstand", "pike-push-ups"], focus: "Lean, stack the hips, then extend" }],
      ["straddle-press", 7, { holdSec: 3 }, { prerequisites: ["handstand", "l-sit"], focus: "Straight arms; shoulders over the fingertips; float the feet" }],
      ["pike-press", 9, { holdSec: 3 }, { prerequisites: ["straddle-press", "v-sit"], focus: "Legs together; compress; hips over hands" }],
    ]
  ),
  path(
    "front-lever",
    "Front Lever",
    "Tuck → advanced tuck → one leg → straddle → full. 20–30 s per step.",
    [OG, "Cali Move front lever progression", "BERG Movement front lever progressions"],
    [
      ["tuck-front-lever", 4, { holdSec: 30 }, { prerequisites: ["pull-ups", "hollow-body-hold"], focus: "Back level; shoulders depressed" }],
      ["advanced-tuck-front-lever", 5, { holdSec: 30 }, { focus: "Open the hips, keep the back flat" }],
      ["one-leg-front-lever", 7, { holdSec: 15 }],
      ["straddle-front-lever", 6, { holdSec: 10 }],
      ["front-lever", 8, { holdSec: 10 }, { focus: "Straight body; hips through" }],
    ]
  ),
  path(
    "back-lever",
    "Back Lever",
    "German hang → skin the cat → tuck → advanced tuck → straddle → full.",
    [OG, "BERG Movement back lever tutorial", "bodyweight.fitness back lever progression"],
    [
      ["german-hang", 1, { holdSec: 15 }, { focus: "Shoulder extension mobility first" }],
      ["skin-the-cat", 2, { note: "3×3 slow rotations" }],
      ["tuck-back-lever", 3, { holdSec: 30 }],
      ["advanced-tuck-back-lever", 4, { holdSec: 20 }],
      ["straddle-back-lever", 5, { holdSec: 10 }],
      ["back-lever", 7, { holdSec: 10 }, { focus: "Squeeze glutes; do not arch the lower back" }],
    ]
  ),
  path(
    "planche",
    "Planche",
    "Lean → tuck → advanced tuck → straddle → full, then planche push-ups.",
    [OG, "GMB planche progression", "Calisthenics Corner straddle planche"],
    [
      ["planche-lean", 3, { holdSec: 30 }, { prerequisites: ["support-hold"], focus: "Protract; lean past the wrists" }],
      ["tuck-planche", 5, { holdSec: 30 }, { prerequisites: ["frog-stand"] }],
      ["advanced-tuck-planche", 6, { holdSec: 15 }, { focus: "Hips level with the shoulders" }],
      ["tuck-planche-push-ups", 6, { note: "3×5 keeping the lean" }],
      ["straddle-planche", 8, { holdSec: 10 }],
      ["straddle-planche-push-ups", 10, { note: "3×3" }],
      ["planche", 11, { holdSec: 5 }],
      ["planche-push-ups", 14, { note: "3×2" }],
    ]
  ),
  path(
    "rings",
    "Ring Strength",
    "Iron cross and the elite ring holds. Requires solid planche and back lever strength.",
    [OG, "GymnastGem iron cross vs Maltese", "Gravgear Maltese guide"],
    [
      ["iron-cross", 10, { holdSec: 3 }, { prerequisites: ["back-lever", "straddle-planche"], focus: "Arms level with the shoulders, elbows locked" }],
    ]
  ),
  path(
    "core",
    "Core & Compression",
    "Hollow body → tuck sit → L-sit family → hanging raises → V-sit → manna; dragon flag.",
    [OG, "Antranik L-sit / V-sit / manna progressions", "Fitloop dragon flag progression"],
    [
      ["hollow-body-hold", 1, { holdSec: 30 }, { focus: "Lower back pressed down" }],
      ["tuck-sit", 1, { holdSec: 30 }],
      ["one-leg-l-sit", 2, { holdSec: 20 }],
      ["l-sit", 3, { holdSec: 30 }, { focus: "Push the floor away; knees locked" }],
      ["hanging-knee-raises", 3, { holdSec: 10, note: "or 3×10 reps" }],
      ["hanging-leg-raises", 4, { holdSec: 10, note: "or 3×8 reps" }],
      ["v-sit", 6, { holdSec: 15 }, { prerequisites: ["l-sit"] }],
      ["dragon-flag", 7, { holdSec: 10 }, { prerequisites: ["hollow-body-hold"] }],
      ["manna", 13, { holdSec: 5 }, { prerequisites: ["v-sit"] }],
    ]
  ),
  path(
    "flag",
    "Human Flag",
    "Tuck → straddle → full flag. Pole strength: pull with the top arm, push with the bottom.",
    [OG],
    [
      ["tuck-flag", 5, { holdSec: 10 }, { prerequisites: ["pull-ups", "dips"] }],
      ["straddle-flag", 7, { holdSec: 8 }],
      ["human-flag", 8, { holdSec: 5 }],
    ]
  ),
  path(
    "legs",
    "Legs",
    "Squat → wall sit → split squats → shrimp → pistol → dragon squat.",
    [OG, RR],
    [
      ["squats", 2, { holdSec: 30, note: "deep squat hold" }],
      ["wall-sit", 2, { holdSec: 60 }],
      ["bulgarian-split-squats", 3, { note: "3×8 each side" }],
      ["shrimp-squats", 4, { note: "3×6 each side" }],
      ["pistol-squats", 4, { note: "3×6 each side" }, { focus: "Heel down; chest up" }],
      ["dragon-squats", 6, { note: "3×5 each side" }],
      ["sissy-squats", 5, { note: "3×8" }],
      ["bosu-single-leg-squats", 5, { holdSec: 20 }],
    ]
  ),
  path(
    "posterior",
    "Hinge & Bridge",
    "Glute bridge → single-leg bridge → full bridge; Nordic curls for the hamstrings.",
    [RR],
    [
      ["glute-bridge", 1, { holdSec: 30 }],
      ["single-leg-glute-bridge", 2, { holdSec: 20, note: "each side" }],
      ["bridge", 3, { holdSec: 30 }, { focus: "Push through the hands; open the shoulders" }],
      ["nordic-curls", 5, { note: "3×5 slow negatives" }],
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
  level: number;
  band: Band;
  prerequisites: string[];
  focus?: string;
} | null {
  const path = getPathForSkill(skillId);
  if (!path) return null;
  const index = path.skillIds.indexOf(skillId);
  if (index < 0) return null;
  const s = path.steps[index];
  return { path, step: index + 1, total: path.skillIds.length, goal: s.goal, level: s.level, band: bandForLevel(s.level), prerequisites: s.prerequisites ?? [], focus: s.focus };
}

/** Human-readable goal for a step, e.g. "Hold 30 s" or "3×8 clean reps". */
export function describeGoal(goal: PathGoal): string {
  if (goal.holdSec && goal.note) return `Hold ${goal.holdSec} s · ${goal.note}`;
  if (goal.holdSec) return `Hold ${goal.holdSec} s`;
  return goal.note ?? "";
}

/**
 * How to train a static step, following Overcoming Gravity: work at 60–75%
 * of the current max hold, 3–5 sets, 30–60 s total per session, 2–3
 * sessions a week; move up once the goal is met with clean form. Handstand
 * balance work uses fixed 3×30 s targets and tolerates daily practice.
 */
export const PROGRESSION_GUIDE = {
  workingHoldFraction: [0.6, 0.75] as const,
  setsPerSession: [3, 5] as const,
  totalHoldSecPerSession: [30, 60] as const,
  sessionsPerWeek: [2, 3] as const,
  handstandTarget: { sets: 3, holdSec: 30 },
  sources: ["Overcoming Gravity 2nd ed.", "BodyTree: How to program isometric holds", "Antranik: progression exercises for static holds"],
};

/** Working hold for a given max, per the guide (rounded to whole seconds). */
export function workingHoldSec(maxHoldSec: number): [number, number] {
  return [Math.round(maxHoldSec * PROGRESSION_GUIDE.workingHoldFraction[0]), Math.round(maxHoldSec * PROGRESSION_GUIDE.workingHoldFraction[1])];
}

/** Validate every registered skill is assigned to exactly one path and prerequisites exist. */
export function validateLearningPaths(): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const path of LEARNING_PATHS) {
    for (const step of path.steps) {
      if (!SKILL_MAP[step.skillId]) errors.push(`Unknown skill "${step.skillId}" in path "${path.id}"`);
      if (seen.has(step.skillId)) errors.push(`Skill "${step.skillId}" appears in multiple paths`);
      seen.add(step.skillId);
      if (step.level < 1 || step.level > 16) errors.push(`Skill "${step.skillId}" has level ${step.level} outside 1–16`);
      for (const pre of step.prerequisites ?? []) {
        if (!SKILL_MAP[pre]) errors.push(`Skill "${step.skillId}" requires unknown skill "${pre}"`);
        if (pre === step.skillId) errors.push(`Skill "${step.skillId}" requires itself`);
      }
    }
  }

  for (const id of Object.keys(SKILL_MAP)) {
    if (!seen.has(id)) errors.push(`Skill "${id}" is not in any learning path`);
  }

  return errors;
}
