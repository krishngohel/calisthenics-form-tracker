import { describe, it, expect } from "vitest";
import { frameRotationFromOrientation, isInverted, isHanging, orientToGravity, toIsotropic, type Body } from "../pose/geometry";
import { detectSkill } from "../skills/autoDetect";

/** A clean dead hang as the camera sees it when the phone is right way up. */
const hang: Body = {
  nose: { x: 0.5, y: 0.2 },
  leftShoulder: { x: 0.45, y: 0.28 },
  rightShoulder: { x: 0.55, y: 0.28 },
  leftElbow: { x: 0.45, y: 0.18 },
  rightElbow: { x: 0.55, y: 0.18 },
  leftWrist: { x: 0.45, y: 0.08 },
  rightWrist: { x: 0.55, y: 0.08 },
  leftHip: { x: 0.45, y: 0.52 },
  rightHip: { x: 0.55, y: 0.52 },
  leftKnee: { x: 0.45, y: 0.7 },
  rightKnee: { x: 0.55, y: 0.7 },
  leftAnkle: { x: 0.45, y: 0.88 },
  rightAnkle: { x: 0.55, y: 0.88 },
};

function flipFrame(body: Body): Body {
  const out: Body = {};
  for (const [k, v] of Object.entries(body)) out[k] = v ? { ...v, x: 1 - v.x, y: 1 - v.y } : null;
  return out;
}

describe("gravity orientation", () => {
  it("an upside-down frame turns a dead hang into a 'handstand' unless corrected", () => {
    const aspect = 9 / 16;
    const seenUpsideDown = flipFrame(hang);
    const raw = toIsotropic(seenUpsideDown, aspect);
    expect(isInverted(raw)).toBe(true); // the failure mode reported on device
    expect(detectSkill(raw, { left: null, right: null }, [raw])?.skillId).toBe("handstand");

    const corrected = orientToGravity(raw, 180, aspect);
    expect(isInverted(corrected)).toBe(false);
    expect(isHanging(corrected)).toBe(true);
    expect(detectSkill(corrected, { left: null, right: null }, [corrected])?.skillId).toBe("dead-hang");
  });

  it("rotation 0 is the identity; 90/270 map points as expected", () => {
    const aspect = 2;
    const iso = toIsotropic(hang, aspect);
    expect(orientToGravity(iso, 0, aspect)).toBe(iso);
    const p: Body = { nose: { x: 0.5, y: 0.25 } };
    expect(orientToGravity(p, 90, aspect).nose).toMatchObject({ x: 0.25, y: 1.5 });
    expect(orientToGravity(p, 270, aspect).nose).toMatchObject({ x: 0.75, y: 0.5 });
  });

  it("a hang filmed in a sideways frame reads as a hang after the matching correction", () => {
    // Landscape frame (16:9) in which the athlete lies along x: wrists at the left edge, feet at the right.
    const aspect = 16 / 9;
    const sideways: Body = {};
    for (const [k, v] of Object.entries(hang)) sideways[k] = v ? { x: v.y, y: 1 - v.x } : null; // 90° turn of the upright hang
    const iso = toIsotropic(sideways, aspect);
    const results = ([90, 270] as const).map((r) => isHanging(orientToGravity(iso, r, aspect)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it("maps device orientation readings to frame rotations", () => {
    expect(frameRotationFromOrientation(85, 2)).toBe(0); // standing upright
    expect(frameRotationFromOrientation(-80, -3)).toBe(180); // propped port-up
    expect(frameRotationFromOrientation(10, 80)).toBe(90);
    expect(frameRotationFromOrientation(5, -85)).toBe(270);
    expect(frameRotationFromOrientation(3, 4)).toBeNull(); // flat
    expect(frameRotationFromOrientation(null, null)).toBeNull();
  });
});
