/* Plate II wall texts: phases, ledger, vitals and the two charts. All read the bench's live model. */
(function () {
  "use strict";
  const H = window.HeartModel, P = window.Plate;
  const $ = (id) => document.getElementById(id);
  const r0 = (v) => Math.round(v);
  const svgNS = "http://www.w3.org/2000/svg";

  const PHASES = [
    { id: "filling", rn: "i.", name: "Filling", rule: "LA > LV · mitral open", d: "The outflow valves are shut. Blood falls from the atria into the relaxed ventricles." },
    { id: "atrial kick", rn: "ii.", name: "Atrial kick", rule: "the atria squeeze", d: "The atria contract and top up the ventricles with their last few millilitres." },
    { id: "isovolumic contraction", rn: "iii.", name: "Isovolumic contraction", rule: "every valve shut", d: "The ventricles squeeze with all valves closed, so pressure climbs while volume holds." },
    { id: "ejection", rn: "iv.", name: "Ejection", rule: "LV > aorta · aortic open", d: "Ventricular pressure beats the arteries, the outflow valves open and the stroke volume leaves." },
    { id: "isovolumic relaxation", rn: "v.", name: "Isovolumic relaxation", rule: "every valve shut", d: "The ventricles relax with all valves closed until their pressure drops below the atria." },
  ];
  $("phases").innerHTML = PHASES.map((p, i) => `<div class="stage" data-ph="${p.id}"><span class="rn">${p.rn}</span><h3>${p.name}</h3><div class="eq small">${p.rule}</div><p>${p.d}</p><div class="live" id="ph${i}"></div></div>`).join("");

  // Controls
  $("hr").addEventListener("input", (e) => P.update({ HR: +e.target.value }));
  $("ct").addEventListener("input", (e) => P.update({ contract: +e.target.value }));
  $("fseg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) P.update({ fault: b.dataset.f }); });
  $("sseg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const s = +b.dataset.s; P.update(s ? { speed: s, playing: true } : { playing: false });
  });

  // Key and pins light each other.
  const key = $("key");
  const light = (n) => {
    key.querySelectorAll("li").forEach((li) => li.classList.toggle("on", li.dataset.pin === n));
    document.querySelectorAll("#plate-svg .pin").forEach((p) => p.classList.toggle("on", p.dataset.pin === n));
  };
  key.addEventListener("mouseover", (e) => { const li = e.target.closest("li"); if (li) light(li.dataset.pin); });
  key.addEventListener("mouseleave", () => light(null));
  key.addEventListener("click", (e) => {
    const li = e.target.closest("li"); if (!li) return;
    document.dispatchEvent(new CustomEvent("folio:part", { detail: +li.dataset.pin }));
    const fig = document.getElementById("plate"), b = fig.getBoundingClientRect();
    if (b.top < 0 || b.bottom > innerHeight) fig.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("plate-svg").addEventListener("mouseover", (e) => { const p = e.target.closest(".pin"); light(p ? p.dataset.pin : null); });

  const LEDGER = [
    ["SV", "venous"], ["RA", "venous"], ["RV", "venous"], ["PA", "venous"],
    ["PV", "arterial"], ["LA", "arterial"], ["LV", "arterial"], ["SA", "arterial"],
  ];
  const NAME = { ...H.NAME, SV: "Systemic veins", SA: "Systemic arteries (aorta)" };
  const range = (rec, f) => [Math.min(...rec.map(f)), Math.max(...rec.map(f))];

  let drawnBeat = null;
  function charts(beat) {
    if (!beat || !beat.rec || beat === drawnBeat) return;
    drawnBeat = beat;
    const rec = beat.rec, T = beat.T;
    // Wiggers
    const lvMax = Math.max(...rec.map((r) => r.P.LV));
    const ymax = Math.max(160, Math.ceil((lvMax + 5) / 20) * 20);
    const X = (t) => 44 + (t / T) * 500, Y = (p) => 262 - (Math.max(-2, p) / ymax) * 236;
    let g = "";
    // phase bands
    let segs = [], cur = null;
    rec.forEach((r) => { if (!cur || cur.ph !== r.phase) { cur = { ph: r.phase, t0: r.t, t1: r.t }; segs.push(cur); } else cur.t1 = r.t; });
    segs = segs.filter((s) => s.t1 > s.t0);
    segs.forEach((s) => {
      if (s.ph.startsWith("isovolumic") || s.ph === "atrial kick") g += `<rect class="band" x="${X(s.t0).toFixed(1)}" y="20" width="${(X(s.t1) - X(s.t0)).toFixed(1)}" height="242"/>`;
      const short = { "filling": "fill", "atrial kick": "kick", "isovolumic contraction": "IVC", "ejection": "eject", "isovolumic relaxation": "IVR" }[s.ph];
      if (X(s.t1) - X(s.t0) > 24) g += `<text class="bandlbl" x="${((X(s.t0) + X(s.t1)) / 2).toFixed(1)}" y="16" text-anchor="middle">${short}</text>`;
    });
    for (let p = 0; p <= ymax; p += 40) g += `<line class="grid" x1="44" x2="544" y1="${Y(p)}" y2="${Y(p)}"/><text x="38" y="${Y(p) + 3.5}" text-anchor="end">${p}</text>`;
    g += `<line class="ax" x1="44" x2="544" y1="262" y2="262"/><line class="ax" x1="44" x2="44" y1="20" y2="262"/>`;
    for (let t = 0; t <= T + 1e-6; t += 0.2) g += `<text x="${X(t)}" y="278" text-anchor="middle">${(t * 1000).toFixed(0)}</text>`;
    g += `<text x="544" y="294" text-anchor="end">ms</text><text x="8" y="14">mmHg</text>`;
    const line = (f, cls) => `<path class="${cls}" d="M${rec.map((r) => X(r.t).toFixed(1) + " " + Y(f(r)).toFixed(1)).join("L")}"/>`;
    g += line((r) => r.P.LA, "la") + line((r) => r.P.SA, "ao") + line((r) => r.P.LV, "lv");
    g += `<line class="cursor" id="wcur" x1="0" x2="0" y1="20" y2="262"/><circle class="dot" id="wdot" r="4.5" cx="-10" cy="-10"/>`;
    $("wiggers").innerHTML = g;
    $("wiggers").dataset.T = T; $("wiggers").dataset.ymax = ymax;
    const ej = rec.filter((r) => r.phase === "ejection");
    const grad = ej.length ? Math.max(...ej.map((r) => r.P.LV - r.P.SA)) : 0;
    $("wigNote").textContent = `The aortic valve stood open for ${r0(ej.length ? (ej[ej.length - 1].t - ej[0].t) * 1000 : 0)} ms. The largest pressure drop across it was ${r0(grad)} mmHg${grad > 25 ? ": the ventricle is forcing blood through a narrow valve." : ", too small to matter in a healthy valve."}`;

    // PV loop
    const vmax = Math.max(170, Math.ceil((beat.EDV + 15) / 20) * 20);
    const XV = (v) => 52 + (v / vmax) * 330, YV = (p) => 262 - (Math.max(-2, p) / ymax) * 236;
    let h = "";
    for (let p = 0; p <= ymax; p += 40) h += `<line class="grid" x1="52" x2="382" y1="${YV(p)}" y2="${YV(p)}"/><text x="46" y="${YV(p) + 3.5}" text-anchor="end">${p}</text>`;
    for (let v = 0; v <= vmax; v += 40) h += `<text x="${XV(v)}" y="278" text-anchor="middle">${v}</text>`;
    h += `<line class="ax" x1="52" x2="382" y1="262" y2="262"/><line class="ax" x1="52" x2="52" y1="20" y2="262"/><text x="382" y="294" text-anchor="end">mL</text><text x="8" y="14">mmHg</text>`;
    h += `<path class="loop" d="M${rec.map((r) => XV(r.V.LV).toFixed(1) + " " + YV(r.P.LV).toFixed(1)).join("L")}Z"/>`;
    for (const [v, l] of [[beat.ESV, "ESV"], [beat.EDV, "EDV"]]) h += `<line class="grid" x1="${XV(v)}" x2="${XV(v)}" y1="20" y2="262"/><text class="lbl" x="${XV(v)}" y="34" text-anchor="middle">${l} ${r0(v)}</text>`;
    h += `<circle class="dot" id="pvdot" r="4.5" cx="-10" cy="-10"/>`;
    $("pvloop").innerHTML = h;
    $("pvloop").dataset.vmax = vmax; $("pvloop").dataset.ymax = ymax;
    let area = 0;
    for (let i = 0; i < rec.length; i++) { const a = rec[i], b = rec[(i + 1) % rec.length]; area += a.V.LV * b.P.LV - b.V.LV * a.P.LV; }
    const work = (Math.abs(area) / 2) * 1.333e-4;
    $("pvNote").textContent = `Each beat fills to ${r0(beat.EDV)} mL, empties to ${r0(beat.ESV)} mL and ejects ${r0(beat.SV)} mL forwards${beat.regurg > 1 ? `, while ${r0(beat.regurg)} mL leaks back through the mitral valve` : ""}. The loop encloses about ${work.toFixed(2)} J of work per beat.`;
  }

  function cursor(ui, cur) {
    const w = $("wiggers"), pv = $("pvloop");
    if (!w.dataset.T) return;
    const T = +w.dataset.T, ymax = +w.dataset.ymax, vmax = +pv.dataset.vmax;
    const x = 44 + (Math.min(cur.tc, T) / T) * 500, y = 262 - (Math.max(-2, cur.P.LV) / ymax) * 236;
    const wc = $("wcur"), wd = $("wdot"), pd = $("pvdot");
    if (wc) { wc.setAttribute("x1", x.toFixed(1)); wc.setAttribute("x2", x.toFixed(1)); wd.setAttribute("cx", x.toFixed(1)); wd.setAttribute("cy", y.toFixed(1)); }
    if (pd) { pd.setAttribute("cx", (52 + (cur.V.LV / vmax) * 330).toFixed(1)); pd.setAttribute("cy", (262 - (Math.max(-2, cur.P.LV) / ymax) * 236).toFixed(1)); }
  }

  let lastLedger = 0;
  P.on((ui, cur, beat) => {
    // controls
    $("hrv").textContent = ui.HR + " bpm";
    $("ctv").textContent = "× " + (+ui.contract).toFixed(2);
    if (+$("hr").value !== ui.HR) $("hr").value = ui.HR;
    if (Math.abs(+$("ct").value - ui.contract) > 0.01) $("ct").value = ui.contract;
    $("fseg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.f === ui.fault));
    $("fv").textContent = H.FAULTS[ui.fault].name;
    $("fdesc").textContent = H.FAULTS[ui.fault].note.charAt(0).toUpperCase() + H.FAULTS[ui.fault].note.slice(1) + ".";
    const sp = ui.playing ? String(ui.speed) : "0";
    $("sseg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.s === sp));
    $("sv").textContent = ui.playing ? (ui.speed === 1 ? "real time" : ui.speed === 0.25 ? "slowed 4×" : "slowed 16×") : "paused";

    // readout
    const b = beat;
    $("readout").innerHTML = `${ui.HR} bpm · <b>${cur.phase}</b>` + (b ? ` · ${r0(b.SA[1])}/${r0(b.SA[0])} mmHg · ${(b.CO).toFixed(1)} L/min` : "");

    // phases
    document.querySelectorAll("#phases .stage").forEach((el) => el.classList.toggle("now", el.dataset.ph === cur.phase));
    if (b && b.rec) {
      PHASES.forEach((p, i) => {
        const rs = b.rec.filter((r) => r.phase === p.id);
        const ms = (rs.length * b.T * 1000) / b.rec.length;
        const dv = rs.length > 1 ? rs[rs.length - 1].V.LV - rs[0].V.LV : 0;
        let s = `lasts ${r0(ms)} ms<br>LV volume ${dv >= 0 ? "+" : "−"}${Math.abs(dv).toFixed(0)} mL`;
        if (cur.phase === p.id) s += `<br><b>now</b> LV ${r0(cur.P.LV)} · Ao ${r0(cur.P.SA)} · LA ${r0(cur.P.LA)}`;
        if (p.id === "isovolumic contraction" && ui.fault === "mr") s += `<br>mitral leaking`;
        $("ph" + i).innerHTML = s;
      });
    }

    // vitals and ledger, a few times a second
    const now = performance.now();
    if (b && now - lastLedger > 250) {
      lastLedger = now;
      const tiles = [
        ["Heart rate", `${r0(b.HR)}<small>bpm</small>`],
        ["Blood pressure", `${r0(b.SA[1])}/${r0(b.SA[0])}<small>mmHg</small>`],
        ["Stroke volume", `${r0(b.SV)}<small>mL</small>`],
        ["Ejection fraction", `${r0(b.EF * 100)}<small>%</small>`],
        ["Cardiac output", `${b.CO.toFixed(1)}<small>L/min</small>`],
        ui.fault === "mr" ? ["Leaks back", `${r0(b.regurg)}<small>mL/beat</small>`] : ["LV peak", `${r0(b.LV[1])}<small>mmHg</small>`],
      ];
      $("vitals").innerHTML = tiles.map(([l, v]) => `<div><span class="label">${l}</span><b>${v}</b></div>`).join("");
      if (b.rec) {
        $("ledger").innerHTML = LEDGER.map(([c, kind]) => {
          const pr = range(b.rec, (r) => r.P[c]), vr = range(b.rec, (r) => r.V[c]);
          return `<tr><td><span class="sw" style="background:var(--${kind === "venous" ? "venous" : "fluid"})"></span></td><td class="tok">${NAME[c]}</td><td>${kind === "venous" ? "low O₂" : "high O₂"}</td>` +
            `<td>${cur.P[c].toFixed(1)} mmHg</td><td>${r0(pr[0])} to ${r0(pr[1])}</td><td>${r0(cur.V[c])} mL</td><td>${r0(vr[0])} to ${r0(vr[1])}</td></tr>`;
        }).join("");
      }
    }
    charts(b);
    cursor(ui, cur);
  });
})();
