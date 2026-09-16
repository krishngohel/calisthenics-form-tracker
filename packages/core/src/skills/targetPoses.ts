import type { Landmark } from "../pose/provider";

function lm(x: number, y: number): Landmark {
  return { x, y, visibility: 1 };
}

const BILATERAL: [string, string][] = [
  ["leftShoulder", "rightShoulder"],
  ["leftElbow", "rightElbow"],
  ["leftWrist", "rightWrist"],
  ["leftHip", "rightHip"],
  ["leftKnee", "rightKnee"],
  ["leftAnkle", "rightAnkle"],
];

/**
 * Side-view pose: the far-side joints sit almost on top of the near-side
 * joints, nudged slightly so both are still drawable.
 */
function sideView(pose: Record<string, Landmark>, depth = 0.012): Record<string, Landmark> {
  const out = { ...pose };
  for (const [left, right] of BILATERAL) {
    const l = pose[left];
    if (l) out[right] = lm(l.x + depth, l.y + depth * 0.5);
  }
  return out;
}

/** Front-view pose: mirror the left side across the body's center line. */
function frontView(pose: Record<string, Landmark>, cx = 0.5): Record<string, Landmark> {
  const out = { ...pose };
  for (const [left, right] of BILATERAL) {
    const l = pose[left];
    if (l) out[right] = lm(cx + (cx - l.x), l.y);
  }
  return out;
}

function buildSideHang(chinAbove = false): Record<string, Landmark> {
  return sideView({
    nose: lm(0.46, chinAbove ? 0.14 : 0.2),
    leftShoulder: lm(0.44, chinAbove ? 0.2 : 0.24),
    leftElbow: lm(0.42, chinAbove ? 0.22 : 0.34),
    leftWrist: lm(0.4, 0.1),
    leftHip: lm(0.44, 0.42),
    leftKnee: lm(0.43, 0.58),
    leftAnkle: lm(0.42, 0.76),
  });
}

function buildSidePlank(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.36, 0.42),
    leftShoulder: lm(0.4, 0.44),
    leftElbow: lm(0.4, 0.52),
    leftWrist: lm(0.4, 0.6),
    leftHip: lm(0.56, 0.44),
    leftKnee: lm(0.68, 0.44),
    leftAnkle: lm(0.8, 0.44),
  });
}

function buildInverted(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.5, 0.72),
    leftShoulder: lm(0.48, 0.62),
    leftElbow: lm(0.46, 0.72),
    leftWrist: lm(0.44, 0.82),
    leftHip: lm(0.48, 0.44),
    leftKnee: lm(0.47, 0.3),
    leftAnkle: lm(0.46, 0.16),
  });
}

function buildHorizontalLever(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.36, 0.44),
    leftShoulder: lm(0.42, 0.46),
    leftElbow: lm(0.42, 0.36),
    leftWrist: lm(0.42, 0.26),
    leftHip: lm(0.58, 0.46),
    leftKnee: lm(0.7, 0.46),
    leftAnkle: lm(0.82, 0.46),
  });
}

function buildPlancheFull(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.36, 0.44),
    leftShoulder: lm(0.42, 0.46),
    leftElbow: lm(0.46, 0.56),
    leftWrist: lm(0.5, 0.66),
    leftHip: lm(0.58, 0.46),
    leftKnee: lm(0.7, 0.46),
    leftAnkle: lm(0.82, 0.46),
  });
}

function buildLSit(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.42, 0.28),
    leftShoulder: lm(0.4, 0.34),
    leftElbow: lm(0.4, 0.44),
    leftWrist: lm(0.4, 0.54),
    leftHip: lm(0.44, 0.5),
    leftKnee: lm(0.58, 0.5),
    leftAnkle: lm(0.72, 0.5),
  });
}

function buildSquatDeep(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.5, 0.36),
    leftShoulder: lm(0.46, 0.42),
    leftElbow: lm(0.5, 0.5),
    leftWrist: lm(0.56, 0.52),
    leftHip: lm(0.4, 0.6),
    leftKnee: lm(0.54, 0.62),
    leftAnkle: lm(0.5, 0.78),
  });
}

