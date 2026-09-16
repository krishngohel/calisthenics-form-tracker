import { describe, it, expect } from "vitest";
import {
  angleAtJoint,
  bodyUnit,
  hangDepth,
  ramp,
  toIsotropic,
  visibleJointAngle,
  type Body,
} from "../pose/geometry";
import { evaluateSkill } from "../skills/registry";
import { detectSkill } from "../skills/autoDetect";

const noHands = { left: null, right: null };

/** Landmarks from pixel coordinates in a frame of the given size. */
function fromPixels(px: Record<string, [number, number]>, w: number, h: number): Body {
  const out: Body = {};
  for (const [k, [x, y]] of Object.entries(px)) out[k] = { x: x / w, y: y / h, visibility: 0.95 };
  return out;
}

/** Scale a body about its centre and shift it, simulating distance / position changes. */
function transform(body: Body, scale: number, dx: number, dy: number): Body {
  const out: Body = {};
  for (const [k, lm] of Object.entries(body)) {
    out[k] = lm ? { ...lm, x: 0.5 + (lm.x - 0.5) * scale + dx, y: 0.5 + (lm.y - 0.5) * scale + dy } : null;
  }
  return out;
}

describe("isotropic coordinates", () => {
  it("recovers true joint angles on a 16:9 frame", () => {
    // Upper arm vertical, forearm at 45° → true elbow angle 135°.
    const body = fromPixels(
      { leftShoulder: [600, 200], leftElbow: [600, 400], leftWrist: [740, 540] },
      1280,
      720
    );
    const raw = angleAtJoint(body.leftShoulder!, body.leftElbow!, body.leftWrist!);
    expect(Math.abs(raw - 135)).toBeGreaterThan(10); // the distortion we are removing
    const iso = toIsotropic(body, 1280 / 720);
    expect(angleAtJoint(iso.leftShoulder!, iso.leftElbow!, iso.leftWrist!)).toBeCloseTo(135, 1);
  });

  it("is a no-op for square frames and preserves nulls", () => {
    const body: Body = { nose: { x: 0.2, y: 0.3 }, leftHip: null };
    expect(toIsotropic(body, 1)).toBe(body);
    expect(toIsotropic(body, 2).leftHip).toBeNull();
    expect(toIsotropic(body, 2).nose?.x).toBeCloseTo(0.4);
  });
});

describe("body units", () => {
  it("uses torso length, then height, then a fallback", () => {
    expect(bodyUnit({ leftShoulder: { x: 0.5, y: 0.3 }, rightShoulder: { x: 0.5, y: 0.3 }, leftHip: { x: 0.5, y: 0.55 }, rightHip: { x: 0.5, y: 0.55 } })).toBeCloseTo(0.25);
    expect(bodyUnit({ nose: { x: 0.5, y: 0.1 }, leftAnkle: { x: 0.5, y: 0.9 } })).toBeCloseTo(0.24);
    expect(bodyUnit({})).toBe(0.2);
  });

  it("ramp scores linearly in either direction and clamps", () => {
    expect(ramp(165, 120, 165)).toBe(100);
    expect(ramp(120, 120, 165)).toBe(0);
    expect(ramp(142.5, 120, 165)).toBe(50);
    expect(ramp(90, 150, 100)).toBe(100);
    expect(ramp(200, 150, 100)).toBe(0);
  });

  it("evaluations are invariant to distance and position in frame", () => {
    const handstand: Body = {
      nose: { x: 0.5, y: 0.2 },
      leftShoulder: { x: 0.45, y: 0.35 },
      rightShoulder: { x: 0.55, y: 0.35 },
      leftHip: { x: 0.45, y: 0.5 },
      rightHip: { x: 0.55, y: 0.5 },
      leftWrist: { x: 0.45, y: 0.7 },
      rightWrist: { x: 0.55, y: 0.7 },
      leftAnkle: { x: 0.45, y: 0.1 },
      rightAnkle: { x: 0.55, y: 0.1 },
      leftElbow: { x: 0.45, y: 0.52 },
      rightElbow: { x: 0.55, y: 0.52 },
      leftKnee: { x: 0.45, y: 0.3 },
      rightKnee: { x: 0.55, y: 0.3 },
    };
    // Note: a body this small in frame flips `farCamera`, which only widens
    // visibility tolerance — the geometry verdict must not change.
    const near = evaluateSkill("handstand", handstand, noHands, [], "perfect")!;
    const far = evaluateSkill("handstand", transform(handstand, 0.4, 0.2, 0.1), noHands, [], "perfect")!;
    expect(far.holdCriteriaMet).toBe(near.holdCriteriaMet);
    expect(far.perfectCriteriaMet).toBe(near.perfectCriteriaMet);
    expect(far.metrics.map((m) => m.passed)).toEqual(near.metrics.map((m) => m.passed));
    expect(far.formScore).toBe(near.formScore);
  });
});

