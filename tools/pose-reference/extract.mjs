// Runs the extractor page in headless Chrome over every downloaded image and
// writes landmarks.json: { skillId: [{ file, width, height, body }] }.
import { chromium } from "playwright";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const root = process.argv[2];
const outFile = new URL("./landmarks.json", import.meta.url);
const browser = await chromium.launch({ headless: true, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror", e.message));
await page.goto(pathToFileURL(new URL("./extractor.html", import.meta.url).pathname).href);
console.log("backend:", await page.evaluate(() => window.ready));

const result = {};
const skills = [];
for (const name of await readdir(root)) if ((await stat(`${root}/${name}`)).isDirectory()) skills.push(name);
for (const skill of skills.sort()) {
  result[skill] = [];
  for (const file of (await readdir(`${root}/${skill}`)).sort()) {
    const buf = await readFile(`${root}/${skill}/${file}`);
    const mime = file.endsWith(".png") ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
    try {
      const r = await page.evaluate((u) => window.extract(u), dataUrl);
      result[skill].push({ file, ...r });
    } catch (e) {
      console.log(`${skill}/${file}: ${String(e).slice(0, 80)}`);
    }
  }
  console.log(`${skill}: ${result[skill].length} images`);
}
await writeFile(outFile, JSON.stringify(result));
await browser.close();
