import { describe, it, expect } from "vitest";
import { HoldMetricsAccumulator } from "../hold/accumulator";

describe("HoldMetricsAccumulator", () => {
  it("averages scores and derives pass from the pass rate across the hold", () => {
    const acc = new HoldMetricsAccumulator();
    for (let i = 0; i < 10; i++) {
      acc.push(80 + i, [
        { id: "line", label: "Body line", score: 100, passed: true, cue: "Straight" },
        // Fails on the final 2 frames only — the frames that end the hold.
        { id: "arms", label: "Arms", score: i >= 8 ? 40 : 100, passed: i < 8, cue: "Lock" },
      ]);
    }
    const summary = acc.summarize();
    expect(summary.frames).toBe(10);
    expect(summary.formScore).toBe(85);
    const arms = summary.metrics.find((m) => m.id === "arms")!;
    expect(arms.passed).toBe(true);
    expect(arms.score).toBe(88);
    expect(arms.cue).toBe("Lock");
  });

  it("marks a metric failed when it failed on most frames", () => {
    const acc = new HoldMetricsAccumulator();
    for (let i = 0; i < 4; i++) {
      acc.push(50, [{ id: "hollow", label: "Hollow", score: 50, passed: i === 0 }]);
    }
    expect(acc.summarize().metrics[0].passed).toBe(false);
  });

  it("resets cleanly", () => {
    const acc = new HoldMetricsAccumulator();
    acc.push(90, [{ id: "a", label: "A", score: 90, passed: true }]);
    acc.reset();
    expect(acc.frameCount).toBe(0);
    expect(acc.summarize()).toEqual({ formScore: 0, metrics: [], frames: 0 });
  });
});