describe("visible-side joint angles", () => {
  it("prefers the confident side over a hallucinated far side", () => {
    const body: Body = {
      leftShoulder: { x: 0.5, y: 0.3, visibility: 0.95 },
      leftElbow: { x: 0.5, y: 0.45, visibility: 0.95 },
      leftWrist: { x: 0.5, y: 0.6, visibility: 0.95 }, // straight, 180°
      rightShoulder: { x: 0.5, y: 0.3, visibility: 0.3 },
      rightElbow: { x: 0.6, y: 0.45, visibility: 0.25 },
      rightWrist: { x: 0.5, y: 0.55, visibility: 0.2 }, // bent, occluded guess
    };
    expect(visibleJointAngle(body, ["Shoulder", "Elbow", "Wrist"])).toBeCloseTo(180);
  });

  it("takes the smaller angle when both sides are equally visible", () => {
    const body: Body = {
      leftShoulder: { x: 0.5, y: 0.3 },
      leftElbow: { x: 0.5, y: 0.45 },
      leftWrist: { x: 0.5, y: 0.6 },
      rightShoulder: { x: 0.5, y: 0.3 },
      rightElbow: { x: 0.6, y: 0.45 },
      rightWrist: { x: 0.5, y: 0.45 },
    };
    expect(visibleJointAngle(body, ["Shoulder", "Elbow", "Wrist"])).toBeLessThan(120);
    expect(visibleJointAngle({}, ["Shoulder", "Elbow", "Wrist"])).toBe(180);
  });
});

