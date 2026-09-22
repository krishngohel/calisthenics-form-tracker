// Renders a contact sheet per skill of the images the analyzer kept, with the
// detected skeleton drawn on each, so bad references can be pruned by eye.
// Usage: node sheet.mjs <imagesRoot> <outDir> [skill]
import { chromium } from "playwright";
import { readFile, mkdir } from "node:fs/promises";

const [root, outDir, only] = process.argv.slice(2);
const kept = JSON.parse(await readFile(new URL("./kept.json", import.meta.url), "utf8"));
await mkdir(outDir, { recursive: true });
const EDGES = [["leftShoulder","rightShoulder"],["leftShoulder","leftElbow"],["leftElbow","leftWrist"],["rightShoulder","rightElbow"],["rightElbow","rightWrist"],["leftShoulder","leftHip"],["rightShoulder","rightHip"],["leftHip","rightHip"],["leftHip","leftKnee"],["leftKnee","leftAnkle"],["rightHip","rightKnee"],["rightKnee","rightAnkle"],["nose","leftShoulder"],["nose","rightShoulder"]];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
for (const [skill, rows] of Object.entries(kept)) {
  if (only && skill !== only) continue;
  if (!rows.length) continue;
  const tiles = [];
  for (const r of rows) {
    const buf = await readFile(`${root}/${skill}/${r.file}`);
    const mime = r.file.endsWith(".png") ? "image/png" : "image/jpeg";
    tiles.push({ src: `data:${mime};base64,${buf.toString("base64")}`, body: r.rawBody ?? null, label: `${r.file} ${r.hold ? "PASS" : "fail"} ${r.form}`, m: r.m });
  }
  const html = `<html><body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(4,300px);gap:4px">${tiles.map((t, i) => `<div style="position:relative;width:300px;height:300px;overflow:hidden;background:#000"><canvas id="c${i}" width="300" height="300"></canvas><div style="position:absolute;left:4px;top:4px;color:#0f0;font:12px monospace;background:rgba(0,0,0,.6)">${t.label}</div><div style="position:absolute;left:4px;bottom:4px;color:#ff0;font:10px monospace;background:rgba(0,0,0,.6)">e${t.m.elbow} k${t.m.knee} h${t.m.hip} L${t.m.bodyLine} hz${t.m.horizontal} hg${t.m.hangDepth} ln${t.m.lean}</div></div>`).join("")}</body></html>`;
  await page.setContent(html);
  await page.evaluate(async ({ tiles, EDGES }) => {
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      const c = document.getElementById("c" + i); const ctx = c.getContext("2d");
      const img = new Image(); await new Promise((r) => { img.onload = r; img.onerror = r; img.src = t.src; });
      const s = Math.min(300 / img.naturalWidth, 300 / img.naturalHeight); const w = img.naturalWidth * s, h = img.naturalHeight * s; const ox = (300 - w) / 2, oy = (300 - h) / 2;
      ctx.drawImage(img, ox, oy, w, h);
      if (!t.body) continue;
      const P = (k) => { const p = t.body[k]; return p && p.visibility >= 0.3 ? [ox + p.x * w, oy + p.y * h] : null; };
      ctx.strokeStyle = "#22d3a7"; ctx.lineWidth = 3;
      for (const [a, b] of EDGES) { const pa = P(a), pb = P(b); if (!pa || !pb) continue; ctx.beginPath(); ctx.moveTo(...pa); ctx.lineTo(...pb); ctx.stroke(); }
    }
  }, { tiles, EDGES });
  const rowsN = Math.ceil(tiles.length / 4);
  await page.setViewportSize({ width: 1216, height: Math.max(300, rowsN * 304) });
  await page.screenshot({ path: `${outDir}/${skill}.png`, fullPage: true });
  console.log(`${skill}: ${tiles.length} tiles`);
}
await browser.close();
