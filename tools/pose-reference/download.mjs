// Downloads candidate images (max N per skill) into the scratch directory. Not committed.
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
const out = process.argv[2];
const MAX = 30;
const manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
const ua = "CFT-pose-reference/1.0 (open-source calisthenics app; landmark extraction only)";
let total = 0;
for (const [skill, items] of Object.entries(manifest)) {
  await mkdir(`${out}/${skill}`, { recursive: true });
  let n = 0;
  for (const item of items.slice(0, MAX)) {
    const ext = /\.png$/i.test(item.title) ? "png" : "jpg";
    const file = `${out}/${skill}/${n}.${ext}`;
    try { await access(file); n++; continue; } catch {}
    try {
      const res = await fetch(item.url, { headers: { "user-agent": ua } });
      if (!res.ok) { if (res.status === 429) await new Promise((r) => setTimeout(r, 4000)); continue; }
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      n++; total++;
      await new Promise((r) => setTimeout(r, 250));
    } catch {}
  }
  console.log(`${skill}: ${n} files`);
}
console.log("downloaded", total);
