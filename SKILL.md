---
name: folio
description: Build a museum-style exhibition plate that explains a technical idea - an invented scientific instrument drawn as a live, engraved isometric SVG, with numbered specimen pins, a catalogue key, a working model behind every number, and wall texts that walk through the formula term by term. Use for explanatory figures, interactive explainers, "how does X work" visuals, or technical illustrations for docs, courses, posts and landing pages, even when the request never mentions museums, plates or isometric drawing.
---

# Folio

A Folio plate explains an idea the way a natural history museum explains a specimen. There is one object on a mount, a numbered key beside it, and wall texts that tell you how to look at it. The object here is an instrument you invent, such as a bench, a balance, a loom or a still, whose working parts perform the idea. Readers can poke it, and every reading on it is computed.

## Three commitments

1. **Mechanism, not metaphor.** The instrument has to *perform* the idea, not stand beside it as an illustration. Before drawing, write one line: "When the reader does X, part Y moves, and that movement is Z in the idea."
2. **A single source of numbers.** A small pure model computes everything: needle angles, fluid levels, the readout, the key, the tables. The page only displays what the model returns, so no two places can disagree.
3. **A guided reading.** A good drawing still needs a guide. Each plate ships with a key, a term-by-term reading, the full working, and an honest account of what was simplified.

## Getting started

- Two reference plates ship with the repo. **Plate I** (`examples/attention/`, attention as an assay bench) is the model for ideas made of discrete steps and a formula. **Plate II** (`examples/heart/`, the human heart as a double pump) is the model for anything that runs in time: a simulation integrated every frame, continuous flow, phases, and charts redrawn after each cycle. Open the closer one first.
- The fastest start is to copy a reference plate: `node scripts/new-plate.mjs <name>` makes `examples/<name>/` from Plate I. Then replace its model, scene and texts. Building from a working plate is quicker and safer than starting blank.
- Shared exhibition styles live in `kit/folio-page.css`; a plate's `page.html` puts `/*CSS*/` inside its `<style>` and adds only its own rules.
- `node scripts/build-site.mjs` builds every plate plus the cover page (`site/index.html`) into `docs/`, a website ready for GitHub Pages. To add a plate, add its name to `PLATES` there and a card to the cover.
- Build any plate into one standalone file with `node scripts/build.mjs examples/<name> dist/<name>.html`.
- If only this file is installed (no repo), the appendix at the end holds the drawing library; save it as `folio-kit.js`.

A plate is five files:

| File | Role |
|---|---|
| `folio-kit.js` | the drawing library (shared, never edited per plate) |
| `model.js` | the pure model; puts one object on `window` |
| `plate.js` | the instrument: static geometry, live slots, input |
| `page.js` | key, controls, wall texts, ledger; listens to the plate |
| `page.html` | the mount and styles, with `/*KIT*/ /*MODEL*/ /*PLATE*/ /*PAGE*/` placeholders |

## Phase A: the brief (no drawing yet)

**A1. Scope.** Tell the user which of these they are getting and roughly how long it will take, before starting:

| Scope | Contents | Typical time |
|---|---|---|
| Sketch | instrument + key + readout, no wall texts | under an hour |
| Plate | the full exhibition page (the default for "explain X") | one and a half to three hours |
| Series | several plates on one shared bench, scale and palette | agree the list first, then one plate at a time |

**A2. The model.** Write `model.js` before anything visual. Gather the real formula, units and magnitudes. Return plain objects: inputs in, every quantity the page will show out. Run it in Node and print a few cases. Look for edge cases now (an empty set, a masked row, a value at the limit). If anything is invented, such as toy weights or sample data, note it for the "About this specimen" wall text.

**A2b. Models that run in time.** When the idea is a process (a heartbeat, a queue draining, a learning curve), write it as state plus a `step(s, dt)` function and a `read(s)` that returns everything shown. Tune parameters against known values in Node before drawing, as Plate II does for a resting adult (about 115/80 mmHg, 70 mL per beat, 5 L/min). Keep the simulation running while the drawing is off screen, and skip only the painting; otherwise changing a control further down the page freezes the numbers.