describe("scapular pulls", () => {
  function hang(shoulderY: number): Body {
    return {
      nose: { x: 0.5, y: shoulderY - 0.09 },
      leftShoulder: { x: 0.45, y: shoulderY },
      rightShoulder: { x: 0.55, y: shoulderY },
      leftElbow: { x: 0.45, y: shoulderY - 0.13 },
      rightElbow: { x: 0.55, y: shoulderY - 0.13 },
      leftWrist: { x: 0.45, y: 0.08 },
      rightWrist: { x: 0.55, y: 0.08 },
      leftHip: { x: 0.45, y: shoulderY + 0.24 },
      rightHip: { x: 0.55, y: shoulderY + 0.24 },
      leftKnee: { x: 0.45, y: shoulderY + 0.44 },
      rightKnee: { x: 0.55, y: shoulderY + 0.44 },
      leftAnkle: { x: 0.45, y: shoulderY + 0.64 },
      rightAnkle: { x: 0.55, y: shoulderY + 0.64 },
    };
  }

  it("is measured against the athlete's own passive hang", () => {
    const passive = hang(0.34);
    const pulled = hang(0.29); // shoulders lifted ~0.2 T
    expect(hangDepth(passive)).toBeGreaterThan(hangDepth(pulled));

    const noHistory = evaluateSkill("scapular-pulls", pulled, noHands, [], "hold_only")!;
    expect(noHistory.holdCriteriaMet).toBe(false);

    const history = Array.from({ length: 10 }, () => passive);
    const withBaseline = evaluateSkill("scapular-pulls", pulled, noHands, history, "hold_only")!;
    expect(withBaseline.holdCriteriaMet).toBe(true);
    const stillPassive = evaluateSkill("scapular-pulls", passive, noHands, history, "hold_only")!;
    expect(stillPassive.holdCriteriaMet).toBe(false);
    expect(stillPassive.metrics.find((m) => m.id === "active_scap")?.passed).toBe(false);

    // A passive hang is still a dead hang.
    expect(evaluateSkill("dead-hang", passive, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    expect(detectSkill(passive, noHands, history)?.skillId).toBe("dead-hang");
  });
});

describe("L-sit and handstand models", () => {
  const lSit: Body = {
    nose: { x: 0.42, y: 0.3 },
    leftShoulder: { x: 0.4, y: 0.36 },
    rightShoulder: { x: 0.41, y: 0.36 },
    leftElbow: { x: 0.4, y: 0.47 },
    rightElbow: { x: 0.41, y: 0.47 },
    leftWrist: { x: 0.4, y: 0.58 },
    rightWrist: { x: 0.41, y: 0.58 },
    leftHip: { x: 0.44, y: 0.56 },
    rightHip: { x: 0.45, y: 0.56 },
    leftKnee: { x: 0.6, y: 0.56 },
    rightKnee: { x: 0.61, y: 0.56 },
    leftAnkle: { x: 0.76, y: 0.56 },
    rightAnkle: { x: 0.77, y: 0.56 },
  };

  it("L-sit needs a ~90° hip angle, not just raised hips", () => {
    expect(evaluateSkill("l-sit", lSit, noHands, [], "hold_only")?.holdCriteriaMet).toBe(true);
    // Legs hanging straight down: hips are up but the body is an I, not an L.
    const hangingLegs: Body = {
      ...lSit,
      leftKnee: { x: 0.44, y: 0.74 },
      rightKnee: { x: 0.45, y: 0.74 },
      leftAnkle: { x: 0.44, y: 0.92 },
      rightAnkle: { x: 0.45, y: 0.92 },
    };
    const r = evaluateSkill("l-sit", hangingLegs, noHands, [], "hold_only")!;
    expect(r.holdCriteriaMet).toBe(false);
    expect(r.metrics.find((m) => m.id === "hip_angle")?.passed).toBe(false);
  });

  it("handstand perfect mode requires shoulders stacked over the hands", () => {
    const stacked: Body = {
      nose: { x: 0.5, y: 0.72 },
      leftShoulder: { x: 0.48, y: 0.62 },
      rightShoulder: { x: 0.49, y: 0.62 },
      leftElbow: { x: 0.47, y: 0.73 },
      rightElbow: { x: 0.48, y: 0.73 },
      leftWrist: { x: 0.46, y: 0.84 },
      rightWrist: { x: 0.47, y: 0.84 },
      leftHip: { x: 0.48, y: 0.42 },
      rightHip: { x: 0.49, y: 0.42 },
      leftKnee: { x: 0.48, y: 0.26 },
      rightKnee: { x: 0.49, y: 0.26 },
      leftAnkle: { x: 0.48, y: 0.1 },
      rightAnkle: { x: 0.49, y: 0.1 },
    };
    expect(evaluateSkill("handstand", stacked, noHands, [], "perfect")?.perfectCriteriaMet).toBe(true);
    const planched: Body = {
      ...stacked,
      leftWrist: { x: 0.3, y: 0.84 },
      rightWrist: { x: 0.31, y: 0.84 },
      leftElbow: { x: 0.39, y: 0.73 },
      rightElbow: { x: 0.4, y: 0.73 },
    };
    const r = evaluateSkill("handstand", planched, noHands, [], "perfect")!;
    expect(r.holdCriteriaMet).toBe(true);
    expect(r.metrics.find((m) => m.id === "stacked")?.passed).toBe(false);
    expect(r.perfectCriteriaMet).toBe(false);
  });
});
