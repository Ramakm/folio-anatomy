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
    const k = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0), o.maxK ?? Infinity);
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
    // Engraving on a face turned away from the viewer is hidden with its face.
    if (o.cull !== false && dot(cross(ax, ay), cam.view) <= 0.02) return "";
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


  /* A convex prism: a flat convex polygon (3D points, in order) swept along dir.
     Only faces turned to the viewer are drawn, each toned by its facing. Roofs, wedges, hoppers. */
  function prism(cam, base, dir, o = {}) {
    const n0 = norm(cross(sub(base[1], base[0]), sub(base[2], base[0])));
    const nb = dot(n0, dir) > 0 ? mul(n0, -1) : n0;
    const top = base.map((p) => add(p, dir));
    const cen = mul(base.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / base.length);
    const mid = add(cen, mul(dir, 0.5));
    const faces = [{ n: nb, q: base }, { n: mul(nb, -1), q: top }];
    for (let i = 0; i < base.length; i++) {
      const a = base[i], b = base[(i + 1) % base.length];
      let n = norm(cross(sub(b, a), dir));
      const fc = mul(add(add(a, b), add(add(a, dir), add(b, dir))), 0.25);
      if (dot(n, sub(fc, mid)) < 0) n = mul(n, -1);
      faces.push({ n, q: [a, b, add(b, dir), add(a, dir)] });
    }
    let s = `<g class="sol ${o.cls || ""}"${attrs(o)}>`;
    for (const fc of faces) {
      if (dot(fc.n, cam.view) <= 1e-6) continue;
      const t = fc.n[2] > 0.9 ? (o.topTone || "top") : (o.tone || toneOf(fc.n));
      s += `<path class="f t-${t}" d="${path(fc.q.map((v) => cam.p(v)))}"/>`;
    }
    return s + "</g>";
  }

  /* The half of a ring (a circle around an axis) that lies behind or in front of its centre,
     for rings that wrap another part: draw the back half first and the front half last. */
  function ringArc(cam, c, axis, r, front, N = 48) {
    const [, u, v] = basis(axis), cd = cam.depth(c);
    let d = "", pen = false;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2, p = ringPt(c, u, v, r, t);
      const on = front ? cam.depth(p) >= cd : cam.depth(p) < cd;
      if (on) { const q = cam.p(p); d += (pen ? "L" : "M") + f(q[0]) + " " + f(q[1]); pen = true; } else pen = false;
    }
    return d;
  }
  /* A point on a ring around an axis, at angle t: for parts that orbit a shaft. */
  function orbitPt(c, axis, r, t) { const [, u, v] = basis(axis); return ringPt(c, u, v, r, t); }

  root.Folio = { camera, fit, path, box, rod, drum, ball, ringPath, arcPath, radialTicks, line, faceText, pin, screw, toneOf, f, add, sub, mul, dot, norm, cross, LIGHT, prism, ringArc, orbitPt };
})(typeof window !== "undefined" ? window : globalThis);
