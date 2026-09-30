import type { Landmark } from "./provider";
import { bodyUnit, midpoint } from "./geometry";
import type { CameraAngle } from "../skills/registry";

type Body = Record<string, Landmark | null>;

export type BodyView = "side" | "front" | "diagonal" | "unknown";

export interface ViewEstimate {
  view: BodyView;
  /** Shoulder (or hip) width over torso length, in isotropic units. ~0.9 facing the camera, <0.3 side-on. */
  ratio: number;
}

const SIDE_MAX = 0.32;
const FRONT_MIN = 0.62;

/**
 * Which way the athlete faces the camera, from the apparent width of the
 * shoulders and hips against the torso length. Both pairs are used so a
 * hidden arm does not fool it; the wider pair wins because occlusion only
 * ever makes a pair look narrower.
 */
export function estimateView(body: Body): ViewEstimate {
  const T = bodyUnit(body);
  const pairs: [string, string][] = [["leftShoulder", "rightShoulder"], ["leftHip", "rightHip"]];
  let width = 0;
  let seen = 0;
  for (const [a, b] of pairs) {
    const pa = body[a], pb = body[b];
    if (!pa || !pb) continue;
    seen++;
    width = Math.max(width, Math.hypot(pa.x - pb.x, pa.y - pb.y));
  }
  if (!seen || T <= 0 || !midpoint(body.leftShoulder, body.rightShoulder)) return { view: "unknown", ratio: 0 };
  const ratio = width / T;
  const view: BodyView = ratio < SIDE_MAX ? "side" : ratio > FRONT_MIN ? "front" : "diagonal";
  return { view, ratio };
}

/** A short instruction when the athlete is not facing the way the skill's rules expect; null when fine or unknown. */
export function viewHint(wanted: CameraAngle, estimate: ViewEstimate): string | null {
  if (estimate.view === "unknown") return null;
  if (wanted === "side" && estimate.view === "front") return "Turn side-on to the camera";
  if (wanted === "side" && estimate.view === "diagonal" && estimate.ratio > 0.45) return "Turn a little more side-on";
  if (wanted === "front" && estimate.view === "side") return "Face the camera";
  return null;
}
