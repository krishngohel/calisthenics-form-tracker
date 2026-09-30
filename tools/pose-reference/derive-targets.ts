// Derives a canonical target skeleton per skill from the kept reference
// landmarks: each body is centred on the hips, scaled to torso length,
// mirrored so the nose is on the left, then joints are taken as medians.
// Output goes to packages/core/src/skills/targetPoses.generated.json in the
// 0–1 frame layout the app expects (hips at (0.5, 0.5), torso = 0.2).
import { readFile, writeFile } from "node:fs/promises";

type LM = { x: number; y: number; visibility?: number };
type Body = Record<string, LM | null | undefined>;
const kept = JSON.parse(await readFile(new URL("./kept.json", import.meta.url), "utf8")) as Record<string, { rawBody: Body; width?: number; height?: number; hold: boolean }[]>;
const JOINTS = ["nose", "leftShoulder", "rightShoulder", "leftElbow", "rightElbow", "leftWrist", "rightWrist", "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle"];
const MIRROR: [string, string][] = [["leftShoulder", "rightShoulder"], ["leftElbow", "rightElbow"], ["leftWrist", "rightWrist"], ["leftHip", "rightHip"], ["leftKnee", "rightKnee"], ["leftAnkle", "rightAnkle"]];
const MIN_IMAGES = 3;
const median = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN; };
const mid = (a?: LM | null, b?: LM | null) => (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a ?? b ?? null);

function normalise(body: Body, aspect: number): Record<string, { x: number; y: number }> | null {
  // isotropic: scale x by aspect so units match
  const iso: Body = {};
  for (const k of JOINTS) { const p = body[k]; iso[k] = p && (p.visibility ?? 1) >= 0.3 ? { x: p.x * aspect, y: p.y } : null; }
  const hip = mid(iso.leftHip, iso.rightHip); const sh = mid(iso.leftShoulder, iso.rightShoulder);
  if (!hip || !sh) return null;
  const T = Math.hypot(sh.x - hip.x, sh.y - hip.y);
  if (T < 0.02) return null;
  let flip = 1;
  const nose = iso.nose;
  if (nose && nose.x > hip.x + 0.05 * T) flip = -1; // nose to the left
  const out: Record<string, { x: number; y: number }> = {};
  for (const k of JOINTS) { const p = iso[k]; if (p) out[k] = { x: (flip * (p.x - hip.x)) / T, y: (p.y - hip.y) / T }; }
  if (flip === -1) for (const [l, r] of MIRROR) { const a = out[l], b = out[r]; if (a) out[r] = a; else delete out[r]; if (b) out[l] = b; else delete out[l]; }
  return out;
}

const generated: Record<string, Record<string, { x: number; y: number }>> = {};
const report: string[] = [];
for (const [skill, rows] of Object.entries(kept)) {
  const norms = rows.map((r) => normalise(r.rawBody, (r.width ?? 1) / (r.height ?? 1))).filter((n): n is Record<string, { x: number; y: number }> => !!n);
  if (norms.length < MIN_IMAGES) { report.push(`${skill}: only ${norms.length} usable, skipped`); continue; }
  const pose: Record<string, { x: number; y: number }> = {};
  for (const k of JOINTS) {
    const xs = norms.map((n) => n[k]?.x).filter((v): v is number => typeof v === "number");
    const ys = norms.map((n) => n[k]?.y).filter((v): v is number => typeof v === "number");
    if (xs.length >= Math.max(2, norms.length / 2)) pose[k] = { x: 0.5 + median(xs) * 0.2, y: 0.5 + median(ys) * 0.2 };
  }
  generated[skill] = pose;
  report.push(`${skill}: ${norms.length} images → ${Object.keys(pose).length} joints`);
}
await writeFile(new URL("../../packages/core/src/skills/targetPoses.generated.json", import.meta.url), JSON.stringify(generated, null, 1));
console.log(report.join("\n"));
