import { describe, expect, it } from "vitest";
import { BoneConsistencyFilter } from "../pose/skeleton";
import { estimateView, viewHint } from "../pose/view";
import { SkillVote } from "../skills/autoDetect";
import type { Landmark } from "../pose/provider";

type Body = Record<string, Landmark | null>;

function standing(scale = 1, shoulderWidth = 0.18): Body {
  const lm = (x: number, y: number): Landmark => ({ x: 0.5 + x * scale, y: 0.5 + y * scale, visibility: 0.95 });
  const w = shoulderWidth / 2;
  return {
    nose: lm(0, -0.42),
    leftShoulder: lm(-w, -0.3), rightShoulder: lm(w, -0.3),
    leftElbow: lm(-w - 0.02, -0.1), rightElbow: lm(w + 0.02, -0.1),
    leftWrist: lm(-w - 0.03, 0.1), rightWrist: lm(w + 0.03, 0.1),
    leftHip: lm(-w * 0.8, 0.05), rightHip: lm(w * 0.8, 0.05),
    leftKnee: lm(-w * 0.8, 0.3), rightKnee: lm(w * 0.8, 0.3),
    leftAnkle: lm(-w * 0.8, 0.55), rightAnkle: lm(w * 0.8, 0.55),
  };
}

describe("bone consistency filter", () => {
  it("learns bone lengths, then attenuates a joint that snaps away", () => {
    const f = new BoneConsistencyFilter();
    for (let i = 0; i < 20; i++) expect(f.apply(standing()).flagged).toEqual([]);
    const bad = standing();
    bad.leftWrist = { x: 0.5, y: 0.9, visibility: 0.9 }; // wrist teleports to the ankles
    const out = f.apply(bad);
    expect(out.flagged).toEqual(["leftWrist"]);
    expect(out.body.leftWrist?.visibility).toBeLessThanOrEqual(0.1);
    expect(out.body.leftElbow?.visibility).toBe(0.95); // neighbour keeps its other bone, so it survives
  });

  it("tolerates a gradual change of distance from the camera", () => {
    const f = new BoneConsistencyFilter();
    for (let i = 0; i < 20; i++) f.apply(standing(1));
    for (let i = 0; i < 40; i++) expect(f.apply(standing(1 + i * 0.01)).flagged).toEqual([]);
  });

  it("does not reject during warm-up", () => {
    const f = new BoneConsistencyFilter();
    const bad = standing();
    bad.leftWrist = { x: 0.5, y: 0.9, visibility: 0.9 };
    expect(f.apply(bad).flagged).toEqual([]);
  });
});

describe("view estimation", () => {
  it("tells front from side by apparent shoulder width", () => {
    expect(estimateView(standing(1, 0.3)).view).toBe("front");
    expect(estimateView(standing(1, 0.04)).view).toBe("side");
    expect(estimateView(standing(1, 0.16)).view).toBe("diagonal");
    expect(estimateView({}).view).toBe("unknown");
  });
  it("hints only on a mismatch", () => {
    expect(viewHint("side", estimateView(standing(1, 0.3)))).toBe("Turn side-on to the camera");
    expect(viewHint("side", estimateView(standing(1, 0.04)))).toBeNull();
    expect(viewHint("front", estimateView(standing(1, 0.04)))).toBe("Face the camera");
    expect(viewHint("diagonal", estimateView(standing(1, 0.3)))).toBeNull();
  });
});

describe("skill vote", () => {
  it("needs a majority of recent frames before naming a skill", () => {
    const v = new SkillVote(6, 4);
    expect(v.push("handstand")).toBeNull();
    expect(v.push("pike-push-ups")).toBeNull();
    expect(v.push("handstand")).toBeNull();
    expect(v.push("handstand")).toBeNull();
    expect(v.push("handstand")).toBe("handstand");
    expect(v.push("dead-hang")).toBe("handstand");
    expect(v.push("dead-hang")).toBeNull();
  });
});
