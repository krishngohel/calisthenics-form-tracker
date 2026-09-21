import { describe, it, expect } from "vitest";
import { evaluateSkill, SKILLS } from "../skills/registry";
import { LEARNING_PATHS, describeGoal, getSkillPathStep, validateLearningPaths } from "../skills/learningPaths";
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
