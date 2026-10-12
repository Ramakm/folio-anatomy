/* Plate II: the human heart, as a double piston pump on a bench.
   The bench is laid out as the circulation itself: veins far left, right heart, lungs behind,
   left heart, the aortic air chamber on the right and the capillary bed across the front.
   Static geometry is built once; pistons, fluid, levers, needles, lungs and flow marks are slots. */
(function () {
  "use strict";
  const K = window.Folio, H = window.HeartModel;
  const { box, rod, drum, ball, arcPath, radialTicks, line, faceText, pin, screw, path, f } = K;
  const W = 1000, HT = 660;

  const pts = [];
  for (const x of [-10, 790]) for (const y of [-10, 306]) for (const z of [-44, 0]) pts.push([x, y, z]);
  pts.push([330, 14, 214], [660, 170, 224], [110, 170, 190], [385, 50, 210]);
  const svg = document.getElementById("plate-svg");
  const stage = K.live.stage({ svg, W, H: HT, az: -24, el: 30, points: pts, center: [390, 150, 60], pad: 20, build });
  let cam = stage.base;

  // Geometry
  const RA = { x: 230, y: 170, z: 100, r: 17, h: 50, vmax: 100 };
  const LA = { x: 530, y: 170, z: 100, r: 17, h: 50, vmax: 100 };
  const RV = { x: 330, y: 170, z: 20, r: 24, h: 110, vmax: 180 };
  const LV = { x: 430, y: 170, z: 20, r: 24, h: 110, vmax: 180 };
  const VR = { x: 110, y: 170, z: 12, r: 30, h: 88 };
  const AC = { x: 660, y: 170, z: 12, r: 26, h: 112 };
  const GAUGE = { y: 218, z: 12, r: 11 };
  const BODY = { a: 246, v: 284, z: 10, x0: 196, x1: 588, n: 17 };
  const LUNG = [{ x: 285 }, { x: 395 }];
  const LZ = 118; // height of the lung stand
  const GMAX = { RA: 20, RV: 40, LV: 160, LA: 20, SA: 160 };

  let S, slot, flowPaths = [], segs = [], facing = 0;
  const acZ = 12 + 112 + 12.6; // the aortic gauge face, on top of the air chamber
  const CTRL = { x: 738, hr: 92, ct: 168, vs: 240 };
  const VS_ANG = [215, 270, 325];

  /* A blood vessel: rods with elbow balls; a dashed flow line rides on top, in the same slot of the order. */
  function vessel(points, r, kind, flowKey, o = {}) {
    let s = "";
    for (let i = 0; i < points.length - 1; i++) {
      s += rod(cam, points[i], points[i + 1], r, { seg: 20, sideCls: kind, capCls: kind + "-cap", cap: false });
      if (flowKey) segs.push({ a: points[i], b: points[i + 1], kind, key: flowKey, r, rev: !!o.rev, first: i === 0 });
    }
    for (let i = 1; i < points.length - 1; i++) s += ball(cam, points[i], r * 1.18, { cls: kind + "-ball" });
    if (flowKey) {
      const id = "fl" + flowPaths.length;
      const lift = points.map((p) => cam.p(p[0], p[1], p[2] + r * 0.55));
      flowPaths.push({ id, q: flowKey, rev: !!o.rev });
      s += `<path id="${id}" class="flow" d="${path(lift, false)}"/>`;
    }
    return s;
  }

  /* A glass cylinder with a slot for its contents. */
  function glass(c, name, ticks = 10) {
    S(drum(cam, c.x, c.y, c.z - 4, c.r + 4, 4, { cls: "collar" }));
    S(rod(cam, [c.x, c.y, c.z], [c.x, c.y, c.z + c.h], c.r, { sideCls: "glass-back", capCls: "glass-back", hatch: false }));
    slot(name);
    let d = "";
    for (let g = 1; g < ticks; g++) d += arcPath(cam, c.x, c.y, c.z + (c.h * g) / ticks, c.r + 0.2, facing - (g % 5 ? 12 : 22), facing + (g % 5 ? 12 : 22), 8);
    const t = (facing + 48) * Math.PI / 180;
    S(`<g class="sol glass">${rod(cam, [c.x, c.y, c.z], [c.x, c.y, c.z + c.h], c.r, { sideCls: "glass-front", capCls: "glass-rim", hatch: false }).replace(/^<g[^>]*>|<\/g>$/g, "")}` +
      `<path class="ln grad" d="${d}"/><path class="ln glint-line" d="${line(cam, [c.x + c.r * Math.cos(t), c.y + c.r * Math.sin(t), c.z + 4], [c.x + c.r * Math.cos(t), c.y + c.r * Math.sin(t), c.z + c.h - 5])}"/></g>`);
  }

  /* ---------- the scene, for any camera ---------- */
  function build(c, api) {
  cam = c; S = api.S; slot = api.slot; flowPaths = []; segs = [];
  facing = Math.atan2(cam.view[1], cam.view[0]) / (Math.PI / 180);
  const far = (arr) => (api.leftIsFar ? arr : arr.slice().reverse());

  /* ---------- plinth ---------- */
  for (const [x, y] of [[10, 10], [770, 10], [10, 290], [770, 290]]) S(drum(cam, x, y, -44, 8, 8, { cls: "foot" }));
  S(box(cam, -6, -6, -36, 792, 312, 8, { hatch: 2.6 }));
  S(box(cam, 0, 0, -28, 780, 300, 28, { hatch: 2.2, groove: 7, cls: "floor" }));
  for (const [x, y] of [[16, 16], [764, 16], [16, 284], [764, 284]]) S(screw(cam, x, y, 0, 3));
  S(box(cam, 270, 300, -22, 240, 1.4, 16, { cls: "brass" }));
  S(faceText(cam, [390, 301.5, -11.4], [1, 0, 0], [0, 0, -1], "FOLIO · PLATE II · THE HUMAN HEART", 5.4));
  S(faceText(cam, [390, 301.5, -17.6], [1, 0, 0], [0, 0, -1], "A DOUBLE PUMP · FOUR CHAMBERS · FOUR VALVES · TWO CIRCUITS", 3.4, { cls: "engr lo" }));
  for (const sx of [276, 504]) { const p = cam.p(sx, 301.5, -14); S(`<circle class="dot" cx="${f(p[0])}" cy="${f(p[1])}" r="${f(1.1 * cam.k)}"/>`); }

  if (!api.leftIsFar) controls();

  /* ---------- behind the lungs: pulmonary artery descender, pulmonary vein riser ---------- */
  S(vessel([[330, 14, 200], [330, 14, LZ + 3.5], [330, 25, LZ + 3.5]], 4.2, "venous", "pulv"));

  /* ---------- lungs, on a stand behind the heart ---------- */
  for (const [x, y] of [[282, 24], [498, 24], [282, 86], [498, 86]]) {
    S(drum(cam, x, y, 0, 6, 3, { cls: "base" }));
    S(rod(cam, [x, y, 3], [x, y, LZ - 6], 3.4, { seg: 18 }));
  }
  S(box(cam, 272, 18, LZ - 6, 236, 74, 6, { hatch: 2.4, groove: 3 }));
  for (const L of LUNG) S(box(cam, L.x, 25, LZ, 90, 60, 5, { groove: 2 }));
  slot("lungs");
  S(vessel([[485, 55, LZ + 3.5], [LA.x, 55, LZ + 3.5], [LA.x, 55, 132], [LA.x, LA.y - LA.r + 1, 132]], 4.2, "arterial", "pv"));

  /* ---------- heart band, far to near ---------- */
  const units = [
    () => { // venous reservoir: the great veins and the blood they hold
      S(box(cam, VR.x - 36, VR.y - 36, 0, 72, 72, 8, { groove: 3 }));
      glass(VR, "vr", 10);
      S(drum(cam, VR.x, VR.y, VR.z + VR.h, VR.r + 2, 5, { cls: "capd" }));
    },
    () => { // right atrium on its stand
      S(box(cam, RA.x - 17, RA.y - 17, 0, 34, 34, 96, { hatch: 2.4 }));
      glass(RA, "ra", 5);
      S(drum(cam, RA.x, RA.y, RA.z + RA.h, RA.r + 2, 4, { cls: "capd" }));
    },
    () => { // tricuspid valve
      S(vessel([[RA.x + RA.r - 1, RA.y, 106], [RV.x - RV.r + 1, RV.y, 106]], 4, "venous", "tri"));
      S(box(cam, 268, 161, 97, 16, 18, 18, { cls: "housing" }));
      slot("vtri");
    },
    () => { // right ventricle
      S(box(cam, RV.x - 32, RV.y - 30, 0, 64, 60, 20, { groove: 3, hatch: 2.4 }));
      glass(RV, "rv", 18);
      S(drum(cam, RV.x, RV.y, RV.z + RV.h, RV.r + 2, 6, { cls: "capd" }));
      S(box(cam, RV.x - 10, RV.y - 10, 136, 20, 20, 10, { cls: "housing" }));
      slot("vpulv");
      S(vessel([[RV.x, RV.y, 146], [RV.x, RV.y, 200]], 4.2, "venous", "pulv"));
    },
    () => { // left ventricle
      S(box(cam, LV.x - 32, LV.y - 30, 0, 64, 60, 20, { groove: 3, hatch: 2.4 }));
      glass(LV, "lv", 18);
      S(drum(cam, LV.x, LV.y, LV.z + LV.h, LV.r + 2, 6, { cls: "capd" }));
      S(box(cam, LV.x - 10, LV.y - 10, 136, 20, 20, 10, { cls: "housing" }));
      slot("vaov");
      S(vessel([[LV.x, LV.y, 146], [LV.x, LV.y, 210]], 5, "arterial", "aov"));
    },
    () => { // mitral valve
      S(vessel([[LV.x + LV.r - 1, LV.y, 106], [LA.x - LA.r + 1, LA.y, 106]], 4, "arterial", "mit", { rev: true }));
      S(box(cam, 476, 161, 97, 16, 18, 18, { cls: "housing" }));
      slot("vmit");
    },
    () => { // left atrium on its stand
      S(box(cam, LA.x - 17, LA.y - 17, 0, 34, 34, 96, { hatch: 2.4 }));
      glass(LA, "la", 5);
      S(drum(cam, LA.x, LA.y, LA.z + LA.h, LA.r + 2, 4, { cls: "capd" }));
    },
    () => { // aortic air chamber: the elastic arteries, a windkessel
      S(box(cam, AC.x - 34, AC.y - 34, 0, 68, 68, 8, { groove: 3 }));
      glass(AC, "ac", 16);
      S(drum(cam, AC.x, AC.y, AC.z + AC.h, AC.r + 1, 4, { cls: "capd" }));
      S(drum(cam, AC.x, AC.y, AC.z + AC.h + 4, AC.r - 6, 3));
      S(drum(cam, AC.x, AC.y, AC.z + AC.h + 7, GAUGE.r + 2, 3));
      S(drum(cam, AC.x, AC.y, AC.z + AC.h + 10, GAUGE.r, 2.5, { capCls: "t-face" }));
      gaugeFace(AC.x, AC.y, acZ, GMAX.SA);
      slot("gSA");
    },
  ];
  far(units).forEach((u) => u());

  /* ---------- high vessels: above everything in the heart band ---------- */
  S(vessel([[VR.x, VR.y, VR.z + VR.h + 5], [VR.x, VR.y, 176], [RA.x, RA.y, 176], [RA.x, RA.y, RA.z + RA.h + 4]], 5.2, "venous", "sv"));
  S(vessel([[RV.x, RV.y, 200], [330, 14, 200]], 4.2, "venous", "pulv"));
  S(ball(cam, [330, 14, 200], 5, { cls: "venous-ball" }));
  S(vessel([[LV.x, LV.y, 210], [AC.x, AC.y, 210], [AC.x, AC.y, acZ + 3]], 5.4, "arterial", "aov"));

  /* ---------- gauges ---------- */
  function gaugeFace(x, y, z, max) {
    const ang = (v) => 180 + (v / max) * 180;
    const mj = [], mn = [];
    const stp = max / 8;
    for (let v = 0; v <= max + 1e-6; v += stp / 2) (Math.round(v / stp) * stp === v ? mj : mn).push(ang(v));
    S(`<path class="ln lo" d="${radialTicks(cam, x, y, z, 8.6, 10, mn)}"/><path class="ln mid" d="${radialTicks(cam, x, y, z, 7.4, 10, mj)}${arcPath(cam, x, y, z, 10, 180, 360, 24)}"/>`);
  }
  for (const [c, X] of far([["RA", RA.x], ["RV", RV.x], ["LV", LV.x], ["LA", LA.x]])) {
    S(box(cam, X - 17, GAUGE.y - 14, 0, 34, 28, 6, { groove: 2 }));
    S(faceText(cam, [X, GAUGE.y + 14.2, 1.6], [1, 0, 0], [0, 0, -1], c + " · 0–" + GMAX[c], 3.4, { cls: "engr lo" }));
    S(drum(cam, X, GAUGE.y, 6, GAUGE.r + 2.5, 3));
    S(drum(cam, X, GAUGE.y, 9, GAUGE.r, 3, { capCls: "t-face" }));
    gaugeFace(X, GAUGE.y, GAUGE.z, GMAX[c]);
    slot("g" + c);
  }

  /* ---------- body: the capillary bed ---------- */
  S(vessel([[VR.x, VR.y + VR.r - 2, 10], [VR.x, BODY.v, 10]], 4.6, "venous", "sys", { rev: true }));
  S(vessel([[AC.x, AC.y + AC.r - 2, 10], [AC.x, BODY.a, 10], [BODY.x0 - 10, BODY.a, 10]], 4.6, "arterial", "sys"));
  S(box(cam, BODY.x0 - 14, BODY.a + 6, 0, BODY.x1 - BODY.x0 + 28, BODY.v - BODY.a - 12, 3, { groove: 2.5 }));
  for (const i of far([...Array(BODY.n).keys()])) {
    const x = BODY.x0 + ((BODY.x1 - BODY.x0) * i) / (BODY.n - 1), mid = (BODY.a + BODY.v) / 2;
    S(rod(cam, [x, BODY.a, BODY.z], [x, mid, BODY.z], 1.6, { seg: 10, sideCls: "arterial", cap: false }));
    S(rod(cam, [x, mid, BODY.z], [x, BODY.v, BODY.z], 1.6, { seg: 10, sideCls: "venous", cap: false }));
    const id = "fl" + flowPaths.length;
    flowPaths.push({ id, q: "sys", per: BODY.n });
    S(`<path id="${id}" class="flow thin" d="${path([cam.p(x, BODY.a, BODY.z + 1), cam.p(x, BODY.v, BODY.z + 1)], false)}"/>`);
  }
  S(vessel([[VR.x, BODY.v, 10], [BODY.x1 + 10, BODY.v, 10]], 4.6, "venous", "sys", { rev: true }));

  if (api.leftIsFar) controls();
  slot("pins");
  }

  /* ---------- controls ---------- */
  function controls() {
  S(box(cam, CTRL.x - 26, CTRL.hr - 24, 0, 52, 48, 3, { groove: 2.5 }));
  {
    const tk = [], tm = [];
    for (let b = 40; b <= 180; b += 10) ((b - 40) % 40 === 0 ? tm : tk).push(160 + ((b - 40) / 140) * 220);
    S(`<path class="ln lo" d="${radialTicks(cam, CTRL.x, CTRL.hr, 3, 16, 18.5, tk)}"/><path class="ln mid" d="${radialTicks(cam, CTRL.x, CTRL.hr, 3, 15, 19.5, tm)}"/>`);
    S(faceText(cam, [CTRL.x, CTRL.hr + 21, 3], [1, 0, 0], [0, 1, 0], "BEATS / MIN", 3.2, { cls: "engr lo" }));
  }
  slot("kHR");
  S(box(cam, CTRL.x - 26, CTRL.ct - 24, 0, 52, 48, 3, { groove: 2.5 }));
  {
    const tk = [];
    for (let i = 0; i <= 12; i++) tk.push(160 + (i / 12) * 220);
    S(`<path class="ln lo" d="${radialTicks(cam, CTRL.x, CTRL.ct, 3, 16, 18.5, tk)}"/>`);
    S(faceText(cam, [CTRL.x, CTRL.ct + 21, 3], [1, 0, 0], [0, 1, 0], "CONTRACTILITY", 3.2, { cls: "engr lo" }));
  }
  slot("kCT");
  S(box(cam, CTRL.x - 26, CTRL.vs - 24, 0, 52, 48, 3, { groove: 2.5 }));
  S(`<path class="ln mid" d="${radialTicks(cam, CTRL.x, CTRL.vs, 3, 15, 18.5, VS_ANG)}"/>`);
  ["N", "AS", "MR"].forEach((l, i) => {
    const t = (VS_ANG[i] * Math.PI) / 180;
    S(faceText(cam, [CTRL.x + 22 * Math.cos(t), CTRL.vs + 22 * Math.sin(t) + 1.2, 3], [1, 0, 0], [0, 1, 0], l, 3.6));
  });
  S(faceText(cam, [CTRL.x, CTRL.vs + 21, 3], [1, 0, 0], [0, 1, 0], "VALVES", 3.2, { cls: "engr lo" }));
  slot("kVS");
  }

  /* ---------- live drawing ---------- */
  function contents(c, V, kind, piston) {
    const h = Math.max(0.5, Math.min(c.h - 0.5, (V / c.vmax) * c.h));
    const top = c.z + c.h, zp = top - h;
    let o = "";
    if (piston) {
      o += rod(cam, [c.x, c.y, c.z], [c.x, c.y, zp - 4], 2.6, { seg: 14 });
      o += drum(cam, c.x, c.y, zp - 4, c.r - 0.8, 4, { cls: "piston", knurl: 0 });
    }
    o += rod(cam, [c.x, c.y, zp], [c.x, c.y, top - 0.4], c.r - 0.8, { cls: kind + "g", sideCls: kind, capCls: kind + "-top" });
    return o;
  }
  function level(c, frac, kind) {
    const h = Math.max(1, Math.min(c.h - 1, frac * c.h));
    return rod(cam, [c.x, c.y, c.z], [c.x, c.y, c.z + h], c.r - 0.8, { cls: kind + "g", sideCls: kind, capCls: kind + "-top" });
  }
  function lever(cx, cy, cz, flowDir, state) {
    // state: 1 open (along flow), 0 shut (across), -1 leaking backwards
    const a = state === 0 ? Math.PI / 2 : 0, L = 9;
    const dir = flowDir === "x" ? [Math.cos(a), Math.sin(a), 0] : [Math.sin(a), Math.cos(a), 0];
    let o = rod(cam, [cx - dir[0] * L * 0.4, cy - dir[1] * L * 0.4, cz], [cx + dir[0] * L, cy + dir[1] * L, cz], 1.4, { seg: 12, cls: state === -1 ? "lever leak" : "lever" });
    o += ball(cam, [cx, cy, cz], 2.2);
    if (state === -1) { const p = cam.p(cx, cy, cz); o += `<circle class="leakring" cx="${f(p[0])}" cy="${f(p[1])}" r="${f(6 * cam.k)}"/>`; }
    return o;
  }
  function needle(x, y, z, v, max) {
    const t = ((180 + Math.max(0, Math.min(1.02, v / max)) * 180) * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
    const P = (a) => cam.p(a);
    const tip = [x + 9.2 * c, y + 9.2 * s, z], tail = [x - 2.6 * c, y - 2.6 * s, z], w1 = [x - s, y + c, z], w2 = [x + s, y - c, z];
    const hub = cam.p(x, y, z);
    return `<path class="needle" d="${path([tail, w1, tip, w2].map(P))}"/><circle class="hub" cx="${f(hub[0])}" cy="${f(hub[1])}" r="${f(1.4 * cam.k)}"/>`;
  }
  function lungs(breath) {
    let o = "";
    const hgt = 24 + 12 * breath;
    LUNG.forEach((L, li) => {
      const n = 6, fh = hgt / n;
      for (let i = 0; i < n; i++) {
        const ins = i % 2 ? 4 : 1.5;
        o += box(cam, L.x + ins, 25 + ins, LZ + 5 + i * fh, 90 - 2 * ins, 60 - 2 * ins, fh, { cls: "leather" });
      }
      o += box(cam, L.x, 25, LZ + 5 + hgt, 90, 60, 4, { groove: 2.5 });
      if (li === 0) o += vessel([[375, 55, LZ + 3], [385, 55, LZ + 3]], 2.6, "venous", null) + vessel([[385, 55, LZ + 3], [395, 55, LZ + 3]], 2.6, "arterial", null);
    });
    const zt = LZ + 9 + hgt, zb = LZ + 62;
    o += rod(cam, [345, 50, zt], [345, 50, zb], 3, { seg: 14 }) + rod(cam, [425, 50, zt], [425, 50, zb], 3, { seg: 14 });
    o += rod(cam, [345, 50, zb], [425, 50, zb], 3, { seg: 14 }) + ball(cam, [345, 50, zb], 3.6) + ball(cam, [425, 50, zb], 3.6);
    o += rod(cam, [385, 50, zb], [385, 50, zb + 20], 3.4, { seg: 14 }) + drum(cam, 385, 50, zb + 20, 7, 4) + ball(cam, [385, 50, zb], 3.8);
    return o;
  }
  function knob(x, y, ang, r = 10) {
    const t = (ang * Math.PI) / 180;
    return drum(cam, x, y, 3, r, 11, { knurl: 14, density: 1.2 }) + drum(cam, x, y, 14, r - 3.5, 1.6) +
      `<path class="ln hi" d="${line(cam, [x + 1.5 * Math.cos(t), y + 1.5 * Math.sin(t), 15.7], [x + (r - 0.8) * Math.cos(t), y + (r - 0.8) * Math.sin(t), 14.1])}"/>`;
  }
  const PINS = [
    [1, [VR.x - 38, VR.y + 8, 70]], [2, [RA.x - 24, RA.y + 6, 136]], [3, [276, 172, 124]],
    [4, [RV.x - 30, RV.y + 12, 60]], [5, [RV.x - 18, RV.y + 4, 152]], [6, [LUNG[0].x - 6, 78, LZ + 22]],
    [7, [LA.x + 24, LA.y + 8, 140]], [8, [484, 172, 124]], [9, [LV.x + 32, LV.y + 6, 92]],
    [10, [LV.x + 20, LV.y, 150]], [11, [AC.x + 34, AC.y + 6, 80]], [12, [BODY.x0 - 4, BODY.v + 10, 12]],
  ];

  const draw = {
    vr: (r) => level(VR, (r.V.SV - H.P0.SV.V0) / 620, "venous"),
    ra: (r) => contents(RA, r.V.RA, "venous", true),
    rv: (r) => contents(RV, r.V.RV, "venous", true),
    lv: (r) => contents(LV, r.V.LV, "arterial", true),
    la: (r) => contents(LA, r.V.LA, "arterial", true),
    ac: (r) => level(AC, 0.12 + (Math.max(0, r.P.SA) / 160) * 0.8, "arterial"),
    vtri: (r) => lever(276, 170, 116, "x", r.valves.tri),
    vmit: (r) => lever(484, 170, 116, "x", r.valves.mit),
    vpulv: (r) => lever(RV.x, RV.y, 147, "y", r.valves.pulv),
    vaov: (r) => lever(LV.x, LV.y, 147, "y", r.valves.aov),
    gRA: (r) => needle(RA.x, GAUGE.y, GAUGE.z + 0.2, r.P.RA, GMAX.RA),
    gRV: (r) => needle(RV.x, GAUGE.y, GAUGE.z + 0.2, r.P.RV, GMAX.RV),
    gLV: (r) => needle(LV.x, GAUGE.y, GAUGE.z + 0.2, r.P.LV, GMAX.LV),
    gLA: (r) => needle(LA.x, GAUGE.y, GAUGE.z + 0.2, r.P.LA, GMAX.LA),
    gSA: (r) => needle(AC.x, AC.y, acZ + 0.2, r.P.SA, GMAX.SA),
    lungs: (r, ui) => lungs(ui.breath),
    kHR: (r, ui) => knob(CTRL.x, CTRL.hr, 160 + ((ui.HR - 40) / 140) * 220),
    kCT: (r, ui) => knob(CTRL.x, CTRL.ct, 160 + ((ui.contract - 0.4) / 1.2) * 220),
    kVS: (r, ui) => knob(CTRL.x, CTRL.vs, VS_ANG[["normal", "as", "mr"].indexOf(ui.fault)], 9),
    pins: () => PINS.map(([n, p]) => pin(cam, p, n)).join(""),
  };

  /* ---------- mount ---------- */
  let slots = {}, flowEls = [], segScreen = [];
  const keyOff = {};
  function mount(az, el) {
    cam = stage.mount(az, el); slots = stage.slots;
    if (slots.pins) slots.pins.innerHTML = draw.pins();
    flowEls = flowPaths.map((fp) => ({ ...fp, el: document.getElementById(fp.id) }));
    // vessel segments on screen, each with its distance along its vessel, for the light layer
    let run = 0;
    segScreen = segs.map((g) => {
      const a = cam.p(g.a), b = cam.p(g.b), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (g.first) run = 0;
      const o = { a, b, start: run, len, kind: g.kind === "arterial" ? 1 : 0, key: g.key, r: g.r * cam.k + 1.2, rev: g.rev };
      run += len; return o;
    });
  }
  mount(-24, 30);

  /* ---------- simulation ---------- */
  const ui = { HR: 72, contract: 1, fault: "normal", speed: 1, playing: true, breath: 0.5 };
  let sim = H.make(ui);
  H.settle(sim, 12);
  let beatRec = [], lastBeat = null, cur = H.read(sim);
  const listeners = [];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let visible = true, raf = 0, last = 0, tBreath = 0;

  function dashes() {
    for (const fl of flowEls) {
      if (!fl.el) continue;
      const off = (keyOff[fl.q] || 0) * (fl.per ? 2.2 / fl.per : 0.06) * (fl.rev ? -1 : 1);
      fl.el.style.strokeDashoffset = off.toFixed(2);
      fl.el.style.opacity = Math.abs(cur.Q[fl.q] || 0) > 0.5 ? 1 : 0.15;
    }
  }
  function paint() {
    for (const k in draw) if (k !== "pins" && slots[k]) slots[k].innerHTML = draw[k](cur, ui);
  }
  function advance(dtReal) {
    const dt = 0.0005;
    let simT = dtReal * ui.speed, n = Math.round(simT / dt);
    for (let i = 0; i < n; i++) {
      const beat = H.step(sim, dt);
      if (i % 8 === 0) { const r = H.read(sim); beatRec.push({ t: sim.tc, P: r.P, V: r.V, Q: r.Q, phase: r.phase }); }
      if (beat) finishBeat();
    }
    cur = H.read(sim);
    tBreath += simT;
    ui.breath = 0.5 - 0.5 * Math.cos((2 * Math.PI * tBreath) / (60 / 14));
    // flow marks: offset by the volume that passed, so the dashes move at the true flow speed
    for (const k of ["sv", "tri", "pulv", "pv", "mit", "aov", "sys"]) keyOff[k] = (keyOff[k] || 0) - Math.max(-200, Math.min(600, cur.Q[k] || 0)) * simT;
    dashes();
  }
  function finishBeat() {
    if (beatRec.length > 20) {
      const T = 60 / sim.HR;
      lastBeat = summarise(beatRec, T);
    }
    beatRec = [];
  }
  function summarise(rec, T) {
    const mx = (g) => Math.max(...rec.map(g)), mn = (g) => Math.min(...rec.map(g));
    let fwd = 0, back = 0;
    for (let i = 1; i < rec.length; i++) { const d = rec[i].t - rec[i - 1].t; if (d > 0) { fwd += Math.max(0, rec[i].Q.aov) * d; back += Math.max(0, -rec[i].Q.mit) * d; } }
    const EDV = mx((r) => r.V.LV), ESV = mn((r) => r.V.LV);
    return { rec, T, HR: 60 / T, EDV, ESV, SV: fwd, EF: (EDV - ESV) / EDV, CO: (fwd * 60) / T / 1000, regurg: back,
      LV: [mn((r) => r.P.LV), mx((r) => r.P.LV)], SA: [mn((r) => r.P.SA), mx((r) => r.P.SA)], RV: [mn((r) => r.P.RV), mx((r) => r.P.RV)],
      PA: [mn((r) => r.P.PA), mx((r) => r.P.PA)], LA: [mn((r) => r.P.LA), mx((r) => r.P.LA)], RA: [mn((r) => r.P.RA), mx((r) => r.P.RA)] };
  }
  let lastEmit = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (ui.playing && !document.hidden) advance(dt);
    if (visible) paint();
    if (now - lastEmit > 90) { lastEmit = now; listeners.forEach((fn) => fn(ui, cur, lastBeat)); }
    raf = requestAnimationFrame(frame);
  }

  function update(patch) {
    Object.assign(ui, patch);
    sim.HR = ui.HR; sim.contract = ui.contract; sim.fault = ui.fault;
    if (ui.playing && !raf) { last = 0; raf = requestAnimationFrame(frame); }
    if (!ui.playing) { paint(); listeners.forEach((fn) => fn(ui, cur, lastBeat)); }
  }
  /* For a still frame: settle the circulation and stop at a chosen moment of the cycle. */
  function stillAt(frac) {
    const s = H.make(ui); const r = H.settle(s, 12);
    lastBeat = { ...r, HR: ui.HR, rec: r.rec };
    const target = frac * r.T;
    while (Math.abs(s.tc - target) > 0.002) H.step(s, 0.0005);
    sim = s; cur = H.read(sim);
    paint(); listeners.forEach((fn) => fn(ui, cur, lastBeat));
  }
  window.Plate = {
    ui, update, stillAt,
    on: (fn) => { listeners.push(fn); fn(ui, cur, lastBeat); },
    resettle: () => { sim = H.make(ui); H.settle(sim, 10); },
  };

  /* ---------- input ---------- */
  const fig = document.getElementById("plate");
  fig.addEventListener("keydown", (e) => {
    const k = e.key;
    if (k === "ArrowUp") update({ HR: Math.min(180, ui.HR + 4) });
    else if (k === "ArrowDown") update({ HR: Math.max(40, ui.HR - 4) });
    else if (k === "]") update({ contract: Math.min(1.6, +(ui.contract + 0.1).toFixed(2)) });
    else if (k === "[") update({ contract: Math.max(0.4, +(ui.contract - 0.1).toFixed(2)) });
    else if (k === "1") update({ fault: "normal" });
    else if (k === "2") update({ fault: "as" });
    else if (k === "3") update({ fault: "mr" });
    else if (k === " ") update({ playing: !ui.playing });
    else if (k === "s" || k === "S") update({ speed: ui.speed === 1 ? 0.25 : ui.speed === 0.25 ? 0.06 : 1 });
    else return;
    e.preventDefault();
  });
  new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(fig);

  /* ---------- three views: SVG, WebGL, 3D ---------- */
  const NSEG = 28;
  const LIGHT_FRAG = `
uniform vec4 uSegA[${NSEG}]; uniform vec4 uSegB[${NSEG}]; uniform float uSegShift[${NSEG}]; uniform float uNSeg;
uniform vec4 uCh[6]; uniform vec4 uChS[6]; uniform float uChE[6];
void main() {
  vec2 vb = vbOf(); vec4 m = maskAt();
  vec4 acc = vec4(0.0);
  bool dk = uDark > 0.5;
  vec3 art = dk ? vec3(1.0, 0.42, 0.30) : vec3(0.86, 0.26, 0.14);
  vec3 ven = dk ? vec3(0.50, 0.58, 1.0) : vec3(0.28, 0.33, 0.62);
  vec3 hiA = dk ? vec3(1.0, 0.78, 0.66) : vec3(1.0, 0.86, 0.8);
  vec3 hiV = dk ? vec3(0.80, 0.85, 1.0) : vec3(0.88, 0.9, 1.0);
  // Blood pulses travel along the vessels at the true flow.
  if (m.g > 0.5) {
    float best = 0.0; float kind = 0.0;
    for (int i = 0; i < ${NSEG}; i++) {
      if (float(i) >= uNSeg) break;
      vec4 A = uSegA[i], B = uSegB[i];
      float t; float d = segDist(vb, A.xy, A.zw, t);
      if (d < B.w) {
        float along = B.x + t * B.y + uSegShift[i];
        float pu = pow(0.5 + 0.5 * cos(along * 0.36), 10.0) * (1.0 - d / B.w * 0.6);
        if (pu > best) { best = pu; kind = B.z; }
      }
    }
    addLight(acc, kind > 0.5 ? hiA : hiV, best * (dk ? 0.85 : 0.75));
  }
  // Each chamber throws light of its blood's colour onto the bench in front of it.
  if (m.r > 0.5) {
    vec2 p = onPlane(vb, 0.0);
    for (int j = 0; j < 6; j++) {
      vec4 c = uCh[j];
      float t;
      float d = segDist(p, c.xy + vec2(0.0, 12.0), fall(vec3(c.x, c.y, c.z), 0.0), t);
      float r = 12.0 + 12.0 * t;
      float e = uChE[j];
      float sh = exp(-d * d / (r * r)) * (1.0 - 0.5 * t) * e;
      vec2 q = p - c.xy;
      float cs = 0.35 + 1.2 * caustic(q * 0.8 + vec2(float(j) * 5.0), uTime);
      addLight(acc, c.w > 0.5 ? art : ven, sh * cs * (dk ? 0.9 : 0.4));
    }
  }
  // Glass glows with its contents; the ventricles flare as they squeeze.
  if (m.b > 0.5) {
    for (int j = 0; j < 6; j++) {
      vec4 s = uChS[j];
      float dx = (vb.x - s.x) / s.w;
      if (abs(dx) < 1.05 && vb.y > s.y - s.w * 0.5) {
        float inF = uCh[j].z > 0.0 ? 1.0 : 0.0;
        float streak = pow(0.5 + 0.5 * sin(dx * 5.0 + vb.y * 0.2 - uTime * 2.0), 6.0);
        float within = s.z > 0.0 ? smoothstep(s.z + 1.5, s.z - 1.5, vb.y) : smoothstep(-s.z - 1.5, -s.z + 1.5, vb.y);
        addLight(acc, uCh[j].w > 0.5 ? hiA : hiV, within * (0.12 + 0.35 * streak + 0.5 * uChE[j]) * (1.0 - dx * dx * 0.7) * inF);
      }
    }
  }
  gl_FragColor = acc;
}`;
  const canvas = document.createElement("canvas");
  canvas.className = "light"; canvas.setAttribute("aria-hidden", "true");
  fig.appendChild(canvas);
  let lightLayer = null, mode = "svg", lightRaf = 0;
  const hintEl = document.querySelector(".plate .bl"), hint0 = hintEl ? hintEl.textContent : "";
  const CHAMBERS = [
    { c: VR, kind: 0, level: (r) => (r.V.SV - H.P0.SV.V0) / 620, piston: false },
    { c: RA, kind: 0, level: (r) => r.V.RA / RA.vmax, piston: true, act: "a" },
    { c: RV, kind: 0, level: (r) => r.V.RV / RV.vmax, piston: true, act: "v" },
    { c: LV, kind: 1, level: (r) => r.V.LV / LV.vmax, piston: true, act: "v" },
    { c: LA, kind: 1, level: (r) => r.V.LA / LA.vmax, piston: true, act: "a" },
    { c: AC, kind: 1, level: (r) => 0.12 + (Math.max(0, r.P.SA) / 160) * 0.8, piston: false },
  ];
  function lightFrame(now) {
    lightRaf = 0;
    if (mode !== "webgl" || !lightLayer) return;
    if (!visible) { lightRaf = requestAnimationFrame(lightFrame); return; }
    if (lightLayer.size()) lightLayer.mask();
    const A = [], B = [], Sh = [];
    for (let i = 0; i < NSEG; i++) {
      const g = segScreen[i];
      if (!g) { A.push(0, 0, 0, 0); B.push(0, 0, 0, 0); Sh.push(0); continue; }
      A.push(g.a[0], g.a[1], g.b[0], g.b[1]); B.push(g.start, g.len, g.kind, g.r);
      Sh.push((keyOff[g.key] || 0) * 0.06 * (g.rev ? -1 : 1));
    }
    const ch = [], chS = [], chE = [];
    const act = cur.act || { v: 0, a: 0 };
    for (const k of CHAMBERS) {
      const c = k.c, lv = Math.max(0, Math.min(1, k.level(cur)));
      const top = c.z + c.h, zF = k.piston ? top - lv * c.h : c.z + lv * c.h;
      ch.push(c.x, c.y, (k.piston ? top : zF) + 0.0001, k.kind);
      const b = cam.p(c.x, c.y, c.z), t = cam.p(c.x, c.y, top), f = cam.p(c.x, c.y, zF);
      chS.push(b[0], t[1], k.piston ? f[1] : -f[1], c.r * cam.k);
      chE.push(Math.min(1, 0.35 + 0.65 * lv + (k.act ? act[k.act] * 0.6 : 0)));
    }
    lightLayer.set("uSegA", A); lightLayer.set("uSegB", B);
    lightLayer.set("uSegShift", new Float32Array(Sh));
    lightLayer.set("uNSeg", Math.min(NSEG, segScreen.length));
    lightLayer.set("uCh", ch); lightLayer.set("uChS", chS);
    lightLayer.set("uChE", new Float32Array(chE));
    lightLayer.draw(cam, reduce.matches ? 2 : now / 1000, K.live.isDark());
    if (!reduce.matches) lightRaf = requestAnimationFrame(lightFrame);
  }
  const MASK_CSS = `.floor .t-top { fill: #f00 !important; }
    .arterial, .venous, .arterial-ball .f, .venous-ball .f, .arterial-cap, .venous-cap { fill: #0f0 !important; stroke: #0f0 !important; }
    .glass-back, .glass-front { fill: #00f !important; stroke: #00f !important; }`;
  function setMode(m) {
    mode = m;
    if (m === "3d" && typeof insp !== "undefined") insp.close();
    fig.classList.toggle("mode-webgl", m === "webgl");
    fig.classList.toggle("mode-3d", m === "3d");
    if (m !== "3d" && (stage.az !== -24 || stage.el !== 30)) { mount(-24, 30); paint(); }
    if (m === "webgl") {
      try { lightLayer = lightLayer || K.live.light({ canvas, svg, W, H: HT, frag: LIGHT_FRAG, maskCss: MASK_CSS }); } catch (e) { lightLayer = null; console.warn(e); }
      if (lightLayer) { lightLayer.size(); lightLayer.mask().then(() => { if (!lightRaf) lightRaf = requestAnimationFrame(lightFrame); }); }
    }
    if (hintEl) hintEl.textContent = m === "3d" ? "Drag to turn the bench · double-click to reset · Shift + arrows to turn" : hint0;
    views.set(m);
  }
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
      requestAnimationFrame(() => { const [a, e] = turnPending; turnPending = null; mount(a, e); paint(); dashes(); });
    },
  });
  fig.addEventListener("keydown", (e) => {
    if (mode !== "3d" || !e.shiftKey) return;
    const d = { ArrowLeft: [-6, 0], ArrowRight: [6, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (d) { orb.nudge(...d); e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  new ResizeObserver(() => { if (mode === "webgl" && lightLayer && lightLayer.size()) lightLayer.mask(); }).observe(fig);
  Object.assign(window.Plate, {
    view: (m) => setMode(m),
    turn: (az, el) => { setMode("3d"); mount(az, el); paint(); dashes(); },
    light: () => lightLayer,
  });

  /* ---------- looking closer ---------- */
  const r0 = (v) => Math.round(v);
  const vstate = (v) => (v === 1 ? "<b>open</b>" : v === -1 ? "<b>leaking back</b>" : "shut");
  const PART_TEXT = [
    [1, "Venous reservoir", "The great veins. Blood comes home from the body here, low in pressure and low in oxygen."],
    [2, "Right atrium", "A small primer pump. It fills while the ventricle squeezes, then tops the ventricle up with a short kick."],
    [3, "Tricuspid valve", "Lets blood fall into the right ventricle and seals when the ventricle squeezes."],
    [4, "Right ventricle", "The pump for the lungs. It needs only about 25 mmHg; the lung circuit is short and soft."],
    [5, "Pulmonary valve", "Opens while the right ventricle ejects, then seals the pulmonary artery."],
    [6, "Lungs", "Bellows breathing 14 times a minute. Blood goes in dark and leaves bright with oxygen."],
    [7, "Left atrium", "Collects oxygenated blood from the pulmonary veins and primes the left ventricle."],
    [8, "Mitral valve", "The left inflow valve. Set the valves to Leak and it lets blood back into the atrium."],
    [9, "Left ventricle", "The pump for the whole body. It reaches about 115 mmHg and moves about 70 mL a beat."],
    [10, "Aortic valve", "Opens once the ventricle out-pushes the aorta. Set the valves to Stenosis and it narrows."],
    [11, "Air chamber", "The elastic aorta. A cushion of air stores each surge and keeps pressure up between beats."],
    [12, "Capillary bed", "The body. Seventeen fine tubes where blood gives up its oxygen and turns dark again."],
  ];
  const PARTS = PART_TEXT.map(([n, name, text]) => ({ n, name, text, at: PINS.find((p) => p[0] === n)[1] }));
  const liveH = (n) => {
    const r = cur, b = lastBeat;
    switch (n) {
      case 1: return `pressure <b>${r.P.SV.toFixed(1)}</b> mmHg · holds ${r0(r.V.SV)} mL`;
      case 2: return `pressure <b>${r.P.RA.toFixed(1)}</b> mmHg · volume ${r0(r.V.RA)} mL`;
      case 3: return `${vstate(r.valves.tri)} · flow ${r0(Math.max(0, r.Q.tri))} mL/s`;
      case 4: return `pressure <b>${r0(r.P.RV)}</b> mmHg · volume ${r0(r.V.RV)} mL · ${r.phase}`;
      case 5: return `${vstate(r.valves.pulv)} · flow ${r0(Math.max(0, r.Q.pulv))} mL/s`;
      case 6: return `artery <b>${r0(r.P.PA)}</b> mmHg → veins ${r0(r.P.PV)} mmHg · ${r0(r.Q.pul)} mL/s`;
      case 7: return `pressure <b>${r.P.LA.toFixed(1)}</b> mmHg · volume ${r0(r.V.LA)} mL`;
      case 8: return `${vstate(r.valves.mit)} · flow ${r0(r.Q.mit)} mL/s` + (b && b.regurg > 1 ? ` · leaks ${r0(b.regurg)} mL a beat` : "");
      case 9: return `pressure <b>${r0(r.P.LV)}</b> mmHg · volume ${r0(r.V.LV)} mL · ${r.phase}`;
      case 10: return `${vstate(r.valves.aov)} · flow ${r0(Math.max(0, r.Q.aov))} mL/s` + (b ? ` · LV peak ${r0(b.LV[1])} mmHg` : "");
      case 11: return `pressure <b>${r0(r.P.SA)}</b> mmHg` + (b ? ` · ${r0(b.SA[1])}/${r0(b.SA[0])} last beat` : "");
      case 12: return `flow <b>${r0(r.Q.sys)}</b> mL/s` + (b ? ` · ${b.CO.toFixed(1)} L/min` : "");
    }
    return "";
  };
  const insp = K.live.inspector({ fig, svg, W, H: HT, parts: PARTS, cam: () => cam, live: liveH, zoom: 2.3,
    onChange: (n) => { if (n !== null && lens.on) toggleLens(false); } });
  const lens = K.live.loupe({ fig, svg, W, H: HT, sceneId: stage.sceneId, mag: 2.6, r: 88 });
  const toolsEl = document.getElementById("tools");
  function toggleLens(v) {
    lens.toggle(v); if (lens.on) insp.close();
    toolsEl?.querySelector('[data-t="loupe"]')?.setAttribute("aria-pressed", lens.on);
  }
  toolsEl?.addEventListener("click", (e) => { if (e.target.closest('[data-t="loupe"]')) toggleLens(); });
  setInterval(() => insp.refresh(), 220);
  document.addEventListener("folio:part", (e) => insp.show(e.detail));
  Object.assign(window.Plate, { inspect: (n) => insp.show(n), closeInspect: () => insp.close(), loupe: (v) => toggleLens(v) });

  if (reduce.matches) { ui.playing = false; stillAt(0.18); }
  else { const r0 = H.settle(H.make(ui), 10); lastBeat = { ...r0, HR: ui.HR }; paint(); raf = requestAnimationFrame(frame); }
})();
