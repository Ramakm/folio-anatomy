/* The true model behind Plate IV: how a hash map resolves collisions.
   Keys are hashed with Java's String.hashCode, spread as java.util.HashMap does (h ^ h>>>16),
   and folded to a slot with a mask: i = spread(h) & (m − 1), the same as h mod m for m a power
   of two. Three ways to settle a collision:
   - chaining:   every slot holds a list; a new key joins the end of its slot's list.
   - linear:     open addressing; try i, i+1, i+2, … until a slot is free.
   - quadratic:  open addressing; try i, i+1, i+3, i+6, … (triangular steps, which visit every
                 slot when m is a power of two).
   When the load α = n/m would pass 0.75 the table doubles and every key is placed again. */
(function (root) {
  "use strict";
  const KEYS = ["pear", "plum", "kiwi", "fig", "date", "lemon", "lime", "quince"];
  const ABSENT = ["cherry", "melon", "banana"];
  const MODES = [
    { id: "chain", name: "Separate chaining", short: "Chaining" },
    { id: "linear", name: "Linear probing", short: "Linear" },
    { id: "quad", name: "Quadratic probing", short: "Quadratic" },
  ];
  const LIMIT = 0.75, M0 = 4, MMAX = 8;

  const hashCode = (s) => { let h = 0; for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0; return h; };
  const spread = (h) => h ^ (h >>> 16);
  const index = (s, m) => spread(hashCode(s)) & (m - 1);
  const hex = (h) => "0x" + (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
  const bits = (v, n) => (v >>> 0).toString(2).padStart(32, "0").slice(-n);
  const step = (mode, i) => (mode === "quad" ? (i * (i + 1)) / 2 : i);

  /* Probe sequence of a key in an open-addressed table: the slots tried, ending at the one
     that holds it (found) or the first empty one (absent or about to be placed). */
  function probe(slots, key, mode, m) {
    const h = index(key, m), path = [];
    for (let i = 0; i < m; i++) {
      const s = (h + step(mode, i)) & (m - 1);
      path.push(s);
      if (slots[s] === null || slots[s] === key) return { path, slot: s, found: slots[s] === key };
    }
    return { path, slot: -1, found: false }; // full: every slot tried
  }

  function empty(mode, m) {
    return { mode, m, n: 0, slots: new Array(m).fill(null), chains: Array.from({ length: m }, () => []) };
  }
  function put(t, key) {
    if (t.mode === "chain") { t.chains[index(key, t.m)].push(key); t.n++; return true; }
    const p = probe(t.slots, key, t.mode, t.m);
    if (p.slot < 0) return false;
    t.slots[p.slot] = key; t.n++; return true;
  }

  /* Build the table from a list of keys, inserted in order, resizing as needed.
     Returns the table, every key's home slot, path and cost, and the history of resizes. */
  function place(keys, o = {}) {
    const mode = o.mode || "chain", auto = o.auto !== false;
    let t = empty(mode, o.m0 || M0);
    const order = [], resizes = [];
    let refused = null;
    for (const k of keys) {
      if (auto && t.m < MMAX && (t.n + 1) / t.m > LIMIT) {
        const from = t.m, nt = empty(mode, t.m * 2);
        for (const old of order) put(nt, old); // placed again in the order they arrived
        resizes.push({ before: k, at: t.n, from, to: nt.m });
        t = nt;
      }
      if (!put(t, k)) { refused = k; break; }
      order.push(k);
    }
    const entries = {};
    for (const k of order) entries[k] = locate(t, k);
    return { ...t, keys: order, entries, resizes, refused, alpha: t.n / t.m, full: mode !== "chain" && t.n >= t.m };
  }

  /* Where a key is, and what it costs to find it: the slots read and the keys compared. */
  function locate(t, key) {
    const home = index(key, t.m), h = hashCode(key);
    if (t.mode === "chain") {
      const ch = t.chains[home], pos = ch.indexOf(key);
      const seen = pos >= 0 ? ch.slice(0, pos + 1) : ch.slice();
      return { key, h, home, slot: home, pos, found: pos >= 0, path: [home], compared: seen, probes: pos >= 0 ? pos + 1 : ch.length };
    }
    const p = probe(t.slots, key, t.mode, t.m);
    return { key, h, home, slot: p.slot, pos: 0, found: p.found, path: p.path, compared: p.path.map((s) => t.slots[s]).filter(Boolean), probes: p.path.length };
  }

  /* Averages over the table as it stands: a successful search for every stored key, and an
     unsuccessful one starting from every slot (each slot equally likely as a home). */
  function measure(t) {
    const hit = t.keys.length ? t.keys.reduce((a, k) => a + t.entries[k].probes, 0) / t.keys.length : 0;
    let miss = 0;
    for (let h = 0; h < t.m; h++) {
      if (t.mode === "chain") miss += t.chains[h].length;
      else {
        let i = 0;
        for (; i < t.m; i++) if (t.slots[(h + step(t.mode, i)) & (t.m - 1)] === null) break;
        miss += Math.min(t.m, i + 1);
      }
    }
    let longest = 0, collided = 0;
    for (const k of t.keys) { const e = t.entries[k]; if (e.probes > 1) collided++; longest = Math.max(longest, e.probes); }
    return { hit, miss: miss / t.m, longest, collided };
  }

  /* Knuth's averages for a table at load α with keys hashed uniformly. */
  function expected(mode, a) {
    if (mode === "chain") return { hit: 1 + a / 2, miss: a };
    if (a >= 1) return { hit: Infinity, miss: Infinity };
    if (mode === "linear") return { hit: 0.5 * (1 + 1 / (1 - a)), miss: 0.5 * (1 + 1 / ((1 - a) * (1 - a))) };
    return { hit: 1 - Math.log(1 - a) - a / 2, miss: 1 / (1 - a) - a - Math.log(1 - a) };
  }

  root.HashModel = { KEYS, ABSENT, MODES, LIMIT, M0, MMAX, hashCode, spread, index, hex, bits, step, place, locate, measure, expected, probe };
})(typeof window !== "undefined" ? window : globalThis);