function buildPistol(): Record<string, Landmark> {
  const base = buildSquatDeep();
  // Free leg extended forward, parallel to the floor.
  base.rightHip = lm(0.412, 0.606);
  base.rightKnee = lm(0.6, 0.6);
  base.rightAnkle = lm(0.78, 0.6);
  return base;
}

function buildPlancheLean(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.34, 0.4),
    leftShoulder: lm(0.38, 0.44),
    leftElbow: lm(0.42, 0.52),
    leftWrist: lm(0.46, 0.6),
    leftHip: lm(0.56, 0.44),
    leftKnee: lm(0.68, 0.44),
    leftAnkle: lm(0.8, 0.44),
  });
}

function buildTuckPlanche(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.36, 0.46),
    leftShoulder: lm(0.42, 0.48),
    leftElbow: lm(0.46, 0.58),
    leftWrist: lm(0.5, 0.68),
    leftHip: lm(0.56, 0.48),
    leftKnee: lm(0.5, 0.4),
    leftAnkle: lm(0.5, 0.52),
  });
}

function buildAdvTuckPlanche(): Record<string, Landmark> {
  const base = buildTuckPlanche();
  base.leftKnee = lm(0.66, 0.42);
  base.leftAnkle = lm(0.64, 0.56);
  return sideView(base);
}

function buildStraddlePlanche(): Record<string, Landmark> {
  const base = buildPlancheFull();
  // Legs spread: one drawn slightly above the hip line, one slightly below.
  base.leftKnee = lm(0.68, 0.4);
  base.leftAnkle = lm(0.8, 0.36);
  base.rightKnee = lm(0.68, 0.52);
  base.rightAnkle = lm(0.8, 0.56);
  return base;
}

function buildHspu90(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.5, 0.66),
    leftShoulder: lm(0.48, 0.58),
    leftElbow: lm(0.4, 0.62),
    leftWrist: lm(0.42, 0.82),
    leftHip: lm(0.48, 0.42),
    leftKnee: lm(0.47, 0.28),
    leftAnkle: lm(0.46, 0.14),
  });
}

function buildOneArmHandstand(): Record<string, Landmark> {
  const base = buildInverted();
  // Free arm tucked to the hip.
  base.rightElbow = lm(0.5, 0.56);
  base.rightWrist = lm(0.5, 0.46);
  return base;
}

function buildCrow(): Record<string, Landmark> {
  return frontView({
    nose: lm(0.5, 0.58),
    leftShoulder: lm(0.42, 0.52),
    leftElbow: lm(0.4, 0.66),
    leftWrist: lm(0.4, 0.82),
    leftHip: lm(0.45, 0.4),
    leftKnee: lm(0.41, 0.6),
    leftAnkle: lm(0.44, 0.52),
  });
}

function buildFrontSquatDeep(): Record<string, Landmark> {
  return frontView({
    nose: lm(0.5, 0.3),
    leftShoulder: lm(0.42, 0.38),
    leftElbow: lm(0.4, 0.48),
    leftWrist: lm(0.42, 0.56),
    leftHip: lm(0.45, 0.58),
    leftKnee: lm(0.42, 0.68),
    leftAnkle: lm(0.44, 0.84),
  });
}

function buildNordic(): Record<string, Landmark> {
  return sideView({
    nose: lm(0.28, 0.36),
    leftShoulder: lm(0.34, 0.42),
    leftElbow: lm(0.32, 0.52),
    leftWrist: lm(0.3, 0.6),
    leftHip: lm(0.52, 0.56),
    leftKnee: lm(0.66, 0.7),
    leftAnkle: lm(0.82, 0.72),
  });
}

