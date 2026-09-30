import { describe, it, expect } from "vitest";
import { evaluateSkill, SKILLS } from "../skills/registry";
import { LEARNING_PATHS, bandForLevel, describeGoal, getSkillPathStep, validateLearningPaths, workingHoldSec } from "../skills/learningPaths";
import { PROGRESSIONS } from "../coaching/progressions";
import { getTargetPose } from "../skills/targetPoses";
import type { Body } from "../pose/geometry";

const noHands = { left: null, right: null };
const side = (pts: Record<string, [number, number]>): Body => {
  const b: Body = {};
  for (const [k, [x, y]] of Object.entries(pts)) {
    b[k] = { x, y, visibility: 0.95 };
    if (k.startsWith("left")) b[`right${k.slice(4)}`] = { x: x + 0.01, y, visibility: 0.9 };
  }
  return b;
};

describe("expanded skill set", () => {
  it("every skill has a path step with a goal, drills, and a target pose", () => {
    expect(validateLearningPaths()).toEqual([]);
    for (const skill of SKILLS) {
      const step = getSkillPathStep(skill.id);
      expect(step, skill.id).not.toBeNull();
      expect(describeGoal(step!.goal), skill.id).not.toBe("");
      expect(PROGRESSIONS[skill.id]?.length, skill.id).toBeGreaterThan(0);
      expect(getTargetPose(skill.id), skill.id).not.toBeNull();
    }
    expect(LEARNING_PATHS.every((p) => p.sources.length > 0)).toBe(true);
  });

  it("levels are non-decreasing within each path except documented branches, with OG bands", () => {
    expect(bandForLevel(1)).toBe("beginner");
    expect(bandForLevel(8)).toBe("intermediate");
    expect(bandForLevel(12)).toBe("advanced");
    expect(bandForLevel(13)).toBe("elite");
    for (const p of LEARNING_PATHS) {
      const levels = p.steps.map((s) => s.level);
      // A path may interleave equal-level variants; it must never drop by more than two levels.
      for (let i = 1; i < levels.length; i++) expect(levels[i], `${p.id} step ${i + 1}`).toBeGreaterThanOrEqual(levels[i - 1] - 2);
    }
    expect(workingHoldSec(20)).toEqual([12, 15]);
  });

  it("press lift-offs need straight arms and floating feet; bent-arm press needs bent arms", () => {
    const straddleLift = side({ nose: [0.46, 0.7], leftShoulder: [0.46, 0.6], leftElbow: [0.42, 0.72], leftWrist: [0.38, 0.84], leftHip: [0.54, 0.38], leftKnee: [0.62, 0.56], leftAnkle: [0.64, 0.7] });
    expect(evaluateSkill("straddle-press", straddleLift, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    const feetDown = side({ ...{ nose: [0.46, 0.7], leftShoulder: [0.46, 0.6], leftElbow: [0.42, 0.72], leftWrist: [0.38, 0.84], leftHip: [0.54, 0.38], leftKnee: [0.62, 0.62], leftAnkle: [0.66, 0.9] } });
    expect(evaluateSkill("straddle-press", feetDown, noHands, [], "hold_only")?.holdCriteriaMet).toBe(false);
    const bentPress = side({ nose: [0.46, 0.74], leftShoulder: [0.46, 0.62], leftElbow: [0.36, 0.7], leftWrist: [0.4, 0.84], leftHip: [0.52, 0.42], leftKnee: [0.58, 0.56], leftAnkle: [0.5, 0.5] });
    expect(evaluateSkill("bent-arm-press", bentPress, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    expect(evaluateSkill("straddle-press", bentPress, noHands, [], "hold_only")?.holdCriteriaMet).toBe(false);
  });

  it("iron cross: arms level with the shoulders while hanging vertical", () => {
    const cross: Body = {
      nose: { x: 0.5, y: 0.24 },
      leftShoulder: { x: 0.44, y: 0.32 }, rightShoulder: { x: 0.56, y: 0.32 },
      leftElbow: { x: 0.3, y: 0.32 }, rightElbow: { x: 0.7, y: 0.32 },
      leftWrist: { x: 0.14, y: 0.32 }, rightWrist: { x: 0.86, y: 0.32 },
      leftHip: { x: 0.46, y: 0.56 }, rightHip: { x: 0.54, y: 0.56 },
      leftKnee: { x: 0.47, y: 0.72 }, rightKnee: { x: 0.53, y: 0.72 },
      leftAnkle: { x: 0.48, y: 0.88 }, rightAnkle: { x: 0.52, y: 0.88 },
    };
    expect(evaluateSkill("iron-cross", cross, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
  });

  it("hollow body: shoulders and legs off the floor, hips lowest", () => {
    const hollow = side({ nose: [0.28, 0.5], leftShoulder: [0.34, 0.54], leftElbow: [0.26, 0.5], leftWrist: [0.18, 0.46], leftHip: [0.5, 0.62], leftKnee: [0.66, 0.56], leftAnkle: [0.82, 0.5] });
    expect(evaluateSkill("hollow-body-hold", hollow, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    const lyingFlat = side({ ...{ nose: [0.28, 0.62], leftShoulder: [0.34, 0.62], leftElbow: [0.26, 0.62], leftWrist: [0.18, 0.62], leftHip: [0.5, 0.62], leftKnee: [0.66, 0.62], leftAnkle: [0.82, 0.62] } });
    expect(evaluateSkill("hollow-body-hold", lyingFlat, noHands, [], "hold_only")?.holdCriteriaMet).toBe(false);
  });

  it("back lever vs front lever: hands behind the body decide", () => {
    // Horizontal body hanging under a bar; wrists directly above the shoulders → front lever.
    const front = side({ nose: [0.34, 0.46], leftShoulder: [0.4, 0.48], leftElbow: [0.4, 0.36], leftWrist: [0.4, 0.22], leftHip: [0.62, 0.48], leftKnee: [0.74, 0.48], leftAnkle: [0.86, 0.48] });
    // Same body, wrists above the mid-back → back lever.
    const back = side({ nose: [0.34, 0.46], leftShoulder: [0.4, 0.48], leftElbow: [0.46, 0.38], leftWrist: [0.5, 0.22], leftHip: [0.62, 0.48], leftKnee: [0.74, 0.48], leftAnkle: [0.86, 0.48] });
    expect(evaluateSkill("front-lever", front, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    expect(evaluateSkill("back-lever", back, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    expect(evaluateSkill("back-lever", front, noHands, [], "hold_only")?.holdCriteriaMet).toBe(false);
  });

  it("tuck front lever needs the tuck; deep squat hold needs both knees bent", () => {
    const tuck = side({ nose: [0.34, 0.46], leftShoulder: [0.4, 0.48], leftElbow: [0.4, 0.36], leftWrist: [0.4, 0.22], leftHip: [0.58, 0.48], leftKnee: [0.56, 0.36], leftAnkle: [0.64, 0.42] });
    expect(evaluateSkill("tuck-front-lever", tuck, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    const squat = side({ nose: [0.5, 0.3], leftShoulder: [0.46, 0.36], leftElbow: [0.52, 0.44], leftWrist: [0.58, 0.44], leftHip: [0.38, 0.6], leftKnee: [0.56, 0.6], leftAnkle: [0.5, 0.78] });
    expect(evaluateSkill("squats", squat, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    const standing = side({ nose: [0.5, 0.1], leftShoulder: [0.5, 0.2], leftElbow: [0.5, 0.32], leftWrist: [0.5, 0.44], leftHip: [0.5, 0.48], leftKnee: [0.5, 0.68], leftAnkle: [0.5, 0.88] });
    expect(evaluateSkill("squats", standing, noHands, [], "hold_only")?.holdCriteriaMet).toBe(false);
  });

  it("human flag: hands stacked on the pole, body level", () => {
    const flag: Body = {
      nose: { x: 0.34, y: 0.44 },
      leftShoulder: { x: 0.4, y: 0.46 }, rightShoulder: { x: 0.42, y: 0.5 },
      leftElbow: { x: 0.34, y: 0.3 }, rightElbow: { x: 0.36, y: 0.62 },
      leftWrist: { x: 0.3, y: 0.16 }, rightWrist: { x: 0.3, y: 0.74 },
      leftHip: { x: 0.6, y: 0.46 }, rightHip: { x: 0.6, y: 0.5 },
      leftKnee: { x: 0.72, y: 0.46 }, rightKnee: { x: 0.72, y: 0.5 },
      leftAnkle: { x: 0.84, y: 0.46 }, rightAnkle: { x: 0.84, y: 0.5 },
    };
    expect(evaluateSkill("human-flag", flag, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
  });
});

describe("lessons", () => {
  it("every skill has a lesson with setup, cues and faults", async () => {
    const { LESSONS } = await import("../skills/lessons");
    for (const s of SKILLS) {
      const l = LESSONS[s.id];
      expect(l, s.id).toBeDefined();
      expect(l.setup.length, s.id).toBeGreaterThan(0);
      expect(l.cues.length, s.id).toBeGreaterThan(0);
      expect(l.faults.length, s.id).toBeGreaterThan(0);
      expect(l.equipment.length, s.id).toBeGreaterThan(0);
    }
    for (const id of Object.keys(LESSONS)) expect(SKILLS.some((s) => s.id === id), `orphan lesson ${id}`).toBe(true);
  });
});

describe("families", () => {
  it("every path belongs to a family and the push family owns pressing lines", async () => {
    const { pathsByFamily, familyLevels, LEARNING_PATH_MAP } = await import("../skills/learningPaths");
    const grouped = pathsByFamily();
    expect(grouped.map((g) => g.family.id)).toEqual(["push", "pull", "handstand", "core", "legs"]);
    expect(grouped.every((g) => g.paths.length > 0)).toBe(true);
    expect(grouped.find((g) => g.family.id === "push")!.paths.map((p) => p.id)).toEqual(["push", "dips", "hspu", "planche"]);
    expect(LEARNING_PATH_MAP["front-lever"].family).toBe("pull");
    expect(LEARNING_PATH_MAP["press"].family).toBe("handstand");
    expect(LEARNING_PATH_MAP["flag"].family).toBe("pull");
    const levels = familyLevels({ handstand: 31_000 });
    expect(levels.find((l) => l.family.id === "handstand")!.level).toBe(4);
    expect(levels.find((l) => l.family.id === "push")!.level).toBe(0);
  });
});

describe("rep goals and session plans", () => {
  it("parses rep standards out of notes and marks them met from the rep log", async () => {
    const { parseRepGoal, getSkillPathStep, isGoalMet, isGoalTracked, athleteLevel, buildSessionPlan } = await import("../skills/learningPaths");
    expect(parseRepGoal("3×8 clean reps")).toEqual({ sets: 3, reps: 8 });
    expect(parseRepGoal("3 strict reps")).toEqual({ sets: 1, reps: 3 });
    expect(parseRepGoal("chest-to-wall first, then free")).toBeNull();
    expect(getSkillPathStep("push-ups")?.goal).toMatchObject({ sets: 3, reps: 8 });
    expect(isGoalTracked("push-ups")).toBe(true);
    expect(isGoalMet("push-ups", {}, { "push-ups": { sets: 3, reps: 7 } })).toBe(false);
    expect(isGoalMet("push-ups", {}, { "push-ups": { sets: 3, reps: 8 } })).toBe(true);
    expect(isGoalMet("one-arm-pull-ups", {}, { "one-arm-pull-ups": { sets: 1, reps: 1 } })).toBe(true);

    expect(athleteLevel({}).level).toBe(0);
    const lvl = athleteLevel({ handstand: 31_000 }, { "archer-push-ups": { sets: 3, reps: 6 } });
    expect(lvl.level).toBe(6);
    expect(lvl.band).toBe("intermediate");

    const plan = buildSessionPlan({ "plank-hold": 40_000 }, {}, 6);
    expect(plan.length).toBe(6);
    const plank = plan.find((i) => i.step.skillId === "plank-hold");
    expect(plank?.prescription).toBe("3 × 24–30 s");
    const untested = plan.find((i) => i.step.goal.holdSec && i.step.skillId !== "plank-hold");
    expect(untested?.isTest).toBe(true);
    const repItem = plan.find((i) => i.step.goal.sets);
    expect(repItem?.prescription).toMatch(/^\d+ × \d+$/);
  });
});

describe("path progress", () => {
  it("tracks level, next step and blocked steps from bests", async () => {
    const { evaluatePathProgress, suggestNextSteps, isGoalMet, unmetPrerequisites } = await import("../skills/learningPaths");
    const none = evaluatePathProgress({});
    const press = none.find((p) => p.path.id === "press")!;
    expect(press.level).toBe(0);
    expect(press.next).toBeNull();
    expect(press.blocked?.skillId).toBe("bent-arm-press");
    expect(unmetPrerequisites("bent-arm-press", {})).toEqual(["handstand", "pike-push-ups"]);
    expect(unmetPrerequisites("bent-arm-press", { handstand: 31_000 }, { "pike-push-ups": { sets: 3, reps: 8 } })).toEqual([]);

    const bests = { handstand: 31_000, "plank-hold": 60_000, "l-sit": 30_000 };
    expect(isGoalMet("handstand", bests)).toBe(true);
    expect(isGoalMet("pike-push-ups", bests)).toBe(false); // rep goal
    const withHs = evaluatePathProgress(bests);
    expect(withHs.find((p) => p.path.id === "handstand")!.level).toBe(4);
    expect(withHs.find((p) => p.path.id === "handstand")!.next?.skillId).toBe("headstand");
    expect(withHs.find((p) => p.path.id === "press")!.blocked?.skillId).toBe("bent-arm-press"); // still needs pike push-ups logged
    const next = suggestNextSteps(bests, {}, 3);
    expect(next.length).toBe(3);
    expect(next[0].level).toBeLessThanOrEqual(next[2].level);
    expect(next.some((s) => s.skillId === "handstand")).toBe(false);
    const push = withHs.find((p) => p.path.id === "push")!;
    expect(push.next?.skillId).toBe("wall-push-ups"); // rep steps count now that reps can be logged
    const pushDone = evaluatePathProgress(bests, { "wall-push-ups": { sets: 3, reps: 12 }, "incline-push-ups": { sets: 3, reps: 10 }, "knee-push-ups": { sets: 3, reps: 8 }, "push-ups": { sets: 3, reps: 8 }, "wide-push-ups": { sets: 3, reps: 10 }, "diamond-push-ups": { sets: 3, reps: 8 }, "decline-push-ups": { sets: 3, reps: 8 }, "archer-push-ups": { sets: 3, reps: 6 } }).find((p) => p.path.id === "push")!;
    expect(pushDone.level).toBe(6);
    expect(pushDone.next).toBeNull();
    expect(pushDone.blocked?.skillId).toBe("pseudo-planche-push-ups"); // needs the planche lean hold first

  });
});

describe("new skill target poses satisfy their own rules", () => {
  const NEW_IDS = [
    "wall-push-ups", "incline-push-ups", "wide-push-ups", "decline-push-ups", "bench-dips", "straight-bar-dips",
    "headstand", "wall-handstand", "straddle-handstand",
    "incline-rows", "bodyweight-rows", "feet-elevated-rows", "archer-rows", "one-arm-rows", "wide-pull-ups", "one-arm-dead-hang", "inverted-hang",
    "side-plank", "reverse-plank", "arch-hold", "l-hang", "toes-to-bar", "ab-wheel-kneeling", "ab-wheel-standing",
    "lunges", "cossack-squats", "single-leg-rdl", "natural-leg-extensions",
  ];
  it.each(NEW_IDS)("%s", (id) => {
    const pose = getTargetPose(id);
    expect(pose).not.toBeNull();
    const e = evaluateSkill(id, pose!, noHands, [], "hold_only");
    expect(e?.holdCriteriaMet, JSON.stringify(e?.metrics)).toBe(true);
  });
});