**A3. The instrument and its correspondence table.** Look for an instrument from the world of laboratories, workshops, observatories or print shops. Then write the table that ties each term to a part:

| Term in the idea | Part of the instrument | What the reader can see |
|---|---|---|
| query | a carriage on an overhead rail | it parks above the word that is asking |
| scaled score | a dial per word | needle position |
| softmax | one sealed reservoir | the columns can only divide what it holds |
| mask | stopcocks with caps | later words are shut off |
| weighted sum | a tray of layered deposit | each layer's length is a weight |

Every row needs a part, and every major part needs a row. Some reliable mappings: a fixed total becomes a reservoir, a purse or a bag of weights. Comparison becomes a dial, a balance or calipers. Selection becomes a valve, a switch or a points lever. Accumulation becomes layers, a stack or a tally. Ordering becomes a rail, a rack or a chute.

## Phase B: the bench

**B1. Inventory.** List the parts before placing them. Aim for 30 to 60. Group them by purpose: *term parts* (from the table, repeated per item), *support parts* (plinth, feet, posts, rails, collars, brackets), *control parts* (selectors, knurled knobs, levers) and *mount details* (catalogue plate, engraved labels, scale strips, screws). Exactly one quantity, the one the idea is about, gets the red.

**B2. Bands.** Use world coordinates with x along the bench, y toward the viewer and z up. Divide the bench into depth bands from back to front, and give each band one kind of part. Plate I runs rail, columns, stopcocks, manifold, dials, tray. Leave clearance between bands in world units, because a part that pokes into the next band will be painted in the wrong order. Inside a band, draw from far to near. Set the camera (`az` near -24 for a long bench, `el` 30) and fit it to the corners with `Folio.fit`.

**B3. Static strings, live slots.** Walk the bands once and push SVG strings into an ordered list. Wherever something moves, push a named slot instead. At mount time the list becomes one SVG with an empty `<g>` per slot. Each animation frame redraws only the slots, from eased values that chase the model's targets. Drawing stops once every value has arrived.

**B4. Pins.** Place 6 to 10 numbered pins directly on the parts that carry the idea, numbered in the order a newcomer should look at them. Pins are the only marks laid over the drawing. All other text is engraved into a surface: names on pad fronts, numbers on scales, a catalogue plate on the plinth.

## Phase C: the mount

The page is part of the explanation. Build it from these blocks, top to bottom:

1. **Masthead.** The series on the left, the wordmark centred, the plate number on the right.
2. **Title block.** A display headline that names the idea as the instrument ("Attention, as an *assay bench*."), three sentences on what happens, and a small catalogue list: Object, Idea, Model, Catalogue.
3. **The mounted plate.** A paper mount with a hairline inset frame. Its corners carry the plate number, a short caption, the interaction hint and a live readout.
4. **The key.** One entry per pin, giving the part's name and one line on what it computes, with the math in mono. Hovering an entry highlights its pin, and hovering a pin highlights its entry.
5. **At the bench.** Ordinary buttons and sliders that do what the instrument's own knobs do.
6. **Wall text I: reading the plate.** A column for each term, in the order the formula is written: a roman numeral, a verb, the term, two sentences that refer to pins by number, and a box of current numbers.
7. **Wall text II: the ledger.** The complete working for the current state, one row per item. Clicking a row selects that item.
8. **Wall text III: the wider view.** Whatever the instrument shows a slice of (the full matrix, the whole sequence, every bucket), and the variants the selector chooses between.
9. **Wall text IV: about this specimen.** Three notes: what is computed exactly, what was chosen by hand, and what was left out. Always include it.
10. **Colophon.** Who made the plate and which typefaces it uses.

