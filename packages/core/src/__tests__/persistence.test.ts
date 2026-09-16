import { describe, it, expect } from "vitest";
import { LandmarkPersistence } from "../pose/persistence";

describe("LandmarkPersistence", () => {
  it("carries a briefly missing landmark forward with decaying confidence, then drops it", () => {
    const p = new LandmarkPersistence(100);
    p.apply({ nose: { x: 0.5, y: 0.2, visibility: 0.9 } }, 0);
    const a = p.apply({ nose: null }, 50);
    expect(a.nose?.x).toBe(0.5);
    expect(a.nose?.visibility).toBeCloseTo(0.45);
    const b = p.apply({ nose: null }, 150);
    expect(b.nose).toBeNull();
    // Once dropped it stays dropped until seen again.
    expect(p.apply({ nose: null }, 160).nose).toBeNull();
    expect(p.apply({ nose: { x: 0.6, y: 0.2 } }, 170).nose?.x).toBe(0.6);
  });

  it("never invents landmarks it has not seen", () => {
    const p = new LandmarkPersistence();
    expect(p.apply({ leftHip: null }, 0).leftHip).toBeNull();
  });
});
