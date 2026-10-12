// Inline the kit, the model and the live scripts into one standalone page.
// node scripts/build.mjs examples/attention dist/attention.html
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, process.argv[2] || "examples/attention");
const out = resolve(root, process.argv[3] || "dist/attention.html");
const read = (p) => readFileSync(p, "utf8").replace(/<\/script/gi, "<\\/script");
let html = readFileSync(join(dir, "page.html"), "utf8");
const theme = "<script>" + read(join(root, "kit/folio-theme.js")) + "</script>\n";
html = html
  .replace("<style>", () => theme + "<style>")
  .replace("/*CSS*/", () => readFileSync(join(root, "kit/folio-page.css"), "utf8"))
  .replace("/*KIT*/", () => read(join(root, "kit/folio-kit.js")) + "\n" + read(join(root, "kit/folio-live.js")))
  .replace("/*MODEL*/", () => read(join(dir, "model.js")))
  .replace("/*PLATE*/", () => read(join(dir, "plate.js")))
  .replace("/*PAGE*/", () => read(join(dir, "page.js")));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html);
console.log("wrote", out, (html.length / 1024).toFixed(1) + " KB");
