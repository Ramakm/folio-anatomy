/* Plate IV: how a hash map resolves collisions, as a sorting office.
   A card file holds the keys still to be filed. Each card is read by the hash press, whose
   windows show the low bits of the hash; a dial folds them to a slot; a carriage on the rail
   takes the card to that bin. If the bin is taken, the card either joins a chain hung in front of
   it (separate chaining) or the carriage tries other bins (open addressing), leaving a red trail.
   When the load passes 0.75 the shutters lift on four more bins and every card is filed again.
   Every part is a unit sorted by depth, so the office can be turned all the way round. */
(function () {
  "use strict";
  const K = window.Folio, HM = window.HashModel;
  const { box, rod, drum, ball, arcPath, radialTicks, line, faceText, pin, screw, path, f } = K;
  const W = 1000, H = 600;
  const KEYS = HM.KEYS;

  // Layout (world units, x along the bench, y toward the viewer, z up)
  const NB = HM.MMAX;                                    // bins on the bench
  const PL = { x1: 720, y1: 288 };
  const BX = (i) => 262 + i * 58;                       // bin centres
  const BIN = { y: 80, y0: 58, y1: 102, hw: 25, h: 22, wall: 2 };
  const CARD = { hw: 19, t: 1.9, h: 46 };
  const NY = (k) => 134 + (k - 1) * 33;                 // chain node k (k ≥ 1) stands here
  const RAIL = { y: 80, z: 134, x0: 36, x1: 702 };
  const HANG = 70;                                      // a card on the carriage hangs with its foot here
  const PRESS = { x: 112, x0: 54, x1: 170, y0: 44, y1: 116, h: 56 };
  const DIAL = { x: 112, y: 146, r: 22 };
  const DRAWER = { x0: 80, x1: 146, y0: 178, y1: 270, h: 26 };
  const DRAW_Y = (j) => 256 - j * 8.6;                    // card j of the file, 0 at the front
  const FR = 250;                                       // the front row of instruments
  const GA = { x: 236, r: 20 }, CNT = { x: 330 }, NM = { x: 430 }, KNOB = { x: 548, r: 20 }, LEV = { x: 648 };
  const MODE_ANG = { chain: 215, linear: 270, quad: 325 };
  const A_MAX = 1.5, aAng = (a) => 180 + Math.max(0, Math.min(1, a / A_MAX)) * 180;
  const dialAng = (s, m) => -90 + (s * 360) / m;

  const pts = [];
  for (const x of [-10, PL.x1 + 10]) for (const y of [-10, PL.y1 + 10]) for (const z of [-36, 0]) pts.push([x, y, z]);
  pts.push([RAIL.x0, RAIL.y, RAIL.z + 14], [RAIL.x1, RAIL.y, RAIL.z + 14]);
  const svg = document.getElementById("plate-svg");
  const stage = K.live.stage({ svg, W, H, az: -24, el: 30, points: pts, center: [370, 160, 50], pad: 16, build });
  let cam = stage.base, S, slot, api;

  /* ---------- a filing card ---------- */
  function card(x, y, z, key, o = {}) {
    const cls = "card" + (o.red ? " clash" : "") + (o.touch ? " touch" : "") + (o.found ? " found" : "") + (o.query ? " query" : "");
    let s = box(cam, x - CARD.hw, y - CARD.t, z, CARD.hw * 2, CARD.t * 2, CARD.h, { cls });
    if (o.red || o.query) s += box(cam, x - CARD.hw, y - CARD.t, z + CARD.h, CARD.hw * 2, CARD.t * 2, 2, { cls: "cardtab" });
    const home = o.home != null ? "h " + o.home : "";
    for (const sgn of [1, -1]) {
      const ax = [sgn, 0, 0], yy = y + sgn * (CARD.t + 0.05);
      s += faceText(cam, [x, yy, z + CARD.h - 10], ax, [0, 0, -1], key, 9.6, { cls: "engr cardkey" });
      if (home) s += faceText(cam, [x, yy, z + 9], ax, [0, 0, -1], home, 5.2, { cls: "engr lo" });
    }
    return o.alpha != null && o.alpha < 1 ? `<g style="opacity:${f(o.alpha)}">${s}</g>` : s;
  }

  /* ---------- static parts ---------- */
  function build(c, a) {
    cam = c; api = a; S = a.S; slot = a.slot;
    const far = (arr) => (api.leftIsFar ? arr : arr.slice().reverse());
    // Plinth, feet, screws, catalogue plate.
    for (const [x, y] of [[10, 10], [PL.x1 - 10, 10], [10, PL.y1 - 10], [PL.x1 - 10, PL.y1 - 10]]) S(drum(cam, x, y, -36, 8, 6, { cls: "foot" }));
    S(box(cam, -6, -6, -32, PL.x1 + 12, PL.y1 + 12, 8, { hatch: 2.6 }));
    S(box(cam, 0, 0, -24, PL.x1, PL.y1, 24, { hatch: 2.2, groove: 7, part: "plinth", cls: "floor" }));
    for (const [x, y] of [[16, 16], [PL.x1 - 16, 16], [16, PL.y1 - 16], [PL.x1 - 16, PL.y1 - 16]]) S(screw(cam, x, y, 0, 3));
    const frontSeen = cam.view[1] > 0;
    if (frontSeen) S(box(cam, 245, PL.y1, -20, 230, 1.4, 15, { cls: "brass" }));
    S(faceText(cam, [360, PL.y1 + 1.5, -10.4], [1, 0, 0], [0, 0, -1], "FOLIO · PLATE IV · HOW A HASH MAP RESOLVES COLLISIONS", 5));
    S(faceText(cam, [360, PL.y1 + 1.5, -16.6], [1, 0, 0], [0, 0, -1], "JAVA String.hashCode · SPREAD h ^ h>>>16 · SLOT = h & (m − 1)", 3.4, { cls: "engr lo" }));
    // Flat bases go down first: the bin rack and the front-row plates.
    S(box(cam, BX(0) - 36, 50, 0, BX(NB - 1) - BX(0) + 72, 60, 3, { groove: 3, cls: "pad" }));
    {
      let d = "";
      for (let i = 0; i < NB; i++) d += line(cam, [BX(i), 110, 3], [BX(i), 115, 0.2]);
      S(`<path class="ln lo" d="${d}"/>`);
    }

    const U = [];
    // The bins: a back wall, two side walls, the card, the front wall with its number, and a lid.
    for (let i = 0; i < NB; i++) {
      const x = BX(i), { y0, y1, hw, h, wall } = BIN;
      U.push({ at: [x, BIN.y, 9], draw() {
        S(box(cam, x - hw, y0, 3, hw * 2, y1 - y0, 1, { cls: "binfloor" }));
        const wb = () => S(box(cam, x - hw, y0, 3, hw * 2, wall, h, { cls: "bin" }));
        const wf = () => {
          S(box(cam, x - hw, y1 - wall, 3, hw * 2, wall, h, { cls: "bin", hatch: 2.4 }));
          S(faceText(cam, [x, y1 + 0.05, 3 + h - 6], [1, 0, 0], [0, 0, -1], String(i), 11, { cls: "engr binno" }));
          S(faceText(cam, [x, y0 - 0.05, 3 + h - 6], [-1, 0, 0], [0, 0, -1], String(i), 11, { cls: "engr binno" }));
        };
        const wl = () => S(box(cam, x - hw, y0 + wall, 3, wall, y1 - y0 - wall * 2, h, { cls: "bin" }));
        const wr = () => S(box(cam, x + hw - wall, y0 + wall, 3, wall, y1 - y0 - wall * 2, h, { cls: "bin" }));
        api.backIsFar ? wb() : wf();
        api.leftIsFar ? wl() : wr();
        slot("bin" + i);
        api.leftIsFar ? wr() : wl();
        api.backIsFar ? wf() : wb();
        slot("lid" + i);
      } });
      U.push({ at: [x, 170, 8], draw() { slot("chain" + i); } });
    }

    // The hash press: a housing under the rail's left end, with bit windows on its face.
    U.push({ at: [PRESS.x, 78, 22], draw() {
      const { x0, x1, y0, y1, h } = PRESS;
      S(box(cam, x0, y0, 0, x1 - x0, y1 - y0, h, { hatch: 2.4, groove: 3, cls: "housing", part: "press" }));
      S(box(cam, PRESS.x - 22, 75, h, 44, 10, 2, { cls: "slotlip" }));
      for (const [sx, sy] of [[x0 + 5, y0 + 5], [x1 - 5, y0 + 5], [x0 + 5, y1 - 5], [x1 - 5, y1 - 5]]) S(screw(cam, sx, sy, h, 2));
      // bit windows: five recessed frames, b4 … b0
      for (const sgn of [1, -1]) {
        const yy = sgn > 0 ? y1 + 0.05 : y0 - 0.05, ax = [sgn, 0, 0];
        S(faceText(cam, [PRESS.x, yy, 10], ax, [0, 0, -1], "HASH PRESS", 5, { cls: "engr lo" }));
      }
      if (cam.view[1] > 0) {
        let d = "";
        for (let j = 0; j < 4; j++) {
          const cx = PRESS.x + (j - 1.5) * 19;
          d += path([[cx - 7.5, y1, 26], [cx + 7.5, y1, 26], [cx + 7.5, y1, 42], [cx - 7.5, y1, 42]].map((p) => cam.p(p)));
        }
        S(`<path class="win-frame" d="${d}"/>`);
      }
      slot("bits");
    } });
    // The fold dial in front of the press.
    U.push({ at: [DIAL.x, DIAL.y, 3], draw() {
      S(box(cam, DIAL.x - 30, DIAL.y - 26, 0, 60, 52, 2, { groove: 2.4 }));
      S(drum(cam, DIAL.x, DIAL.y, 2, DIAL.r + 2, 3, { cls: "base" }));
      S(drum(cam, DIAL.x, DIAL.y, 5, DIAL.r, 1.2, { capCls: "t-face" }));
      slot("dialFace");
      S(faceText(cam, [DIAL.x, DIAL.y + DIAL.r + 2.6, 2], [1, 0, 0], [0, 1, 0], "SLOT = h & (m − 1)", 4, { cls: "engr lo" }));
      slot("dial");
    } });
    // The card file: the keys waiting to be filed, the next one at the front.
    U.push({ at: [(DRAWER.x0 + DRAWER.x1) / 2, (DRAWER.y0 + DRAWER.y1) / 2, 11], draw() {
      const { x0, x1, y0, y1, h } = DRAWER, w = 2;
      S(box(cam, x0, y0, 0, x1 - x0, y1 - y0, 2, { cls: "pad" }));
      const wb = () => S(box(cam, x0, y0, 2, x1 - x0, w, h - 2, { cls: "drawer" }));
      const wf = () => {
        S(box(cam, x0 - 1, y1 - w, 0, x1 - x0 + 2, w + 1, h, { cls: "drawer", hatch: 2.4 }));
        if (cam.view[1] > 0) S(box(cam, (x0 + x1) / 2 - 12, y1 + 1, 11, 24, 0.8, 8, { cls: "brass" }));
        S(faceText(cam, [(x0 + x1) / 2, y1 + 1.9, 14.2], [1, 0, 0], [0, 0, -1], "KEYS", 4.6, { cls: "engr" }));
        S(rod(cam, [(x0 + x1) / 2 - 8, y1 + 4, 6], [(x0 + x1) / 2 + 8, y1 + 4, 6], 1.3, { seg: 12 }));
      };
      const wl = () => S(box(cam, x0, y0 + w, 2, w, y1 - y0 - w * 2, h - 2, { cls: "drawer" }));
      const wr = () => S(box(cam, x1 - w, y0 + w, 2, w, y1 - y0 - w * 2, h - 2, { cls: "drawer" }));
      api.backIsFar ? wb() : wf();
      api.leftIsFar ? wl() : wr();
      slot("drawer");
      api.leftIsFar ? wr() : wl();
      api.backIsFar ? wf() : wb();
    } });
    // Front row: load gauge, probe counter, n and m, mode knob, resize lever.
    U.push({ at: [GA.x, FR, 4], draw() {
      S(box(cam, GA.x - 26, FR - 22, 0, 52, 40, 2, { groove: 2 }));
      S(drum(cam, GA.x, FR, 2, GA.r + 2.4, 3));
      S(drum(cam, GA.x, FR, 5, GA.r, 1.4, { capCls: "t-face" }));
      const z = 6.5, tk = [], tkM = [];
      for (let a = 0; a <= 1.5001; a += 0.125) (Math.abs(a * 4 - Math.round(a * 4)) < 1e-6 && Math.round(a * 4) % 2 === 0 ? tkM : tk).push(aAng(a));
      S(`<path class="ln lo" d="${radialTicks(cam, GA.x, FR, z, GA.r - 3.4, GA.r - 1, tk)}"/><path class="ln mid" d="${radialTicks(cam, GA.x, FR, z, GA.r - 5, GA.r - 1, tkM)}${arcPath(cam, GA.x, FR, z, GA.r - 1, 180, 360, 30)}"/>`);
      S(`<path class="ln zero" d="${radialTicks(cam, GA.x, FR, z, GA.r - 7, GA.r - 0.6, [aAng(HM.LIMIT)])}${arcPath(cam, GA.x, FR, z, GA.r - 1.8, aAng(HM.LIMIT), 360, 12)}"/>`);
      for (const [a, lab] of [[0, "0"], [0.75, ".75"], [1.5, "1.5"]]) {
        const t = (aAng(a) * Math.PI) / 180;
        S(faceText(cam, [GA.x + (GA.r - 9) * Math.cos(t), FR + (GA.r - 9) * Math.sin(t) + 1.2, z], [1, 0, 0], [0, 1, 0], lab, 3.2, { cls: "engr lo" }));
      }
      S(faceText(cam, [GA.x, FR + 8, z], [1, 0, 0], [0, 1, 0], "LOAD α = n/m", 3, { cls: "engr lo" }));
      slot("gA");
    } });
    U.push({ at: [CNT.x, FR, 8], draw() {
      S(box(cam, CNT.x - 26, FR - 12, 0, 52, 24, 16, { hatch: 2.4, groove: 2, cls: "housing" }));
      S(faceText(cam, [CNT.x, FR + 12.05, 4.2], [1, 0, 0], [0, 0, -1], "PROBES", 3.4, { cls: "engr lo" }));
      S(faceText(cam, [CNT.x, FR - 12.05, 4.2], [-1, 0, 0], [0, 0, -1], "PROBES", 3.4, { cls: "engr lo" }));
      slot("cnt");
    } });
    U.push({ at: [NM.x, FR, 8], draw() {
      S(box(cam, NM.x - 30, FR - 12, 0, 60, 24, 16, { hatch: 2.4, groove: 2, cls: "housing" }));
      S(faceText(cam, [NM.x, FR + 12.05, 4.2], [1, 0, 0], [0, 0, -1], "KEYS n · SLOTS m", 3.2, { cls: "engr lo" }));
      S(faceText(cam, [NM.x, FR - 12.05, 4.2], [-1, 0, 0], [0, 0, -1], "KEYS n · SLOTS m", 3.2, { cls: "engr lo" }));
      slot("nm");
    } });
    U.push({ at: [KNOB.x, FR, 4], draw() {
      S(drum(cam, KNOB.x, FR, 0, KNOB.r + 6, 3, { cls: "base" }));
      S(`<path class="ln mid" d="${radialTicks(cam, KNOB.x, FR, 3, KNOB.r - 1, KNOB.r + 2, Object.values(MODE_ANG))}"/>`);
      for (const [id, a] of Object.entries(MODE_ANG)) {
        const t = (a * Math.PI) / 180, lab = { chain: "CHAIN", linear: "LINEAR", quad: "QUAD" }[id];
        S(faceText(cam, [KNOB.x + (KNOB.r + 3.4) * Math.cos(t), FR + (KNOB.r + 3.4) * Math.sin(t) - 0.6, 3], [1, 0, 0], [0, 1, 0], lab, 3, { cls: "engr" }));
      }
      slot("knob");
    } });
    U.push({ at: [LEV.x, FR, 4], draw() {
      S(box(cam, LEV.x - 26, FR - 14, 0, 52, 28, 3, { groove: 2.5 }));
      S(box(cam, LEV.x - 13, FR - 2, 3, 26, 4, 1.4, { cls: "slotlip" }));
      S(faceText(cam, [LEV.x - 15, FR + 10, 3], [1, 0, 0], [0, 1, 0], "AUTO", 3.2, { cls: "engr lo" }));
      S(faceText(cam, [LEV.x + 15, FR + 10, 3], [1, 0, 0], [0, 1, 0], "FIXED", 3.2, { cls: "engr lo" }));
      S(faceText(cam, [LEV.x, FR - 7, 3], [1, 0, 0], [0, 1, 0], "RESIZE AT .75", 2.8, { cls: "engr lo" }));
      slot("lever");
    } });
    // The rail's posts stand among the other units; the rail, the trails and the carriage ride
    // above everything on the bench, so they are drawn after it from any side.
    for (const x of [RAIL.x0, RAIL.x1]) U.push({ at: [x, RAIL.y, 40], draw() {
      S(drum(cam, x, RAIL.y, 0, 10, 4, { cls: "base" }));
      S(rod(cam, [x, RAIL.y, 4], [x, RAIL.y, RAIL.z + 10], 4.2));
      S(drum(cam, x, RAIL.y, RAIL.z + 10, 6, 4));
    } });
    api.units(U);
    S(rod(cam, [RAIL.x0, RAIL.y, RAIL.z], [RAIL.x1, RAIL.y, RAIL.z], 3.2, { seg: 30 }));
    {
      let d = "";
      for (let i = 0; i < NB; i++) d += line(cam, [BX(i), RAIL.y + 3.3, RAIL.z - 3], [BX(i), RAIL.y + 3.3, RAIL.z - 7]);
      S(`<path class="ln lo" d="${d}"/>`);
    }
    slot("trails");
    slot("carriage");
    slot("air");
    slot("hits");
    slot("pins");
  }

  /* ---------- the scene: what the office shows at this moment ---------- */
  const st = { mode: "chain", auto: true };
  const sc = {
    layout: HM.place([], { mode: st.mode, auto: st.auto }),
    hidden: new Set(), fliers: [], mover: null,  // mover: { key, pos, attached, query, alpha }
    carX: PRESS.x, lidM: HM.M0, lid: new Array(NB).fill(0).map((_, i) => (i < HM.M0 ? 1 : 0)),
    touch: null, found: null, trail: null, press: null, spinUntil: 0,
    dialS: 0, dialA: dialAng(0, HM.M0), gA: aAng(0), knob: MODE_ANG.chain, lever: 0, count: 0,
    last: null,
  };
  const drawerKeys = () => KEYS.filter((k) => !sc.layout.entries[k] && !sc.hidden.has(k) && !(sc.mover && sc.mover.key === k));
  const poseIn = (lay, key) => {
    const e = lay.entries[key];
    if (!e) { const j = KEYS.filter((k) => !lay.entries[k]).indexOf(key); return [(DRAWER.x0 + DRAWER.x1) / 2, DRAW_Y(Math.max(0, j)), 3]; }
    if (lay.mode === "chain" && e.pos > 0) return [BX(e.slot), NY(e.pos), 3];
    return [BX(e.slot), BIN.y, 4];
  };
  const collided = (lay, key) => { const e = lay.entries[key]; return !!e && (lay.mode === "chain" ? e.pos > 0 : e.slot !== e.home); };

  /* ---------- live parts ---------- */
  const draw = {
    bin(i) {
      const lay = sc.layout;
      const key = lay.mode === "chain" ? lay.chains[i] && lay.chains[i][0] : lay.slots[i];
      if (!key || sc.hidden.has(key)) return "";
      return card(BX(i), BIN.y, 4, key, { red: collided(lay, key), home: lay.entries[key].home, touch: sc.touch === key, found: sc.found === key });
    },
    lid(i) {
      const k = sc.lid[i];
      if (k > 0.995) return "";
      const z = 3 + BIN.h + k * 30, o = Math.min(1, (1 - k) * 1.6);
      return `<g style="opacity:${f(o)}">` + box(cam, BX(i) - BIN.hw - 0.8, BIN.y0 - 0.8, z, BIN.hw * 2 + 1.6, BIN.y1 - BIN.y0 + 1.6, 2, { cls: "shutter", hatch: 2 }) +
        box(cam, BX(i) - 6, BIN.y - 2, z + 2, 12, 4, 2, { cls: "cock" }) + `</g>`;
    },
    chain(i) {
      const lay = sc.layout;
      if (lay.mode !== "chain" || !lay.chains[i]) return "";
      const ch = lay.chains[i];
      if (ch.length < 2) return "";
      const x = BX(i), parts = [];
      for (let k = 1; k < ch.length; k++) {
        const key = ch[k], y = NY(k), yPrev = k === 1 ? BIN.y1 + 0.5 : NY(k - 1) + 6;
        if (sc.hidden.has(key)) break;
        // the chain: beads from the previous node to this one
        let beads = "";
        const n = Math.max(2, Math.round((y - 6 - yPrev) / 3));
        for (let b = 0; b <= n; b++) beads += ball(cam, [x, yPrev + ((y - 6 - yPrev) * b) / n, 1.8], 1.4, { cls: "bead" });
        const node = box(cam, x - 22, y - 6, 0, 44, 12, 3, { cls: "stand", groove: 1.6 }) +
          (sc.hidden.has(key) ? "" : card(x, y, 3, key, { red: true, home: lay.entries[key].home, touch: sc.touch === key, found: sc.found === key }));
        parts.push({ y, s: beads + node });
      }
      if (!api.backIsFar) parts.reverse();
      return parts.map((p) => p.s).join("");
    },
    drawer() {
      const ks = drawerKeys(), x = (DRAWER.x0 + DRAWER.x1) / 2;
      const items = ks.map((k, j) => ({ j, s: card(x, DRAW_Y(j), 3, k) }));
      if (api.backIsFar) items.reverse();
      return items.map((it) => it.s).join("") || "";
    },
    trails() {
      const lay = sc.layout;
      if (lay.mode === "chain") return "";
      let quiet = "", hot = "";
      const arc = (a, b) => {
        const P = [], span = Math.abs(b - a), lift = 8 + span * 3 + (b < a ? 12 : 0);
        for (let t = 0; t <= 1.0001; t += 1 / 16) P.push(cam.p(BX(a) + (BX(b) - BX(a)) * t, BIN.y, 56 + lift * Math.sin(Math.PI * t)));
        return path(P, false);
      };
      for (const k of lay.keys) {
        const p = lay.entries[k].path;
        if (sc.trail && sc.trail.key === k) continue;
        for (let i = 0; i + 1 < p.length; i++) quiet += arc(p[i], p[i + 1]);
      }
      if (sc.trail) { const p = sc.trail.path; for (let i = 0; i + 1 < Math.min(p.length, sc.trail.upTo + 1); i++) hot += arc(p[i], p[i + 1]); }
      return (quiet ? `<path class="trail" d="${quiet}"/>` : "") + (hot ? `<path class="trail on" d="${hot}"/>` : "");
    },
    carriage() {
      const x = sc.carX, z = RAIL.z;
      let o = "";
      const m = sc.mover;
      if (m && m.attached) o += card(m.pos[0], m.pos[1], m.pos[2], m.key, { query: m.query, alpha: m.alpha });
      o += rod(cam, [x, RAIL.y, z - 10], [x, RAIL.y, HANG + CARD.h - 1], 1.8, { seg: 12 });
      o += box(cam, x - 9, RAIL.y - 4, HANG + CARD.h - 4, 18, 8, 8, { cls: "cock" });
      o += box(cam, x - 20, RAIL.y - 13, z - 10, 40, 26, 22, { cls: "carriage", part: "carriage", groove: 2.6 });
      for (const dx of [-14, 14]) o += screw(cam, x + dx, RAIL.y, z + 12, 1.8);
      o += box(cam, x - 14, RAIL.y + 13, z - 6, 28, 0.8, 12, { cls: "brass" });
      const s = Math.round((x - BX(0)) / 58);
      o += faceText(cam, [x, RAIL.y + 14, z + 2], [1, 0, 0], [0, 0, -1], x < BX(0) - 29 ? "PARK" : "SLOT " + Math.max(0, Math.min(NB - 1, s)), 5, { cls: "engr" });
      return o;
    },
    air() {
      const items = sc.fliers.map((fl) => ({ d: cam.depth(...fl.pos), s: card(fl.pos[0], fl.pos[1], fl.pos[2], fl.key, { alpha: fl.alpha }) }));
      const m = sc.mover;
      if (m && !m.attached) items.push({ d: cam.depth(...m.pos), s: card(m.pos[0], m.pos[1], m.pos[2], m.key, { query: m.query, alpha: m.alpha }) });
      items.sort((a, b) => a.d - b.d);
      return items.map((i) => i.s).join("");
    },
    bits() {
      const p = sc.press;
      if (!p) return faceText(cam, [PRESS.x, PRESS.y1 + 0.05, 48], [1, 0, 0], [0, 0, -1], "—", 5, { cls: "engr lo" });
      const spin = performance.now() < sc.spinUntil;
      const v = HM.spread(p.h), b = HM.bits(v, 4), lowN = Math.log2(p.m);
      let o = "";
      for (let j = 0; j < 4; j++) {
        const cx = PRESS.x + (j - 1.5) * 19, ch = spin ? String((Math.random() * 2) | 0) : b[j], inMask = 3 - j < lowN;
        o += faceText(cam, [cx, PRESS.y1 + 0.05, 29.6], [1, 0, 0], [0, 0, -1], ch, 12, { cls: inMask && !spin ? "engr bit on" : "engr bit" });
      }
      o += faceText(cam, [PRESS.x, PRESS.y1 + 0.05, 49], [1, 0, 0], [0, 0, -1], spin ? "reading…" : `${p.key} · ${HM.hex(p.h)}`, 5.2, { cls: "engr" });
      if (!spin) {
        const xs = PRESS.x + (4 - lowN - 1.5) * 19 - 8, xe = PRESS.x + 1.5 * 19 + 8;
        o += `<path class="maskline" d="${line(cam, [xs, PRESS.y1 + 0.1, 22.6], [xe, PRESS.y1 + 0.1, 22.6])}"/>`;
        o += faceText(cam, [PRESS.x, PRESS.y1 + 0.05, 16.4], [1, 0, 0], [0, 0, -1], `& ${p.m - 1} → slot ${v & (p.m - 1)}`, 4.6, { cls: "engr acc" });
      }
      return o;
    },
    dialFace() {
      const m = sc.lidM, z = 6.3, ang = [];
      for (let s = 0; s < m; s++) ang.push(dialAng(s, m));
      let o = `<path class="ln mid" d="${radialTicks(cam, DIAL.x, DIAL.y, z, DIAL.r - 3, DIAL.r - 0.8, ang)}"/>`;
      for (let s = 0; s < m; s++) {
        const t = (dialAng(s, m) * Math.PI) / 180, rr = DIAL.r - 7.5;
        o += faceText(cam, [DIAL.x + rr * Math.cos(t), DIAL.y + rr * Math.sin(t) + 1.6, z], [1, 0, 0], [0, 1, 0], String(s), 4.6, { cls: "engr" });
      }
      return o;
    },
    dial() {
      const t = (sc.dialA * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t), z = 6.6, x = DIAL.x, y = DIAL.y, L = DIAL.r - 2;
      const tip = [x + L * c, y + L * sn, z], tail = [x - 3 * c, y - 3 * sn, z];
      const w1 = [x - 1.2 * sn, y + 1.2 * c, z], w2 = [x + 1.2 * sn, y - 1.2 * c, z];
      return `<path class="needle" d="${path([tail, w1, tip, w2].map((p) => cam.p(p)))}"/>` + dotAt(x, y, z);
    },
    gA() {
      const t = (sc.gA * Math.PI) / 180, c = Math.cos(t), sn = Math.sin(t), z = 6.8, x = GA.x, y = FR, L = GA.r - 2.5;
      const tip = [x + L * c, y + L * sn, z], tail = [x - 3 * c, y - 3 * sn, z];
      const w1 = [x - 1.1 * sn, y + 1.1 * c, z], w2 = [x + 1.1 * sn, y - 1.1 * c, z];
      return `<path class="needle" d="${path([tail, w1, tip, w2].map((p) => cam.p(p)))}"/>` + dotAt(x, y, z);
    },
    cnt() {
      const v = String(Math.min(99, sc.count)).padStart(2, "0");
      let o = "";
      for (const sgn of [1, -1]) {
        const y = FR + sgn * 12.05, ax = [sgn, 0, 0];
        for (let j = 0; j < 2; j++) {
          const cx = CNT.x + sgn * (j - 0.5) * 12;
          if (sgn > 0 && cam.view[1] > 0) o += `<path class="win-frame" d="${path([[cx - 5, y, 7], [cx + 5, y, 7], [cx + 5, y, 15], [cx - 5, y, 15]].map((p) => cam.p(p)))}"/>`;
          o += faceText(cam, [cx, y, 13.4], ax, [0, 0, -1], v[j], 7, { cls: "engr bit" + (sc.count > 1 ? " on" : "") });
        }
      }
      return o;
    },
    nm() {
      const lay = sc.layout, s = `${lay.n} · ${sc.lidM}`;
      return faceText(cam, [NM.x, FR + 12.05, 12.6], [1, 0, 0], [0, 0, -1], s, 6.4, { cls: "engr bit" }) +
        faceText(cam, [NM.x, FR - 12.05, 12.6], [-1, 0, 0], [0, 0, -1], s, 6.4, { cls: "engr bit" });
    },
    knob() {
      const t = (sc.knob * Math.PI) / 180;
      let o = drum(cam, KNOB.x, FR, 3, 11, 11, { knurl: 14, density: 1.2 });
      o += drum(cam, KNOB.x, FR, 14, 7, 1.6);
      o += `<path class="ln hi" d="${line(cam, [KNOB.x + 2 * Math.cos(t), FR + 2 * Math.sin(t), 15.7], [KNOB.x + 10.5 * Math.cos(t), FR + 10.5 * Math.sin(t), 14.1])}"/>`;
      return o;
    },
    lever() {
      const a = ((sc.lever * 2 - 1) * 32 * Math.PI) / 180, base = [LEV.x, FR, 4.4], tip = [LEV.x + Math.sin(a) * 15, FR, 4.4 + Math.cos(a) * 15];
      return rod(cam, base, tip, 1.5, { seg: 12 }) + ball(cam, tip, 3.2);
    },
    pins() {
      return PINS().map(([n, p]) => pin(cam, p, n)).join("");
    },
    hits() {
      let o = "";
      const quad = (pts3, attrs, title) => `<path class="hit" ${attrs} d="${path(hull(pts3.map((p) => cam.p(p))))}"><title>${title}</title></path>`;
      const D = DRAWER, dp = [];
      for (const x of [D.x0, D.x1]) for (const y of [D.y0, D.y1]) for (const z of [0, 50]) dp.push([x, y, z]);
      o += quad(dp, `data-act="insert"`, "File the next key");
      for (let i = 0; i < NB; i++) {
        const q = [];
        for (const x of [BX(i) - BIN.hw, BX(i) + BIN.hw]) for (const y of [BIN.y0, BIN.y1]) for (const z of [0, 50]) q.push([x, y, z]);
        o += quad(q, `data-act="look" data-slot="${i}"`, `Look up the key in slot ${i}`);
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
  const PINS = () => [
    [1, [DRAWER.x0 - 4, DRAWER.y1 - 10, 30]],
    [2, [PRESS.x0 - 2, PRESS.y1, 30]],
    [3, [DIAL.x - DIAL.r - 6, DIAL.y, 7]],
    [4, [sc.carX + 26, RAIL.y + 13, RAIL.z + 14]],
    [5, [BX(0) - 34, BIN.y0 + 4, 24]],
    [6, [BX(2) + 27, NY(1), 30]],
    [7, [BX(3) + 29, BIN.y, 84]],
    [8, [BX(6), BIN.y1, 30]],
    [9, [GA.x - GA.r - 8, FR, 8]],
    [10, [CNT.x - 30, FR + 4, 14]],
    [11, [KNOB.x + KNOB.r + 10, FR, 8]],
    [12, [LEV.x + 28, FR, 8]],
  ];

  /* ---------- mount and paint ---------- */
  let slots = {};
  const memo = {};
  function sig(name) {
    const lay = sc.layout, hid = [...sc.hidden].join(",");
    const m = /^(bin|lid|chain)(\d+)$/.exec(name);
    if (m) {
      const i = +m[2];
      if (m[1] === "lid") return (sc.lid[i] * 200 | 0) + "";
      const keys = lay.mode === "chain" ? (lay.chains[i] || []) : [lay.slots[i]];
      return [lay.mode, keys.join(","), hid, keys.includes(sc.touch) ? sc.touch : "", keys.includes(sc.found) ? sc.found : ""].join("|");
    }
    switch (name) {
      case "drawer": return drawerKeys().join(",");
      case "trails": return lay.mode + lay.keys.join(",") + (sc.trail ? sc.trail.key + sc.trail.upTo : "");
      case "carriage": return [sc.carX.toFixed(2), sc.mover && sc.mover.attached ? sc.mover.pos.map((v) => v.toFixed(1)).join() + sc.mover.alpha : ""].join("|");
      case "air": return sc.fliers.length || (sc.mover && !sc.mover.attached) ? Math.random() + "" : "none";
      case "bits": return performance.now() < sc.spinUntil ? Math.random() + "" : (sc.press ? sc.press.key + sc.press.m : "-");
      case "dialFace": return sc.lidM + "";
      case "dial": return sc.dialA.toFixed(2);
      case "gA": return sc.gA.toFixed(2);
      case "cnt": return sc.count + "";
      case "nm": return lay.n + "/" + sc.lidM;
      case "knob": return sc.knob.toFixed(2);
      case "lever": return sc.lever.toFixed(3);
      case "pins": return sc.carX.toFixed(1);
    }
    return null;
  }
  function paint(force) {
    for (const name in slots) {
      const g = slots[name];
      if (name === "hits") continue;
      const s = sig(name);
      if (!force && s !== null && memo[name] === s) continue;
      memo[name] = s;
      const m = /^(bin|lid|chain)(\d+)$/.exec(name);
      g.innerHTML = m ? draw[m[1]](+m[2]) : draw[name] ? draw[name]() : "";
    }
  }
  function mount(az, el) {
    cam = stage.mount(az, el); slots = stage.slots;
    for (const k in memo) delete memo[k];
    slots.hits.innerHTML = draw.hits();
  }
  mount(-24, 30);

  /* ---------- the sequencer: every operation becomes a list of timed acts ---------- */
  const ops = [];      // pending operations, each expands into acts when it starts
  let acts = [], act = null, busy = false, lastInfo = null;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const A = {
    wait: (dur) => ({ dur }),
    call: (fn) => ({ dur: 0, start: fn }),
    move(to, dur, o = {}) {
      return { dur, start() { this.from = sc.mover.pos.slice(); if (o.attach != null) sc.mover.attached = o.attach; },
        step(k) {
          const e = ease(k), p = lerp3(this.from, to, e);
          if (o.lift) p[2] += o.lift * Math.sin(Math.PI * e);
          sc.mover.pos = p; if (sc.mover.attached) sc.carX = p[0];
        } };
    },
    fade(to, dur) { return { dur, start() { this.a0 = sc.mover.alpha; }, step(k) { sc.mover.alpha = this.a0 + (to - this.a0) * k; } }; },
    dip(onTouch) { // lower the card onto what is there, compare, lift again
      return { dur: 0.5, start() { this.p0 = sc.mover.pos.slice(); this.fired = false; },
        step(k) {
          const d = Math.sin(Math.PI * Math.min(1, k * 1.1)) * 16;
          sc.mover.pos = [this.p0[0], this.p0[1], this.p0[2] - d];
          if (!this.fired && k > 0.45) { this.fired = true; onTouch(); }
        } };
    },
    fly(from, to, dur, lift = 46) { // every card moves from one arrangement to another at once
      return { dur,
        start() {
          this.keys = KEYS.filter((k) => from.entries[k] || to.entries[k]);
          this.keys.forEach((k) => sc.hidden.add(k));
          this.a = this.keys.map((k) => poseIn(from, k)); this.b = this.keys.map((k) => poseIn(to, k));
          this.delay = this.keys.map((_, j) => (j / Math.max(1, this.keys.length)) * 0.35);
        },
        step(k) {
          sc.fliers = this.keys.map((key, j) => {
            const t = Math.max(0, Math.min(1, (k - this.delay[j]) / 0.65)), e = ease(t);
            const p = lerp3(this.a[j], this.b[j], e); p[2] += lift * Math.sin(Math.PI * e);
            return { key, pos: p };
          });
        },
        end() { sc.fliers = []; sc.layout = to; sc.hidden.clear(); } };
    },
  };

  function slotsTo(m) { return [A.call(() => (sc.lidM = m)), A.wait(0.55)]; }
  function readCard(key, m) {
    return [
      A.call(() => { sc.press = { key, h: HM.hashCode(key), m }; sc.spinUntil = performance.now() + 650; sc.count = 0; }),
      A.wait(0.7),
      A.call(() => { sc.dialS = HM.index(key, m); }),
      A.wait(0.45),
    ];
  }
  // Walk the card through a probe sequence on the rail, touching every occupied bin it tries.
  function walkRail(lay, key, pathSlots, final) {
    const out = [];
    pathSlots.forEach((s, i) => {
      const x = BX(s);
      out.push(A.move([x, BIN.y, HANG], 0.3 + Math.abs(x - (i ? BX(pathSlots[i - 1]) : PRESS.x)) * 0.0018, { attach: true }));
      out.push(A.call(() => { if (sc.trail) sc.trail.upTo = i; }));
      const occupant = lay.slots[s];
      if (i < pathSlots.length - 1 || (final === "look" && occupant)) {
        out.push(A.dip(() => { sc.touch = occupant; sc.count++; if (occupant === key) sc.found = key; }));
        if (occupant === key) return;
      } else out.push(A.call(() => { sc.count++; }));
    });
    return out;
  }
  function begin(key, query) {
    if (query) return [A.call(() => { sc.mover = { key, pos: [PRESS.x, BIN.y, HANG], attached: true, query: true, alpha: 0 }; }), A.fade(1, 0.35)];
    const x = (DRAWER.x0 + DRAWER.x1) / 2;
    return [
      A.call(() => { sc.mover = { key, pos: [x, DRAW_Y(0), 3], attached: false, alpha: 1 }; }),
      A.move([x, DRAW_Y(0), 56], 0.35),
      A.move([PRESS.x, BIN.y, HANG], 0.65, { lift: 18 }),
      A.call(() => { sc.mover.attached = true; }),
    ];
  }
  function finish(info) {
    return [A.call(() => { sc.mover = null; sc.touch = null; lastInfo = info; emit(); remask(); })];
  }

  function opInsert() {
    const before = sc.layout;
    const key = KEYS.find((k) => !before.entries[k]);
    if (!key) return [];
    const after = HM.place(before.keys.concat(key), { mode: st.mode, auto: st.auto });
    let list = [];
    let lay = before;
    if (after.m > before.m) {
      const re = HM.place(before.keys, { mode: st.mode, auto: st.auto, m0: after.m });
      list.push(A.call(() => { lastInfo = { type: "resize", from: before.m, to: after.m }; emit(); }), ...slotsTo(after.m), A.fly(before, re, 1.5, 40), A.wait(0.3));
      lay = re;
    }
    list.push(...begin(key, false), ...readCard(key, after.m));
    if (after.refused === key) {
      const p = HM.probe(lay.slots, key, st.mode, lay.m).path;
      list.push(A.call(() => (sc.trail = { key, path: p, upTo: 0 })), ...walkRail(lay, key, p, "full"));
      list.push(A.call(() => { sc.mover.attached = false; }), A.move([(DRAWER.x0 + DRAWER.x1) / 2, DRAW_Y(0), 3], 0.9, { lift: 30 }),
        A.call(() => (sc.trail = null)), ...finish({ type: "full", key, probes: p.length, m: lay.m }));
      return list;
    }
    const e = after.entries[key];
    if (st.mode === "chain") {
      const ch = lay.chains[e.home] || [], x = BX(e.home);
      list.push(A.move([x, BIN.y, HANG], 0.3 + Math.abs(x - PRESS.x) * 0.0018, { attach: true }));
      if (!ch.length) list.push(A.call(() => (sc.count = 1)), A.move([x, BIN.y, 4], 0.45));
      else {
        list.push(A.dip(() => { sc.touch = ch[0]; sc.count++; }), A.call(() => { sc.mover.attached = false; }));
        for (let k = 1; k < ch.length; k++) list.push(A.move([x, NY(k), 56], 0.4), A.dip(() => { sc.touch = ch[k]; sc.count++; }));
        list.push(A.move([x, NY(ch.length), 56], 0.4), A.call(() => (sc.touch = null)), A.move([x, NY(ch.length), 3], 0.4));
      }
    } else {
      list.push(A.call(() => (sc.trail = { key, path: e.path, upTo: 0 })), ...walkRail(lay, key, e.path, "put"), A.call(() => (sc.touch = null)), A.move([BX(e.slot), BIN.y, 4], 0.45));
    }
    list.push(A.call(() => { sc.layout = after; sc.trail = null; }));
    list.push(...finish({ type: "insert", key, home: e.home, slot: e.slot, pos: e.pos, probes: e.probes, path: e.path, m: after.m, resized: after.m > before.m }));
    return list;
  }
  function opLookup(key) {
    const lay = sc.layout;
    if (!lay.keys.length) return [];
    const e = HM.locate(lay, key);
    const list = [...begin(key, true), ...readCard(key, lay.m)];
    if (st.mode === "chain") {
      const ch = lay.chains[e.home], x = BX(e.home);
      list.push(A.move([x, BIN.y, HANG], 0.3 + Math.abs(x - PRESS.x) * 0.0018));
      if (!ch.length) list.push(A.dip(() => {}));
      else {
        list.push(A.dip(() => { sc.touch = ch[0]; sc.count = 1; if (ch[0] === key) sc.found = key; }));
        if (ch[0] !== key) {
          list.push(A.call(() => { sc.mover.attached = false; }));
          for (let k = 1; k < ch.length; k++) {
            list.push(A.move([x, NY(k), 56], 0.4), A.dip(() => { sc.touch = ch[k]; sc.count++; if (ch[k] === key) sc.found = key; }));
            if (ch[k] === key) break;
          }
        }
      }
    } else {
      list.push(A.call(() => (sc.trail = { key, path: e.path, upTo: 0 })), ...walkRail(lay, key, e.path, "look"));
      if (!e.found) list.push(A.dip(() => { sc.touch = null; }));
    }
    list.push(A.wait(e.found ? 0.7 : 0.35), A.fade(0, 0.4), A.call(() => { sc.found = null; sc.trail = null; sc.mover.attached = false; }));
    list.push(...finish({ type: "look", key, found: e.found, home: e.home, slot: e.slot, probes: e.probes, path: e.path, m: lay.m }));
    return list;
  }
  function opRearrange(next) { // a new mode, a new resize rule, or an empty table
    const before = sc.layout;
    const list = [];
    if (next.m > before.m) list.push(...slotsTo(next.m));
    list.push(A.fly(before, next, next.n === 0 ? 1.1 : 1.4, next.n === 0 ? 30 : 40));
    if (next.m < before.m) list.push(...slotsTo(next.m));
    list.push(A.call(() => { sc.press = null; sc.count = 0; sc.dialS = 0; }), ...finish({ type: next.n === 0 ? "reset" : "rearrange", m: next.m }));
    return list;
  }

  /* ---------- frame loop ---------- */
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  let last = 0, visible = true;
  function tick(dt) {
    const hurry = ops.some((o) => o.user) ? 3 : 1;
    let left = dt * hurry;
    while (left > 0) {
      if (!act) {
        if (!acts.length) {
          const op = ops.shift();
          if (!op) { busy = false; break; }
          busy = true; acts = op.build();
          continue;
        }
        act = acts.shift(); act.t = 0; act.start && act.start();
      }
      const need = act.dur - act.t, use = Math.min(left, Math.max(0, need));
      act.t += use; left -= use;
      act.step && act.step(act.dur > 0 ? Math.min(1, act.t / act.dur) : 1);
      if (act.t >= act.dur - 1e-9) { act.end && act.end(); act = null; } else break;
    }
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    tick(reduce.matches ? 10 : dt);
    const k = reduce.matches ? 1 : 1 - Math.exp(-dt * 6);
    // parts that settle on their own: lids, dial, gauge, knob, lever, the carriage going home
    for (let i = 0; i < NB; i++) sc.lid[i] += ((i < sc.lidM ? 1 : 0) - sc.lid[i]) * (reduce.matches ? 1 : 1 - Math.exp(-dt * 4));
    const dT = dialAng(sc.dialS, sc.lidM);
    sc.dialA += (dT - sc.dialA) * k;
    sc.gA += (aAng(sc.layout.n / Math.max(1, sc.lidM)) - sc.gA) * k;
    sc.knob += (MODE_ANG[st.mode] - sc.knob) * k;
    sc.lever += ((st.auto ? 0 : 1) - sc.lever) * k;
    if (!(sc.mover && sc.mover.attached)) sc.carX += (PRESS.x - sc.carX) * (reduce.matches ? 1 : 1 - Math.exp(-dt * 2.2));
    if (visible) paint();
    if (now - lastEmit > 150) { lastEmit = now; emit(); }
    requestAnimationFrame(frame);
  }
  let lastEmit = 0;

  /* ---------- the plate's public face ---------- */
  const listeners = [];
  function info() {
    const lay = sc.layout;
    return { st, layout: lay, m: lay.m, n: lay.n, alpha: lay.n / lay.m, last: lastInfo, measure: HM.measure(lay), expected: HM.expected(lay.mode, lay.n / lay.m), busy: busy || ops.length > 0, count: sc.count, press: sc.press };
  }
  function emit() { const i = info(); listeners.forEach((fn) => fn(st, i)); }
  function enqueue(build, user = true) {
    if (user) { lastTouch = performance.now(); for (let i = ops.length - 1; i >= 0; i--) if (!ops[i].user) ops.splice(i, 1); }
    if (ops.length > 4) return;
    ops.push({ build, user });
    emit();
  }
  const api2 = {
    insert: (user = true) => enqueue(opInsert, user),
    lookup: (key, user = true) => enqueue(() => opLookup(key), user),
    reset: (user = true) => enqueue(() => opRearrange(HM.place([], { mode: st.mode, auto: st.auto })), user),
    setMode(mode, user = true) {
      if (st.mode === mode) return;
      st.mode = mode;
      enqueue(() => opRearrange(HM.place(sc.layout.keys, { mode: st.mode, auto: st.auto })), user);
    },
    setAuto(v, user = true) {
      if (st.auto === v) return;
      st.auto = v;
      enqueue(() => opRearrange(HM.place(sc.layout.keys, { mode: st.mode, auto: st.auto })), user);
    },
  };
  window.Plate = Object.assign(api2, { st, on: (fn) => { listeners.push(fn); fn(st, info()); }, info, keys: KEYS });

  /* ---------- input ---------- */
  const fig = document.getElementById("plate");
  svg.addEventListener("click", (e) => {
    const h = e.target.closest(".hit");
    if (!h) return;
    if (h.dataset.act === "insert") api2.insert();
    else if (h.dataset.act === "look") {
      const i = +h.dataset.slot, lay = sc.layout;
      const key = lay.mode === "chain" ? (lay.chains[i] || []).slice(-1)[0] : lay.slots[i];
      if (key) api2.lookup(key);
    }
  });
  fig.addEventListener("keydown", (e) => {
    const k = e.key;
    if (e.shiftKey && mode === "3d") return;
    if (k === "i" || k === "I" || k === "Enter") api2.insert();
    else if (k === "l" || k === "L") { const ks = sc.layout.keys; if (ks.length) api2.lookup(ks[(Math.random() * ks.length) | 0]); }
    else if (k === "r" || k === "R") api2.reset();
    else if (/^[1-3]$/.test(k)) api2.setMode(HM.MODES[+k - 1].id);
    else if (k === "a" || k === "A") api2.setAuto(!st.auto);
    else return;
    e.preventDefault();
  });
  new IntersectionObserver((es) => (visible = es[0].isIntersecting)).observe(fig);

  /* Self-demonstration: file every key, look a few up, then empty the table and try the next
     way of resolving collisions. It steps aside for twelve seconds after you touch it. */
  let lastTouch = -1e9, demoStep = 0;
  const DEMO_LOOK = ["lemon", "banana", "quince", "melon"];
  setInterval(() => {
    if (reduce.matches || !visible || document.hidden || busy || ops.length) return;
    if (performance.now() - lastTouch < 12000) return;
    const lay = sc.layout, left = KEYS.find((k) => !lay.entries[k]);
    if (left && !lay.refused && !(lay.full && lay.mode !== "chain")) { api2.insert(false); return; }
    if (demoStep < DEMO_LOOK.length) { api2.lookup(DEMO_LOOK[demoStep++], false); return; }
    demoStep = 0;
    const order = ["chain", "linear", "quad"], next = order[(order.indexOf(st.mode) + 1) % 3];
    st.mode = next;
    api2.reset(false);
  }, 900);

  /* ---------- three views: SVG, WebGL, 3D ---------- */
  const LIGHT_FRAG = `
uniform vec4 uCar; uniform float uHot[8]; uniform float uOpen; uniform vec4 uMover;
void main() {
  vec2 vb = vbOf(); vec4 m = maskAt();
  vec4 acc = vec4(0.0);
  bool dk = uDark > 0.5;
  vec3 warm = dk ? vec3(1.0, 0.82, 0.55) : vec3(1.0, 0.86, 0.62);
  vec3 red = dk ? vec3(1.0, 0.34, 0.2) : vec3(0.85, 0.22, 0.1);
  // A lamp under the carriage lights the bins below it; bins just touched glow red in front.
  if (m.r > 0.25) {
    float z = m.r > 0.75 ? 0.0 : 3.0;
    vec2 p = onPlane(vb, z);
    float lamp = exp(-pow((p.x - uCar.x) / 34.0, 2.0) - pow((p.y - 90.0) / 42.0, 2.0));
    addLight(acc, warm, lamp * (dk ? 0.55 : 0.32) * (0.85 + 0.15 * sin(uTime * 3.0)));
    float hot = 0.0;
    for (int i = 0; i < 8; i++) {
      float h = uHot[i];
      if (h < 0.01) continue;
      float x = 262.0 + float(i) * 58.0;
      hot += h * exp(-pow((p.x - x) / 22.0, 2.0) - pow((p.y - 114.0) / 11.0, 2.0)) * (0.55 + 0.45 * caustic(p * 0.6, uTime));
    }
    addLight(acc, red, hot * (dk ? 0.9 : 0.5));
  }
  // The chains: a pulse runs out along every chain, from the bin to its last card.
  if (m.g > 0.5) {
    vec2 p = onPlane(vb, 1.6);
    float pu = pow(0.5 + 0.5 * cos(p.y * 0.26 - uTime * 4.0), 6.0);
    addLight(acc, dk ? warm : red, pu * 0.75);
  }
  // Cards catch a slow sweep of light; the card in hand glows.
  if (m.b > 0.5) {
    float sweep = pow(0.5 + 0.5 * sin(vb.x * 0.05 - uTime * 1.3 + vb.y * 0.02), 8.0);
    addLight(acc, warm, sweep * 0.22);
    float d = length((vb - uMover.xy) / max(uMover.z, 1.0));
    addLight(acc, warm, uMover.w * exp(-d * d * 2.2) * 0.5);
  }
  gl_FragColor = acc;
}`;
  const MASK_CSS = `.floor .t-top, .pad .t-top, .binfloor .t-top, .stand .t-top { fill: #f00 !important; }
    .bead .f { fill: #0f0 !important; stroke: #0f0 !important; }
    .card .f { fill: #00f !important; stroke: #00f !important; }`;
  const canvas = document.createElement("canvas");
  canvas.className = "light"; canvas.setAttribute("aria-hidden", "true");
  fig.appendChild(canvas);
  let lightLayer = null, mode = "svg", lightRaf = 0, maskT = 0;
  const hot = new Float32Array(NB);
  const hintEl = document.querySelector(".plate .bl"), hint0 = hintEl ? hintEl.textContent : "";
  function remask() { if (mode === "webgl" && lightLayer) { clearTimeout(maskT); maskT = setTimeout(() => lightLayer.mask(), 60); } }
  function lightFrame(now) {
    lightRaf = 0;
    if (mode !== "webgl" || !lightLayer) return;
    if (!visible) { lightRaf = requestAnimationFrame(lightFrame); return; }
    if (lightLayer.size()) lightLayer.mask();
    // bins heat up when touched and cool slowly
    const touchSlot = (() => {
      if (!sc.touch) return -1;
      const e = sc.layout.entries[sc.touch]; return e ? e.slot : -1;
    })();
    for (let i = 0; i < NB; i++) hot[i] = Math.max(i === touchSlot ? 1 : 0, hot[i] * 0.975);
    if (sc.trail) for (let i = 0; i <= Math.min(sc.trail.upTo, sc.trail.path.length - 1); i++) hot[sc.trail.path[i]] = Math.max(hot[sc.trail.path[i]], 0.6);
    lightLayer.set("uHot", hot);
    lightLayer.set("uCar", [sc.carX, RAIL.y, 0, 0]);
    const mv = sc.mover ? cam.p(sc.mover.pos[0], sc.mover.pos[1], sc.mover.pos[2] + CARD.h / 2) : [0, 0];
    lightLayer.set("uMover", [mv[0], mv[1], 30 * cam.k, sc.mover ? sc.mover.alpha : 0]);
    lightLayer.draw(cam, reduce.matches ? 2 : now / 1000, K.live.isDark());
    if (!reduce.matches) lightRaf = requestAnimationFrame(lightFrame);
  }
  function setMode(m) {
    mode = m;
    if (m === "3d") insp.close();
    fig.classList.toggle("mode-webgl", m === "webgl");
    fig.classList.toggle("mode-3d", m === "3d");
    if (m !== "3d" && (stage.az !== -24 || stage.el !== 30)) { mount(-24, 30); paint(true); }
    if (m === "webgl") {
      try { lightLayer = lightLayer || K.live.light({ canvas, svg, W, H, frag: LIGHT_FRAG, maskCss: MASK_CSS }); } catch (e) { lightLayer = null; console.warn(e); }
      if (lightLayer) { lightLayer.size(); lightLayer.mask().then(() => { if (!lightRaf) lightRaf = requestAnimationFrame(lightFrame); }); }
    }
    if (hintEl) hintEl.textContent = m === "3d" ? "Drag to turn the office all the way round · double-click to reset · Shift + arrows to turn" : hint0;
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
      requestAnimationFrame(() => { const [a, e] = turnPending; turnPending = null; mount(a, e); paint(true); });
    },
  });
  fig.addEventListener("keydown", (e) => {
    if (mode !== "3d" || !e.shiftKey) return;
    const d = { ArrowLeft: [-8, 0], ArrowRight: [8, 0], ArrowUp: [0, -4], ArrowDown: [0, 4] }[e.key];
    if (d) { orb.nudge(...d); e.preventDefault(); }
  }, true);
  new ResizeObserver(() => { if (mode === "webgl" && lightLayer && lightLayer.size()) lightLayer.mask(); }).observe(fig);

  /* ---------- looking closer ---------- */
  const lay = () => sc.layout;
  const PARTS = [
    [1, "Card file", "The keys waiting to be filed, the next one at the front. Press it to file the next key.", () => { const ks = drawerKeys(); return ks.length ? `next <b>${ks[0]}</b> · ${ks.length} waiting` : "<b>empty</b> · every key is filed"; }],
    [2, "Hash press", "Reads the key's hashCode, h = s[0]·31ⁿ⁻¹ + … + s[n−1], mixes the high half into the low (h ^ h>>>16), and shows the last four bits in its windows.", () => sc.press ? `${sc.press.key} → <b>${HM.hex(sc.press.h)}</b> · low bits ${HM.bits(HM.spread(sc.press.h), 4)}` : "waiting for a card"],
    [3, "Fold dial", "Keeps only the low bits the table can use: slot = h & (m − 1), the same as h mod m when m is a power of two.", () => sc.press ? `${sc.press.key} → home slot <b>${HM.index(sc.press.key, sc.press.m)}</b> of ${sc.press.m}` : `${lay().m} slots`],
    [4, "Carriage", "Carries the card along the rail to its home bin, and on to other bins when open addressing has to look further.", () => sc.mover ? `carrying <b>${sc.mover.key}</b>` : "parked over the press"],
    [5, "Bins", "The table: one bin per slot. Each card shows its key and, below, its home slot. A red edge means it did not get its first choice.", () => `${lay().n} keys in ${lay().m} bins · <b>${HM.measure(lay()).collided}</b> collided`],
    [6, "Chains", "Separate chaining: a bin holds a list, and a new key is hung at the end of its bin's chain. Finding a key means walking the chain.", () => { const L = lay(); if (L.mode !== "chain") return "unused while probing"; const lens = L.chains.map((c) => c.length); return `longest chain <b>${Math.max(...lens)}</b> · ${lens.filter((v) => v > 1).length} bins share`; }],
    [7, "Probe trails", "Open addressing: when a bin is taken, the carriage tries the next in the probe sequence. Each arc is one extra probe; the red one is the card in hand.", () => { const L = lay(); if (L.mode === "chain") return "unused while chaining"; const ms = HM.measure(L); return `longest search <b>${ms.longest}</b> probes · ${L.mode === "linear" ? "i, i+1, i+2 …" : "i, i+1, i+3, i+6 …"}`; }],
    [8, "Shutters", "Four more bins stay shut until the load passes 0.75. Then the shutters lift, m doubles, and every card is filed again by one more bit.", () => `m = <b>${lay().m}</b> · ${lay().m === NB ? "all eight bins open" : "four bins shut"}`],
    [9, "Load gauge", "α = n / m, keys per bin. Every cost on this bench grows with it; the red mark at 0.75 is where the table doubles.", () => `α = <b>${(lay().n / lay().m).toFixed(2)}</b> · ${lay().n} / ${lay().m}`],
    [10, "Probe counter", "How many bins or chain cards the last search had to look at. One means no collision.", () => `last search <b>${sc.count}</b> · average ${HM.measure(lay()).hit.toFixed(2)} for keys present`],
    [11, "Method knob", "Chaining, linear probing or quadratic probing. Turning it files every card again by the new rule.", () => `<b>${HM.MODES.find((m) => m.id === st.mode).name}</b>`],
    [12, "Resize lever", "Automatic doubling at α > 0.75, as in Java's HashMap, or a fixed four bins. Fixed and open addressing: the fifth key has nowhere to go.", () => (st.auto ? "<b>auto</b> · doubles past 0.75, up to eight bins" : "<b>fixed</b> at four bins")],
  ].map(([n, name, text, live]) => ({ n, name, text, live, at: () => PINS().find((p) => p[0] === n)[1] }));
  const insp = K.live.inspector({ fig, svg, W, H, parts: PARTS, cam: () => cam, live: (n) => PARTS.find((p) => p.n === n).live(), zoom: 2.4,
    onChange: (n) => { if (n !== null && lens.on) toggleLens(false); } });
  const lens = K.live.loupe({ fig, svg, W, H, sceneId: stage.sceneId, mag: 2.6, r: 88 });
  const toolsEl = document.getElementById("tools");
  function toggleLens(v) { lens.toggle(v); if (lens.on) insp.close(); toolsEl?.querySelector('[data-t="loupe"]')?.setAttribute("aria-pressed", lens.on); }
  toolsEl?.addEventListener("click", (e) => { if (e.target.closest('[data-t="loupe"]')) toggleLens(); });
  setInterval(() => insp.refresh(), 250);
  document.addEventListener("folio:part", (e) => insp.show(e.detail));
  Object.assign(window.Plate, {
    view: (m) => setMode(m), turn: (az, el) => { setMode("3d"); mount(az, el); paint(true); }, light: () => lightLayer,
    inspect: (n) => insp.show(n), closeInspect: () => insp.close(), loupe: (v) => toggleLens(v),
    // for tests and screenshots: jump straight to a state, no animation
    jump(n, mode = st.mode, auto = st.auto) {
      ops.length = 0; acts = []; act = null; sc.mover = null; sc.fliers = []; sc.hidden.clear(); sc.trail = null; sc.touch = null; sc.found = null;
      st.mode = mode; st.auto = auto; sc.layout = HM.place(KEYS.slice(0, n), { mode, auto });
      sc.lidM = sc.layout.m; for (let i = 0; i < NB; i++) sc.lid[i] = i < sc.lidM ? 1 : 0;
      lastTouch = performance.now() + 1e9; paint(true); emit();
    },
    demo(on) { lastTouch = on ? -1e9 : performance.now() + 1e9; },
  });

  paint(true);
  requestAnimationFrame(frame);
})();
