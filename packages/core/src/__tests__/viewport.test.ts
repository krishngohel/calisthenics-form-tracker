import { describe, it, expect } from "vitest";
import { coverMapping, projectPoint } from "../pose/viewport";

describe("coverMapping", () => {
  it("is the identity when aspect ratios match", () => {
    const m = coverMapping(1280, 720, 640, 360);
    expect(m).toEqual({ drawWidth: 640, drawHeight: 360, offsetX: 0, offsetY: 0 });
  });

  it("crops the sides of a landscape video shown in a portrait box", () => {
    // 16:9 video in a 3:4 box: scale to fill height, overflow width.
    const m = coverMapping(1280, 720, 300, 400);
    expect(m.drawHeight).toBe(400);
    expect(m.drawWidth).toBeCloseTo(711.11, 1);
    expect(m.offsetY).toBe(0);
    expect(m.offsetX).toBeCloseTo(-205.56, 1);
    // A landmark at the horizontal center still lands at the box center.
    expect(projectPoint(0.5, 0.5, m, false)).toEqual({ x: 150, y: 200 });
    // A landmark near the left edge of the video is off-canvas (cropped).
    expect(projectPoint(0.05, 0.5, m, false).x).toBeLessThan(0);
  });

  it("crops top/bottom of a portrait video shown in a landscape box", () => {
    const m = coverMapping(720, 1280, 640, 360);
    expect(m.drawWidth).toBe(640);
    expect(m.offsetX).toBe(0);
    expect(m.offsetY).toBeLessThan(0);
  });

  it("mirrors horizontally around the box when requested", () => {
    const m = coverMapping(1280, 720, 640, 360);
    expect(projectPoint(0.25, 0.5, m, true).x).toBe(480);
  });

  it("degrades to the box when dimensions are unknown", () => {
    expect(coverMapping(0, 0, 640, 360)).toEqual({
      drawWidth: 640,
      drawHeight: 360,
      offsetX: 0,
      offsetY: 0,
    });
  });
});
