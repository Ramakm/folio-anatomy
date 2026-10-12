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
// Embeddable plates for the cover: the figure alone, with its own small readout.
const EMBED = {
  attention: { TITLE: "Plate I", TL: "Pl. I", CAP: "The assay of a query", HINT: "Click a column or a numbered pin · drag in 3D", ARIA: "Plate I: attention as an assay bench",
    READOUT: `Plate.on((st, r) => { const T = AttnModel.TOKENS; document.getElementById("readout").innerHTML = T[st.q].w + " → <b>" + T[r.top].w + " " + r.a[r.top].toFixed(2) + "</b> · head " + AttnModel.HEADS[st.head].id; });` },
  heart: { TITLE: "Plate II", TL: "Pl. II", CAP: "The double pump", HINT: "Click a numbered pin to look closer · drag in 3D", ARIA: "Plate II: the human heart as a double pump",
    READOUT: `Plate.on((ui, cur, b) => { document.getElementById("readout").innerHTML = ui.HR + " bpm · <b>" + cur.phase + "</b>" + (b ? " · " + Math.round(b.SA[1]) + "/" + Math.round(b.SA[0]) + " mmHg" : ""); });` },
};
const tpl = readFileSync(join(root, "site/embed.html"), "utf8");
for (const p of PLATES) {
  const e = EMBED[p], src = (f) => readFileSync(join(root, f), "utf8").replace(/<\/script/gi, "<\\/script");
  let h = tpl.replace("/*CSS*/", () => css)
    .replace("/*KIT*/", () => src("kit/folio-kit.js") + "\n" + src("kit/folio-live.js"))
    .replace("/*MODEL*/", () => src(`examples/${p}/model.js`))
    .replace("/*PLATE*/", () => src(`examples/${p}/plate.js`))
    .replace("/*READOUT*/", () => e.READOUT);
  for (const k of ["TITLE", "TL", "CAP", "HINT", "ARIA"]) h = h.split(`{{${k}}}`).join(e[k]);
  h = h.split("{{ID}}").join(p);
  writeFileSync(join(out, `embed-${p}.html`), "<!doctype html>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" + h);
}
for (const p of PLATES) {
  const f = join(out, `${p}.html`);
  const s = readFileSync(f, "utf8");
  if (!s.startsWith("<!doctype")) writeFileSync(f, "<!doctype html>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" + s);
}
console.log("site written to docs/: index.html, " + PLATES.map((p) => p + ".html, embed-" + p + ".html").join(", "));
