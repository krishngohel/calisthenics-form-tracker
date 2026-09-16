import { describe, it, expect } from "vitest";
import { evaluateSkill, SKILLS } from "../skills/registry";
import { detectSkill } from "../skills/autoDetect";
import { generateCoachingPlan } from "../coaching/planGenerator";
import { PROGRESSIONS, METRIC_TO_DRILL } from "../coaching/progressions";

const noHands = { left: null, right: null };

describe("skill evaluators", () => {
  it("never throws on an empty frame in either mode", () => {
    for (const skill of SKILLS) {
      for (const mode of ["hold_only", "perfect"] as const) {
        const result = evaluateSkill(skill.id, {}, noHands, [], mode);
        expect(result?.holdCriteriaMet, `${skill.id}/${mode}`).toBe(false);
        expect(result?.formScore).toBeLessThanOrEqual(25);
      }
    }
  });

  it("perfect criteria are never looser than hold criteria", () => {
    const body = {
      nose: { x: 0.5, y: 0.2 },
      leftShoulder: { x: 0.45, y: 0.35 },
      rightShoulder: { x: 0.55, y: 0.35 },
      leftHip: { x: 0.45, y: 0.5 },
      rightHip: { x: 0.55, y: 0.5 },
      leftWrist: { x: 0.45, y: 0.7 },
      rightWrist: { x: 0.55, y: 0.7 },
      leftAnkle: { x: 0.45, y: 0.1 },
      rightAnkle: { x: 0.55, y: 0.1 },
      leftElbow: { x: 0.45, y: 0.5 },
      rightElbow: { x: 0.55, y: 0.5 },
      leftKnee: { x: 0.45, y: 0.35 },
      rightKnee: { x: 0.55, y: 0.35 },
    };
    for (const skill of SKILLS) {
      const r = evaluateSkill(skill.id, body, noHands, [body], "perfect")!;
      if (r.perfectCriteriaMet) expect(r.holdCriteriaMet, skill.id).toBe(true);
    }
  });

  it("crow pose perfect mode requires arm extension", () => {
    // Front view: hands planted, knees perched on the elbows, arms clearly bent.
    const bentArms = {
      nose: { x: 0.5, y: 0.62 },
      leftShoulder: { x: 0.42, y: 0.55 },
      rightShoulder: { x: 0.58, y: 0.55 },
      leftElbow: { x: 0.36, y: 0.68 },
      rightElbow: { x: 0.64, y: 0.68 },
      leftWrist: { x: 0.44, y: 0.84 },
      rightWrist: { x: 0.56, y: 0.84 },
      leftHip: { x: 0.45, y: 0.38 },
      rightHip: { x: 0.55, y: 0.38 },
      leftKnee: { x: 0.4, y: 0.66 },
      rightKnee: { x: 0.6, y: 0.66 },
      leftAnkle: { x: 0.46, y: 0.56 },
      rightAnkle: { x: 0.54, y: 0.56 },
    };
    const r = evaluateSkill("crow-pose", bentArms, noHands, [], "perfect")!;
    expect(r.holdCriteriaMet).toBe(true);
    expect(r.perfectCriteriaMet).toBe(false);
    const straight = {
      ...bentArms,
      leftElbow: { x: 0.43, y: 0.7 },
      rightElbow: { x: 0.57, y: 0.7 },
    };
    expect(evaluateSkill("crow-pose", straight, noHands, [], "perfect")?.perfectCriteriaMet).toBe(true);
  });

  it("frog stand requires hands planted below the hips", () => {
    const standingHandsUp = {
      leftShoulder: { x: 0.45, y: 0.3 },
      rightShoulder: { x: 0.55, y: 0.3 },
      leftWrist: { x: 0.45, y: 0.5 },
      rightWrist: { x: 0.55, y: 0.5 },
      leftElbow: { x: 0.45, y: 0.55 },
      rightElbow: { x: 0.55, y: 0.55 },
      leftKnee: { x: 0.45, y: 0.6 },
      rightKnee: { x: 0.55, y: 0.6 },
      leftHip: { x: 0.45, y: 0.7 },
      rightHip: { x: 0.55, y: 0.7 },
    };
    expect(evaluateSkill("frog-stand", standingHandsUp, noHands, [], "hold_only")?.holdCriteriaMet).toBe(false);
    const frog = {
      ...standingHandsUp,
      leftShoulder: { x: 0.45, y: 0.5 },
      rightShoulder: { x: 0.55, y: 0.5 },
      leftHip: { x: 0.45, y: 0.35 },
      rightHip: { x: 0.55, y: 0.35 },
      leftWrist: { x: 0.45, y: 0.72 },
      rightWrist: { x: 0.55, y: 0.72 },
    };
    expect(evaluateSkill("frog-stand", frog, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
  });
});

describe("auto-detect", () => {
  it("returns null for an empty frame", () => {
    expect(detectSkill({}, noHands, [])).toBeNull();
  });

  it("prefers hang skills when the wrists are above the shoulders", () => {
    const hang = {
      nose: { x: 0.5, y: 0.2 },
      leftShoulder: { x: 0.45, y: 0.26 },
      rightShoulder: { x: 0.55, y: 0.26 },
      leftElbow: { x: 0.45, y: 0.16 },
      rightElbow: { x: 0.55, y: 0.16 },
      leftWrist: { x: 0.45, y: 0.06 },
      rightWrist: { x: 0.55, y: 0.06 },
      leftHip: { x: 0.45, y: 0.5 },
      rightHip: { x: 0.55, y: 0.5 },
      leftKnee: { x: 0.45, y: 0.68 },
      rightKnee: { x: 0.55, y: 0.68 },
      leftAnkle: { x: 0.45, y: 0.86 },
      rightAnkle: { x: 0.55, y: 0.86 },
    };
    const guess = detectSkill(hang, noHands, [hang]);
    expect(["dead-hang", "scapular-pulls"]).toContain(guess?.skillId);
    expect(guess?.holdMatch).toBe(true);
  });
});

describe("coaching plans", () => {
  it("every skill has progressions and every mapped drill exists somewhere", () => {
    const allDrillIds = new Set(Object.values(PROGRESSIONS).flat().map((d) => d.id));
    for (const skill of SKILLS) {
      expect(PROGRESSIONS[skill.id]?.length, skill.id).toBeGreaterThan(0);
    }
    for (const drillId of Object.values(METRIC_TO_DRILL)) {
      expect(allDrillIds.has(drillId), drillId).toBe(true);
    }
  });

  it("orders weak points by severity and always recommends at least three drills", () => {
    const plan = generateCoachingPlan("pull-ups", [
      { id: "chin_height", label: "Chin above bar", score: 60, passed: false },
      { id: "hollow", label: "Hollow body", score: 20, passed: false },
      { id: "elbow_bend", label: "Elbow flexion", score: 100, passed: true },
    ]);
    expect(plan.weakPoints).toEqual(["Hollow body", "Chin above bar"]);
    expect(plan.recommendedDrills.length).toBeGreaterThanOrEqual(3);
    expect(plan.recommendedDrills.map((d) => d.id)).toContain("negatives");
  });
});
