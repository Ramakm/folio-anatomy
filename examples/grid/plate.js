/* Plate III: a power grid in miniature.
   Falling water turns a wheel; the shaft spins a magnet inside three coils; a flyball governor
   holds the speed. Transformers raise the voltage for the long line and lower it for the town.
   Every part is a unit sorted by depth, so the bench can be turned all the way round. */
(function () {
  "use strict";
  const K = window.Folio, G = window.GridModel;
  const { box, rod, drum, ball, arcPath, radialTicks, line, faceText, pin, screw, path, f, prism, ringArc, orbitPt } = K;
  const W = 1000, H = 600;
  const X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1];

  // Layout (world units, x along the bench, y toward the viewer, z up)
  const PL = { x1: 980, y1: 330 };
  const WHEEL = { c: [95, 150, 80], R: 40, half: 6, n: 12 };
  const TANK = { x: 40, y: 78, z: 10, r: 22, h: 140 };
  const SH = { y: 150, z: 80, x0: 101, x1: 318, r: 4 };
  const GOV = { x: 140, y: 150, z0: 90, z1: 150, L: 28 };
  const GEN = { x: 225, r: 38, x0: 178, x1: 272, rr: 24 };
  const T1 = { x0: 340, xl: 358, xr: 422, xb: 452 };
  const T2 = { x0: 760, xb: 772, xl: 798, xr: 862, xo: 882 };
  const PY = [540, 700];
  const PHASE = [118, 150, 182], BUSH = [128, 150, 172];
  const ARMZ = 176;
  const TOWN = { bus: 905, houses: [{ y: 60, h: 22 }, { y: 116, h: 26 }, { y: 172, h: 22 }], factory: { y: 230 } };
  const FRONT = 285;
  const CTRL = { demand: 650, volt: 735, brk: 820 };
  const GAUGES = [
    { id: "gF", x: 110, r: 15, label: "FREQUENCY · Hz", min: 48, max: 52, val: (r) => r.f },
    { id: "gP", x: 210, r: 12, label: "GENERATOR · MW", min: 0, max: 150, val: (r) => r.Pe },
    { id: "gI", x: 470, r: 12, label: "LINE · A", min: 0, max: 1200, val: (r) => r.I },
    { id: "gL", x: 590, r: 12, label: "LINE LOSS · MW", min: 0, max: 40, val: (r) => r.loss },
  ];

  const pts = [];
  for (const x of [-10, PL.x1 + 10]) for (const y of [-10, PL.y1 + 10]) for (const z of [-40, 0]) pts.push([x, y, z]);
  for (const x of PY) pts.push([x, 150, 212]);
  pts.push([GOV.x, GOV.y, 165], [TANK.x, TANK.y, 160]);
  const svg = document.getElementById("plate-svg");
  const stage = K.live.stage({ svg, W, H, az: -24, el: 30, points: pts, center: [490, 165, 60], pad: 18, build });
  let cam = stage.base, S, slot;
  let flowPaths = [], wires = [], flux = [];

  /* A cable or conductor with a sag, as depth-sortable spans, each carrying an energy-flow line. */
  function catenary(a, b, sag, n = 10) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - sag * 4 * t * (1 - t)]);
    }
    return out;
  }
  function conductorUnits(points, cls, key, r = 1.6) {
    const us = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      us.push({ at: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], draw() {
        S(rod(cam, a, b, r, { seg: 10, sideCls: cls, cap: false, hatch: false }));
        const id = "fp" + flowPaths.length;
        flowPaths.push({ id, key });
        wires.push({ a: cam.p(a), b: cam.p(b), key });
        S(`<path id="${id}" class="flow energy" d="${path([cam.p(a), cam.p(b)], false)}"/>`);
      } });
    }
    return us;
  }
  const facing = () => Math.atan2(cam.view[1], cam.view[0]) / (Math.PI / 180);

  /* ---------- the scene, for any camera ---------- */
  function build(c, api) {
    cam = c; S = api.S; slot = api.slot; flowPaths = []; wires = []; flux = [];

    // Plinth
    for (const [x, y] of [[10, 10], [PL.x1 - 10, 10], [10, PL.y1 - 10], [PL.x1 - 10, PL.y1 - 10]]) S(drum(cam, x, y, -40, 8, 8, { cls: "foot" }));
    S(box(cam, -6, -6, -32, PL.x1 + 12, PL.y1 + 12, 8, { hatch: 2.6 }));
    S(box(cam, 0, 0, -24, PL.x1, PL.y1, 24, { hatch: 2.2, groove: 7, cls: "floor" }));
    for (const [x, y] of [[16, 16], [PL.x1 - 16, 16], [16, PL.y1 - 16], [PL.x1 - 16, PL.y1 - 16]]) S(screw(cam, x, y, 0, 3));
    if (cam.view[1] > 0) S(box(cam, 370, PL.y1, -19, 240, 1.4, 15, { cls: "brass" }));
    S(faceText(cam, [490, PL.y1 + 1.5, -9.4], X, [0, 0, -1], "FOLIO · PLATE III · A POWER GRID IN MINIATURE", 5.2));
    S(faceText(cam, [490, PL.y1 + 1.5, -15.4], X, [0, 0, -1], "ONE GENERATOR · TWO TRANSFORMERS · ONE LINE · ONE TOWN · 50 Hz", 3.3, { cls: "engr lo" }));
    if (cam.view[1] < 0) S(box(cam, 370, -1.4, -19, 240, 1.4, 15, { cls: "brass" }));
    S(faceText(cam, [490, -1.5, -9.4], [-1, 0, 0], [0, 0, -1], "FOLIO · PLATE III · THE GRID SEEN FROM BEHIND", 5.2));

    const U = [];
    // The water tank and penstock
    U.push({ at: [TANK.x, TANK.y, 60], draw() {
      S(drum(cam, TANK.x, TANK.y, 0, TANK.r + 5, TANK.z, { cls: "base" }));
      S(rod(cam, [TANK.x, TANK.y, TANK.z], [TANK.x, TANK.y, TANK.z + TANK.h], TANK.r, { sideCls: "glass-back", capCls: "glass-back", hatch: false }));
      S(rod(cam, [TANK.x, TANK.y, TANK.z], [TANK.x, TANK.y, TANK.z + TANK.h * 0.82], TANK.r - 0.8, { cls: "waterg", sideCls: "water", capCls: "water-top" }));
      S(rod(cam, [TANK.x, TANK.y, TANK.z], [TANK.x, TANK.y, TANK.z + TANK.h], TANK.r, { sideCls: "glass-front", capCls: "glass-rim", hatch: false }));
      S(drum(cam, TANK.x, TANK.y, TANK.z + TANK.h, TANK.r + 2, 3, { cls: "capd" }));
    } });
    U.push({ at: [70, 104, 22], draw() {
      const route = [[TANK.x, TANK.y + TANK.r - 2, 20], [TANK.x, 104, 20], [WHEEL.c[0], 104, 20], [WHEEL.c[0], 104, 36], [WHEEL.c[0], 112, 36]];
      for (let i = 0; i < route.length - 1; i++) S(rod(cam, route[i], route[i + 1], 4.5, { seg: 16, sideCls: "t-cyl" }));
      for (const p of route.slice(1, -1)) S(ball(cam, p, 5.2));
      S(rod(cam, [WHEEL.c[0], 112, 36], [WHEEL.c[0], 120, 36], 3, { seg: 14, cls: "nozzle" }));
      slot("jet");
    } });
    // The wheel
    U.push({ at: [WHEEL.c[0], WHEEL.c[1], WHEEL.c[2]], draw() {
      S(box(cam, WHEEL.c[0] - 14, 124, 0, 28, 52, 8, { groove: 2.5 }));
      for (const y of [128, 172]) S(box(cam, WHEEL.c[0] - 3, y - 3, 8, 6, 6, 70, { hatch: 2 }));
      slot("wheel");
    } });
    // Shaft pieces and bearing pedestals
    const shaftSeg = (x0, x1) => ({ at: [(x0 + x1) / 2, SH.y, SH.z], draw() { S(rod(cam, [x0, SH.y, SH.z], [x1, SH.y, SH.z], SH.r, { seg: 18 })); } });
    U.push(shaftSeg(SH.x0, 132), shaftSeg(148, GEN.x0 - 4), shaftSeg(GEN.x1 + 2, 284), shaftSeg(298, SH.x1));
    for (const px of [120, 310]) U.push({ at: [px, SH.y, 40], draw() {
      S(box(cam, px - 8, SH.y - 12, 0, 16, 24, SH.z - 10, { hatch: 2.2 }));
      S(rod(cam, [px - 6, SH.y, SH.z], [px + 6, SH.y, SH.z], 9, { seg: 24 }));
    } });
    // The flyball governor on its gearbox
    U.push({ at: [GOV.x, GOV.y, 100], draw() {
      S(box(cam, GOV.x - 8, GOV.y - 8, SH.z - 10, 16, 16, 20, { groove: 2 }));
      slot("governor");
    } });
    // The generator: stator cage, coils, rotor slot
    U.push({ at: [GEN.x, SH.y, SH.z], draw() {
      S(box(cam, GEN.x0 - 4, 114, 0, GEN.x1 - GEN.x0 + 8, 72, 30, { hatch: 2.4, groove: 3 }));
      for (const y of [120, 180]) S(box(cam, GEN.x - 40, y - 4, 30, 80, 8, 14, { cls: "base" }));
      const c = [GEN.x, SH.y, SH.z];
      const rings = [180, 202, 225, 248, 270];
      const bars = [45, 135, 225, 315].map((a) => (a * Math.PI) / 180);
      const coils = [80, 100, 260, 280].map((a) => (a * Math.PI) / 180);
      const depthOf = (t, r) => cam.depth(orbitPt(c, X, r, t));
      const cd = cam.depth(c);
      let back = "", front = "";
      for (const x of rings) {
        back += `<path class="ring" d="${ringArc(cam, [x, SH.y, SH.z], X, GEN.r, false)}"/>`;
        front += `<path class="ring" d="${ringArc(cam, [x, SH.y, SH.z], X, GEN.r, true)}"/>`;
      }
      const piece = (t, r, rad, cls) => rod(cam, orbitPt([GEN.x0, SH.y, SH.z], X, r, t), orbitPt([GEN.x1, SH.y, SH.z], X, r, t), rad, { seg: 10, sideCls: cls, cap: true, capCls: cls });
      for (const t of coils) (depthOf(t, 33) < cd ? (back += piece(t, 33, 3, "copper")) : (front += piece(t, 33, 3, "copper")));
      for (const t of bars) (depthOf(t, GEN.r) < cd ? (back += piece(t, GEN.r, 2, "t-cyl")) : (front += piece(t, GEN.r, 2, "t-cyl")));
      S(`<g class="stator">${back}</g>`);
      slot("rotor");
      S(`<g class="stator">${front}</g>`);
    } });
    // Slip rings, brushes and the generator's three cables up to the step-up transformer
    U.push({ at: [291, SH.y, SH.z], draw() {
      for (const x of [286, 293]) S(rod(cam, [x - 2.5, SH.y, SH.z], [x + 2.5, SH.y, SH.z], 9, { seg: 22, sideCls: "copper", capCls: "copper" }));
      S(box(cam, 283, SH.y - 6, SH.z + 9, 14, 12, 10, { cls: "housing" }));
    } });
    BUSH.forEach((yb, i) => {
      const yc = 144 + i * 6;
      const route = [[290, yc, SH.z + 19], [290, yc, 132], [T1.xl, yc, 132], [T1.xl, 150 + (yc - 150) * 0.4, 100]];
      U.push(...conductorUnits(route, "cable", "gen", 1.5));
    });
    // Step-up transformer
    function transformer(x0, xl, xr, flip, name) {
      U.push({ at: [(xl + xr) / 2, 150, 60], draw() {
        S(box(cam, x0, 108, 0, 132, 84, 10, { groove: 3, hatch: 2.4 }));
        const limb = (x) => S(box(cam, x - 8, 142, 10, 16, 16, 110, { cls: "core" }));
        const far = api.leftIsFar;
        const yokeB = () => S(box(cam, xl - 8, 142, 10, xr - xl + 16, 16, 16, { cls: "core" }));
        const yokeT = () => S(box(cam, xl - 8, 142, 104, xr - xl + 16, 16, 16, { cls: "core" }));
        yokeB();
        const coil = (x, r, bands, cls) => {
          S(rod(cam, [x, 150, 30], [x, 150, 98], r, { sideCls: cls, capCls: cls + "-top" }));
          let d = "";
          const fc = facing();
          for (let k = 1; k < bands; k++) d += arcPath(cam, x, 150, 30 + (68 * k) / bands, r + 0.2, fc - 80, fc + 80, 16);
          S(`<path class="ln turns" d="${d}"/>`);
        };
        const lv = () => { limb(xl); coil(xl, flip ? 19 : 16, flip ? 22 : 7, "copper"); };
        const hv = () => { limb(xr); coil(xr, flip ? 16 : 19, flip ? 7 : 22, "copper"); };
        far ? (lv(), hv()) : (hv(), lv());
        yokeT();
        // flux path: a dashed loop round the core window, whose dashes swing with the alternating flux
        const loop = [[xl, 150, 18], [xr, 150, 18], [xr, 150, 112], [xl, 150, 112]];
        const id = "fx" + flux.length; flux.push(id);
        S(`<path id="${id}" class="flux" d="${path(loop.map((p) => cam.p(p[0], api.backIsFar ? 158.5 : 141.5, p[2])))}"/>`);
        S(faceText(cam, [(xl + xr) / 2, 192.2, 4], X, [0, 0, -1], name, 3.6, { cls: "engr lo" }));
      } });
    }
    transformer(T1.x0, T1.xl, T1.xr, false, "STEP-UP · 11 kV TO LINE");
    transformer(T2.x0, T2.xl, T2.xr, true, "STEP-DOWN · LINE TO 11 kV");
    // Bushings: insulator stacks the conductors leave from
    const bushing = (x, y, n, topZ) => ({ at: [x, y, topZ / 2], draw() {
      S(rod(cam, [x, y, 10], [x, y, 16], 2.4, { seg: 12 }));
      for (let k = 0; k < n; k++) S(drum(cam, x, y, 16 + k * 6, 6, 3.2, { cls: "insul" }));
      S(rod(cam, [x, y, 16], [x, y, topZ], 1.8, { seg: 10 }));
      S(ball(cam, [x, y, topZ], 2.4));
    } });
    BUSH.forEach((y) => { U.push(bushing(T1.xb, y, 6, 54)); U.push(bushing(T2.xb, y, 6, 54)); });
    [135, 150, 165].forEach((y) => U.push(bushing(T2.xo, y, 3, 36)));
    // Pylons
    for (const px of PY) {
      U.push({ at: [px, 150, 100], draw() {
        const leg = (sx, sy) => [[px + sx * 22, 150 + sy * 22, 0], [px + sx * 6, 150 + sy * 6, 200]];
        const legs = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => leg(a, b));
        const order = legs.map((l, i) => i).sort((a, b) => cam.depth(...legs[a][0]) - cam.depth(...legs[b][0]));
        for (const i of order) S(drum(cam, legs[i][0][0], legs[i][0][1], -0.5, 4, 3, { cls: "base" }));
        // bracing: an X on every face, every 40 units of height
        let d = "";
        const at = (l, z) => { const t = z / 200; return [l[0][0] + (l[1][0] - l[0][0]) * t, l[0][1] + (l[1][1] - l[0][1]) * t, z]; };
        for (let i = 0; i < 4; i++) {
          const A = legs[i], B = legs[(i + 1) % 4];
          for (let z = 0; z < 200; z += 40) {
            d += line(cam, at(A, z), at(B, z + 40)) + line(cam, at(B, z), at(A, z + 40)) + line(cam, at(A, z + 40), at(B, z + 40));
          }
        }
        S(`<path class="ln lattice" d="${d}"/>`);
        for (const i of order) S(rod(cam, legs[i][0], legs[i][1], 1.8, { seg: 10 }));
        S(box(cam, px - 4, 108, 196, 8, 84, 6, { hatch: 2 }));
        S(prism(cam, [[px - 6, 144, 200], [px + 6, 144, 200], [px, 144, 214]], [0, 12, 0]));
        for (const y of PHASE) {
          for (let k = 0; k < 4; k++) S(drum(cam, px, y, ARMZ + 2 + k * 4.5, 3.6, 2.4, { cls: "insul" }));
        }
      } });
    }
    // The line: three conductors, bushing to pylon to pylon to bushing
    PHASE.forEach((yp, i) => {
      const yb = BUSH[i];
      const a = [T1.xb, yb, 54], p1 = [PY[0], yp, ARMZ], p2 = [PY[1], yp, ARMZ], b = [T2.xb, yb, 54];
      U.push(...conductorUnits(catenary(a, p1, 6, 4), "conductor", "line"));
      U.push(...conductorUnits(catenary(p1, p2, 26, 10), "conductor", "line"));
      U.push(...conductorUnits(catenary(p2, b, 6, 4), "conductor", "line"));
    });
    // The town: a bus bar, three houses and a works
    U.push({ at: [TOWN.bus, 160, 30], draw() {
      for (const y of [56, 268]) S(rod(cam, [TOWN.bus, y, 0], [TOWN.bus, y, 48], 2.2, { seg: 12 }));
      S(rod(cam, [TOWN.bus, 56, 48], [TOWN.bus, 268, 48], 2, { seg: 12, sideCls: "copper", capCls: "copper" }));
    } });
    [135, 150, 165].forEach((y) => U.push(...conductorUnits([[T2.xo, y, 36], [TOWN.bus, y, 48]], "cable", "town", 1.2)));
    const house = (y0, h, i) => ({ at: [942, y0 + 14, h / 2], draw() {
      const x0 = 925, w = 34, d = 28;
      S(box(cam, x0, y0, 0, w, d, h, { cls: "house" }));
      S(prism(cam, [[x0, y0, h], [x0, y0 + d, h], [x0, y0 + d / 2, h + 14]], [w, 0, 0], { cls: "roof" }));
      slot("win" + i);
    } });
    TOWN.houses.forEach((hh, i) => {
      U.push(house(hh.y, hh.h, i));
      U.push(...conductorUnits([[TOWN.bus, hh.y + 14, 46], [925, hh.y + 14, hh.h - 2]], "cable", "town", 0.9));
    });
    U.push({ at: [945, 258, 22], draw() {
      const x0 = 918, y0 = 232, w = 50, d = 52, h = 30;
      S(box(cam, x0, y0, 0, w, d, h, { cls: "house" }));
      for (let k = 0; k < 3; k++) S(prism(cam, [[x0 + k * (w / 3), y0, h], [x0 + (k + 1) * (w / 3), y0, h], [x0 + (k + 1) * (w / 3), y0, h + 10]], [0, d, 0], { cls: "roof" }));
      S(rod(cam, [x0 + 8, y0 + 10, h], [x0 + 8, y0 + 10, h + 36], 4, { seg: 16 }));
      slot("win3");
    } });
    U.push(...conductorUnits([[TOWN.bus, 258, 46], [918, 258, 28]], "cable", "town", 0.9));
    // Gauges and controls along the front
    for (const g of GAUGES) U.push({ at: [g.x, FRONT, 6], draw() {
      S(box(cam, g.x - g.r - 8, FRONT - g.r - 6, 0, 2 * g.r + 16, 2 * g.r + 14, 5, { groove: 2 }));
      S(drum(cam, g.x, FRONT, 5, g.r + 2.5, 3));
      S(drum(cam, g.x, FRONT, 8, g.r, 3, { capCls: "t-face" }));
      const z = 11, ang = (v) => 180 + ((v - g.min) / (g.max - g.min)) * 180;
      const mj = [], mn = [];
      for (let k = 0; k <= 16; k++) (k % 4 === 0 ? mj : mn).push(180 + (k / 16) * 180);
      S(`<path class="ln lo" d="${radialTicks(cam, g.x, FRONT, z, g.r * 0.8, g.r * 0.92, mn)}"/><path class="ln mid" d="${radialTicks(cam, g.x, FRONT, z, g.r * 0.7, g.r * 0.92, mj)}${arcPath(cam, g.x, FRONT, z, g.r * 0.92, 180, 360, 24)}"/>`);
      if (g.id === "gF") S(`<path class="ln zero" d="${arcPath(cam, g.x, FRONT, z, g.r * 0.86, ang(48), ang(G.P0.ufls), 8)}"/><path class="ln mid" d="${radialTicks(cam, g.x, FRONT, z, g.r * 0.55, g.r * 0.95, [ang(50)])}"/>`);
      S(faceText(cam, [g.x, FRONT + g.r + 8.2, 2], X, [0, 0, -1], g.label, 3.2, { cls: "engr lo" }));
      slot(g.id);
    } });
    U.push({ at: [CTRL.demand, FRONT, 6], draw() {
      S(box(cam, CTRL.demand - 24, FRONT - 22, 0, 48, 44, 3, { groove: 2.5 }));
      const tk = [];
      for (let k = 0; k <= 14; k++) tk.push(160 + (k / 14) * 220);
      S(`<path class="ln lo" d="${radialTicks(cam, CTRL.demand, FRONT, 3, 15, 17.5, tk)}"/>`);
      S(faceText(cam, [CTRL.demand, FRONT + 22.2, 1.5], X, [0, 0, -1], "TOWN DEMAND", 3.2, { cls: "engr lo" }));
      slot("kD");
    } });
    U.push({ at: [CTRL.volt, FRONT, 6], draw() {
      S(box(cam, CTRL.volt - 26, FRONT - 22, 0, 52, 44, 3, { groove: 2.5 }));
      G.TX_KV.forEach((kv, i) => {
        const t = (VANG[i] * Math.PI) / 180;
        S(faceText(cam, [CTRL.volt + 19 * Math.cos(t), FRONT + 19 * Math.sin(t) + 1.2, 3], X, Y, String(kv), 3.2));
      });
      S(`<path class="ln mid" d="${radialTicks(cam, CTRL.volt, FRONT, 3, 11.5, 14, VANG)}"/>`);
      S(faceText(cam, [CTRL.volt, FRONT + 22.2, 1.5], X, [0, 0, -1], "LINE kV", 3.2, { cls: "engr lo" }));
      slot("kV");
    } });
    U.push({ at: [CTRL.brk, FRONT, 8], draw() {
      S(box(cam, CTRL.brk - 20, FRONT - 16, 0, 40, 32, 3, { groove: 2.5 }));
      S(box(cam, CTRL.brk - 7, FRONT - 7, 3, 14, 14, 8, { cls: "housing" }));
      S(faceText(cam, [CTRL.brk, FRONT + 16.2, 1.5], X, [0, 0, -1], "BREAKER", 3.2, { cls: "engr lo" }));
      slot("brk");
    } });

    api.units(U);
    slot("pins");
  }
  const VANG = [200, 235, 270, 305, 340];

  /* ---------- live drawing ---------- */
  function wheel(r) {
    const c = WHEEL.c, cd = cam.depth(c);
    const buckets = [];
    for (let k = 0; k < WHEEL.n; k++) {
      const t = r.rot + (k * 2 * Math.PI) / WHEEL.n;
      const p = orbitPt(c, X, WHEEL.R + 3, t);
      buckets.push({ p, d: cam.depth(p) });
    }
    const bk = (b) => box(cam, b.p[0] - 7, b.p[1] - 3.5, b.p[2] - 3.5, 14, 7, 7, { cls: "bucket" });
    let o = "";
    for (const b of buckets) if (b.d < cd) o += bk(b);
    o += rod(cam, [c[0] - WHEEL.half, c[1], c[2]], [c[0] + WHEEL.half, c[1], c[2]], WHEEL.R, { seg: 40 });
    // spokes on the face turned to us
    const face = cam.view[0] > 0 ? c[0] + WHEEL.half : c[0] - WHEEL.half;
    let d = "";
    for (let k = 0; k < 6; k++) {
      const t = r.rot + (k * Math.PI) / 3;
      d += line(cam, orbitPt([face, c[1], c[2]], X, 6, t), orbitPt([face, c[1], c[2]], X, WHEEL.R - 4, t));
    }
    o += `<path class="ln spoke" d="${d}"/>` + `<path class="ln lo" d="${path(Array.from({ length: 41 }, (_, i) => cam.p(orbitPt([face, c[1], c[2]], X, WHEEL.R - 4, (i / 40) * 2 * Math.PI))))}"/>`;
    o += rod(cam, [face, c[1], c[2]], [face + (cam.view[0] > 0 ? 3 : -3), c[1], c[2]], 6, { seg: 16 });
    for (const b of buckets) if (b.d >= cd) o += bk(b);
    return o;
  }
  function governor(r) {
    const g = Math.max(0, Math.min(1, (r.f - 48.6) / 3.2));
    const phi = ((26 + 38 * g) * Math.PI) / 180, top = [GOV.x, GOV.y, GOV.z1];
    const zc = GOV.z1 - GOV.L * Math.cos(phi) * 1.2;
    const parts = [];
    for (let k = 0; k < 2; k++) {
      const psi = r.rot * 1.6 + k * Math.PI;
      const dir = [Math.sin(phi) * Math.cos(psi), Math.sin(phi) * Math.sin(psi), -Math.cos(phi)];
      const bp = [top[0] + dir[0] * GOV.L, top[1] + dir[1] * GOV.L, top[2] + dir[2] * GOV.L];
      const mid = [top[0] + dir[0] * GOV.L * 0.55, top[1] + dir[1] * GOV.L * 0.55, top[2] + dir[2] * GOV.L * 0.55];
      parts.push({ d: cam.depth(bp), s: rod(cam, top, bp, 1.2, { seg: 8 }) + rod(cam, mid, [GOV.x, GOV.y, zc], 0.9, { seg: 8 }) + ball(cam, bp, 6, { cls: "flyball" }) });
    }
    const cd = cam.depth(GOV.x, GOV.y, zc);
    let o = "";
    for (const p of parts) if (p.d < cd) o += p.s;
    o += rod(cam, [GOV.x, GOV.y, GOV.z0], [GOV.x, GOV.y, GOV.z1 + 2], 1.8, { seg: 10 });
    o += drum(cam, GOV.x, GOV.y, zc - 2, 4.5, 4, { cls: "collar" });
    o += ball(cam, [GOV.x, GOV.y, GOV.z1 + 3], 3);
    for (const p of parts) if (p.d >= cd) o += p.s;
    return o;
  }
  function rotor(r) {
    const c = [GEN.x, SH.y, SH.z], cd = cam.depth(c);
    const poles = [0, Math.PI].map((dt, k) => {
      const t = r.rot + dt;
      const a = orbitPt([GEN.x0 + 4, SH.y, SH.z], X, GEN.rr - 2, t), b = orbitPt([GEN.x1 - 4, SH.y, SH.z], X, GEN.rr - 2, t);
      return { d: cam.depth(orbitPt(c, X, GEN.rr, t)), s: rod(cam, a, b, 6.5, { seg: 12, sideCls: k ? "pole-s" : "pole-n", capCls: k ? "pole-s" : "pole-n", hatch: false }) };
    });
    // field lines: loops leaving the north pole, crossing the gap and returning to the south pole
    let fl = "";
    for (const x of [GEN.x - 30, GEN.x, GEN.x + 30]) {
      for (const sgn of [1, -1]) {
        const p = [];
        for (let i = 0; i <= 16; i++) {
          const u = i / 16, t = r.rot + sgn * u * Math.PI, rad = GEN.rr + 4 + 10 * Math.sin(u * Math.PI);
          p.push(cam.p(orbitPt([x, SH.y, SH.z], X, rad, t)));
        }
        fl += path(p, false);
      }
    }
    let o = "";
    for (const p of poles) if (p.d < cd) o += p.s;
    o += rod(cam, [GEN.x0 - 2, SH.y, SH.z], [GEN.x1 + 2, SH.y, SH.z], GEN.rr, { seg: 36, cls: "rotorbody" });
    for (const p of poles) if (p.d >= cd) o += p.s;
    o += `<path class="field" d="${fl}"/>`;
    return o;
  }
  function needle(g, r) {
    const v = Math.max(g.min, Math.min(g.max, g.val(r)));
    const t = ((180 + ((v - g.min) / (g.max - g.min)) * 180) * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t), z = 11.2, R = g.r * 0.88;
    const tip = [g.x + R * c, FRONT + R * s, z], tail = [g.x - 3 * c, FRONT - 3 * s, z], w1 = [g.x - 1.1 * s, FRONT + 1.1 * c, z], w2 = [g.x + 1.1 * s, FRONT - 1.1 * c, z];
    const hub = cam.p(g.x, FRONT, z);
    return `<path class="needle" d="${path([tail, w1, tip, w2].map((p) => cam.p(p)))}"/><circle class="hub" cx="${f(hub[0])}" cy="${f(hub[1])}" r="${f(1.4 * cam.k)}"/>`;
  }
  function knob(x, ang, r = 10) {
    const t = (ang * Math.PI) / 180;
    return drum(cam, x, FRONT, 3, r, 11, { knurl: 14, density: 1.2 }) + drum(cam, x, FRONT, 14, r - 3.5, 1.6) +
      `<path class="ln hi" d="${line(cam, [x + 1.5 * Math.cos(t), FRONT + 1.5 * Math.sin(t), 15.7], [x + (r - 0.8) * Math.cos(t), FRONT + (r - 0.8) * Math.sin(t), 14.1])}"/>`;
  }
  function windows(i, r) {
    const lit = r.closed ? Math.max(0, Math.min(1, (r.Vtown - 0.55) / 0.4)) * Math.min(1, r.load / Math.max(1, r.want || r.load || 1) + 0.15) : 0;
    const flick = r.closed && r.Vtown < 0.9 ? 0.75 + 0.25 * Math.sin(performance.now() / 70 + i) : 1;
    const op = (0.12 + 0.88 * lit * flick).toFixed(2);
    const fac = i === 3;
    const x0 = fac ? 918 : 925, w = fac ? 50 : 34, d = fac ? 52 : 28, y0 = fac ? 232 : TOWN.houses[i].y, h = fac ? 30 : TOWN.houses[i].h;
    let o = "";
    const quad = (pts) => `<path class="win" style="opacity:${op}" d="${path(pts.map((p) => cam.p(p)))}"/>`;
    const n = fac ? 4 : 2;
    for (const yFace of [y0 + d + 0.3, y0 - 0.3]) {
      const ny = yFace > y0 ? 1 : -1;
      if (cam.view[1] * ny <= 0.03) continue;
      for (let k = 0; k < n; k++) {
        const wx = x0 + ((k + 0.5) * w) / n - 3;
        o += quad([[wx, yFace, h * 0.35], [wx + 6, yFace, h * 0.35], [wx + 6, yFace, h * 0.35 + 7], [wx, yFace, h * 0.35 + 7]]);
      }
    }
    for (const xFace of [x0 + w + 0.3, x0 - 0.3]) {
      const nx = xFace > x0 ? 1 : -1;
      if (cam.view[0] * nx <= 0.03) continue;
      const wy = y0 + d / 2 - 3;
      o += quad([[xFace, wy, h * 0.35], [xFace, wy + 6, h * 0.35], [xFace, wy + 6, h * 0.35 + 7], [xFace, wy, h * 0.35 + 7]]);
    }
    return o;
  }
  const PINS = [
    [1, [WHEEL.c[0] - 14, 150, WHEEL.c[2] + WHEEL.R + 10]], [2, [GOV.x + 12, GOV.y, GOV.z1 + 8]], [3, [GEN.x, SH.y - 4, SH.z + GEN.r + 10]],
    [4, [GEN.x0 + 6, SH.y + GEN.r, SH.z - 18]], [5, [T1.xr + 10, 150, 128]], [6, [620, 150, ARMZ - 8]],
    [7, [PY[0] + 12, 108, 205]], [8, [T2.xl - 12, 150, 128]], [9, [942, 100, 50]],
    [10, [GAUGES[0].x - 24, FRONT, 10]], [11, [GAUGES[3].x - 22, FRONT, 10]], [12, [CTRL.brk + 22, FRONT, 10]],
  ];
  const draw = {
    wheel, governor, rotor,
    jet: (r) => {
      const a = cam.p(WHEEL.c[0], 120, 36), b = cam.p(WHEEL.c[0], 146, 36);
      return `<path class="jet" style="stroke-dashoffset:${f(-r.rot * 30)};opacity:${f(0.35 + 0.65 * r.governor)}" d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}"/>`;
    },
    kD: (r) => knob(CTRL.demand, 160 + ((r.demand - 10) / 130) * 220),
    kV: (r) => knob(CTRL.volt, VANG[G.TX_KV.indexOf(r.kv)], 9),
    brk: (r) => {
      const a = ((r.closed ? -1 : 1) * 34 * Math.PI) / 180, base = [CTRL.brk, FRONT, 11], tip = [CTRL.brk + Math.sin(a) * 15, FRONT, 11 + Math.cos(a) * 15];
      return rod(cam, base, tip, 1.6, { seg: 12 }) + ball(cam, tip, 3.4, { cls: r.closed ? "" : "tripped" });
    },
    pins: () => PINS.map(([n, p]) => pin(cam, p, n)).join(""),
  };
  for (const g of GAUGES) draw[g.id] = (r) => needle(g, r);
  for (let i = 0; i < 4; i++) draw["win" + i] = (r) => windows(i, r);

  /* ---------- mount ---------- */
  let slots = {}, flowEls = [], fluxEls = [];
  function mount(az, el) {
    cam = stage.mount(az, el); slots = stage.slots;
    flowEls = flowPaths.map((fp) => ({ ...fp, el: document.getElementById(fp.id) }));
    fluxEls = flux.map((id) => document.getElementById(id));
    if (slots.pins) slots.pins.innerHTML = draw.pins();
  }
  mount(-24, 30);

  const r0 = (v) => Math.round(v);
  /* ---------- simulation ---------- */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const ui = { playing: true };
  let sim = G.make({ demand: 60, kv: 220 });
  for (let i = 0; i < 300; i++) G.step(sim, 0.02);
  let cur = G.read(sim), energy = { gen: 0, line: 0, town: 0 };
  const hist = []; let histT = 0;
  const listeners = [];
  let visible = true, last = 0, lastEmit = 0;
  // Parts that change only when a control moves are redrawn only then.
  const memo = {};
  const keyOf = {
    kD: (r) => r0(r.demand), kV: (r) => r.kv, brk: (r) => r.closed,
    win0: (r) => [r.closed, (r.Vtown * 40) | 0, (r.load * 2) | 0, r.Vtown < 0.9 ? (performance.now() / 90) | 0 : 0].join(),
  };
  keyOf.win1 = keyOf.win2 = keyOf.win3 = keyOf.win0;
  function paint(force) {
    for (const k in draw) {
      if (k === "pins" || !slots[k]) continue;
      if (keyOf[k]) { const kk = keyOf[k](cur); if (!force && memo[k] === kk) continue; memo[k] = kk; }
      slots[k].innerHTML = draw[k](cur);
    }
  }
  function marks() {
    // energy flows from the station to the town at a speed set by the power carried
    for (const fl of flowEls) if (fl.el) fl.el.style.strokeDashoffset = (-energy[fl.key]).toFixed(1);
    for (const el of fluxEls) if (el) el.style.strokeDashoffset = (Math.sin(cur.ac) * 9).toFixed(2);
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (ui.playing && !document.hidden) {
      let n = Math.max(1, Math.round(dt / 0.01));
      for (let i = 0; i < n; i++) G.step(sim, dt / n);
      cur = G.read(sim);
      const v = (p) => Math.max(0, p) * dt * 0.35;
      energy.gen += v(cur.Pe); energy.line += v(cur.Pe - cur.loss * 0.5); energy.town += v(cur.load);
      histT += dt;
      if (histT > 0.25) { histT = 0; hist.push({ t: sim.t, f: cur.f, Pe: cur.Pe, load: cur.load, Pm: cur.Pm, loss: cur.loss }); if (hist.length > 240) hist.shift(); }
    }
    if (visible && ui.playing) { paint(); marks(); }
    if (now - lastEmit > 120) { lastEmit = now; listeners.forEach((fn) => fn(sim, cur, hist)); }
    requestAnimationFrame(frame);
  }
  function update(patch) {
    if ("demand" in patch) sim.demand = patch.demand;
    if ("kv" in patch) sim.kv = patch.kv;
    if ("closed" in patch) { sim.closed = patch.closed; if (patch.closed) sim.tripped = false; }
    if ("playing" in patch) ui.playing = patch.playing;
    cur = G.read(sim);
    paint(true); marks(); listeners.forEach((fn) => fn(sim, cur, hist));
  }
  window.Plate = { sim: () => sim, ui, update, on: (fn) => { listeners.push(fn); fn(sim, cur, hist); } };

  /* ---------- input ---------- */
  const fig = document.getElementById("plate");
  fig.addEventListener("keydown", (e) => {
    const k = e.key;
    if (e.shiftKey) return;
    if (k === "ArrowUp") update({ demand: Math.min(140, sim.demand + 10) });
    else if (k === "ArrowDown") update({ demand: Math.max(10, sim.demand - 10) });
    else if (k === "ArrowRight" || k === "]") { const i = G.TX_KV.indexOf(sim.kv); update({ kv: G.TX_KV[Math.min(G.TX_KV.length - 1, i + 1)] }); }
    else if (k === "ArrowLeft" || k === "[") { const i = G.TX_KV.indexOf(sim.kv); update({ kv: G.TX_KV[Math.max(0, i - 1)] }); }
    else if (k === "b" || k === "B") update({ closed: !sim.closed });
    else if (k === " ") update({ playing: !ui.playing });
    else return;
    e.preventDefault();
  });
  new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(fig);

  /* ---------- three views: SVG, WebGL, 3D ---------- */
  const NW = 40;
  const LIGHT_FRAG = `
uniform vec4 uW[${NW}]; uniform float uWk[${NW}]; uniform float uNW;
uniform float uAC; uniform float uLoad; uniform float uLoss; uniform float uLit; uniform vec4 uTown; uniform vec4 uRotor; uniform float uRot;
void main() {
  vec2 vb = vbOf(); vec4 m = maskAt();
  vec4 acc = vec4(0.0);
  bool dk = uDark > 0.5;
  vec3 cur = dk ? vec3(0.55, 0.85, 1.0) : vec3(0.15, 0.45, 0.85);
  vec3 heat = dk ? vec3(1.0, 0.45, 0.2) : vec3(0.88, 0.32, 0.12);
  vec3 lamp = dk ? vec3(1.0, 0.82, 0.5) : vec3(0.98, 0.72, 0.3);
  // Current: a glow that runs along each conductor and swings back and forth with the alternation.
  if (m.g > 0.5) {
    float best = 0.0; float hot = 0.0;
    for (int i = 0; i < ${NW}; i++) {
      if (float(i) >= uNW) break;
      vec4 s = uW[i]; float t; float d = segDist(vb, s.xy, s.zw, t);
      if (d < 4.0) {
        float along = t * length(s.zw - s.xy);
        float wave = 0.5 + 0.5 * cos(along * 0.12 - uAC * 1.0);
        best = max(best, wave * (1.0 - d / 4.0) * clamp(uLoad / 90.0, 0.15, 1.0));
        if (uWk[i] > 0.5) hot = max(hot, 1.0 - d / 4.0);
      }
    }
    addLight(acc, cur, best * 0.8);
    addLight(acc, heat, hot * clamp(uLoss / 12.0, 0.0, 1.0) * 0.9);
  }
  // Magnetism: the iron cores and the rotor glow with the alternating flux.
  if (m.b > 0.5) {
    float flux = abs(sin(uAC));
    addLight(acc, cur, (0.2 + 0.6 * flux) * clamp(uLoad / 60.0, 0.2, 1.0) * 0.7);
  }
  // The town throws warm light onto the bench; the more power arrives, the brighter.
  if (m.r > 0.5) {
    vec2 p = onPlane(vb, 0.0);
    vec2 d = (p - uTown.xy) / vec2(70.0, 140.0);
    addLight(acc, lamp, exp(-dot(d, d) * 2.0) * uLit * (dk ? 0.75 : 0.45));
    vec2 q = (p - uRotor.xy) / 70.0;
    addLight(acc, cur, exp(-dot(q, q) * 3.0) * clamp(uLoad / 90.0, 0.1, 1.0) * (0.25 + 0.2 * sin(uRot * 2.0)) * (dk ? 0.9 : 0.4));
  }
  gl_FragColor = acc;
}`;
  const canvas = document.createElement("canvas");
  canvas.className = "light"; canvas.setAttribute("aria-hidden", "true");
  fig.appendChild(canvas);
  let lightLayer = null, mode = "svg", lightRaf = 0;
  const hintEl = document.querySelector(".plate .bl"), hint0 = hintEl ? hintEl.textContent : "";
  const MASK_CSS = `.floor .t-top { fill: #f00 !important; }
    .conductor, .cable, .copper, .copper-top { fill: #0f0 !important; stroke: #0f0 !important; }
    .core .f, .rotorbody .f, .pole-n, .pole-s { fill: #00f !important; stroke: #00f !important; }`;
  function lightFrame(now) {
    lightRaf = 0;
    if (mode !== "webgl" || !lightLayer) return;
    if (!visible) { lightRaf = requestAnimationFrame(lightFrame); return; }
    if (lightLayer.size()) lightLayer.mask();
    const Wv = [], Wk = [];
    const ws = wires.filter((w) => w.key === "line").concat(wires.filter((w) => w.key !== "line")).slice(0, NW);
    for (let i = 0; i < NW; i++) {
      const w = ws[i];
      if (!w) { Wv.push(0, 0, 0, 0); Wk.push(0); continue; }
      Wv.push(w.a[0], w.a[1], w.b[0], w.b[1]); Wk.push(w.key === "line" ? 1 : 0);
    }
    lightLayer.set("uW", Wv); lightLayer.set("uWk", new Float32Array(Wk)); lightLayer.set("uNW", ws.length);
    lightLayer.set("uAC", cur.ac); lightLayer.set("uLoad", cur.load); lightLayer.set("uLoss", cur.loss);
    lightLayer.set("uLit", cur.closed ? Math.max(0, Math.min(1, (cur.Vtown - 0.55) / 0.4)) : 0);
    lightLayer.set("uTown", [945, 170, 0, 0]); lightLayer.set("uRotor", [GEN.x, SH.y + 60, 0, 0]); lightLayer.set("uRot", cur.rot);
    lightLayer.draw(cam, reduce.matches ? 2 : now / 1000, K.live.isDark());
    if (!reduce.matches) lightRaf = requestAnimationFrame(lightFrame);
  }
  function setMode(m) {
    mode = m;
    if (m === "3d") insp.close();
    fig.classList.toggle("mode-webgl", m === "webgl");
    fig.classList.toggle("mode-3d", m === "3d");
    if (m !== "3d" && (stage.az !== -24 || stage.el !== 30)) { mount(-24, 30); paint(true); marks(); }
    if (m === "webgl") {
      try { lightLayer = lightLayer || K.live.light({ canvas, svg, W, H, frag: LIGHT_FRAG, maskCss: MASK_CSS }); } catch (e) { lightLayer = null; console.warn(e); }
      if (lightLayer) { lightLayer.size(); lightLayer.mask().then(() => { if (!lightRaf) lightRaf = requestAnimationFrame(lightFrame); }); }
    }
    if (hintEl) hintEl.textContent = m === "3d" ? "Drag to turn the grid all the way round · double-click to reset · Shift + arrows to turn" : hint0;
    views.set(m);
  }
  const views = K.live.views(document.getElementById("views"), {
    modes: [{ id: "svg", label: "SVG" }, { id: "webgl", label: "WebGL", ok: K.live.webglOK() }, { id: "3d", label: "3D" }],
    current: "svg", onSelect: setMode,
  });
  let turnPending = null;
  const orb = K.live.orbit(fig, {
    az0: -24, el0: 30, wrap: true, azRange: [-180, 180], elRange: [8, 76], enabled: () => mode === "3d",
    onTurn(az, el) {
      if (turnPending) { turnPending = [az, el]; return; }
      turnPending = [az, el];
      requestAnimationFrame(() => { const [a, e] = turnPending; turnPending = null; mount(a, e); paint(true); marks(); });
    },
  });
  fig.addEventListener("keydown", (e) => {
    if (mode !== "3d" || !e.shiftKey) return;
    const d = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (d) { orb.nudge(...d); e.preventDefault(); }
  }, true);
  new ResizeObserver(() => { if (mode === "webgl" && lightLayer && lightLayer.size()) lightLayer.mask(); }).observe(fig);

  /* ---------- looking closer ---------- */
  const PARTS = [
    [1, "Water wheel", "Water falls from the tank through the nozzle onto the buckets. The jet's strength is the turbine's mechanical power.", (r) => `mechanical power <b>${r.Pm.toFixed(1)}</b> MW · valve ${r0(r.governor * 100)} % open`],
    [2, "Flyball governor", "Two weights spun by the shaft. Faster spin throws them out; the linkage then closes the water valve. This is droop control.", (r) => `${r.f.toFixed(3)} Hz · arms at ${r0(26 + 38 * Math.max(0, Math.min(1, (r.f - 48.6) / 3.2)))}°`],
    [3, "Rotor", "An electromagnet with a north and a south pole, turned by the shaft. Its field sweeps through the coils around it, drawn at a hundredth of its real speed.", (r) => `${r0(r.f * 60)} rpm · field turning with the shaft`],
    [4, "Stator coils", "Copper bars fixed around the rotor. The moving field induces a voltage in them: e = N·B·A·ω·sin(ωt).", (r) => `11 kV · ${r0(r.Igen)} A · emf now <b>${(r.emf * 100).toFixed(0)}</b> % of peak`],
    [5, "Step-up transformer", "Few turns on the left, many on the right, sharing one iron core. Voltage rises by the turns ratio and current falls by the same ratio.", (r) => `11 → <b>${r.kv}</b> kV · ratio 1 : ${(r.kv / 11).toFixed(1)}`],
    [6, "Line conductors", "Three aluminium conductors, one per phase. They heat by I²R, so losses fall with the square of the voltage.", (r) => `${r0(r.I)} A · loss <b>${r.loss.toFixed(2)}</b> MW (${(100 * (1 - r.eff)).toFixed(1)} %)`],
    [7, "Pylon and insulators", "A lattice tower holds the conductors high and apart. Strings of glass discs keep the high voltage away from the steel.", (r) => `${r.kv} kV phase to phase`],
    [8, "Step-down transformer", "The same machine reversed: many turns in, few out. It brings the line back down to the town's 11 kV.", (r) => `<b>${r.kv}</b> → 11 kV · town voltage ${(r.Vtown * 100).toFixed(0)} %`],
    [9, "The town", "Three streets of houses and a works. Their lights dim when the voltage sags and go out when the breaker opens.", (r) => r.closed ? `drawing <b>${r.load.toFixed(1)}</b> MW · ${r0(r.home)} V at the socket` : `<b>dark</b> · breaker open`],
    [10, "Frequency meter", "Every generator on a grid spins in step. If demand runs ahead of supply the machine slows, and the frequency falls with it.", (r) => `<b>${r.f.toFixed(3)}</b> Hz · the town is cut off below ${G.P0.ufls} Hz`],
    [11, "Loss meter", "The power the line turns into heat. Change the line voltage and watch this needle.", (r) => `<b>${r.loss.toFixed(2)}</b> MW lost · ${(100 * r.eff).toFixed(1)} % delivered`],
    [12, "Breaker", "Disconnects the town. The generator suddenly has nothing to push against, speeds up, and the governor closes the valve.", (r) => r.closed ? `<b>closed</b>` : `<b>open</b>${r.tripped ? " · tripped by under-frequency" : ""}`],
  ].map(([n, name, text, live]) => ({ n, name, text, live, at: PINS.find((p) => p[0] === n)[1] }));
  const insp = K.live.inspector({ fig, svg, W, H, parts: PARTS, cam: () => cam, live: (n) => PARTS.find((p) => p.n === n).live(cur), zoom: 2.4,
    onChange: (n) => { if (n !== null && lens.on) toggleLens(false); } });
  const lens = K.live.loupe({ fig, svg, W, H, sceneId: stage.sceneId, mag: 2.6, r: 88 });
  const toolsEl = document.getElementById("tools");
  function toggleLens(v) { lens.toggle(v); if (lens.on) insp.close(); toolsEl?.querySelector('[data-t="loupe"]')?.setAttribute("aria-pressed", lens.on); }
  toolsEl?.addEventListener("click", (e) => { if (e.target.closest('[data-t="loupe"]')) toggleLens(); });
  setInterval(() => insp.refresh(), 220);
  document.addEventListener("folio:part", (e) => insp.show(e.detail));
  Object.assign(window.Plate, {
    view: (m) => setMode(m), turn: (az, el) => { setMode("3d"); mount(az, el); paint(true); marks(); }, light: () => lightLayer,
    inspect: (n) => insp.show(n), closeInspect: () => insp.close(), loupe: (v) => toggleLens(v),
  });

  paint(true); marks();
  if (reduce.matches) ui.playing = false;
  requestAnimationFrame(frame);
})();
