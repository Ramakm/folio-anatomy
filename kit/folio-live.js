/* Folio live kit: the three views of a plate.
   - stage():  owns the camera and the painter's order; rebuilds the drawing when the camera turns.
   - light():  a WebGL layer over the SVG. Its visibility mask is rendered from the drawing itself,
               so light only lands on surfaces the reader can actually see.
   - orbit():  drag to turn the bench; the scene is re-projected and re-shaded from the new view.
   - views():  the SVG · WebGL · 3D switch on the plate's mount.
   Requires folio-kit.js. No dependencies. */
(function (root) {
  "use strict";
  const K = root.Folio;
  const D = Math.PI / 180;

  /* ---------- stage ---------- */
  function stage(o) {
    // o: { svg, W, H, az, el, points, center, build(cam, api) }
    const base = K.fit({ az: o.az, el: o.el }, o.points, o.W, o.H, o.pad ?? 22);
    const C = o.center;
    const anchor = base.p(C);
    const st = { cam: base, base, slots: {}, az: o.az, el: o.el, turned: false };
    o.svg.setAttribute("viewBox", `0 0 ${o.W} ${o.H}`);

    st.cameraAt = (az, el) => {
      if (az === o.az && el === o.el) return base;
      const c0 = K.camera({ az, el, k: base.k * (o.orbitScale ?? 0.9) });
      const p = c0.p(C);
      return K.camera({ az, el, k: c0.k, ox: anchor[0] - p[0], oy: anchor[1] - p[1] });
    };
    st.mount = (az = st.az, el = st.el) => {
      st.az = az; st.el = el; st.turned = az !== o.az || el !== o.el;
      const cam = (st.cam = st.cameraAt(az, el));
      const order = [];
      const api = {
        S: (s) => order.push(s),
        slot: (n) => order.push({ slot: n }),
        // Units along the bench: far end first. Valid for any view from the front half.
        alongX: (list, key = (v) => v) => list.slice().sort((a, b) => cam.depth(key(a), 0, 0) - cam.depth(key(b), 0, 0)),
        farFirst: (list, pt) => list.slice().sort((a, b) => cam.depth(...pt(a)) - cam.depth(...pt(b))),
        leftIsFar: cam.depth(0, 0, 0) < cam.depth(1, 0, 0),
      };
      o.build(cam, api);
      let html = "", run = "";
      for (const it of order) {
        if (typeof it === "string") run += it;
        else { html += run; run = ""; html += `<g data-slot="${it.slot}"></g>`; }
      }
      o.svg.innerHTML = html + run;
      st.slots = {};
      o.svg.querySelectorAll("[data-slot]").forEach((g) => (st.slots[g.dataset.slot] = g));
      return cam;
    };
    return st;
  }

  /* ---------- orbit ---------- */
  function orbit(el, o) {
    // o: { az0, el0, azRange:[a,b], elRange:[a,b], onTurn(az, el), onSettle(az, el), enabled() }
    let az = o.az0, elv = o.el0, va = 0, ve = 0, drag = null, raf = 0, last = 0;
    const clamp = (v, r) => Math.max(r[0], Math.min(r[1], v));
    const tick = (now) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      if (!drag) {
        az = clamp(az + va * dt, o.azRange); elv = clamp(elv + ve * dt, o.elRange);
        va *= Math.exp(-dt * 5); ve *= Math.exp(-dt * 5);
        if (Math.abs(va) + Math.abs(ve) < 2) { va = ve = 0; o.onTurn(az, elv); o.onSettle?.(az, elv); raf = 0; last = 0; return; }
      }
      o.onTurn(az, elv);
      raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    el.addEventListener("pointerdown", (e) => {
      if (!o.enabled()) return;
      if (e.target.closest(".hit")) return;
      drag = { x: e.clientX, y: e.clientY, t: performance.now() };
      el.setPointerCapture(e.pointerId); el.classList.add("turning"); kick();
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const now = performance.now(), dt = Math.max(1, now - drag.t) / 1000;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      const sa = -dx * 0.32, se = dy * 0.22;
      az = clamp(az + sa, o.azRange); elv = clamp(elv + se, o.elRange);
      va = sa / dt; ve = se / dt;
      drag = { x: e.clientX, y: e.clientY, t: now };
    });
    const end = () => { if (!drag) return; drag = null; el.classList.remove("turning"); kick(); };
    el.addEventListener("pointerup", end); el.addEventListener("pointercancel", end);
    el.addEventListener("dblclick", () => { if (o.enabled()) api.to(o.az0, o.el0); });
    const api = {
      get: () => [az, elv],
      to(a, e) {
        // ease to a view without inertia
        const a0 = az, e0 = elv, t0 = performance.now();
        const step = (now) => {
          const k = Math.min(1, (now - t0) / 600), s = k * k * (3 - 2 * k);
          az = a0 + (a - a0) * s; elv = e0 + (e - e0) * s; o.onTurn(az, elv);
          if (k < 1) requestAnimationFrame(step); else o.onSettle?.(az, elv);
        };
        va = ve = 0; requestAnimationFrame(step);
      },
      nudge(da, de) { az = clamp(az + da, o.azRange); elv = clamp(elv + de, o.elRange); o.onTurn(az, elv); o.onSettle?.(az, elv); },
    };
    return api;
  }

  /* ---------- light ---------- */
  const PRELUDE = `
precision highp float;
uniform vec2 uRes; uniform vec2 uVB; uniform vec3 uCam; uniform vec2 uAng;
uniform float uTime; uniform float uDark; uniform sampler2D uMask;
vec2 vbOf() { return vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y) / uRes * uVB; }
vec4 maskAt() { return texture2D(uMask, gl_FragCoord.xy / uRes); }
vec2 project(vec3 p) {
  float ca = cos(uAng.x), sa = sin(uAng.x), ce = cos(uAng.y), se = sin(uAng.y);
  float u = p.x * ca + p.y * sa, w = -p.x * sa + p.y * ca;
  return vec2(uCam.x + uCam.z * u, uCam.y + uCam.z * (w * se - p.z * ce));
}
// The world point on the horizontal plane at height z that lands on this pixel.
vec2 onPlane(vec2 vb, float z) {
  float ca = cos(uAng.x), sa = sin(uAng.x), ce = cos(uAng.y), se = sin(uAng.y);
  float u = (vb.x - uCam.x) / uCam.z;
  float w = ((vb.y - uCam.y) / uCam.z + z * ce) / se;
  return vec2(u * ca - w * sa, u * sa + w * ca);
}
float segDist(vec2 p, vec2 a, vec2 b, out float t) {
  vec2 ab = b - a; t = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - a - ab * t);
}
// Where light falls: the bench is lit from a lamp behind it and to the left, so light that
// passes through a part lands on the floor in front of it.
const vec3 LAMP = vec3(-0.38, -0.62, 0.69);
vec2 fall(vec3 p, float floorZ) { vec3 L = normalize(LAMP); float h = p.z - floorZ; return p.xy - L.xy * h / L.z; }
// Accumulate premultiplied light of one colour.
void addLight(inout vec4 acc, vec3 col, float a) { a = clamp(a, 0.0, 1.0); acc.rgb += col * a * (1.0 - acc.a); acc.a += a * (1.0 - acc.a); }
float caustic(vec2 q, float t) {
  float a = sin(q.x * 0.55 + t * 1.1) + sin(q.y * 0.7 - t * 0.9) + sin((q.x + q.y) * 0.4 + t * 1.6);
  float b = sin(q.x * 0.31 - q.y * 0.52 + t * 0.7);
  return pow(clamp(1.0 - abs(a + b) * 0.42, 0.0, 1.0), 5.0);
}
`;

  function light(o) {
    // o: { canvas, svg, W, H, frag, maskCss }
    const gl = o.canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return null;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }"));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, PRELUDE + o.frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    const U = {};
    const u = (n) => (n in U ? U[n] : (U[n] = gl.getUniformLocation(prog, n)));
    let w = 0, h = 0, maskBusy = false;

    const api = {
      gl,
      size() {
        const r = Math.min(1.5, root.devicePixelRatio || 1);
        const cw = Math.max(2, Math.round(o.canvas.clientWidth * r)), ch = Math.max(2, Math.round(o.canvas.clientHeight * r));
        if (cw !== w || ch !== h) { w = o.canvas.width = cw; h = o.canvas.height = ch; gl.viewport(0, 0, w, h); return true; }
        return false;
      },
      /* Render the drawing with flat channel colours: red = floor, green = vessels, blue = glass,
         black = everything else, in the drawing's own painter's order. Occlusion comes for free. */
      async mask() {
        if (maskBusy || !w) return; maskBusy = true;
        try {
          const clone = o.svg.cloneNode(true);
          clone.setAttribute("width", w); clone.setAttribute("height", h);
          clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
          const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
          style.textContent = `* { fill: #000 !important; stroke: #000 !important; opacity: 1 !important; fill-opacity: 1 !important; stroke-opacity: 1 !important; }
            .hit, .pin, .flow, text { display: none !important; }
            .ln, .hatch, .leakring { fill: none !important; } ${o.maskCss}`;
          clone.insertBefore(style, clone.firstChild);
          const img = new Image();
          img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(new XMLSerializer().serializeToString(clone));
          await img.decode();
          const c = document.createElement("canvas"); c.width = w; c.height = h;
          const g = c.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
          api.maskCanvas = c;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
        } catch (e) { /* the light layer is an extra; the drawing stays */ }
        maskBusy = false;
      },
      set(name, v) {
        const l = u(name); if (l === null) return;
        if (typeof v === "number") gl.uniform1f(l, v);
        else if (v instanceof Float32Array) gl.uniform1fv(l, v); // an array of floats
        else if (v.length === 2) gl.uniform2fv(l, v);
        else if (v.length === 3) gl.uniform3fv(l, v);
        else if (v.length % 4 === 0) gl.uniform4fv(l, v);
      },
      draw(cam, t, dark) {
        api.set("uRes", [w, h]); api.set("uVB", [o.W, o.H]); api.set("uCam", [cam.ox, cam.oy, cam.k]);
        api.set("uAng", [cam.az * D, cam.el * D]); api.set("uTime", t); api.set("uDark", dark ? 1 : 0);
        gl.uniform1i(u("uMask"), 0);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
    };
    return api;
  }

  /* ---------- the view switch ---------- */
  function views(host, o) {
    // o: { modes: [{id,label,ok}], current, onSelect(id) }
    host.innerHTML = o.modes.map((m) => `<button type="button" data-v="${m.id}" aria-pressed="${m.id === o.current}" ${m.ok === false ? "disabled title=\"Not available in this browser\"" : ""}>${m.label}</button>`).join("");
    host.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b || b.disabled) return;
      host.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
      o.onSelect(b.dataset.v);
    });
    return { set(id) { host.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x.dataset.v === id)); } };
  }

  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === "dark" : root.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const webglOK = () => { try { return !!document.createElement("canvas").getContext("webgl"); } catch (e) { return false; } };

  K.live = { stage, orbit, light, views, isDark, webglOK, PRELUDE };
})(typeof window !== "undefined" ? window : globalThis);
