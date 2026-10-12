// Build the Folio website into docs/ (GitHub Pages can serve that folder as-is).
// node scripts/build-site.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "docs");
mkdirSync(join(out, "img"), { recursive: true });
const PLATES = ["attention", "heart"];
for (const p of PLATES) execFileSync("node", [join(root, "scripts/build.mjs"), `examples/${p}`, `docs/${p}.html`], { stdio: "inherit" });
const css = readFileSync(join(root, "kit/folio-page.css"), "utf8");
const index = readFileSync(join(root, "site/index.html"), "utf8").replace("/*CSS*/", () => css);
writeFileSync(join(out, "index.html"), "<!doctype html>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" + index);
for (const p of PLATES) {
  const f = join(out, `${p}.html`);
  const s = readFileSync(f, "utf8");
  if (!s.startsWith("<!doctype")) writeFileSync(f, "<!doctype html>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" + s);
}
console.log("site written to docs/: index.html, " + PLATES.map((p) => p + ".html").join(", "));
