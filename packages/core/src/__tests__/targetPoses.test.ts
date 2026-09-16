import { describe, it, expect } from "vitest";
import { alignTargetPose, getAlignedTargetPose, getTargetPose } from "../skills/targetPoses";
import { computeFormCorrections } from "../skills/formCorrections";
import { SKILLS } from "../skills/registry";

/** Upright athlete standing on the left third of the frame, facing right. */
const athleteLeft = {
  nose: { x: 0.24, y: 0.3 },
  leftShoulder: { x: 0.2, y: 0.36 },
  rightShoulder: { x: 0.2, y: 0.36 },
  leftHip: { x: 0.2, y: 0.56 },
  rightHip: { x: 0.2, y: 0.56 },
  leftKnee: { x: 0.2, y: 0.72 },
  rightKnee: { x: 0.2, y: 0.72 },
  leftAnkle: { x: 0.2, y: 0.88 },
  rightAnkle: { x: 0.2, y: 0.88 },
  leftWrist: { x: 0.18, y: 0.6 },
  rightWrist: { x: 0.18, y: 0.6 },
  leftElbow: { x: 0.19, y: 0.48 },
  rightElbow: { x: 0.19, y: 0.48 },
};

describe("alignTargetPose", () => {
  it("every skill has a target pose", () => {
    for (const skill of SKILLS) {
      expect(getTargetPose(skill.id), skill.id).not.toBeNull();
    }
  });

  it("anchors the target on the athlete's hips and scales to their torso", () => {
    const target = getTargetPose("handstand")!;
    const aligned = alignTargetPose(target, athleteLeft);
    const hip = { x: (aligned.leftHip.x + aligned.rightHip.x) / 2, y: (aligned.leftHip.y + aligned.rightHip.y) / 2 };
    expect(hip.x).toBeCloseTo(0.2, 5);
    expect(hip.y).toBeCloseTo(0.56, 5);

    const torso = Math.hypot(
      (aligned.leftShoulder.x + aligned.rightShoulder.x) / 2 - hip.x,
      (aligned.leftShoulder.y + aligned.rightShoulder.y) / 2 - hip.y
    );
    expect(torso).toBeCloseTo(0.2, 5);
  });

  it("mirrors the target when the athlete faces the other way", () => {
    const target = getTargetPose("plank-hold")!; // canonical plank faces left (nose x < hip x)
    const facingRight = alignTargetPose(target, athleteLeft); // athlete's nose is right of hips
    expect(facingRight.nose.x).toBeGreaterThan(facingRight.leftHip.x);

    const athleteFacingLeft = { ...athleteLeft, nose: { x: 0.16, y: 0.3 } };
    const facingLeft = alignTargetPose(target, athleteFacingLeft);
    expect(facingLeft.nose.x).toBeLessThan(facingLeft.leftHip.x);
  });

  it("falls back to the canonical pose when the athlete's torso is not visible", () => {
    const target = getTargetPose("l-sit")!;
    expect(alignTargetPose(target, { nose: { x: 0.5, y: 0.5 } })).toBe(target);
  });

  it("corrections point relative to the athlete, not to the frame center", () => {
    const corrections = computeFormCorrections(
      "handstand",
      [{ id: "inverted", label: "Inverted", score: 20, passed: false, cue: "Kick up" }],
      athleteLeft
    );
    expect(corrections.length).toBeGreaterThan(0);
    for (const c of corrections) {
      // Targets stay near the athlete's column of the frame.
      expect(Math.abs(c.target.x - 0.2)).toBeLessThan(0.15);
    }
    expect(getAlignedTargetPose("nope", athleteLeft)).toBeNull();
  });
});
