import type { Landmark } from "../pose/provider";

function lm(x: number, y: number): Landmark {
  return { x, y, visibility: 1 };
}

/** Mirror left-side x around center for bilateral landmarks. */
function mirrorRight(
  pose: Record<string, Landmark>,
  cx = 0.5
): Record<string, Landmark> {
  const pairs: [string, string][] = [
    ["leftShoulder", "rightShoulder"],
    ["leftElbow", "rightElbow"],
    ["leftWrist", "rightWrist"],
    ["leftHip", "rightHip"],
    ["leftKnee", "rightKnee"],
    ["leftAnkle", "rightAnkle"],
  ];
  const out = { ...pose };
  for (const [left, right] of pairs) {
    const l = pose[left];
    if (!l) continue;
    out[left] = l;
    out[right] = lm(cx + (cx - l.x), l.y);
  }
  return out;
}

function buildSideHang(chinAbove = false): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.46, chinAbove ? 0.14 : 0.2),
    leftShoulder: lm(0.44, chinAbove ? 0.2 : 0.24),
    leftElbow: lm(0.42, 0.34),
    leftWrist: lm(0.4, 0.1),
    leftHip: lm(0.44, 0.42),
    leftKnee: lm(0.43, 0.58),
    leftAnkle: lm(0.42, 0.76),
  };
  return mirrorRight(base);
}

function buildSidePlank(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.52, 0.42),
    leftShoulder: lm(0.48, 0.44),
    leftElbow: lm(0.44, 0.44),
    leftWrist: lm(0.4, 0.44),
    leftHip: lm(0.56, 0.44),
    leftKnee: lm(0.68, 0.44),
    leftAnkle: lm(0.8, 0.44),
  };
  return mirrorRight(base);
}

function buildInverted(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.5, 0.72),
    leftShoulder: lm(0.48, 0.62),
    leftElbow: lm(0.46, 0.52),
    leftWrist: lm(0.44, 0.42),
    leftHip: lm(0.48, 0.48),
    leftKnee: lm(0.47, 0.36),
    leftAnkle: lm(0.46, 0.24),
  };
  return mirrorRight(base);
}

function buildHorizontalLever(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.38, 0.48),
    leftShoulder: lm(0.42, 0.46),
    leftElbow: lm(0.46, 0.46),
    leftWrist: lm(0.5, 0.46),
    leftHip: lm(0.58, 0.46),
    leftKnee: lm(0.7, 0.46),
    leftAnkle: lm(0.82, 0.46),
  };
  return mirrorRight(base);
}

function buildLSit(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.42, 0.38),
    leftShoulder: lm(0.4, 0.4),
    leftElbow: lm(0.38, 0.4),
    leftWrist: lm(0.36, 0.4),
    leftHip: lm(0.44, 0.38),
    leftKnee: lm(0.58, 0.38),
    leftAnkle: lm(0.72, 0.38),
  };
  return mirrorRight(base);
}

function buildSquatDeep(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.46, 0.28),
    leftShoulder: lm(0.44, 0.32),
    leftElbow: lm(0.42, 0.38),
    leftWrist: lm(0.4, 0.42),
    leftHip: lm(0.44, 0.48),
    leftKnee: lm(0.5, 0.58),
    leftAnkle: lm(0.48, 0.68),
  };
  return mirrorRight(base);
}

function buildPlancheLean(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.5, 0.4),
    leftShoulder: lm(0.46, 0.44),
    leftElbow: lm(0.42, 0.44),
    leftWrist: lm(0.38, 0.44),
    leftHip: lm(0.56, 0.44),
    leftKnee: lm(0.68, 0.44),
    leftAnkle: lm(0.8, 0.44),
  };
  return mirrorRight(base);
}

function buildTuckPlanche(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.36, 0.46),
    leftShoulder: lm(0.4, 0.46),
    leftElbow: lm(0.44, 0.46),
    leftWrist: lm(0.48, 0.46),
    leftHip: lm(0.52, 0.46),
    leftKnee: lm(0.5, 0.42),
    leftAnkle: lm(0.48, 0.4),
  };
  return mirrorRight(base);
}

function buildStraddlePlanche(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.34, 0.46),
    leftShoulder: lm(0.38, 0.46),
    leftElbow: lm(0.42, 0.46),
    leftWrist: lm(0.46, 0.46),
    leftHip: lm(0.54, 0.46),
    leftKnee: lm(0.66, 0.46),
    leftAnkle: lm(0.78, 0.46),
  };
  const out = mirrorRight(base);
  if (out.rightAnkle) out.rightAnkle = lm(0.72, 0.48);
  if (out.leftAnkle) out.leftAnkle = lm(0.6, 0.48);
  return out;
}

function buildHspu90(): Record<string, Landmark> {
  const base: Record<string, Landmark> = {
    nose: lm(0.5, 0.58),
    leftShoulder: lm(0.48, 0.52),
    leftElbow: lm(0.46, 0.56),
    leftWrist: lm(0.44, 0.42),
    leftHip: lm(0.48, 0.46),
    leftKnee: lm(0.47, 0.34),
    leftAnkle: lm(0.46, 0.22),
  };
  return mirrorRight(base);
}

function buildHspuTop(): Record<string, Landmark> {
  return buildInverted();
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
  "advanced-tuck-planche": buildTuckPlanche(),
  "straddle-planche": buildStraddlePlanche(),
  handstand: buildInverted(),
  "handstand-push-ups-90": buildHspu90(),
  "handstand-push-ups": buildHspuTop(),
  "one-arm-handstand": buildInverted(),
  "l-sit": buildLSit(),
  "front-lever": buildHorizontalLever(),
  planche: buildHorizontalLever(),
  "skin-the-cat": buildHorizontalLever(),
  "frog-stand": buildInverted(),
  "crow-pose": buildInverted(),
  "pistol-squats": buildSquatDeep(),
  "shrimp-squats": buildSquatDeep(),
  "dragon-squats": buildSquatDeep(),
  "sissy-squats": buildSquatDeep(),
  "nordic-curls": buildSidePlank(),
  "bosu-single-leg-squats": buildSquatDeep(),
};

export function getTargetPose(skillId: string): Record<string, Landmark> | null {
  return TARGET_POSES[skillId] ?? null;
}