const TARGET_POSES: Record<string, Record<string, Landmark>> = {
  "dead-hang": buildSideHang(false),
  "scapular-pulls": buildSideHang(false),
  "chin-ups": buildSideHang(true),
  "pull-ups": buildSideHang(true),
  "muscle-up": buildSideHang(true),
  dips: buildSidePlank(),
  "push-ups": buildSidePlank(),
  "plank-hold": buildSidePlank(),
  "planche-lean": buildPlancheLean(),
  "pseudo-planche-push-ups": buildPlancheLean(),
  "tuck-planche": buildTuckPlanche(),
  "advanced-tuck-planche": buildAdvTuckPlanche(),
  "straddle-planche": buildStraddlePlanche(),
  handstand: buildInverted(),
  "handstand-push-ups-90": buildHspu90(),
  "handstand-push-ups": buildInverted(),
  "one-arm-handstand": buildOneArmHandstand(),
  "l-sit": buildLSit(),
  "front-lever": buildHorizontalLever(),
  planche: buildPlancheFull(),
  "skin-the-cat": buildHorizontalLever(),
  "frog-stand": buildCrow(),
  "crow-pose": buildCrow(),
  "pistol-squats": buildPistol(),
  "shrimp-squats": buildSquatDeep(),
  "dragon-squats": buildFrontSquatDeep(),
  "sissy-squats": buildSquatDeep(),
  "nordic-curls": buildNordic(),
  "bosu-single-leg-squats": buildFrontSquatDeep(),
};

export function getTargetPose(skillId: string): Record<string, Landmark> | null {
  return TARGET_POSES[skillId] ?? null;
}

function mid(a?: Landmark | null, b?: Landmark | null): Landmark | null {
  if (!a || !b) return a ?? b ?? null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Fit a canonical target pose onto the athlete's current pose so the ghost
 * skeleton and correction arrows appear *on the athlete*, regardless of where
 * they stand in frame, how far away they are, or which way they face.
 *
 * Alignment anchors on the hip midpoint and scales by torso length
 * (shoulder→hip). When the athlete faces the opposite direction from the
 * canonical pose (nose on the other side of the hips), the target is
 * mirrored horizontally around its hip line.
 */
export function alignTargetPose(
  target: Record<string, Landmark>,
  current: Record<string, Landmark | null>
): Record<string, Landmark> {
  const curHip = mid(current.leftHip, current.rightHip);
  const curShoulder = mid(current.leftShoulder, current.rightShoulder);
  const tgtHip = mid(target.leftHip, target.rightHip);
  const tgtShoulder = mid(target.leftShoulder, target.rightShoulder);
  if (!curHip || !curShoulder || !tgtHip || !tgtShoulder) return target;

  const curTorso = Math.hypot(curShoulder.x - curHip.x, curShoulder.y - curHip.y);
  const tgtTorso = Math.hypot(tgtShoulder.x - tgtHip.x, tgtShoulder.y - tgtHip.y);
  if (curTorso < 0.02 || tgtTorso < 0.02) return target;
  const scale = curTorso / tgtTorso;

  // Facing direction: which side of the hips the head is on (side views only).
  const curNoseSide = current.nose ? sideOf(current.nose.x - curHip.x) : 0;
  const tgtNoseSide = target.nose ? sideOf(target.nose.x - tgtHip.x) : 0;
  const flip = curNoseSide !== 0 && tgtNoseSide !== 0 && curNoseSide !== tgtNoseSide;

  const out: Record<string, Landmark> = {};
  for (const [key, lm] of Object.entries(target)) {
    const dx = (flip ? -1 : 1) * (lm.x - tgtHip.x) * scale;
    const dy = (lm.y - tgtHip.y) * scale;
    out[key] = { x: curHip.x + dx, y: curHip.y + dy, visibility: 1 };
  }

  if (flip) {
    for (const [left, right] of BILATERAL) {
      const l = out[left];
      const r = out[right];
      if (l && r) {
        out[left] = r;
        out[right] = l;
      }
    }
  }

  return out;
}

/** Sign with a dead zone so front-facing poses (nose over hips) never flip. */
function sideOf(dx: number): -1 | 0 | 1 {
  if (dx > 0.02) return 1;
  if (dx < -0.02) return -1;
  return 0;
}

/** Target pose for a skill, aligned onto the athlete's current landmarks. */
export function getAlignedTargetPose(
  skillId: string,
  current: Record<string, Landmark | null>
): Record<string, Landmark> | null {
  const target = getTargetPose(skillId);
  return target ? alignTargetPose(target, current) : null;
}
