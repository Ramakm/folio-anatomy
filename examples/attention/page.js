/* Wall texts, ledger, matrix and controls: all read the same model the plate reads. */
(function () {
  "use strict";
  const M = window.AttnModel, P = window.Plate, N = M.TOKENS.length;
  const $ = (id) => document.getElementById(id);
  const n2 = (v) => (Math.abs(v) < 0.005 ? "0.00" : v.toFixed(2));
  const tok = (j) => M.TOKENS[j].w;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // Controls
  $("qseg").innerHTML = M.TOKENS.map((t, j) => `<button data-q="${j}" aria-pressed="false">${t.w}</button>`).join("");
  $("hseg").innerHTML = M.HEADS.map((h, i) => `<button data-h="${i}" aria-pressed="false" title="${h.name}">${h.id}</button>`).join("");
  $("qseg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) P.update({ q: +b.dataset.q }); });
  $("hseg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) P.update({ head: +b.dataset.h }); });
  $("temp").addEventListener("input", (e) => P.update({ T: +Math.pow(2, +e.target.value).toFixed(3) }));
  $("mask").addEventListener("click", () => P.update({ causal: !P.st.causal }));
  $("heads").innerHTML = M.HEADS.map((h, i) => `<button data-h="${i}" aria-pressed="false"><span class="rn">${h.id}</span><span><b>${h.name}</b><small>${h.short}</small></span><span class="h" id="hh${i}"></span></button>`).join("");
  $("heads").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) P.update({ head: +b.dataset.h }); });
  $("ledger").addEventListener("click", (e) => { const r = e.target.closest("tr"); if (r) P.update({ q: +r.dataset.j }); });
  $("matrix").addEventListener("click", (e) => { const b = e.target.closest("[data-row]"); if (b) P.update({ q: +b.dataset.row }); });

  // Key: hovering an entry lights its pin on the plate.
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
  document.getElementById("plate-svg").addEventListener("mouseover", (e) => { const p = e.target.closest(".pin"); light(p ? p.dataset.pin : null); });

  const strip = (v) => {
    const mx = 3.2;
    return `<span class="strip">${v.map((x) => {
      const a = Math.min(1, Math.abs(x) / mx);
      const c = x >= 0 ? `color-mix(in srgb, var(--accent) ${Math.round(a * 100)}%, var(--paper))` : `color-mix(in srgb, var(--ink-3) ${Math.round(a * 100)}%, var(--paper))`;
      return `<i style="background:${c}" title="${x.toFixed(2)}"></i>`;
    }).join("")}</span>`;
  };

  P.on((st, r) => {
    const h = M.HEADS[st.head];
    // controls
    $("qseg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.q === st.q));
    $("hseg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.h === st.head));
    $("heads").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.h === st.head));
    $("qname").textContent = tok(st.q);
    $("hname").textContent = h.id + " · " + h.name;
    $("hdesc").textContent = h.short.charAt(0).toUpperCase() + h.short.slice(1) + ".";
    $("tval").textContent = "T = " + st.T.toFixed(2);
    const tv = Math.log2(st.T); if (Math.abs(+$("temp").value - tv) > 0.011) $("temp").value = tv.toFixed(2);
    $("mask").setAttribute("aria-pressed", st.causal);
    $("mask").textContent = st.causal ? "Causal" : "Open";

    // readout
    $("readout").innerHTML = `${tok(st.q)} → <b>${tok(r.top)} ${r.a[r.top].toFixed(2)}</b> · H ${r.H.toFixed(2)} bits · head ${h.id}`;

    // stages
    const open = r.a.map((_, j) => j).filter((j) => !r.masked[j]);
    const best = open.slice().sort((a, b) => r.raw[b] - r.raw[a]);
    $("L1").innerHTML = best.slice(0, 3).map((j) => `q·k(${tok(j)}) = ${j === r.top ? "<b>" : ""}${n2(r.raw[j])}${j === r.top ? "</b>" : ""}`).join("<br>");
    $("L2").innerHTML = best.slice(0, 3).map((j) => `${tok(j)}: ${n2(r.raw[j])} / 2.83 = ${n2(r.scaled[j])}`).join("<br>") + `<br>then ÷ T ${st.T.toFixed(2)}`;
    const Z = r.Z;
    $("L3").innerHTML = `Σ e<sup>z</sup> = ${Z < 1000 ? Z.toFixed(2) : Z.toExponential(2)}<br>` + best.slice(0, 2).map((j) => `a(${tok(j)}) = ${r.ex[j] < 1000 ? r.ex[j].toFixed(2) : r.ex[j].toExponential(2)} / Σ = ${j === r.top ? "<b>" : ""}${r.a[j].toFixed(3)}${j === r.top ? "</b>" : ""}`).join("<br>") +
      `<br>${r.masked.filter(Boolean).length} shut · Σ a = ${r.a.reduce((s, v) => s + v, 0).toFixed(3)}`;
    const ranked = open.slice().sort((a, b) => r.a[b] - r.a[a]);
    $("L4").innerHTML = `o = ` + ranked.slice(0, 3).map((j) => `${r.a[j].toFixed(2)}·v(${tok(j)})`).join(" + ") + (ranked.length > 3 ? ` + ${(1 - ranked.slice(0, 3).reduce((s, j) => s + r.a[j], 0)).toFixed(2)} rest` : "") +
      `<br>entropy ${r.H.toFixed(2)} of ${Math.log2(open.length).toFixed(2)} bits`;

    // ledger
    $("qline").innerHTML = `<span class="label">Query</span><b style="font-family:var(--body);font-size:14px;color:var(--ink)">${tok(st.q)}</b> q = ${strip(r.q)} <span>[${r.q.map((v) => v.toFixed(1)).join(", ")}]</span>`;
    $("ledger").innerHTML = M.TOKENS.map((t, j) => {
      const m = r.masked[j];
      return `<tr data-j="${j}" class="${j === st.q ? "q" : ""} ${m ? "mask" : ""}"><td>${j}</td><td class="tok">${t.w}</td><td>${strip(h.k[j])}</td>` +
        `<td>${n2(r.raw[j])}</td><td>${n2(r.scaled[j])}</td><td>${n2(r.logit[j])}</td><td>${m ? "shut" : r.ex[j] < 1000 ? r.ex[j].toFixed(2) : r.ex[j].toExponential(1)}</td>` +
        `<td class="w">${m ? "masked" : `<span class="bar"><span><i style="width:${(r.a[j] * 100).toFixed(1)}%"></i></span>${r.a[j].toFixed(3)}</span>`}</td></tr>`;
    }).join("");

    // matrix
    let g = `<span></span>` + M.TOKENS.map((t) => `<span class="ch">${t.w}</span>`).join("");
    for (let i = 0; i < N; i++) {
      const ri = M.attend(st.head, i, st.T, st.causal);
      g += `<span class="rh" data-row="${i}">${tok(i)}</span>`;
      for (let j = 0; j < N; j++) {
        const a = ri.a[j], m = ri.masked[j];
        g += `<button data-row="${i}" class="${m ? "mask" : ""} ${i === st.q ? "row" : ""} ${a > 0.5 ? "dark" : ""}" aria-label="${tok(i)} to ${tok(j)}: ${m ? "masked" : a.toFixed(2)}">` +
          (m ? "" : `<span class="fill" style="opacity:${Math.pow(a, 0.7).toFixed(3)}"></span><span>${a >= 0.995 ? "1" : a.toFixed(2).replace(/^0/, "")}</span>`) + `</button>`;
      }
    }
    $("matrix").innerHTML = g;
    M.HEADS.forEach((hh, i) => { const ri = M.attend(i, st.q, st.T, st.causal); $("hh" + i).textContent = `${tok(st.q)} → ${tok(ri.top)} ${ri.a[ri.top].toFixed(2)}`; });
  });
})();
