// Filters detections down to plausible examples of each skill and summarizes the
// rule measurements (median / p10 / p90) so thresholds can be set from data.
import { readFile, writeFile } from "node:fs/promises";
import { measureBody, evaluateSkill } from "../../packages/core/src/skills/registry";
import { toIsotropic } from "../../packages/core/src/pose/geometry";

const data = JSON.parse(await readFile(new URL("./landmarks.json", import.meta.url), "utf8"));
const CORE = ["nose", "leftShoulder", "rightShoulder", "leftHip", "rightHip", "leftKnee", "rightKnee", "leftAnkle", "rightAnkle", "leftWrist", "rightWrist", "leftElbow", "rightElbow"];

/** Loose plausibility gates per skill family: keep images that could be this pose. */
const GATES = {
  inverted: (m) => m.inverted,
  horizontalSupport: (m) => m.horizontal > 0.35 && m.support,
  hang: (m) => m.hangDepth > 0.3,
  lsit: (m) => m.hip > 40 && m.hip < 140 && !m.inverted,
  squat: (m) => m.knee < 130 && !m.inverted,
  lever: (m) => m.horizontal > 0.45,
  any: () => true,
};
const FAMILY = {
  "plank-hold": "horizontalSupport", "push-ups": "horizontalSupport", "planche-lean": "horizontalSupport", "pseudo-planche-push-ups": "horizontalSupport",
  "dead-hang": "hang", "pull-ups": "hang", "chin-ups": "hang", "scapular-pulls": "hang", "muscle-up": "any",
  handstand: "inverted", "handstand-push-ups": "inverted", "handstand-push-ups-90": "inverted", "one-arm-handstand": "inverted", "crow-pose": "any", "frog-stand": "any",
  "l-sit": "lsit", "front-lever": "lever", planche: "lever", "straddle-planche": "lever", "tuck-planche": "any", "advanced-tuck-planche": "any", "skin-the-cat": "any",
  "pistol-squats": "squat", "shrimp-squats": "squat", "dragon-squats": "squat", "sissy-squats": "squat", "nordic-curls": "any", "bosu-single-leg-squats": "squat", dips: "any",
};

const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const summary = {};
const kept = {};
for (const [skill, items] of Object.entries(data)) {
  const rows = [];
  for (const it of items) {
    const vis = CORE.filter((k) => (it.body[k]?.visibility ?? 0) >= 0.3).length;
    if (it.score < 0.3 || vis < 9) continue; // no confident full body
    const body = toIsotropic(it.body, it.width / it.height);
    const m = measureBody(body);
    const gate = GATES[FAMILY[skill] ?? "any"];
    if (!gate(m)) continue;
    const ev = evaluateSkill(skill, body, { left: null, right: null }, [], "hold_only");
    rows.push({ file: it.file, m, hold: ev?.holdCriteriaMet ?? false, form: ev?.formScore ?? 0, body, rawBody: it.body, width: it.width, height: it.height });
  }
  kept[skill] = rows;
  const keys = ["T", "elbow", "knee", "hip", "bodyLine", "horizontal", "hangDepth", "lean"];
  summary[skill] = { n: rows.length, holdPassRate: rows.length ? Math.round((100 * rows.filter((r) => r.hold).length) / rows.length) : null };
  for (const k of keys) {
    const vals = rows.map((r) => r.m[k]).filter((v) => typeof v === "number");
    summary[skill][k] = vals.length ? { p10: pct(vals, 0.1), med: pct(vals, 0.5), p90: pct(vals, 0.9) } : null;
  }
}
await writeFile(new URL("./summary.json", import.meta.url), JSON.stringify(summary, null, 1));
await writeFile(new URL("./kept.json", import.meta.url), JSON.stringify(kept));
for (const [skill, s] of Object.entries(summary)) {
  const f = (k) => (s[k] ? `${k}=${s[k].p10}/${s[k].med}/${s[k].p90}` : "");
  console.log(`${skill.padEnd(26)} n=${String(s.n).padStart(2)} pass=${String(s.holdPassRate ?? "-").padStart(3)}%  ${["elbow","knee","hip","bodyLine","horizontal","hangDepth","lean"].map(f).join("  ")}`);
}
