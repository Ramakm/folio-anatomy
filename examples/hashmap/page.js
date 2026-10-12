/* Plate IV wall texts: the five terms, the ledger, the whole table and the cost curves,
   all read from the bench's own model. */
(function () {
  "use strict";
  const HM = window.HashModel, P = window.Plate;
  const $ = (id) => document.getElementById(id);
  const MODE_DESC = {
    chain: "Every bin holds a list. A key that finds its bin taken is hung at the end of that bin's chain.",
    linear: "One key per bin. If the home bin is taken, try the next, and the next, wrapping round at the end.",
    quad: "One key per bin, but the steps grow: 1, 2, 3 … bins further each time, so clusters spread out.",
  };
  const RULE = {
    chain: "chain[home].append(key)",
    linear: "slot = (home + i) & (m − 1)",
    quad: "slot = (home + i(i+1)/2) & (m − 1)",
  };
  const ord = (n) => n + (n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th");
  const bitsHtml = (key, m) => {
    const b = HM.bits(HM.spread(HM.hashCode(key)), 4), low = Math.log2(m);
    return `<span class="bits">${b.slice(0, 4 - low)}<i>${b.slice(4 - low)}</i></span>`;
  };

  const STEPS = [
    { rn: "i.", name: "Hash", rule: "h = s[0]·31ⁿ⁻¹ + … + s[n−1]", d: "The press reads the key letter by letter and folds it into one 32-bit number (pin 2). Equal keys always give equal numbers." },
    { rn: "ii.", name: "Fold", rule: "slot = (h ^ h>>>16) & (m − 1)", d: "The dial keeps only the low bits, as many as the table has bins for (pin 3). That is the key's home bin." },
    { rn: "iii.", name: "Collide", rule: "table[slot] ≠ empty", d: "Eight keys and at most eight bins, with hashes that agree in their low bits: some must share. A collision is a key whose home is already taken (pin 5, red edge)." },
    { rn: "iv.", name: "Resolve", rule: "", d: "" },
    { rn: "v.", name: "Grow", rule: "α = n/m > 0.75 ⇒ m ← 2m", d: "As the table fills, every search gets longer. Past three quarters full the shutters lift (pin 8) and each key is filed again by one more bit." },
  ];
  $("steps").innerHTML = STEPS.map((s, i) => `<div class="stage"><span class="rn">${s.rn}</span><h3>${s.name}</h3><div class="eq small" id="eq${i}">${s.rule}</div><p id="sd${i}">${s.d}</p><div class="live" id="st${i}"></div></div>`).join("");

  // Controls
  $("modeseg").innerHTML = HM.MODES.map((m) => `<button data-m="${m.id}" aria-pressed="false">${m.short}</button>`).join("");
  $("modeseg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) P.setMode(b.dataset.m); });
  const LOOK = HM.KEYS.concat(HM.ABSENT);
  $("lookseg").innerHTML = LOOK.map((k) => `<button data-k="${k}" aria-pressed="false">${k}</button>`).join("");
  let lookKey = null;
  $("lookseg").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { lookKey = b.dataset.k; P.lookup(lookKey); } });
  $("ins").addEventListener("click", () => P.insert());
  $("rst").addEventListener("click", () => P.reset());
  $("auto").addEventListener("click", () => P.setAuto(!P.st.auto));
  let demo = true;
  $("demo").addEventListener("click", () => { demo = !demo; P.demo(demo); $("demo").setAttribute("aria-pressed", demo); $("demo").textContent = demo ? "Running" : "Paused"; });
  $("ledger").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-k]"); if (tr) { P.lookup(tr.dataset.k); const fig = $("plate"); fig.scrollIntoView({ behavior: "smooth", block: "center" }); } });

  // Key and pins
  const key = $("key");
  const lightPin = (n) => {
    key.querySelectorAll("li").forEach((li) => li.classList.toggle("on", li.dataset.pin === n));
    document.querySelectorAll("#plate-svg .pin").forEach((p) => p.classList.toggle("on", p.dataset.pin === n));
  };
  key.addEventListener("mouseover", (e) => { const li = e.target.closest("li"); if (li) lightPin(li.dataset.pin); });
  key.addEventListener("mouseleave", () => lightPin(null));
  key.addEventListener("click", (e) => {
    const li = e.target.closest("li"); if (!li) return;
    document.dispatchEvent(new CustomEvent("folio:part", { detail: +li.dataset.pin }));
    const fig = $("plate"), b = fig.getBoundingClientRect();
    if (b.top < 0 || b.bottom > innerHeight) fig.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  let sigLast = "";
  P.on((st, I) => {
    const L = I.layout, m = L.m, ms = I.measure, last = I.last;
    // readout
    let tail = "";
    if (last && last.type === "insert") tail = ` · <b>${last.key}</b> → ${L.mode === "chain" ? (last.pos ? `chain ${last.home}, ${ord(last.pos + 1)}` : `bin ${last.slot}`) : `bin ${last.slot}`} · ${last.probes} probe${last.probes === 1 ? "" : "s"}`;
    else if (last && last.type === "look") tail = ` · find <b>${last.key}</b>: ${last.found ? "found" : "absent"} in ${last.probes} probe${last.probes === 1 ? "" : "s"}`;
    else if (last && last.type === "resize") tail = ` · <b>resizing</b> ${last.from} → ${last.to} bins`;
    else if (last && last.type === "full") tail = ` · <b>${last.key}</b>: table full`;
    $("readout").innerHTML = `${HM.MODES.find((x) => x.id === L.mode).short} · ${L.n}/${m} · α ${(L.n / m).toFixed(2)}${tail}`;

    const sig = [L.mode, L.keys.join(), m, st.auto, last ? JSON.stringify(last) : "", I.busy].join("|");
    if (sig === sigLast) return;
    sigLast = sig;

    // controls
    $("modeseg").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.m === L.mode));
    $("modev").textContent = HM.MODES.find((x) => x.id === L.mode).name;
    $("modedesc").textContent = MODE_DESC[L.mode];
    $("auto").setAttribute("aria-pressed", st.auto); $("auto").textContent = st.auto ? "Auto" : "Fixed at 4";
    $("nmv").textContent = `${L.n} filed · ${m} bins`;
    const next = HM.KEYS.find((k) => !L.entries[k]);
    $("ins").disabled = !next || (L.mode !== "chain" && L.full && !st.auto);
    $("ins").textContent = next ? `File “${next}”` : "All keys filed";
    $("lookseg").querySelectorAll("button").forEach((b) => { b.classList.toggle("absent", !L.entries[b.dataset.k]); b.setAttribute("aria-pressed", b.dataset.k === (last && last.type === "look" ? last.key : lookKey)); });

    // wall text I: follow the last card (or the next one)
    const k = last && last.key ? last.key : next || HM.KEYS[0];
    const h = HM.hashCode(k), home = HM.index(k, m), e = L.entries[k];
    $("eq3").textContent = RULE[L.mode];
    $("sd3").textContent = L.mode === "chain" ? "The card is hung at the end of the chain in front of its bin (pin 6). Finding it later means walking the chain, card by card." : `The carriage tries the next bin in the sequence (pin 7) until it finds the key or an empty bin. Each try is one probe.`;
    const occupant = L.mode === "chain" ? (L.chains[home] || []).filter((x) => x !== k) : [L.slots[home]].filter((x) => x && x !== k);
    $("st0").innerHTML = `${k} → <b>${HM.hex(h)}</b><br>${h} as a signed int`;
    $("st1").innerHTML = `low bits ${bitsHtml(k, m)} · m = ${m}<br>home bin <b>${home}</b>`;
    $("st2").innerHTML = occupant.length ? `bin ${home} also holds <b>${occupant.join(", ")}</b><br>${ms.collided} of ${L.n} keys collided` : `bin ${home} was free for it<br>${ms.collided} of ${L.n} keys collided`;
    $("st3").innerHTML = e ? (L.mode === "chain" ? `chain ${home}, position <b>${e.pos + 1}</b><br>found in ${e.probes} comparison${e.probes === 1 ? "" : "s"}` : `tried ${e.path.join(" → ")}<br>filed in bin <b>${e.slot}</b> · ${e.probes} probe${e.probes === 1 ? "" : "s"}`) : (last && last.type === "look" ? `tried ${last.path.join(" → ")}<br><b>${last.found ? "found" : "absent"}</b> after ${last.probes}` : "not filed yet");
    $("st4").innerHTML = `α = ${L.n} / ${m} = <b>${(L.n / m).toFixed(2)}</b><br>${st.auto ? (m < HM.MMAX ? `doubles when key ${Math.floor(HM.LIMIT * m) + 1} arrives` : "eight bins: the most this bench holds") : "resizing off"}`;

    // vitals
    const warnA = L.n / m > HM.LIMIT;
    const tiles = [
      ["Keys", `${L.n}`], ["Bins", `${m}`], ["Load α", `${(L.n / m).toFixed(2)}`, warnA],
      ["Probes, found", `${ms.hit.toFixed(2)}`, ms.hit > 2], ["Probes, absent", `${ms.miss.toFixed(2)}`, ms.miss > 3], ["Collided", `${ms.collided}<small>of ${L.n}</small>`],
    ];
    $("vitals").innerHTML = tiles.map(([l, v, w]) => `<div class="${w ? "warn" : ""}"><span class="label">${l}</span><b>${v}</b></div>`).join("");

    // ledger
    $("ledger").innerHTML = L.keys.map((kk) => {
      const en = L.entries[kk], clash = L.mode === "chain" ? en.pos > 0 : en.slot !== en.home;
      const where = L.mode === "chain" ? (en.pos ? `chain ${en.home} · ${ord(en.pos + 1)}` : `bin ${en.slot}`) : `bin ${en.slot}`;
      const what = !clash ? "Its home bin was free." : L.mode === "chain" ? `Bin ${en.home} was taken by ${L.chains[en.home][0]}; hung ${ord(en.pos + 1)} on its chain.` : `Bin ${en.home} was taken; tried ${en.path.join(" → ")}.`;
      const isLast = last && last.key === kk;
      return `<tr data-k="${kk}" class="${clash ? "clash" : ""}${isLast ? " last" : ""}"><td class="tok">${kk}</td><td>${HM.hex(en.h)}</td><td>${bitsHtml(kk, m)}</td><td>${en.home}</td><td class="slot">${where}</td><td>${en.probes}</td><td style="font-family:var(--body);white-space:normal;text-align:left">${what}</td></tr>`;
    }).join("") || `<tr><td colspan="7" style="font-family:var(--body);text-align:left">The table is empty. File a key to begin.</td></tr>`;

    // the whole table
    const cells = [];
    for (let i = 0; i < m; i++) {
      const ks = L.mode === "chain" ? L.chains[i] : (L.slots[i] ? [L.slots[i]] : []);
      cells.push(`<div class="cell${ks.length ? "" : " empty"}"><span class="ix">${i}</span>${ks.map((x) => `<span class="k${(L.mode === "chain" ? L.entries[x].pos > 0 : L.entries[x].slot !== L.entries[x].home) ? " clash" : ""}" title="${x}: home ${L.entries[x].home}">${x}</span>`).join("")}</div>`);
    }
    $("tview").innerHTML = cells.join(""); $("tview").style.setProperty("--cols", m);
    $("tlegend").innerHTML = `<span>${m} bins</span><span style="color:var(--accent)">red: not in its first choice</span>`;
    const longest = L.mode === "chain" ? Math.max(0, ...L.chains.map((c) => c.length)) : 0;
    let run = 0, best = 0; if (L.mode !== "chain") for (let i = 0; i < 2 * m; i++) { if (L.slots[i % m]) { run++; best = Math.max(best, Math.min(run, m)); } else run = 0; }
    $("tnote").textContent = L.mode === "chain"
      ? `The longest chain holds ${longest}. Keys never leave their home bin; a crowded bin just grows a longer chain.`
      : `The longest run of full bins is ${best}. In open addressing a run grows from both ends: any key whose home falls inside it lands at its end, which is why linear probing slows so sharply as the table fills.`;

    // curves
    const X = (a) => 44 + (a / 1.5) * 360, Y = (p) => 262 - ((Math.min(p, 6) - 1) / 5) * 236;
    let g = "";
    for (let p = 1; p <= 6; p++) g += `<line class="grid" x1="44" x2="404" y1="${Y(p)}" y2="${Y(p)}"/><text x="38" y="${Y(p) + 3.5}" text-anchor="end">${p}</text>`;
    for (const a of [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5]) g += `<text x="${X(a)}" y="280" text-anchor="middle">${a}</text>`;
    g += `<line class="limit" x1="${X(0.75)}" x2="${X(0.75)}" y1="26" y2="262"/><text x="${X(0.75) + 4}" y="36" style="fill:var(--accent)">resize</text>`;
    g += `<line class="ax" x1="44" x2="404" y1="262" y2="262"/><text x="8" y="14">probes</text><text x="404" y="296" text-anchor="end">load α = n / m</text>`;
    for (const md of ["chain", "linear", "quad"]) {
      const pts = [];
      for (let a = 0; a <= (md === "chain" ? 1.5 : 0.93); a += 0.01) { const v = HM.expected(md, a).hit; if (v > 6.2) break; pts.push(`${X(a).toFixed(1)} ${Y(v).toFixed(1)}`); }
      g += `<path class="c-${md}${md === L.mode ? " on" : ""}" d="M${pts.join("L")}"/>`;
    }
    const aNow = L.n / m;
    if (L.n) {
      const ex = HM.expected(L.mode, aNow).hit;
      if (isFinite(ex)) g += `<circle class="now" cx="${X(aNow)}" cy="${Y(ex)}" r="3"/>`;
      g += `<circle class="meas" cx="${X(Math.min(1.5, aNow))}" cy="${Y(ms.hit)}" r="5.5"/>`;
    }
    $("curve").innerHTML = g;
    const exNow = HM.expected(L.mode, aNow).hit;
    $("cnote").textContent = L.n
      ? `At α = ${aNow.toFixed(2)}, ${HM.MODES.find((x) => x.id === L.mode).name.toLowerCase()} should cost about ${isFinite(exNow) ? exNow.toFixed(2) : "∞"} probes per successful search; these ${L.n} keys cost ${ms.hit.toFixed(2)}. With so few keys, luck matters: the curve is the average over many tables.`
      : "File a few keys to place this table on the curves.";
  });
})();
