import { describe, it, expect } from "vitest";
import { OneEuroFilter, PoseSmoother, rejectOutliers } from "../pose/smoothing";
import { LandmarkInterpolator } from "../pose/interpolation";
import { computeFormScore, FormScoreSmoother } from "../scoring/formScore";

describe("OneEuroFilter", () => {
  it("passes the first sample through and damps jitter afterwards", () => {
    const f = new OneEuroFilter(1.0, 0.007, 1.0);
    const first = f.filter({ x: 0.5, y: 0.5 }, 0);
    expect(first.x).toBe(0.5);
    let out = first;
    for (let i = 1; i <= 30; i++) {
      out = f.filter({ x: 0.5 + (i % 2 ? 0.02 : -0.02), y: 0.5 }, i * 33);
    }
    expect(Math.abs(out.x - 0.5)).toBeLessThan(0.02);
  });

  it("tracks fast motion with little lag", () => {
    const f = new OneEuroFilter(1.0, 0.5, 1.0);
    let out = { x: 0, y: 0 };
    for (let i = 0; i <= 30; i++) {
      out = f.filter({ x: i / 30, y: 0 }, i * 33);
    }
    expect(out.x).toBeGreaterThan(0.85);
  });
});

describe("PoseSmoother", () => {
  it("drops the filter for a landmark that disappears so it re-seeds on return", () => {
    const s = new PoseSmoother();
    s.smoothLandmarks({ nose: { x: 0.1, y: 0.1 } }, 0);
    s.smoothLandmarks({ nose: null }, 33);
    const out = s.smoothLandmarks({ nose: { x: 0.9, y: 0.9 } }, 66);
    expect(out.nose?.x).toBe(0.9);
  });
});

describe("rejectOutliers", () => {
  const base = {
    nose: { x: 0.5, y: 0.1 },
    leftAnkle: { x: 0.5, y: 0.9 },
    leftWrist: { x: 0.4, y: 0.5 },
  };
  it("accepts small motion and rejects a teleporting joint", () => {
    expect(rejectOutliers(base, { ...base, leftWrist: { x: 0.42, y: 0.5 } })).toBe(false);
    expect(rejectOutliers(base, { ...base, leftWrist: { x: 0.9, y: 0.5 } })).toBe(true);
    expect(rejectOutliers(null, base)).toBe(false);
  });
});

describe("LandmarkInterpolator", () => {
  it("lerps between detections and extrapolates slightly past the latest", () => {
    const interp = new LandmarkInterpolator();
    interp.update({ nose: { x: 0, y: 0 } }, 0);
    interp.update({ nose: { x: 1, y: 0 } }, 100);
    expect(interp.interpolate(50)?.landmarks.nose?.x).toBeCloseTo(0.5);
    expect(interp.interpolate(120, { extrapolateMs: 40 })?.landmarks.nose?.x).toBeCloseTo(1.2);
    // Extrapolation is capped.
    expect(interp.interpolate(500, { extrapolateMs: 40 })?.landmarks.nose?.x).toBeCloseTo(1.4);
  });
});

describe("form score", () => {
  it("blends average and pass ratio when the hold is met", () => {
    expect(
      computeFormScore(true, [
        { id: "a", label: "A", score: 100, passed: true },
        { id: "b", label: "B", score: 50, passed: false },
      ])
    ).toBe(56);
    expect(computeFormScore(true, [])).toBe(100);
    expect(computeFormScore(false, [])).toBe(0);
  });

  it("smoother converges toward the raw score", () => {
    const s = new FormScoreSmoother();
    let v = 0;
    for (let t = 0; t < 3000; t += 33) v = s.update(90, t, true);
    expect(v).toBeGreaterThanOrEqual(88);
  });
});
