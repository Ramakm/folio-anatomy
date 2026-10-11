// Start a new plate from the reference plate.
// node scripts/new-plate.mjs <name>
import { cpSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const name = process.argv[2];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error("usage: node scripts/new-plate.mjs <name>   (lowercase letters, digits and dashes)");
  process.exit(1);
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dest = resolve(root, "examples", name);
if (existsSync(dest)) { console.error(`examples/${name} already exists`); process.exit(1); }
cpSync(resolve(root, "examples/attention"), dest, { recursive: true });
console.log(`created examples/${name} from Plate I.
Next:
  1. rewrite model.js for your idea and test it in Node
  2. rebuild the bench in plate.js (bands, slots, pins)
  3. rewrite the key, wall texts and title block in page.html and page.js
  4. node scripts/build.mjs examples/${name} dist/${name}.html
  5. node scripts/capture.mjs dist/${name}.html shots`);
