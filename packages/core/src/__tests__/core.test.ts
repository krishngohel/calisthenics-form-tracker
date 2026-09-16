import { describe, it, expect } from "vitest";
import {
  angleAtJoint,
  chickenNecking,
  shouldersShrugged,
  invertedArch,
} from "../pose/geometry";
import { DEFAULT_HOLD_CONFIG, HoldStateMachine } from "../hold/stateMachine";
import {
  getDistanceContext,
  recommendBackCameraZoom,
  recommendFramingGuidance,
  shouldSwitchToWiderLens,
} from "../pose/distance";
import { detectSkill } from "../skills/autoDetect";
import { computeFormScore } from "../scoring/formScore";
import { evaluateSkill, getSkill, SKILLS } from "../skills/registry";
import { generateCoachingPlan } from "../coaching/planGenerator";
import { validateLearningPaths } from "../skills/learningPaths";

describe("geometry", () => {
  it("computes straight angle", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0.5, y: 0 };
    const c = { x: 1, y: 0 };
    expect(angleAtJoint(a, b, c)).toBeCloseTo(180, 0);
  });

  it("detects shrugged shoulders vs depressed", () => {
    const shrugged = {
      nose: { x: 0.5, y: 0.2 },
      leftShoulder: { x: 0.45, y: 0.22 },
      rightShoulder: { x: 0.55, y: 0.22 },
    };
    const depressed = {
      nose: { x: 0.5, y: 0.2 },
      leftShoulder: { x: 0.45, y: 0.35 },
      rightShoulder: { x: 0.55, y: 0.35 },
    };
    expect(shouldersShrugged(shrugged)).toBe(true);
    expect(shouldersShrugged(depressed)).toBe(false);
  });

  it("detects chicken necking at pull-up top", () => {
    const neckReach = {
      nose: { x: 0.5, y: 0.15 },
      leftShoulder: { x: 0.45, y: 0.28 },
      rightShoulder: { x: 0.55, y: 0.28 },
      leftWrist: { x: 0.45, y: 0.2 },
      rightWrist: { x: 0.55, y: 0.2 },
    };
    expect(chickenNecking(neckReach)).toBe(true);
  });
});

describe("hold state machine", () => {
  it("backdates the hold start to the first qualifying frame (default config)", () => {
    const fsm = new HoldStateMachine();
    expect(fsm.tick(true, 1000).state).toBe("qualifying");
    const r = fsm.tick(true, 1000 + DEFAULT_HOLD_CONFIG.qualifyingMs);
    expect(r.state).toBe("holding");
    expect(r.holdStartTime).toBe(1000);
  });

  it("ignores a single glitched frame but measures the hold to the true drop (default config)", () => {
    const fsm = new HoldStateMachine();
    fsm.tick(true, 1000);
    fsm.tick(true, 1200); // holding
    expect(fsm.tick(false, 1233).state).toBe("holding"); // one bad frame at 30fps
    expect(fsm.tick(true, 1266).state).toBe("holding");
    fsm.tick(false, 2500); // criteria genuinely lost
    const r = fsm.tick(false, 2500 + DEFAULT_HOLD_CONFIG.dropGraceMs);
    expect(r.state).toBe("dropped");
    expect(r.lastHoldMs).toBe(1500);
  });

  it("starts and stops instantly when both windows are zero", () => {
    const fsm = new HoldStateMachine({ qualifyingMs: 0, dropGraceMs: 0, resetDelayMs: 100, mode: "hold_only" });
    expect(fsm.tick(true, 1000).state).toBe("holding");
    const r = fsm.tick(false, 2500);
    expect(r.state).toBe("dropped");
    expect(r.lastHoldMs).toBe(1500);
  });

  it("returns to idle after the reset delay", () => {
    const fsm = new HoldStateMachine({ qualifyingMs: 0, dropGraceMs: 0, resetDelayMs: 100, mode: "hold_only" });
    fsm.tick(true, 0);
    fsm.tick(false, 500);
    expect(fsm.tick(false, 550).state).toBe("dropped");
    expect(fsm.tick(false, 650).state).toBe("idle");
  });

  it("transitions idle to holding after qualifying", () => {
    const fsm = new HoldStateMachine({ qualifyingMs: 100, dropGraceMs: 50, resetDelayMs: 100, mode: "hold_only" });
    let r = fsm.tick(true, 0);
    expect(r.state).toBe("qualifying");
    r = fsm.tick(true, 150);
    expect(r.state).toBe("holding");
  });

  it("returns to idle when criteria lost while qualifying", () => {
    const fsm = new HoldStateMachine({ qualifyingMs: 100, dropGraceMs: 50, resetDelayMs: 100, mode: "hold_only" });
    fsm.tick(true, 0);
    const r = fsm.tick(false, 50);
    expect(r.state).toBe("idle");
  });

  it("measures hold from skill start through grace config", () => {
    const fsm = new HoldStateMachine({ qualifyingMs: 100, dropGraceMs: 200, resetDelayMs: 100, mode: "perfect" });
    fsm.tick(true, 0); // skill begins
    fsm.tick(true, 150); // now holding (timer backdated to skill start)
    fsm.tick(false, 1150); // criteria lost — grace begins
    const r = fsm.tick(false, 1400); // grace expired -> dropped
    expect(r.state).toBe("dropped");
    expect(r.lastHoldMs).toBe(1150);
  });

  it("survives a brief form break within the grace window", () => {
    const fsm = new HoldStateMachine({ qualifyingMs: 100, dropGraceMs: 200, resetDelayMs: 100, mode: "perfect" });
    fsm.tick(true, 0);
    fsm.tick(true, 150); // holding
    fsm.tick(false, 300); // blip
    const r = fsm.tick(true, 400); // recovered within grace
    expect(r.state).toBe("holding");
  });
});

