import type { Landmark } from "../pose/provider";
import type { FormMetric } from "./registry";
import { getAlignedTargetPose } from "./targetPoses";

export interface FormCorrection {
  joint: string;
  target: Landmark;
  label: string;
}

/** Which joints to nudge toward the target pose when a metric fails. */
const METRIC_JOINTS: Record<string, string[]> = {
  chin_height: ["nose", "leftShoulder", "rightShoulder"],
  top_position: ["nose"],
  elbow_bend: ["leftElbow", "rightElbow"],
  scap_init: ["leftShoulder", "rightShoulder"],
  scap_depression: ["leftShoulder", "rightShoulder"],
  no_chicken_neck: ["nose", "leftShoulder", "rightShoulder"],
  hollow: ["leftHip", "rightHip", "leftShoulder", "rightShoulder"],
  hip_height: ["leftHip", "rightHip"],
  leg_extension: ["leftKnee", "rightKnee", "leftAnkle", "rightAnkle"],
  inverted: ["leftAnkle", "rightAnkle", "leftShoulder", "rightShoulder"],
  body_line: ["leftHip", "rightHip", "leftShoulder", "rightShoulder"],
  no_banana: ["leftHip", "rightHip"],
  horizontal: ["leftHip", "rightHip", "leftAnkle", "rightAnkle"],
  straight: ["leftHip", "rightHip", "leftKnee", "rightKnee"],
  lean: ["leftShoulder", "rightShoulder"],
  depth: ["leftKnee", "rightKnee", "leftHip", "rightHip"],
  position: ["leftElbow", "rightElbow"],
  hang_position: ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist"],
  active_scap: ["leftShoulder", "rightShoulder"],
  plank_line: ["leftHip", "rightHip", "leftShoulder", "rightShoulder"],
  stacked: ["leftShoulder", "rightShoulder"],
  hip_angle: ["leftKnee", "rightKnee", "leftAnkle", "rightAnkle"],
  elbows: ["leftElbow", "rightElbow"],
  knee_stack: ["leftKnee", "rightKnee"],
  stack: ["leftKnee", "rightKnee"],
  transition: ["leftShoulder", "rightShoulder"],
  lowering: ["leftShoulder", "rightShoulder", "leftHip", "rightHip"],
  hands: ["leftWrist", "rightWrist"],
  pike: ["leftHip", "rightHip"],
  arms: ["leftElbow", "rightElbow"],
  hollow_body: ["leftShoulder", "rightShoulder", "leftAnkle", "rightAnkle"],
  arch: ["leftHip", "rightHip"],
  hips: ["leftHip", "rightHip"],
};

/**
 * Arrows from failing joints toward their position in the target pose.
 * The target is first aligned onto the athlete (see `alignTargetPose`), so the
 * arrows describe relative corrections rather than "walk to the frame center".
 */
export function computeFormCorrections(
  skillId: string,
  metrics: FormMetric[],
  current: Record<string, Landmark | null>,
  alignedTarget?: Record<string, Landmark> | null
): FormCorrection[] {
  const targetPose = alignedTarget ?? getAlignedTargetPose(skillId, current);
  if (!targetPose) return [];

  const failed = metrics.filter((m) => !m.passed && m.cue);
  const corrections: FormCorrection[] = [];
  const seen = new Set<string>();

  for (const metric of failed) {
    const joints = METRIC_JOINTS[metric.id] ?? [];
    for (const joint of joints) {
      if (seen.has(joint)) continue;
      const target = targetPose[joint];
      const cur = current[joint];
      if (!target || !cur) continue;

      const dx = target.x - cur.x;
      const dy = target.y - cur.y;
      if (Math.hypot(dx, dy) < 0.015) continue;

      seen.add(joint);
      corrections.push({
        joint,
        target,
        label: metric.cue ?? metric.label,
      });
    }
  }

  return corrections.slice(0, 4);
}
