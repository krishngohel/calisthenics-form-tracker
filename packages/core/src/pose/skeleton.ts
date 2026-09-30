import type { Landmark } from "./provider";
import { SKELETON_CONNECTIONS } from "./provider";

type Body = Record<string, Landmark | null>;

/** Bones whose length is stable enough to learn: limbs and torso sides. The head link is excluded (nose moves with gaze). */
const LEARNED_BONES: [string, string][] = SKELETON_CONNECTIONS.filter(([a, b]) => a !== "nose" && b !== "nose");

interface BoneStat {
  /** Ring of recent normalized lengths. */
  samples: number[];
  median: number;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Bone-length consistency filter.
 *
 * Pose models occasionally snap a single joint to the wrong place (a wrist
 * onto the hip, an ankle onto the other leg) while reporting good confidence.
 * Bone lengths, normalised by the shoulder–hip torso length, are nearly
 * constant for one athlete and one camera placement, so after a short
 * warm-up any joint whose bones stretch or shrink far beyond the learned
 * length is treated as unreliable: its visibility is attenuated so the
 * confidence gate and persistence bridge take over. Perspective changes
 * are tracked by a rolling median.
 */
export class BoneConsistencyFilter {
  private stats = new Map<string, BoneStat>();
  private frames = 0;

  constructor(
    /** Fractional deviation from the learned length that marks a bone as broken. */
    private tolerance = 0.45,
    /** Frames of clean data before the filter starts rejecting. */
    private warmupFrames = 12,
    private window = 45,
    private minVisibility = 0.5
  ) {}

  private torso(body: Body): number {
    const pairs: [string, string][] = [["leftShoulder", "leftHip"], ["rightShoulder", "rightHip"]];
    const lengths = pairs.flatMap(([a, b]) => {
      const pa = body[a], pb = body[b];
      return pa && pb && (pa.visibility ?? 1) >= this.minVisibility && (pb.visibility ?? 1) >= this.minVisibility ? [Math.hypot(pa.x - pb.x, pa.y - pb.y)] : [];
    });
    return lengths.length ? Math.max(...lengths) : 0;
  }

  /** Returns a body with suspect joints' visibility attenuated, plus the joints that were flagged. */
  apply(body: Body): { body: Body; flagged: string[] } {
    const T = this.torso(body);
    if (T <= 0) return { body, flagged: [] };
    const ratios = new Map<string, number>();
    for (const [a, b] of LEARNED_BONES) {
      const pa = body[a], pb = body[b];
      if (!pa || !pb || (pa.visibility ?? 1) < this.minVisibility || (pb.visibility ?? 1) < this.minVisibility) continue;
      ratios.set(`${a}-${b}`, Math.hypot(pa.x - pb.x, pa.y - pb.y) / T);
    }

    const broken = new Map<string, number>();
    const learned = this.frames >= this.warmupFrames;
    if (learned) {
      ratios.forEach((ratio, key) => {
        const stat = this.stats.get(key);
        if (!stat || stat.samples.length < this.warmupFrames) return;
        const dev = Math.abs(ratio - stat.median) / stat.median;
        if (dev > this.tolerance) {
          const [a, b] = key.split("-");
          broken.set(a, (broken.get(a) ?? 0) + 1);
          broken.set(b, (broken.get(b) ?? 0) + 1);
        }
      });
    }

    // A joint is suspect when every bone touching it is broken; shoulders and
    // hips have three or more bones, so one bad neighbour cannot take them down.
    const flagged: string[] = [];
    broken.forEach((count, joint) => {
      const degree = LEARNED_BONES.filter(([a, b]) => (a === joint || b === joint) && ratios.has(`${a}-${b}`)).length;
      if (count >= Math.max(1, degree)) flagged.push(joint);
    });

    // Learn only from bones not touching a flagged joint so a bad frame cannot poison the medians.
    ratios.forEach((ratio, key) => {
      const [a, b] = key.split("-");
      if (flagged.includes(a) || flagged.includes(b)) return;
      const stat = this.stats.get(key) ?? { samples: [], median: ratio };
      stat.samples.push(ratio);
      if (stat.samples.length > this.window) stat.samples.shift();
      stat.median = median(stat.samples);
      this.stats.set(key, stat);
    });
    this.frames++;

    if (flagged.length === 0) return { body, flagged };
    const out: Body = { ...body };
    for (const joint of flagged) {
      const lm = out[joint];
      if (lm) out[joint] = { ...lm, visibility: Math.min(lm.visibility ?? 1, 0.1) };
    }
    return { body: out, flagged };
  }

  reset(): void {
    this.stats.clear();
    this.frames = 0;
  }
}
