/* Plate III wall texts: steps, vitals, ledger and charts, all read from the bench's live model. */
(function () {
  "use strict";
  const G = window.GridModel, P = window.Plate;
  const $ = (id) => document.getElementById(id);
  const r0 = (v) => Math.round(v);
  const KVDESC = { 33: "Too low for this town: the line can carry only half the demand.", 66: "Workable for a short line, but one seventh of the power is lost as heat.", 132: "A common regional voltage. A few per cent is lost.", 220: "A typical long-distance line. About one per cent is lost.", 400: "A main transmission voltage. Losses are a fraction of a per cent." };

  const STEPS = [
    { rn: "i.", name: "Turn", rule: "P = ρ·g·Q·h", d: "Water falling from the tank pushes the wheel's buckets. The governor sets how much water the nozzle lets through." },
    { rn: "ii.", name: "Generate", rule: "e = N·B·A·ω·sin ωt", d: "The spinning magnet sweeps its field through the stator coils, which induces an alternating voltage in them." },
    { rn: "iii.", name: "Step up", rule: "V₂/V₁ = N₂/N₁", d: "The transformer trades current for voltage. The power is the same; the current, and so the heating, is far smaller." },
    { rn: "iv.", name: "Transmit", rule: "P_loss = 3·I²·R", d: "The conductors warm as current flows. Double the voltage and the loss falls to a quarter." },
    { rn: "v.", name: "Balance", rule: "2H/f₀ · df/dt = (Pm − Pe)/S", d: "No grid stores energy. If demand outruns supply the machines slow down, and frequency falls until the governors catch up." },
  ];
  $("steps").innerHTML = STEPS.map((s, i) => `<div class="stage"><span class="rn">${s.rn}</span><h3>${s.name}</h3><div class="eq small">${s.rule}</div><p>${s.d}</p><div class="live" id="st${i}"></div></div>`).join("");

  // Controls
  $("kvseg").innerHTML = G.TX_KV.map((kv) => `<button data-kv="${kv}" aria-pressed="false">${kv}</button>`).join("");
  $("kvseg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) P.update({ kv: +b.dataset.kv }); });
  $("dem").addEventListener("input", (e) => P.update({ demand: +e.target.value }));
  $("brk").addEventListener("click", () => P.update({ closed: !P.sim().closed }));
  $("play").addEventListener("click", () => P.update({ playing: !P.ui.playing }));

  // Key and pins
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
    const fig = $("plate"), b = fig.getBoundingClientRect();
    if (b.top < 0 || b.bottom > innerHeight) fig.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  let lastSlow = 0, lastCurve = "";
  P.on((sim, r, hist) => {
    $("demv").textContent = r0(sim.demand) + " MW";
    if (+$("dem").value !== r0(sim.demand)) $("dem").value = r0(sim.demand);
    $("kvseg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.kv === sim.kv));
    $("kvv").textContent = sim.kv + " kV";
    $("kvdesc").textContent = KVDESC[sim.kv];
    $("brk").setAttribute("aria-pressed", r.closed); $("brk").textContent = r.closed ? "Closed" : (r.tripped ? "Tripped" : "Open");
    $("play").setAttribute("aria-pressed", P.ui.playing); $("play").textContent = P.ui.playing ? "Running" : "Paused";
    $("readout").innerHTML = `<b>${r.f.toFixed(2)} Hz</b> · ${r.Pe.toFixed(1)} MW · loss ${r.loss.toFixed(2)} MW` + (r.closed ? "" : r.tripped ? " · <b>tripped</b>: frequency fell below " + G.P0.ufls + " Hz" : " · town dark");

    const now = performance.now();
    if (now - lastSlow < 250) return;
    lastSlow = now;

    // steps
    const st = [
      `mechanical <b>${r.Pm.toFixed(1)}</b> MW<br>valve ${r0(r.governor * 100)} % open`,
      `${r0(r.f * 60)} rpm · ${r.f.toFixed(2)} Hz<br>11 kV · <b>${r0(r.Igen)}</b> A per phase`,
      `11 → <b>${r.kv}</b> kV · ×${(r.kv / 11).toFixed(1)}<br>current ÷${(r.kv / 11).toFixed(1)} → ${r0(r.I)} A`,
      `I = ${r0(r.I)} A · R = ${G.P0.R} Ω<br>loss <b>${r.loss.toFixed(2)}</b> MW · ${(100 * (1 - r.eff)).toFixed(1)} %`,
      `supply ${r.Pe.toFixed(1)} · demand ${r.load.toFixed(1)}<br>frequency <b>${r.f.toFixed(3)}</b> Hz`,
    ];
    st.forEach((h, i) => ($("st" + i).innerHTML = h));

    // vitals and ledger
    const warnF = Math.abs(r.f - 50) > 0.2, warnL = 1 - r.eff > 0.05;
    const tiles = [
      ["Frequency", `${r.f.toFixed(2)}<small>Hz</small>`, warnF],
      ["Generation", `${r.Pe.toFixed(1)}<small>MW</small>`],
      ["Town draws", `${r.load.toFixed(1)}<small>MW</small>`, r.short > 0.05 || !r.closed],
      ["Line loss", `${r.loss.toFixed(2)}<small>MW</small>`, warnL],
      ["Delivered", `${(100 * r.eff).toFixed(1)}<small>%</small>`, warnL],
      ["Line current", `${r0(r.I)}<small>A</small>`],
    ];
    $("vitals").innerHTML = tiles.map(([l, v, w]) => `<div class="${w ? "warn" : ""}"><span class="label">${l}</span><b>${v}</b></div>`).join("");
    const rows = [
      ["Generator", "11 kV", `${r0(r.Igen)} A`, `${r.Pe.toFixed(1)} MW`, "Mechanical power becomes electrical power."],
      ["Step-up transformer", `11 → ${r.kv} kV`, `${r0(r.Igen)} → ${r0(r.I)} A`, `${r.Pe.toFixed(1)} MW`, "Voltage up, current down, power unchanged."],
      ["Line", `${r.kv} kV`, `${r0(r.I)} A`, `−${r.loss.toFixed(2)} MW`, `${(100 * (1 - r.eff)).toFixed(1)} % lost as heat in the conductors.`],
      ["Step-down transformer", `${r.kv} → 11 kV`, `${r0(r.I)} → ${r0((r.load / (Math.sqrt(3) * 11)) * 1000)} A`, `${r.load.toFixed(1)} MW`, `Town voltage ${(100 * r.Vtown).toFixed(0)} % of normal.`],
      ["Town", `${r0(r.home)} V at the socket`, "", `${r.load.toFixed(1)} MW`, r.closed ? (r.short > 0.05 ? `Short of ${(r.want - r.load).toFixed(1)} MW: lights dim.` : "Every window lit.") : "Disconnected."],
    ];
    $("ledger").innerHTML = rows.map((c) => `<tr><td class="tok">${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td>${c[3]}</td><td style="font-family:var(--body);white-space:normal;text-align:left">${c[4]}</td></tr>`).join("");

    // trend chart
    if (hist.length > 2) {
      const t1 = hist[hist.length - 1].t, t0 = t1 - 60;
      const X = (t) => 44 + ((t - t0) / 60) * 470, Yf = (f) => 262 - ((f - 48.5) / 3) * 236, Yp = (p) => 262 - (p / 150) * 236;
      let g = "";
      for (const f of [49, 50, 51]) g += `<line class="grid" x1="44" x2="514" y1="${Yf(f)}" y2="${Yf(f)}"/><text x="38" y="${Yf(f) + 3.5}" text-anchor="end">${f}</text>`;
      for (const p of [0, 50, 100, 150]) g += `<text x="520" y="${Yp(p) + 3.5}">${p}</text>`;
      g += `<line class="ufls" x1="44" x2="514" y1="${Yf(G.P0.ufls)}" y2="${Yf(G.P0.ufls)}"/>`;
      g += `<line class="ax" x1="44" x2="514" y1="262" y2="262"/><text x="8" y="14">Hz</text><text x="548" y="14" text-anchor="end">MW</text>`;
      for (let s = 0; s <= 60; s += 15) g += `<text x="${X(t0 + s)}" y="280" text-anchor="middle">${s - 60}s</text>`;
      const pl = (fn, Yy, cls) => `<path class="${cls}" d="M${hist.filter((h) => h.t >= t0).map((h) => X(h.t).toFixed(1) + " " + Yy(fn(h)).toFixed(1)).join("L")}"/>`;
      g += pl((h) => h.load, Yp, "dem") + pl((h) => h.Pe, Yp, "gen") + pl((h) => Math.max(48.5, Math.min(51.5, h.f)), Yf, "fr");
      $("trend").innerHTML = g;
      const fmin = Math.min(...hist.filter((h) => h.t >= t0).map((h) => h.f)), fmax = Math.max(...hist.filter((h) => h.t >= t0).map((h) => h.f));
      $("trendNote").textContent = `Over the last minute the frequency ranged from ${fmin.toFixed(2)} to ${fmax.toFixed(2)} Hz. Move the demand slider or open the breaker and watch the red line dip or rise, then recover as the governor and the slower control catch up.`;
    }
    // loss curve (only when the demand or voltage changes)
    const sig = r0(sim.demand) + "/" + sim.kv;
    if (sig !== lastCurve) {
      lastCurve = sig;
      const curve = G.lossCurve(sim.demand), bw = 52;
      const maxL = Math.max(10, ...curve.map((c) => c.loss));
      let h = "";
      curve.forEach((c, i) => {
        const x = 50 + i * 66, hgt = (c.loss / maxL) * 220, on = c.kv === sim.kv;
        h += `<rect class="bar ${on ? "on" : ""}" x="${x}" y="${262 - hgt}" width="${bw}" height="${Math.max(1, hgt)}"/>`;
        h += `<text x="${x + bw / 2}" y="278" text-anchor="middle">${c.kv} kV</text>`;
        h += `<text class="lbl" x="${x + bw / 2}" y="${256 - hgt}" text-anchor="middle">${c.loss < 1 ? c.loss.toFixed(2) : c.loss.toFixed(1)}</text>`;
      });
      h += `<line class="ax" x1="40" x2="390" y1="262" y2="262"/><text x="8" y="14">MW lost</text>`;
      $("losses").innerHTML = h;
      const a = curve[0], b = curve[curve.length - 1];
      $("lossNote").textContent = `Sending ${r0(sim.demand)} MW at ${b.kv} kV loses ${b.loss.toFixed(2)} MW. At ${a.kv} kV the line ${a.ok ? `would lose ${a.loss.toFixed(1)} MW` : `cannot carry it at all: it delivers ${a.got.toFixed(0)} MW and burns as much again`}.`;
    }
  });
})();
