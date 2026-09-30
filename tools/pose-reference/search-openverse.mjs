// Second source: Openverse (CC-licensed images aggregated from Flickr, etc.).
// Adds candidates for skills that Commons covers poorly. Writes manifest-openverse.json.
import { readFile, writeFile } from "node:fs/promises";
const queries = JSON.parse(await readFile(new URL("./queries.json", import.meta.url), "utf8"));
const extra = {
  "front-lever": ["front lever", "front lever hold gymnastics rings", "front lever bar calisthenics"],
  planche: ["planche calisthenics", "full planche hold", "planche parallettes"],
  "straddle-planche": ["straddle planche", "planche straddle hold"],
  "tuck-planche": ["tuck planche", "tuck planche parallettes"],
  "planche-lean": ["planche lean", "planche lean calisthenics"],
  "advanced-tuck-planche": ["advanced tuck planche"],
  "pseudo-planche-push-ups": ["pseudo planche push up", "planche push up"],
  dips: ["parallel bar dips", "ring dips", "dips calisthenics"],
  "pull-ups": ["pull-up chin over bar", "pull up bar exercise", "pullup calisthenics"],
  "chin-ups": ["chin-up bar exercise", "chin up"],
  "muscle-up": ["muscle up bar", "muscle up rings"],
  "handstand-push-ups": ["handstand push up", "handstand pushup wall"],
  "handstand-push-ups-90": ["90 degree push up", "handstand push up bottom"],
  "frog-stand": ["frog stand", "crow pose bakasana"],
  "nordic-curls": ["nordic hamstring curl", "nordic curl"],
  "skin-the-cat": ["skin the cat rings", "german hang"],
  "scapular-pulls": ["scapular pull up", "scapula pull dead hang"],
  "one-arm-handstand": ["one arm handstand", "one-armed handstand"],
  "shrimp-squats": ["shrimp squat exercise"],
  "dragon-squats": ["dragon squat exercise", "dragon pistol squat"],
  "bosu-single-leg-squats": ["bosu ball single leg squat", "bosu squat"],
  "dead-hang": ["dead hang", "hanging pull up bar"],
  "push-ups": ["push up exercise side view", "pushup"],
  "pistol-squats": ["pistol squat"],
  "sissy-squats": ["sissy squat"],
  handstand: ["handstand calisthenics", "straight handstand"],
  "l-sit": ["l-sit hold", "l-sit parallettes"],
  "crow-pose": ["crow pose"],
  "plank-hold": ["forearm plank", "plank exercise"],
};
const manifest = {};
const ua = "CFT-pose-reference/1.0 (open-source calisthenics app; landmark extraction only)";
for (const skill of Object.keys(queries)) {
  const qs = extra[skill] ?? queries[skill];
  const seen = new Set();
  manifest[skill] = [];
  for (const q of qs) {
    let data = null;
    for (let attempt = 0; attempt < 4 && !data; attempt++) {
      const params = new URLSearchParams({ q, page_size: "30", license_type: "all-cc", extension: "jpg,png", mature: "false" });
      const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, { headers: { "user-agent": ua, accept: "application/json" } });
      if (res.ok) data = await res.json();
      else { await new Promise((r) => setTimeout(r, 5000 * (attempt + 1))); }
    }
    for (const r of data?.results ?? []) {
      const url = r.url;
      if (!url || seen.has(url) || (r.width && r.width < 400)) continue;
      seen.add(url);
      manifest[skill].push({ title: r.title, url, width: r.width, height: r.height, license: `${r.license} ${r.license_version}`, source: r.source });
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(`${skill}: ${manifest[skill].length}`);
}
await writeFile(new URL("./manifest-openverse.json", import.meta.url), JSON.stringify(manifest, null, 1));
