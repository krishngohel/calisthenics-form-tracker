import { describe, it, expect } from "vitest";
import { dropLowConfidence } from "../pose/confidence";
import { evaluateSkill } from "../skills/registry";

describe("dropLowConfidence", () => {
  it("nulls low-score keypoints and keeps points without a score", () => {
    const out = dropLowConfidence({
      nose: { x: 0.5, y: 0.1, visibility: 0.9 },
      leftAnkle: { x: 0.1, y: 0.95, visibility: 0.05 },
      leftHip: { x: 0.5, y: 0.5 },
      rightHip: null,
    });
    expect(out.nose).not.toBeNull();
    expect(out.leftAnkle).toBeNull();
    expect(out.leftHip).not.toBeNull();
    expect(out.rightHip).toBeNull();
  });

  it("prevents garbage off-frame ankles from faking an inverted pose", () => {
    // Standing upright, but the model hallucinated ankles above the head with ~0 score.
    const standing = {
      nose: { x: 0.5, y: 0.2, visibility: 0.9 },
      leftShoulder: { x: 0.45, y: 0.3, visibility: 0.9 },
      rightShoulder: { x: 0.55, y: 0.3, visibility: 0.9 },
      leftElbow: { x: 0.45, y: 0.42, visibility: 0.9 },
      rightElbow: { x: 0.55, y: 0.42, visibility: 0.9 },
      leftWrist: { x: 0.45, y: 0.55, visibility: 0.9 },
      rightWrist: { x: 0.55, y: 0.55, visibility: 0.9 },
      leftHip: { x: 0.45, y: 0.5, visibility: 0.9 },
      rightHip: { x: 0.55, y: 0.5, visibility: 0.9 },
      leftAnkle: { x: 0.45, y: 0.02, visibility: 0.03 },
      rightAnkle: { x: 0.55, y: 0.02, visibility: 0.03 },
    };
    const raw = evaluateSkill("handstand", standing, { left: null, right: null }, [], "hold_only");
    const filtered = evaluateSkill(
      "handstand",
      dropLowConfidence(standing),
      { left: null, right: null },
      [],
      "hold_only"
    );
    expect(raw?.metrics[0].passed).toBe(true); // the failure mode we are guarding against
    expect(filtered?.holdCriteriaMet).toBe(false);
  });
});
