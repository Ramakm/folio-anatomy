// Screenshots of a built plate: desktop and phone, light and dark, plus 4x crops.
// node scripts/capture.mjs dist/attention.html shots [--crop x,y,w,h] [--eval "js"]
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const [, , page = "docs/attention.html", outDir = "shots", ...rest] = process.argv;
const arg = (k) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : null; };
mkdirSync(outDir, { recursive: true });
const url = "file://" + resolve(page);
const exe = process.env.CHROME_PATH || undefined;
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const errors = [];
for (const [name, vw, scheme] of [["desktop-light", 1440, "light"], ["desktop-dark", 1440, "dark"], ["phone-light", 390, "light"]]) {
  const ctx = await browser.newContext({ viewport: { width: vw, height: 900 }, colorScheme: scheme, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const p = await ctx.newPage();
  p.on("console", (m) => m.type() === "error" && errors.push(name + ": " + m.text()));
  p.on("pageerror", (e) => errors.push(name + ": " + e.message));
  await p.goto(url, { waitUntil: "networkidle" }).catch(() => p.goto(url));
  await p.waitForTimeout(600);
  if (arg("--eval")) { await p.evaluate(arg("--eval")); await p.waitForTimeout(400); }
  const fig = await p.$(".plate");
  await fig.screenshot({ path: `${outDir}/${name}-plate.png` });
  if (name === "desktop-light") {
    await p.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true });
    const c = arg("--crop");
    if (c) {
      const [x, y, w, h] = c.split(",").map(Number);
      const box = await (await p.$("#plate-svg")).boundingBox();
      const sx = box.width / 1000;
      await p.screenshot({ path: `${outDir}/crop.png`, clip: { x: box.x + x * sx, y: box.y + y * sx, width: w * sx, height: h * sx } });
    }
  }
  if (name === "phone-light") await p.screenshot({ path: `${outDir}/${name}-full.png`, fullPage: true });
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (overflow > 0) errors.push(`${name}: page scrolls sideways by ${overflow}px`);
  await ctx.close();
}
await browser.close();
console.log(errors.length ? "problems:\n" + errors.join("\n") : "clean: no console errors, no sideways scroll");