describe("distance context", () => {
  it("detects far camera from small body span", () => {
    const farBody: Record<string, { x: number; y: number } | null> = {
      nose: { x: 0.5, y: 0.2 },
      leftShoulder: { x: 0.45, y: 0.28 },
      rightShoulder: { x: 0.55, y: 0.28 },
      leftHip: { x: 0.45, y: 0.38 },
      rightHip: { x: 0.55, y: 0.38 },
      leftAnkle: { x: 0.45, y: 0.48 },
      rightAnkle: { x: 0.55, y: 0.48 },
    };
    const ctx = getDistanceContext(farBody);
    expect(ctx.isFar).toBe(true);
    expect(ctx.bodyDetected).toBe(true);
    expect(ctx.captureMaxEdge).toBeGreaterThan(640);
    expect(ctx.visThreshold).toBeLessThan(0.4);
  });

  it("reports the real body span when the athlete is close (needed for step-back guidance)", () => {
    const nearBody: Record<string, { x: number; y: number } | null> = {
      nose: { x: 0.5, y: 0.05 },
      leftShoulder: { x: 0.4, y: 0.18 },
      rightShoulder: { x: 0.6, y: 0.18 },
      leftHip: { x: 0.42, y: 0.5 },
      rightHip: { x: 0.58, y: 0.5 },
      leftAnkle: { x: 0.42, y: 0.9 },
      rightAnkle: { x: 0.58, y: 0.9 },
    };
    const ctx = getDistanceContext(nearBody);
    expect(ctx.isFar).toBe(false);
    expect(ctx.bodySpan).toBeGreaterThan(0.8);
    expect(recommendFramingGuidance(ctx.bodySpan)).toContain("Step back");
  });

  it("flags frames with no usable body instead of guessing a distance", () => {
    const ctx = getDistanceContext({});
    expect(ctx.bodyDetected).toBe(false);
    expect(ctx.isFar).toBe(false);
  });

  it("memoizes the context per landmark object", () => {
    const body = { nose: { x: 0.5, y: 0.1 }, leftAnkle: { x: 0.5, y: 0.8 } };
    expect(getDistanceContext(body)).toBe(getDistanceContext(body));
  });

  it("recommends zoom in when athlete is too small in frame", () => {
    const range = { min: 1, max: 4, step: 0.1 };
    expect(recommendBackCameraZoom(0.4, 1.5, range)).toBeGreaterThan(1.5);
    expect(recommendBackCameraZoom(0.7, 1.5, range)).toBeNull();
    expect(recommendBackCameraZoom(0.85, 2, range)).toBeLessThan(2);
  });

  it("requests a wider lens when zoom is already at minimum", () => {
    const range = { min: 1, max: 4, step: 0.1 };
    expect(shouldSwitchToWiderLens(0.82, 1, range)).toBe(true);
    expect(shouldSwitchToWiderLens(0.7, 1.5, range)).toBe(false);
  });

  it("suggests position coaching when hardware zoom is unavailable", () => {
    expect(recommendFramingGuidance(0.85)).toContain("Step back");
    expect(recommendFramingGuidance(0.4)).toContain("Move closer");
    expect(recommendFramingGuidance(0.68)).toBeNull();
  });
});

