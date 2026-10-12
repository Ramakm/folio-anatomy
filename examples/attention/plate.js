/* Plate I: scaled dot-product attention, as an assay bench.
   The scene is a function of the camera. In the SVG and WebGL views it is built once; in the
   3D view it is rebuilt as the bench turns. Moving parts live in slots of the painter's order. */
(function () {
  "use strict";
  const K = window.Folio, M = window.AttnModel;
  const { box, rod, drum, ball, ringPath, arcPath, radialTicks, line, faceText, pin, screw, path, f } = K;
  const N = M.TOKENS.length;
  const W = 1000, H = 640;
  const SX = (j) => 132 + j * 60;
  const GL = { y: 98, z: 15, r: 15, h: 100 };  // glass cylinders
  const PIPE = { y: 135, z: 12, r: 3.6 };
  const DIAL = { y: 158, z: 16, r: 12 };
  const TRAY = { x0: 100, x1: 584, y0: 200, y1: 244, z: 12 };
  const RAIL = { y: 34, z: 146 };
  const SCORE = [-2, 6];                           // the dial's scale, in units of q·k/√d_k
  const HEAD_ANG = [205, 245, 295, 335];
  const T_MIN = 0.25, T_MAX = 4;
  const tAng = (T) => 160 + (Math.log(T / T_MIN) / Math.log(T_MAX / T_MIN)) * 220;

  const pts = [];
  for (const x of [-10, 730]) for (const y of [-10, 286]) for (const z of [-46, 0]) pts.push([x, y, z]);
  pts.push([14, 34, 166], [590, 34, 166], [60, 98, 122]);
  const svg = document.getElementById("plate-svg");
  const stage = K.live.stage({ svg, W, H, az: -24, el: 30, points: pts, center: [360, 138, 40], build });
  let cam = stage.base, ctl = null;
  const scoreAng = (s) => 180 + Math.max(0, Math.min(1, (s - SCORE[0]) / (SCORE[1] - SCORE[0]))) * 180;

  /* ---------- static parts ---------- */
  function build(c, api) {
  cam = c;
  const { S, slot } = api;
  ctl = api;
  const far = (arr) => (api.leftIsFar ? arr : arr.slice().reverse());
  const J = far([...Array(N).keys()]);

  // Plinth: base slab, feet, body with engraved hatch, groove, screws, catalogue plate.
  for (const [x, y] of [[8, 8], [712, 8], [8, 268], [712, 268]]) S(drum(cam, x, y, -46, 8, 8, { cls: "foot" }));
  S(box(cam, -6, -6, -38, 732, 288, 8, { hatch: 2.6 }));
  S(box(cam, 0, 0, -30, 720, 276, 30, { hatch: 2.2, groove: 7, part: "plinth", cls: "floor" }));
  for (const [x, y] of [[16, 16], [704, 16], [16, 260], [704, 260]]) S(screw(cam, x, y, 0, 3));
  S(box(cam, 250, 276, -24, 240, 1.4, 17, { cls: "brass" }));
  S(faceText(cam, [370, 277.5, -12.6], [1, 0, 0], [0, 0, -1], "FOLIO · PLATE I · SCALED DOT-PRODUCT ATTENTION", 5.4));
  S(faceText(cam, [370, 277.5, -20], [1, 0, 0], [0, 0, -1], "ONE HEAD · d_model 11 · d_k 8 · EIGHT TOKENS", 3.6, { cls: "engr lo" }));
  for (const sx of [256, 484]) {
    const p = cam.p(sx, 277.5, -15.5);
    S(`<circle class="dot" cx="${f(p[0])}" cy="${f(p[1])}" r="${f(1.1 * cam.k)}"/>`);
  }
  // Station ruler engraved along the back of the plinth top.
  {
    let d = "";
    for (let x = 100; x <= 600; x += 6) d += line(cam, [x, 58, 0], [x, (x - 100) % 30 === 0 ? 52 : 55, 0]);
    S(`<path class="ln lo" d="${d}${line(cam, [100, 58, 0], [600, 58, 0])}"/>`);
  }

  if (!api.leftIsFar) controls();

  // Query rail on two posts, behind the stations.
  for (const x of [14, 590]) {
    S(drum(cam, x, RAIL.y, 0, 10, 4, { cls: "base" }));
    S(rod(cam, [x, RAIL.y, 4], [x, RAIL.y, RAIL.z + 10], 4.2));
    S(drum(cam, x, RAIL.y, RAIL.z + 10, 6, 4));
  }
  S(rod(cam, [14, RAIL.y, RAIL.z], [590, RAIL.y, RAIL.z], 3.2, { seg: 30 }));
  {
    let d = "";
    for (let j = 0; j < N; j++) d += line(cam, [SX(j), RAIL.y + 3.2, RAIL.z - 3], [SX(j), RAIL.y + 3.2, RAIL.z - 7]);
    S(`<path class="ln lo" d="${d}"/>`);
  }
  slot("carriage");

  // Pads: one per token, the reservoir's at the far end.
  const pad = (x0, w, label, cls) => {
    S(box(cam, x0, 66, 0, w, 110, 10, { groove: 3, part: cls, cls: "pad" }));
    if (label) S(faceText(cam, [x0 + w / 2, 176.2, 2.6], [1, 0, 0], [0, 0, -1], label, 6.4, { cls: "engr tok" }));
  };
  const padRes = () => pad(30, 60, "Σ = 1", "reservoir");
  if (api.leftIsFar) padRes();
  for (const j of J) pad(SX(j) - 27, 54, M.TOKENS[j].w, "station");
  if (!api.leftIsFar) padRes();
  for (const j of J) {
    const p = cam.p(SX(j) + 22, 170, 10);
    S(`<text class="engr lo" x="${f(p[0])}" y="${f(p[1])}" font-size="${f(4 * cam.k)}" text-anchor="end">${j}</text>`);
  }

  // Glass column helper: back wall, a slot for the fluid, then the front glass with graduations.
  const facing = Math.atan2(cam.view[1], cam.view[0]) / (Math.PI / 180);
  function column(x, y, z, r, h, name, opts = {}) {
    S(drum(cam, x, y, z - 5, r + 4, 5, { cls: "collar" }));
    S(rod(cam, [x, y, z], [x, y, z + h], r, { sideCls: "glass-back", capCls: "glass-back", hatch: false }));
    if (opts.fluid) S(opts.fluid); else slot(name);
    let d = "";
    for (let g = 1; g <= 9; g++) {
      const zz = z + (h * g) / 10, span = g === 5 ? 26 : 14;
      d += arcPath(cam, x, y, zz, r + 0.2, facing - span, facing + span, 8);
    }
    S(`<g class="sol glass">${rod(cam, [x, y, z], [x, y, z + h], r, { sideCls: "glass-front", capCls: "glass-rim", hatch: false }).replace(/^<g[^>]*>|<\/g>$/g, "")}` +
      `<path class="ln grad" d="${d}"/>` +
      `<path class="ln glint-line" d="${line(cam, ...[[0, 0], [0, 0]].map((_, i) => {
        const t = (facing + 48) * Math.PI / 180; return [x + r * Math.cos(t), y + r * Math.sin(t), i ? z + h - 6 : z + 4];
      }))}"/></g>`);
    S(drum(cam, x, y, z + h, r + 1.6, 2, { capCls: "glass-rim", sideCls: "glass-lip", hatch: false }));
  }

  // The reservoir: one sealed unit of fluid, always full. Softmax shares exactly this much.
  const reservoir = () => {
    column(60, 98, 15, 20, 78, null, {
      fluid: rod(cam, [60, 98, 15], [60, 98, 15 + 72], 19.2, { cls: "fluidg", sideCls: "fluid", capCls: "fluid-top" }),
    });
    S(drum(cam, 60, 98, 95, 12, 7, { cls: "stopper" }));
    S(ball(cam, [60, 98, 106], 4));
  };
  if (api.leftIsFar) reservoir();
  for (const j of J) {
    column(SX(j), GL.y, GL.z, GL.r, GL.h, "fluid" + j);
    slot("shut" + j);
  }
  if (!api.leftIsFar) reservoir();

  // Manifold: stubs with stopcocks from the pipe to each collar, then the pipe itself.
  S(rod(cam, [60, 122, PIPE.z], [60, PIPE.y, PIPE.z], 3, { seg: 24, cls: "pipe" }));
  for (const j of J) {
    S(rod(cam, [SX(j), 117, PIPE.z], [SX(j), PIPE.y, PIPE.z], 2.6, { seg: 24, cls: "pipe" }));
    S(box(cam, SX(j) - 4.5, 119.5, 6, 9, 8, 12, { cls: "cock" }));
    slot("cock" + j);
  }
  S(rod(cam, [60, PIPE.y, PIPE.z], [SX(N - 1) + 14, PIPE.y, PIPE.z], PIPE.r, { seg: 30, cls: "pipe" }));
  S(ball(cam, [60, PIPE.y, PIPE.z], 5, { cls: "pipe" }));
  for (const j of J) S(ball(cam, [SX(j), PIPE.y, PIPE.z], 4.6, { cls: "pipe" }));

  // Key dials: one per token. The needle reads q·k / √d_k.
  for (const j of J) {
    const x = SX(j);
    S(drum(cam, x, DIAL.y, 10, DIAL.r + 2.5, 3));
    S(drum(cam, x, DIAL.y, 13, DIAL.r, 3, { capCls: "t-face" }));
    const majors = [], minors = [];
    for (let s = SCORE[0]; s <= SCORE[1]; s += 0.5) (Number.isInteger(s / 2) ? majors : minors).push(scoreAng(s));
    S(`<path class="ln lo" d="${radialTicks(cam, x, DIAL.y, DIAL.z, 9.6, 11.2, minors)}"/>` +
      `<path class="ln mid" d="${radialTicks(cam, x, DIAL.y, DIAL.z, 8.4, 11.2, majors)}${arcPath(cam, x, DIAL.y, DIAL.z, 11.2, 180, 360, 24)}"/>` +
      `<path class="ln zero" d="${radialTicks(cam, x, DIAL.y, DIAL.z, 7.6, 11.2, [scoreAng(0)])}"/>`);
    slot("needle" + j);
  }

  // The core-sample tray: the output, laid down as strata whose lengths are the weights.
  {
    const { x0, x1, y0, y1, z } = TRAY;
    S(box(cam, x0, y0, 0, x1 - x0, y1 - y0, 4, { cls: "tray" }));
    S(box(cam, x0, y0, 4, x1 - x0, 4, z - 4, { cls: "tray" }));
    const wl = () => S(box(cam, x0, y0 + 4, 4, 4, y1 - y0 - 8, z - 4, { cls: "tray" }));
    const wr = () => S(box(cam, x1 - 4, y0 + 4, 4, 4, y1 - y0 - 8, z - 4, { cls: "tray" }));
    api.leftIsFar ? wl() : wr();
    slot("strata");
    api.leftIsFar ? wr() : wl();
    S(box(cam, x0, y1 - 4, 4, x1 - x0, 4, z - 4, { cls: "tray", hatch: 3 }));
    let d = "", dm = "";
    for (let i = 0; i <= 20; i++) {
      const x = x0 + 4 + ((x1 - x0 - 8) * i) / 20;
      (i % 5 === 0 ? (dm += line(cam, [x, y1 - 4, z], [x, y1 - 1.2, z])) : (d += line(cam, [x, y1 - 4, z], [x, y1 - 2.4, z])));
    }
    S(`<path class="ln lo" d="${d}"/><path class="ln mid" d="${dm}"/>`);
    for (const [fr, lab] of [[0, "0"], [0.25, ".25"], [0.5, ".50"], [0.75, ".75"], [1, "1"]]) {
      const x = x0 + 4 + (x1 - x0 - 8) * fr;
      S(faceText(cam, [x, y1 + 0.2, z - 3], [1, 0, 0], [0, 0, -1], lab, 3.6, { cls: "engr lo" }));
    }
    slot("trayText");
    for (const x of [x0 - 6, x1 + 2]) S(box(cam, x, y0 + 8, 0, 4, y1 - y0 - 16, z + 2, { cls: "clamp" }));
  }

  if (api.leftIsFar) controls();
  slot("hits");
  slot("pins");
  }

  // Controls: head selector, temperature knob, mask lever.
  function controls() {
    const { S, slot } = ctl;
    const hx = 655, hy = 96;
    S(box(cam, hx - 30, hy - 26, 0, 60, 52, 3, { groove: 3 }));
    S(drum(cam, hx, hy, 3, 17, 5, { cls: "base" }));
    S(`<path class="ln mid" d="${radialTicks(cam, hx, hy, 8, 17.5, 20.5, HEAD_ANG)}"/>`);
    HEAD_ANG.forEach((a, i) => {
      const t = (a * Math.PI) / 180;
      S(faceText(cam, [hx + 23.8 * Math.cos(t), hy + 23.8 * Math.sin(t) + 1.4, 3], [1, 0, 0], [0, 1, 0], M.HEADS[i].id, 4.4, { cls: "engr" }));
    });
    S(faceText(cam, [hx, hy + 22, 3], [1, 0, 0], [0, 1, 0], "HEAD", 3.4, { cls: "engr lo" }));
    slot("headKnob");

    const tx = 655, ty = 172;
    S(drum(cam, tx, ty, 0, 26, 3, { cls: "base" }));
    const tk = [], tkM = [];
    for (let l = 0; l <= 16; l++) (l % 4 === 0 ? tkM : tk).push(160 + (l / 16) * 220);
    S(`<path class="ln lo" d="${radialTicks(cam, tx, ty, 3, 20, 22.5, tk)}"/><path class="ln mid" d="${radialTicks(cam, tx, ty, 3, 18.6, 23.5, tkM)}"/>`);
    for (const [T, lab] of [[0.25, "¼"], [1, "1"], [4, "4"]]) {
      const t = (tAng(T) * Math.PI) / 180;
      S(faceText(cam, [tx + 15.4 * Math.cos(t), ty + 15.4 * Math.sin(t) + 1.3, 3], [1, 0, 0], [0, 1, 0], lab, 3.8));
    }
    slot("tempKnob");

    const mx = 655, my = 232;
    S(box(cam, mx - 22, my - 14, 0, 44, 28, 3, { groove: 2.5 }));
    S(faceText(cam, [mx - 12, my + 10, 3], [1, 0, 0], [0, 1, 0], "MASK", 3.4, { cls: "engr lo" }));
    S(faceText(cam, [mx + 12, my + 10, 3], [1, 0, 0], [0, 1, 0], "OPEN", 3.4, { cls: "engr lo" }));
    S(box(cam, mx - 6, my - 6, 3, 12, 12, 5, { cls: "cock" }));
    slot("lever");
  }

  /* ---------- live parts ---------- */
  const fluidCol = (j, lv) => {
    const h = Math.max(0.0001, lv) * GL.h;
    return rod(cam, [SX(j), GL.y, GL.z], [SX(j), GL.y, GL.z + Math.min(h, GL.h - 0.6)], GL.r - 0.7, { cls: "fluidg", sideCls: "fluid", capCls: "fluid-top" });
  };
  const draw = {
    carriage(s) {
      const x = s.xq;
      let o = rod(cam, [x, RAIL.y, RAIL.z - 10], [x, RAIL.y, RAIL.z - 22], 1.5, { seg: 16 });
      o += ball(cam, [x, RAIL.y, RAIL.z - 24], 3.2, { cls: "probe" });
      o += box(cam, x - 17, RAIL.y - 11, RAIL.z - 10, 34, 22, 21, { cls: "carriage", part: "carriage", groove: 2.4 });
      for (const dx of [-12, 12]) o += screw(cam, x + dx, RAIL.y, RAIL.z + 11, 1.6);
      o += box(cam, x - 11, RAIL.y + 11, RAIL.z - 6, 22, 0.8, 11, { cls: "brass" });
      const j = Math.round((x - SX(0)) / 60);
      o += faceText(cam, [x, RAIL.y + 12, RAIL.z - 1.4], [1, 0, 0], [0, 0, -1], "q = " + M.TOKENS[Math.max(0, Math.min(N - 1, j))].w, 4.4, { cls: "engr" });
      return o;
    },
    fluid(s, j) { return s.a[j] > 0.0005 ? fluidCol(j, s.a[j]) : ""; },
    shut(s, j) {
      const k = s.shut[j];
      if (k < 0.01) return "";
      const lift = (1 - k) * 14;
      const z = GL.z + GL.h + 2 + lift;
      return `<g style="opacity:${f(Math.min(1, k * 1.4))}">` + drum(cam, SX(j), GL.y, z, GL.r + 3, 3.4, { cls: "shutter", capCls: "t-shut" }) +
        `<path class="ln lo" d="${radialTicks(cam, SX(j), GL.y, z + 3.4, 3, GL.r + 1.5, [20, 65, 110, 155, 200, 245, 290, 335])}"/>` +
        drum(cam, SX(j), GL.y, z + 3.4, 3, 2.6) + `</g>`;
    },
    cock(s, j) {
      const k = s.shut[j], a = (k * 90 * Math.PI) / 180, L = 9;
      const c = [SX(j), 123.5, 18.5];
      const d = [Math.sin(a) * L, Math.cos(a) * L, 0];
      return rod(cam, [c[0] - d[0] * 0.4, c[1] - d[1] * 0.4, c[2]], [c[0] + d[0], c[1] + d[1], c[2]], 1.3, { seg: 12, cls: "lever" }) + ball(cam, c, 2);
    },
    needle(s, j) {
      const x = SX(j), y = DIAL.y, z = DIAL.z + 0.2;
      if (s.shut[j] > 0.98) return dotAt(x, y, z);
      const t = (scoreAng(s.sc[j]) * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t);
      const tip = [x + 10.4 * c, y + 10.4 * sn, z], tail = [x - 3 * c, y - 3 * sn, z];
      const w1 = [x - 1.1 * sn, y + 1.1 * c, z], w2 = [x + 1.1 * sn, y - 1.1 * c, z];
      return `<path class="needle" d="${path([tail, w1, tip, w2].map((p) => cam.p(p)))}"/>` + dotAt(x, y, z);
    },
    strata(s) {
      const { x0, x1, y0, y1 } = TRAY, L = x1 - x0 - 8;
      let x = x0 + 4, o = "";
      for (let j = 0; j < N; j++) {
        const w = s.a[j] * L;
        if (w > 0.05) {
          o += box(cam, x, y0 + 4, 4, w, y1 - y0 - 8, 6, { cls: j % 2 ? "stratum alt" : "stratum", topTone: j === s.top ? "fluid" : (j % 2 ? "fluid-2" : "fluid-top") });
        }
        x += w;
      }
      return o;
    },
    trayText(s) {
      const { x0, x1, y1 } = TRAY, L = x1 - x0 - 8;
      let x = x0 + 4, o = "";
      for (let j = 0; j < N; j++) {
        const w = s.a[j] * L;
        if (w > 34) o += faceText(cam, [x + w / 2, y1 + 0.2, 7.2], [1, 0, 0], [0, 0, -1], M.TOKENS[j].w + " " + s.a[j].toFixed(2), 3.6);
        x += w;
      }
      return o;
    },
    headKnob(s) {
      const hx = 655, hy = 96, t = (s.headAng * Math.PI) / 180;
      let o = drum(cam, hx, hy, 8, 8.5, 9, { knurl: 9 });
      o += `<path class="ln hi" d="${line(cam, [hx - 2 * Math.cos(t), hy - 2 * Math.sin(t), 17.1], [hx + 7.4 * Math.cos(t), hy + 7.4 * Math.sin(t), 17.1])}"/>`;
      return o;
    },
    tempKnob(s) {
      const tx = 655, ty = 172, t = (s.tAng * Math.PI) / 180;
      let o = drum(cam, tx, ty, 3, 12, 13, { knurl: 16, density: 1.2 });
      o += drum(cam, tx, ty, 16, 8, 1.6);
      o += `<path class="ln hi" d="${line(cam, [tx + 2 * Math.cos(t), ty + 2 * Math.sin(t), 17.7], [tx + 11.4 * Math.cos(t), ty + 11.4 * Math.sin(t), 16.1])}"/>`;
      return o;
    },
    lever(s) {
      const mx = 655, my = 232, a = ((s.lever * 2 - 1) * 32 * Math.PI) / 180;
      const tip = [mx + Math.sin(a) * 16, my, 8 + Math.cos(a) * 16];
      return rod(cam, [mx, my, 8], tip, 1.6, { seg: 14 }) + ball(cam, tip, 3.4);
    },
    pins(s) {
      const P = [
        [1, [s.xq + 23, RAIL.y + 11, RAIL.z + 14]],
        [2, [SX(0) - 18, DIAL.y + 2, 18]],
        [3, [SX(1) - 20, GL.y + 18, GL.z + GL.h * 0.72]],
        [4, [30, 98, 72]],
        [5, [SX(2) - 13, 123, 20]],
        [6, [TRAY.x0 + 14, TRAY.y1 + 8, 10]],
        [7, [655 + 30, 96 - 4, 14]],
        [8, [655 + 30, 172 + 6, 16]],
        [9, [655 + 26, 232 + 4, 12]],
      ];
      return P.map(([n, p]) => pin(cam, p, n)).join("");
    },
    hits() {
      let o = "";
      for (let j = 0; j < N; j++) {
        const q = [];
        for (const [x, y, z] of [[-27, 66, 0], [27, 66, 0], [27, 176, 0], [-27, 176, 0], [-27, 66, 10], [27, 176, 10], [-27, 176, 10]]) q.push(cam.p(SX(j) + x, y, z));
        for (let i = 0; i < 16; i++) { const t = (i / 16) * Math.PI * 2; q.push(cam.p(SX(j) + 18 * Math.cos(t), GL.y + 18 * Math.sin(t), GL.z + GL.h + 6)); }
        o += `<path class="hit" data-j="${j}" d="${path(hull(q))}"><title>Make “${M.TOKENS[j].w}” the query</title></path>`;
      }
      return o;
    },
  };
  function dotAt(x, y, z) { const p = cam.p(x, y, z); return `<circle class="hub" cx="${f(p[0])}" cy="${f(p[1])}" r="${f(1.5 * cam.k)}"/>`; }
  function hull(P) {
    P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (const p of P.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }

  /* ---------- mount ---------- */
  let slots = {};
  function mount(az, el) { cam = stage.mount(az, el); slots = stage.slots; slots.hits.innerHTML = draw.hits(); }
  mount(-24, 30);

  /* ---------- state ---------- */
  const st = { head: 0, q: 7, T: 1, causal: true };
  let tgt = null;
  const cur = { a: new Array(N).fill(0), sc: new Array(N).fill(SCORE[0]), shut: new Array(N).fill(0), xq: SX(7), headAng: HEAD_ANG[0], tAng: tAng(1), lever: 0, top: 0 };
  function target() {
    const r = M.attend(st.head, st.q, st.T, st.causal);
    tgt = {
      r, a: r.a, sc: r.scaled.map((v) => v), shut: r.masked.map((m) => (m ? 1 : 0)),
      xq: SX(st.q), headAng: HEAD_ANG[st.head], tAng: tAng(st.T), lever: st.causal ? 0 : 1, top: r.top,
    };
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let last = 0, raf = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    const k = reduce.matches ? 1 : 1 - Math.exp(-dt * 5.2), kf = reduce.matches ? 1 : 1 - Math.exp(-dt * 3.4);
    let moving = false;
    const ease = (a, b, kk) => { const d = b - a; if (Math.abs(d) > 1e-4) moving = true; return Math.abs(d) < 1e-4 ? b : a + d * kk; };
    for (let j = 0; j < N; j++) {
      cur.a[j] = ease(cur.a[j], tgt.a[j], kf);
      cur.sc[j] = ease(cur.sc[j], Math.max(SCORE[0] - 0.3, Math.min(SCORE[1] + 0.3, tgt.sc[j])), k);
      cur.shut[j] = ease(cur.shut[j], tgt.shut[j], k);
    }
    for (const key of ["xq", "headAng", "tAng", "lever"]) cur[key] = ease(cur[key], tgt[key], k);
    cur.top = tgt.top;
    paint();
    raf = moving ? requestAnimationFrame(frame) : 0;
    if (!moving) last = 0;
  }
  function paint() {
    slots.carriage.innerHTML = draw.carriage(cur);
    for (let j = 0; j < N; j++) {
      slots["fluid" + j].innerHTML = draw.fluid(cur, j);
      slots["shut" + j].innerHTML = draw.shut(cur, j);
      slots["cock" + j].innerHTML = draw.cock(cur, j);
      slots["needle" + j].innerHTML = draw.needle(cur, j);
    }
    slots.strata.innerHTML = draw.strata(cur);
    slots.trayText.innerHTML = draw.trayText(cur);
    slots.headKnob.innerHTML = draw.headKnob(cur);
    slots.tempKnob.innerHTML = draw.tempKnob(cur);
    slots.lever.innerHTML = draw.lever(cur);
    slots.pins.innerHTML = draw.pins(cur);
  }
  const listeners = [];
  function update(patch, fromUser = true) {
    Object.assign(st, patch);
    if (fromUser) lastTouch = performance.now();
    target();
    if (!raf) raf = requestAnimationFrame(frame);
    listeners.forEach((fn) => fn(st, tgt.r));
  }
  window.Plate = { st, update, on: (fn) => { listeners.push(fn); if (tgt) fn(st, tgt.r); }, HEAD_ANG, T_MIN, T_MAX };

  /* ---------- input ---------- */
  svg.addEventListener("click", (e) => {
    const h = e.target.closest(".hit");
    if (h) update({ q: +h.dataset.j });
  });
  const fig = document.getElementById("plate");
  fig.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowLeft") update({ q: Math.max(0, st.q - 1) });
    else if (k === "ArrowRight") update({ q: Math.min(N - 1, st.q + 1) });
    else if (/^[1-4]$/.test(k)) update({ head: +k - 1 });
    else if (k === "[") update({ T: Math.max(T_MIN, +(st.T / 1.25).toFixed(3)) });
    else if (k === "]") update({ T: Math.min(T_MAX, +(st.T * 1.25).toFixed(3)) });
    else if (k === "m" || k === "M") update({ causal: !st.causal });
    else return;
    e.preventDefault();
  });

  /* Self-demonstration: the plate keeps stepping the query along the sentence and changes
     head every lap. It rests for a few seconds after you touch it, and under reduced motion. */
  let lastTouch = -1e9;
  let visible = true;
  new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(fig);
  setInterval(() => {
    if (reduce.matches || !visible || document.hidden) return;
    if (performance.now() - lastTouch < 9000) return;
    let q = st.q + 1, head = st.head;
    if (q >= N) { q = 1; head = (head + 1) % M.HEADS.length; }
    update({ q, head }, false);
  }, 3000);

  /* ---------- three views: SVG, WebGL, 3D ---------- */
  const LIGHT_FRAG = `
uniform vec4 uCol[8]; uniform vec4 uColS[8]; uniform vec4 uPipe; uniform float uPour;
void main() {
  vec2 vb = vbOf(); vec4 m = maskAt();
  vec4 acc = vec4(0.0);
  bool dk = uDark > 0.5;
  vec3 pool = dk ? vec3(1.0, 0.36, 0.22) : vec3(0.86, 0.24, 0.12);
  vec3 glow = dk ? vec3(1.0, 0.72, 0.58) : vec3(1.0, 0.88, 0.78);
  // Light through each column pools on the bench in front of it, rippled by the fluid.
  if (m.r > 0.25) {
    float z = m.r > 0.75 ? 0.0 : 10.0;
    vec2 p = onPlane(vb, z);
    float sum = 0.0;
    for (int j = 0; j < 8; j++) {
      vec4 c = uCol[j];
      if (c.w > 0.5) continue;
      float lv = c.z;
      // a shaft of light from the column's foot to where its fluid's top casts
      float t;
      vec2 a0 = vec2(c.x, c.y + 14.0), a1 = fall(vec3(c.x, c.y, 15.0 + lv * 100.0), z);
      float d = segDist(p, a0, a1, t);
      float r = 9.0 + 9.0 * t + lv * 6.0;
      float shaft = exp(-d * d / (r * r)) * (1.0 - 0.55 * t);
      vec2 q = p - a1;
      sum += shaft * pow(lv, 0.55) * (0.35 + 1.25 * caustic(q * 0.9 + vec2(float(j) * 7.0), uTime));
    }
    addLight(acc, pool, sum * (dk ? 1.05 : 0.45));
  }
  // The fluid glows in proportion to its weight; empty glass catches a slow sweep of light.
  if (m.b > 0.5) {
    for (int j = 0; j < 8; j++) {
      vec4 s = uColS[j];
      float dx = (vb.x - s.x) / s.w;
      if (abs(dx) < 1.05 && vb.y > s.y - s.w * 0.5) {
        float lv = uCol[j].z;
        float inF = smoothstep(s.z - 1.5, s.z + 1.5, vb.y);
        float streak = pow(0.5 + 0.5 * sin(dx * 6.0 + vb.y * 0.22 - uTime * 2.4), 6.0);
        addLight(acc, glow, inF * pow(lv, 0.75) * (0.18 + 0.5 * streak) * (1.0 - dx * dx * 0.7));
        addLight(acc, glow, (1.0 - inF) * exp(-pow(dx - 0.6 * sin(uTime * 0.45 + float(j)), 2.0) * 16.0) * 0.35);
      }
    }
  }
  // Pulses run along the manifold from the reservoir; faster while the weights are shifting.
  if (m.g > 0.5) {
    float t; float d = segDist(vb, uPipe.xy, uPipe.zw, t);
    float L = length(uPipe.zw - uPipe.xy);
    float pu = pow(0.5 + 0.5 * cos(t * L * 0.22 - uTime * (3.0 + 6.0 * uPour)), 8.0) * (0.35 + uPour) * step(d, 10.0);
    addLight(acc, dk ? glow : pool, pu * 0.8);
  }
  gl_FragColor = acc;
}`;
  const canvas = document.createElement("canvas");
  canvas.className = "light"; canvas.setAttribute("aria-hidden", "true");
  fig.appendChild(canvas);
  let lightLayer = null, mode = "svg", lightRaf = 0;
  const hintEl = document.querySelector(".plate .bl"), hint0 = hintEl ? hintEl.textContent : "";
  function lightFrame(now) {
    lightRaf = 0;
    if (mode !== "webgl" || !lightLayer) return;
    if (!visible) { lightRaf = requestAnimationFrame(lightFrame); return; }
    if (lightLayer.size()) lightLayer.mask();
    const colsW = [], colsS = [];
    let pour = 0;
    for (let j = 0; j < N; j++) {
      const lv = cur.a[j];
      colsW.push(SX(j), GL.y, lv, cur.shut[j] > 0.5 ? 1 : 0);
      const b = cam.p(SX(j), GL.y, GL.z), t = cam.p(SX(j), GL.y, GL.z + GL.h), fl = cam.p(SX(j), GL.y, GL.z + Math.max(0.002, lv) * GL.h);
      colsS.push(b[0], t[1], fl[1], GL.r * cam.k);
      pour += Math.abs(cur.a[j] - (tgt ? tgt.a[j] : 0));
    }
    const pa = cam.p(60, PIPE.y, PIPE.z), pb = cam.p(SX(N - 1) + 14, PIPE.y, PIPE.z);
    lightLayer.set("uCol", colsW); lightLayer.set("uColS", colsS);
    lightLayer.set("uPipe", [pa[0], pa[1], pb[0], pb[1]]); lightLayer.set("uPour", Math.min(1, pour * 2));
    lightLayer.draw(cam, reduce.matches ? 2 : now / 1000, K.live.isDark());
    if (!reduce.matches) lightRaf = requestAnimationFrame(lightFrame);
  }
  function setMode(m) {
    mode = m;
    if (m === "3d" && typeof insp !== "undefined") insp.close();
    fig.classList.toggle("mode-webgl", m === "webgl");
    fig.classList.toggle("mode-3d", m === "3d");
    if (m !== "3d" && (stage.az !== -24 || stage.el !== 30)) { mount(-24, 30); paint(); }
    if (m === "webgl") {
      try { lightLayer = lightLayer || K.live.light({ canvas, svg, W, H, frag: LIGHT_FRAG, maskCss: MASK_CSS }); } catch (e) { lightLayer = null; console.warn(e); }
      if (lightLayer) { lightLayer.size(); lightLayer.mask().then(() => { if (!lightRaf) lightRaf = requestAnimationFrame(lightFrame); }); }
    }
    if (hintEl) hintEl.textContent = m === "3d" ? "Drag to turn the bench · double-click to reset · Shift + arrows to turn" : hint0;
    views.set(m);
  }
  const MASK_CSS = `.floor .t-top { fill: #f00 !important; } .pad .t-top { fill: #800 !important; }
    .pipe .f { fill: #0f0 !important; stroke: #0f0 !important; }
    .glass-back, .glass-front { fill: #00f !important; stroke: #00f !important; }`;
  const views = K.live.views(document.getElementById("views"), {
    modes: [{ id: "svg", label: "SVG" }, { id: "webgl", label: "WebGL", ok: K.live.webglOK() }, { id: "3d", label: "3D" }],
    current: "svg", onSelect: setMode,
  });
  let turnPending = null;
  const orb = K.live.orbit(fig, {
    az0: -24, el0: 30, azRange: [-62, 62], elRange: [12, 68], enabled: () => mode === "3d",
    onTurn(az, el) {
      if (turnPending) { turnPending = [az, el]; return; }
      turnPending = [az, el];
      requestAnimationFrame(() => { const [a, e] = turnPending; turnPending = null; mount(a, e); paint(); });
    },
  });
  fig.addEventListener("keydown", (e) => {
    if (mode !== "3d" || !e.shiftKey) return;
    const m = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (m) { orb.nudge(...m); e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  new ResizeObserver(() => { if (mode === "webgl" && lightLayer && lightLayer.size()) lightLayer.mask(); }).observe(fig);
  const kickLight = () => { if (mode === "webgl" && !lightRaf) lightRaf = requestAnimationFrame(lightFrame); };
  window.Plate.view = (m) => setMode(m);
  window.Plate.light = () => lightLayer;
  window.Plate.turn = (az, el) => { setMode("3d"); mount(az, el); paint(); };
  listeners.push(kickLight);

  /* ---------- looking closer ---------- */
  const tok = (j) => M.TOKENS[j].w;
  const PARTS = [
    { n: 1, name: "Query carriage", text: "Rides the rail to the word doing the looking. It carries that word's query, q = x·W_Q.", at: () => [cur.xq, RAIL.y, RAIL.z] },
    { n: 2, name: "Key dials", text: "One per word. Each needle reads how well that word's key lines up with the query, scaled by √d_k.", at: [SX(1), DIAL.y, DIAL.z] },
    { n: 3, name: "Glass columns", text: "The share of attention each word receives. Fluid height is the weight, graduated in tenths.", at: [SX(1), GL.y, GL.z + GL.h * 0.5] },
    { n: 4, name: "Unit reservoir", text: "Holds exactly one unit and is sealed. Softmax can only divide it, so the columns always sum to one.", at: [60, 98, 60] },
    { n: 5, name: "Stopcocks and shutters", text: "The causal mask. A word may only look back, so every later word's stopcock is shut and its column capped.", at: [SX(4), 123, 18] },
    { n: 6, name: "Core-sample tray", text: "The output: a blend of every word's value, laid down in order. Each stratum's length is that word's weight.", at: [(TRAY.x0 + TRAY.x1) / 2, (TRAY.y0 + TRAY.y1) / 2, 8] },
    { n: 7, name: "Head selector", text: "Four heads read the same words with different learned projections, so each pours attention differently.", at: [655, 96, 10] },
    { n: 8, name: "Temperature knob", text: "Divides every score before softmax. Turn it down and one column takes everything; turn it up and the fluid spreads.", at: [655, 172, 10] },
    { n: 9, name: "Mask lever", text: "Causal attention, as in a decoder, or open attention, as in an encoder where every word sees every other.", at: [655, 232, 8] },
  ];
  const top3 = (arr, f) => arr.map((v, j) => [v, j]).filter(([, j]) => !tgt.r.masked[j]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([v, j]) => f(v, j)).join(" · ");
  const live = (n) => {
    const r = tgt.r, h = M.HEADS[st.head];
    switch (n) {
      case 1: return `query <b>${tok(st.q)}</b> · q = [${r.q.slice(0, 4).map((v) => v.toFixed(1)).join(", ")}, …]`;
      case 2: return "scaled score · " + top3(r.scaled, (v, j) => `${tok(j)} <b>${v.toFixed(2)}</b>`);
      case 3: return "weight · " + top3(r.a, (v, j) => `${tok(j)} <b>${v.toFixed(2)}</b>`);
      case 4: return `Σ a = <b>${r.a.reduce((x, y) => x + y, 0).toFixed(3)}</b> · shared by ${r.masked.filter((m) => !m).length} open columns`;
      case 5: return `${r.masked.filter((m) => !m).length} open · <b>${r.masked.filter(Boolean).length}</b> shut · mask ${st.causal ? "causal" : "open"}`;
      case 6: return "output = " + top3(r.a, (v, j) => `<b>${v.toFixed(2)}</b>·v(${tok(j)})`);
      case 7: return `head <b>${h.id}</b> · ${h.name}`;
      case 8: return `T = <b>${st.T.toFixed(2)}</b> · entropy ${r.H.toFixed(2)} bits`;
      case 9: return `<b>${st.causal ? "causal" : "open"}</b> · ${tok(st.q)} can see ${r.masked.filter((m) => !m).length} of ${N} words`;
    }
    return "";
  };
  const insp = K.live.inspector({ fig, svg, W, H, parts: PARTS, cam: () => cam, live, zoom: 2.3,
    onChange: (n) => { if (n !== null && lens.on) toggleLens(false); } });
  const lens = K.live.loupe({ fig, svg, W, H, sceneId: stage.sceneId, mag: 2.6, r: 88 });
  const toolsEl = document.getElementById("tools");
  function toggleLens(v) {
    lens.toggle(v); if (lens.on) insp.close();
    toolsEl?.querySelector('[data-t="loupe"]')?.setAttribute("aria-pressed", lens.on);
  }
  toolsEl?.addEventListener("click", (e) => { if (e.target.closest('[data-t="loupe"]')) toggleLens(); });
  listeners.push(() => insp.refresh());
  document.addEventListener("folio:part", (e) => insp.show(e.detail));
  Object.assign(window.Plate, { inspect: (n) => insp.show(n), closeInspect: () => insp.close(), loupe: (v) => toggleLens(v) });

  target();
  if (reduce.matches) { Object.assign(cur, JSON.parse(JSON.stringify(tgt)), { a: tgt.a.slice(), sc: tgt.sc.slice(), shut: tgt.shut.slice() }); paint(); }
  else raf = requestAnimationFrame(frame);
  })();