Controls answer pointer and keyboard: click a station, arrows step, digits pick a variant, brackets turn a knob, one letter flips a toggle. When nobody is interacting, the plate slowly demonstrates itself. It pauses on hover or focus, rests when scrolled away, and shows one settled frame under reduced motion. The readout uses `aria-live`.

## Phase D: proof

Check with screenshots, not assumptions. In the repo, `node scripts/capture.mjs dist/<name>.html shots --crop x,y,w,h` produces light, dark and phone captures, an enlarged crop in viewBox units, and a report of console errors and horizontal overflow. Pass `--eval "Plate.update({...})"` to capture other states. Look at every image and check:

- **Depth.** No part shows through one that should cover it (Plate I's first draft ran the manifold through the dials).
- **Engraving.** Every engraved string sits inside its surface.
- **Colour.** Red appears only on the subject quantity.
- **Numbers.** The readout, key, wall texts and ledger match `model.js` run in Node for the same state.
- **Scale.** Small values look small. Never inflate a level to make it visible.
- **Width.** The plate still reads at 390 px wide, and the page never scrolls sideways.

## Drawing style

- **Engraving over flat fills.** Faces take one of four tones according to how they face the light. A large box's darkest side carries fine vertical hatching (`box(..., { hatch: 2.2 })`). Round parts are hatched more densely toward their shadow side (`rod`), which makes them look turned. Hatch lines always end on an edge or rim.
- **One red.** The instrument is warm grey. Red belongs only to the quantity being explained.
- **Glass in three passes.** Draw the rear wall, then the contents slot (at a slightly smaller radius), then the front with graduations, a highlight and a rim.
- **Detail with a job.** Collars, tees, slotted screws, knurling, minor and major ticks, a catalogue plate. Each detail belongs to a part, and nothing is texture for its own sake.
- **Proportion.** The plinth takes about 85% of the mount's width, with air above it for rails and probes.

## Type and colour

Use a Didone display face for headlines, plate numbers and numerals (Bodoni Moda, often italic), a quiet grotesque for reading (Hanken Grotesk), and a mono for data and engraving (IBM Plex Mono). In light mode: warm grey wall #E5E1DA, paper #F5F2ED, ink #1F1C18, red #C9381D. In dark mode: wall #151412, paper #1D1B19, a brighter red. Every colour is a CSS custom property defined on `:root` and redefined for dark mode, and every SVG class reads those properties. Copy the token block from the reference plate's `page.html`.

A user's own brand rules override these: keep the structure and the engraving, and swap the tokens.

## Library reference

`folio-kit.js` defines `window.Folio` and has no dependencies:

| Function | Purpose |
|---|---|
| `camera({az, el})`, `fit(opts, points, W, H, pad)` | orthographic camera; `cam.p(x,y,z)` returns screen coordinates; `cam.view` is the direction toward the viewer |
| `box(cam, x, y, z, w, d, h, opts)` | a block with visible faces only; `hatch`, `groove`, `tone`, `topTone`, `cls`, `part` |
| `rod(cam, p0, p1, r, opts)` | a cylinder on any axis; `hatch`, `knurl`, `density`, `sideCls`, `capCls` |
| `drum(cam, cx, cy, z, r, h, opts)` | a vertical rod |
| `ball(cam, centre, r)` | a sphere |
| `ringPath`, `arcPath`, `radialTicks`, `line` | marks on horizontal planes, and segments in space |
| `faceText(cam, origin, xDir, downDir, text, size)` | text engraved on any plane |
| `pin(cam, at, n)`, `screw(cam, x, y, z, r)` | specimen pins and slotted screws |

If the library is missing, write the appendix below to `folio-kit.js` exactly as given rather than recreating it.

## Appendix: folio-kit.js

```js
/* Folio kit: an orthographic isometric camera and engraved solids, drawn as SVG strings.
   World units: x along the bench, y toward the viewer, z up. No dependencies. */
(function (root) {
  "use strict";
  const D = Math.PI / 180;
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const norm = (a) => mul(a, 1 / (len(a) || 1));
  const f = (n) => (Math.round(n * 100) / 100).toString();

  /* The light comes from the upper left, slightly in front. Tones are chosen by facing. */
  const LIGHT = norm([-0.55, 0.35, 0.78]);

  function camera(o = {}) {
    const az = o.az ?? -24, el = o.el ?? 30, k = o.k ?? 1, ox = o.ox ?? 0, oy = o.oy ?? 0;
    const a = az * D, e = el * D;
    const ca = Math.cos(a), sa = Math.sin(a), ce = Math.cos(e), se = Math.sin(e);
    return {
      az, el, k, ox, oy,
      view: [-sa * ce, ca * ce, se],
      p(x, y, z) {
        if (Array.isArray(x)) [x, y, z] = x;
        const u = x * ca + y * sa, w = -x * sa + y * ca;
        return [ox + k * u, oy + k * (w * se - z * ce)];
      },
      depth(x, y, z) {
        if (Array.isArray(x)) [x, y, z] = x;
        return -x * sa * ce + y * ca * ce + z * se;
      },
    };
  }

  /* Fit a camera so that the given world points fill W x H with padding. */
  function fit(o, pts, W, H, pad = 24) {
    const c = camera({ ...o, k: 1, ox: 0, oy: 0 });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      const [x, y] = c.p(p);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
    const k = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0));
    return camera({ ...o, k, ox: W / 2 - k * (x0 + x1) / 2, oy: H / 2 - k * (y0 + y1) / 2 });
  }

  const path = (pts, close = true) =>
    "M" + pts.map((q) => f(q[0]) + " " + f(q[1])).join("L") + (close ? "Z" : "");

  function toneOf(n) {
    if (n[2] > 0.9) return "top";
    if (n[2] < -0.9) return "s0";
    const d = dot(n, LIGHT);
    return d < -0.25 ? "s0" : d < 0 ? "s1" : d < 0.25 ? "s2" : "s3";
  }

  const attrs = (o) => {
    let s = "";
    if (o.id) s += ` id="${o.id}"`;
    if (o.part) s += ` data-part="${o.part}"`;
    return s;
  };

  /* A box from (x,y,z) with size (w,d,h). Draws only the faces turned to the viewer,
     shaded by facing, with an optional engraved hatch on the darkest side and an inset
     groove on the top. */
  function box(cam, x, y, z, w, d, h, o = {}) {
    const P = (a, b, c) => cam.p(a, b, c);
    const X = x + w, Y = y + d, Z = z + h;
    const faces = [
      { n: [0, 0, 1], q: [[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]] },
      { n: [0, 1, 0], q: [[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]] },
      { n: [0, -1, 0], q: [[x, y, z], [X, y, z], [X, y, Z], [x, y, Z]] },
      { n: [1, 0, 0], q: [[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]] },
      { n: [-1, 0, 0], q: [[x, y, z], [x, Y, z], [x, Y, Z], [x, y, Z]] },
    ];
    let s = `<g class="sol ${o.cls || ""}"${attrs(o)}>`;
    let darkest = null;
    for (const fc of faces) {
      if (dot(fc.n, cam.view) <= 1e-6) continue;
      const t = o.tone && fc.n[2] < 0.9 ? o.tone : toneOf(fc.n);
      s += `<path class="f t-${fc.n[2] > 0.9 ? (o.topTone || "top") : t}" d="${path(fc.q.map((v) => P(...v)))}"/>`;
      if (fc.n[2] < 0.9 && (!darkest || dot(fc.n, LIGHT) < dot(darkest.n, LIGHT))) darkest = fc;
    }
    if (o.hatch && darkest && h > 2) {
      const sp = o.hatch === true ? 3 : o.hatch;
      const n = darkest.n, along = n[0] !== 0 ? [0, 1, 0] : [1, 0, 0];
      const L = n[0] !== 0 ? d : w, base = darkest.q[0];
      let lines = "";
      for (let t = sp; t < L - sp * 0.5; t += sp) {
        const a = add(base, mul(along, t));
        lines += `M${f(P(...a)[0])} ${f(P(...a)[1])}L${f(P(a[0], a[1], Z)[0])} ${f(P(a[0], a[1], Z)[1])}`;
      }
      s += `<path class="hatch" d="${lines}"/>`;
    }
    if (o.groove) {
      const g = o.groove;
      s += `<path class="ln faint" d="${path([[x + g, y + g, Z], [X - g, y + g, Z], [X - g, Y - g, Z], [x + g, Y - g, Z]].map((v) => P(...v)))}"/>`;
    }
    return s + "</g>";
  }

  function basis(axis) {
    const n = norm(axis);
    const t = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = norm(cross(n, t));
    const v = cross(n, u);
    return [n, u, v];
  }
  const ringPt = (c, u, v, r, t) => add(c, add(mul(u, r * Math.cos(t)), mul(v, r * Math.sin(t))));

  /* A round bar from p0 to p1 of radius r: a post, a rail, a pipe, a knob or a drum.
     The side is engraved with hatch lines whose density follows the shade, so a
     curved body reads as turned metal instead of a staircase of flat tones. */
  function rod(cam, p0, p1, r, o = {}) {
    const N = o.seg || 44;
    const [n, u, v] = basis(sub(p1, p0));
    const V = cam.view;
    const phi = Math.atan2(dot(v, V), dot(u, V));
    const t0 = phi - Math.PI / 2, t1 = phi + Math.PI / 2;
    const side = [];
    for (let i = 0; i <= N; i++) side.push(cam.p(ringPt(p0, u, v, r, t0 + (t1 - t0) * i / N)));
    for (let i = N; i >= 0; i--) side.push(cam.p(ringPt(p1, u, v, r, t0 + (t1 - t0) * i / N)));
    const capC = dot(n, V) > 0 ? p1 : p0;
    const cap = [];
    for (let i = 0; i < N * 2; i++) cap.push(cam.p(ringPt(capC, u, v, r, (i / (N * 2)) * Math.PI * 2)));
    let s = `<g class="sol ${o.cls || ""}"${attrs(o)}>`;
    s += `<path class="f ${o.sideCls || "t-cyl"}" d="${path(side)}"/>`;
    if (o.hatch !== false) {
      const K = 90; let acc = 0, lines = "";
      const dens = o.density ?? 1;
      for (let i = 1; i < K; i++) {
        const t = t0 + (t1 - t0) * i / K;
        const m = add(mul(u, Math.cos(t)), mul(v, Math.sin(t)));
        const dark = Math.pow(Math.max(0, 1 - (dot(m, LIGHT) + 1) / 1.6), 1.7);
        acc += dark * dens * (r * cam.k) / 14;
        if (acc >= 1) {
          acc -= 1;
          const a = cam.p(ringPt(p0, u, v, r, t)), b = cam.p(ringPt(p1, u, v, r, t));
          lines += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
        }
      }
      if (lines) s += `<path class="hatch" d="${lines}"/>`;
    }
    if (o.knurl) {
      let lines = "";
      for (let i = 0; i < o.knurl; i++) {
        const t = t0 + (t1 - t0) * (i + 0.5) / o.knurl;
        const a = cam.p(ringPt(p0, u, v, r, t)), b = cam.p(ringPt(p1, u, v, r, t));
        lines += `M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}`;
      }
      s += `<path class="ln lo" d="${lines}"/>`;
    }
    if (o.cap !== false) s += `<path class="f ${o.capCls || "t-top"}" d="${path(cap)}"/>`;
    return s + "</g>";
  }

  /* A vertical drum standing on the floor plane. */
  const drum = (cam, cx, cy, z, r, h, o) => rod(cam, [cx, cy, z], [cx, cy, z + h], r, o);

  /* A ball: in an orthographic camera it projects to a circle. */
  function ball(cam, c, r, o = {}) {
    const [x, y] = cam.p(c);
    const R = r * cam.k;
    const hx = x - R * 0.35, hy = y - R * 0.4;
    return `<g class="sol ${o.cls || ""}"${attrs(o)}><circle class="f t-cyl" cx="${f(x)}" cy="${f(y)}" r="${f(R)}"/>` +
      `<path class="hatch" d="M${f(x + R * 0.15)} ${f(y + R * 0.92)}A${f(R)} ${f(R)} 0 0 0 ${f(x + R * 0.92)} ${f(y + R * 0.2)}"/>` +
      `<circle class="glint" cx="${f(hx)}" cy="${f(hy)}" r="${f(R * 0.18)}"/></g>`;
  }

  /* A circle lying on a horizontal plane, as a closed path. */
  function ringPath(cam, cx, cy, z, r, N = 48) {
    const pts = [];
    for (let i = 0; i < N; i++) { const t = (i / N) * Math.PI * 2; pts.push(cam.p(cx + r * Math.cos(t), cy + r * Math.sin(t), z)); }
    return path(pts);
  }

  /* An arc on a horizontal plane, angles in degrees measured in world xy. */
  function arcPath(cam, cx, cy, z, r, a0, a1, N = 32) {
    const pts = [];
    for (let i = 0; i <= N; i++) { const t = (a0 + (a1 - a0) * i / N) * D; pts.push(cam.p(cx + r * Math.cos(t), cy + r * Math.sin(t), z)); }
    return path(pts, false);
  }

  /* Radial ticks on a horizontal plane. */
  function radialTicks(cam, cx, cy, z, r0, r1, angles) {
    let s = "";
    for (const a of angles) {
      const t = a * D;
      const p = cam.p(cx + r0 * Math.cos(t), cy + r0 * Math.sin(t), z);
      const q = cam.p(cx + r1 * Math.cos(t), cy + r1 * Math.sin(t), z);
      s += `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`;
    }
    return s;
  }

  function line(cam, a, b) {
    const p = cam.p(a), q = cam.p(b);
    return `M${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}`;
  }

  /* Text engraved in a plane: ax is the world direction of the baseline, ay the world
     direction of "down" on the glyphs. Size is in world units. */
  function faceText(cam, origin, ax, ay, str, size, o = {}) {
    const p0 = cam.p(origin);
    const px = cam.p(add(origin, ax)), py = cam.p(add(origin, ay));
    const a = (px[0] - p0[0]), b = (px[1] - p0[1]), c = (py[0] - p0[0]), d = (py[1] - p0[1]);
    const esc = String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return `<text class="${o.cls || "engr"}" text-anchor="${o.anchor || "middle"}" font-size="${size}" transform="matrix(${f(a)} ${f(b)} ${f(c)} ${f(d)} ${f(p0[0])} ${f(p0[1])})">${esc}</text>`;
  }

  /* A specimen pin: a small numbered disc set on a part, never a leader line. */
  function pin(cam, at, num, o = {}) {
    const [x, y] = cam.p(at);
    return `<g class="pin" data-pin="${num}" tabindex="-1"><circle cx="${f(x)}" cy="${f(y)}" r="7.2"/>` +
      `<text x="${f(x)}" y="${f(y + 2.9)}" text-anchor="middle">${num}</text></g>`;
  }

  /* A screw head on a horizontal plane: a ring and a slot. */
  function screw(cam, cx, cy, z, r = 2.2) {
    const a = cam.p(cx - r * 0.7, cy - r * 0.2, z), b = cam.p(cx + r * 0.7, cy + r * 0.2, z);
    return `<path class="f t-s3 ln-lo" d="${ringPath(cam, cx, cy, z, r, 20)}"/><path class="ln lo" d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}"/>`;
  }

  root.Folio = { camera, fit, path, box, rod, drum, ball, ringPath, arcPath, radialTicks, line, faceText, pin, screw, toneOf, f, add, sub, mul, dot, norm, LIGHT };
})(typeof window !== "undefined" ? window : globalThis);
```