describe("skills registry", () => {
  it("has all 29 skills", () => {
    expect(SKILLS.length).toBe(29);
  });

  it("assigns every skill to exactly one learning path in order", () => {
    expect(validateLearningPaths()).toEqual([]);
  });

  it("caps form score when not in hold position", () => {
    const score = computeFormScore(false, [
      { id: "a", label: "A", score: 100, passed: true },
    ]);
    expect(score).toBeLessThanOrEqual(25);
  });

  it("does not treat standing as dips hold", () => {
    const standing: Record<string, { x: number; y: number } | null> = {
      leftShoulder: { x: 0.45, y: 0.3 },
      rightShoulder: { x: 0.55, y: 0.3 },
      leftElbow: { x: 0.45, y: 0.45 },
      rightElbow: { x: 0.55, y: 0.45 },
      leftWrist: { x: 0.45, y: 0.55 },
      rightWrist: { x: 0.55, y: 0.55 },
      leftHip: { x: 0.45, y: 0.5 },
      rightHip: { x: 0.55, y: 0.5 },
    };
    const result = evaluateSkill(
      "dips",
      standing,
      { left: null, right: null },
      [standing],
      "hold_only"
    );
    expect(result?.holdCriteriaMet).toBe(false);
    expect(result?.formScore).toBeLessThanOrEqual(25);
  });

  it("does not treat standing as push-up hold", () => {
    const standing: Record<string, { x: number; y: number } | null> = {
      leftShoulder: { x: 0.45, y: 0.25 },
      rightShoulder: { x: 0.55, y: 0.25 },
      leftElbow: { x: 0.45, y: 0.4 },
      rightElbow: { x: 0.55, y: 0.4 },
      leftWrist: { x: 0.45, y: 0.55 },
      rightWrist: { x: 0.55, y: 0.55 },
      leftHip: { x: 0.45, y: 0.45 },
      rightHip: { x: 0.55, y: 0.45 },
      leftAnkle: { x: 0.45, y: 0.7 },
      rightAnkle: { x: 0.55, y: 0.7 },
    };
    const result = evaluateSkill(
      "push-ups",
      standing,
      { left: null, right: null },
      [standing],
      "hold_only"
    );
    expect(result?.holdCriteriaMet).toBe(false);
    expect(result?.formScore).toBeLessThanOrEqual(25);
  });

  it("auto-detects handstand from inverted pose", () => {
    const body: Record<string, { x: number; y: number } | null> = {
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
    const detected = detectSkill(body, { left: null, right: null }, [body], "hold_only");
    expect(detected?.skillId).toBe("handstand");
    expect(detected?.holdMatch).toBe(true);
  });

  it("evaluates handstand inverted", () => {
    const body: Record<string, { x: number; y: number } | null> = {
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
    const result = evaluateSkill("handstand", body, { left: null, right: null }, [body], "hold_only");
    expect(result?.holdCriteriaMet).toBe(true);
  });
});

describe("one-arm handstand", () => {
  const invertedBody: Record<string, { x: number; y: number } | null> = {
    nose: { x: 0.5, y: 0.25 },
    leftShoulder: { x: 0.45, y: 0.4 },
    rightShoulder: { x: 0.55, y: 0.4 },
    leftHip: { x: 0.45, y: 0.55 },
    rightHip: { x: 0.55, y: 0.55 },
    leftWrist: { x: 0.45, y: 0.75 },
    rightWrist: { x: 0.55, y: 0.6 }, // free hand raised
    leftAnkle: { x: 0.45, y: 0.1 },
    rightAnkle: { x: 0.55, y: 0.1 },
    leftElbow: { x: 0.45, y: 0.55 },
    rightElbow: { x: 0.55, y: 0.5 },
    leftKnee: { x: 0.45, y: 0.35 },
    rightKnee: { x: 0.55, y: 0.35 },
  };

  it("detects hand off ground via wrist height delta", () => {
    const result = evaluateSkill(
      "one-arm-handstand",
      invertedBody,
      { left: null, right: null },
      [invertedBody],
      "hold_only"
    );
    expect(result?.holdCriteriaMet).toBe(true);
  });

  it("detects hand off ground when only one hand is tracked", () => {
    const levelWrists = {
      ...invertedBody,
      rightWrist: { x: 0.55, y: 0.75 },
    };
    const result = evaluateSkill(
      "one-arm-handstand",
      levelWrists,
      { left: [{ x: 0.45, y: 0.75 }], right: null },
      [levelWrists],
      "hold_only"
    );
    expect(result?.holdCriteriaMet).toBe(true);
  });
});

describe("coaching", () => {
  it("generates plan from failed metrics", () => {
    const plan = generateCoachingPlan("handstand", [
      { id: "body_line", label: "Straight line", score: 40, passed: false },
    ]);
    expect(plan.recommendedDrills.length).toBeGreaterThan(0);
  });
});

describe("skill map", () => {
  it("every skill is retrievable", () => {
    for (const s of SKILLS) {
      expect(getSkill(s.id)?.name).toBe(s.name);
    }
  });
});
