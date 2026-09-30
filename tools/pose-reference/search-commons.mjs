// Finds candidate reference photos on Wikimedia Commons (free licences) per skill.
// Writes manifest.json: { skillId: [{ title, url, width, height, license }] }.
import { readFile, writeFile } from "node:fs/promises";

const queries = JSON.parse(await readFile(new URL("./queries.json", import.meta.url), "utf8"));
let manifest = {};
try {
  manifest = JSON.parse(await readFile(new URL("./manifest.json", import.meta.url), "utf8"));
} catch {
  // first run
}
const ua = "CFT-pose-reference/1.0 (open-source calisthenics app; landmark extraction only)";

async function search(q) {
  const params = new URLSearchParams({
    action: "query", format: "json", generator: "search", gsrsearch: `${q} filetype:bitmap`, gsrnamespace: "6", gsrlimit: "25",
    prop: "imageinfo", iiprop: "url|size|extmetadata", iiurlwidth: "1024",
  });
  let data = null;
  for (let attempt = 0; attempt < 5 && !data; attempt++) {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { "user-agent": ua } });
    if (res.ok) data = await res.json();
    else {
      console.log(`  ${q}: HTTP ${res.status}, retrying`);
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  if (!data) return [];
  const pages = Object.values(data.query?.pages ?? {});
  return pages
    .map((p) => {
      const ii = p.imageinfo?.[0];
      if (!ii || !/\.(jpe?g|png)$/i.test(p.title)) return null;
      const meta = ii.extmetadata ?? {};
      return { title: p.title, url: ii.thumburl ?? ii.url, width: ii.width, height: ii.height, license: meta.LicenseShortName?.value ?? "", categories: meta.Categories?.value ?? "" };
    })
    .filter((x) => x && x.width >= 400 && x.height >= 400);
}

for (const [skill, qs] of Object.entries(queries)) {
  if (manifest[skill]?.length) continue; // already searched
  const seen = new Set();
  manifest[skill] = [];
  for (const q of qs) {
    for (const hit of await search(q)) {
      if (seen.has(hit.url)) continue;
      seen.add(hit.url);
      manifest[skill].push(hit);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.log(`${skill}: ${manifest[skill].length} candidates`);
}
await writeFile(new URL("./manifest.json", import.meta.url), JSON.stringify(manifest, null, 1));
