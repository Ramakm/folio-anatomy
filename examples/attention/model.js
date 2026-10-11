/* The true model behind Plate I. One attention head of a toy transformer, d_model = 11, d_k = 8.
   Every number the plate shows (dial needles, fluid levels, strata, ledger, matrix) is read from here. */
(function (root) {
  "use strict";
  const TOKENS = [
    { w: "The", bos: 1, fn: 1 },
    { w: "cat", noun: 1, anim: 1 },
    { w: "sat", verb: 1 },
    { w: "on", fn: 1 },
    { w: "the", fn: 1 },
    { w: "mat", noun: 1 },
    { w: "because", fn: 1 },
    { w: "it", pron: 1 },
  ];
  const W1 = 1.1, W2 = 0.35; // two positional frequencies, in radians per token
  const FEATS = ["1", "bos", "noun", "anim", "pron", "verb", "fn", "cos ω₁i", "sin ω₁i", "cos ω₂i", "sin ω₂i"];
  const F = Object.fromEntries(FEATS.map((n, i) => [n, i]));
  const DM = FEATS.length, DK = 8;

  const x = TOKENS.map((t, i) => {
    const v = new Array(DM).fill(0);
    v[F["1"]] = 1;
    for (const k of ["bos", "noun", "anim", "pron", "verb", "fn"]) v[F[k]] = t[k] || 0;
    v[F["cos ω₁i"]] = Math.cos(W1 * i); v[F["sin ω₁i"]] = Math.sin(W1 * i);
    v[F["cos ω₂i"]] = Math.cos(W2 * i); v[F["sin ω₂i"]] = Math.sin(W2 * i);
    return v;
  });

  /* Sparse weight matrices: [feature, column, value]. */
  const rot = (b, w, c0, fc, fs) => [
    [fc, c0, b * Math.cos(w)], [fs, c0, b * Math.sin(w)],
    [fs, c0 + 1, b * Math.cos(w)], [fc, c0 + 1, -b * Math.sin(w)],
  ];
  const HEADS = [
    {
      id: "I", name: "Coreference", short: "a pronoun looks for the animate noun it stands for",
      Q: [[F.pron, 0, 3.0], [F.verb, 0, 1.0], [F.pron, 1, 2.0], [F.verb, 1, 1.0], [F["1"], 1, 0.4], [F["1"], 2, 1.0]],
      K: [[F.anim, 0, 2.2], [F.noun, 1, 2.0], [F.bos, 2, 1.2], [F["1"], 2, 0.3]],
    },
    {
      id: "II", name: "Previous token", short: "every word looks one step back",
      Q: [...rot(8, W1, 0, F["cos ω₁i"], F["sin ω₁i"]), ...rot(6, W2, 2, F["cos ω₂i"], F["sin ω₂i"])],
      K: [[F["cos ω₁i"], 0, 1], [F["sin ω₁i"], 1, 1], [F["cos ω₂i"], 2, 1], [F["sin ω₂i"], 3, 1]],
    },
    {
      id: "III", name: "Attention sink", short: "spare attention drains to the first token",
      Q: [[F["1"], 5, 3.0]],
      K: [[F.bos, 5, 3.0], [F.fn, 5, 0.5]],
    },
    {
      id: "IV", name: "Verb lookup", short: "nouns and pronouns find the action they take part in",
      Q: [[F.noun, 6, 2.4], [F.pron, 6, 2.6], [F.verb, 6, 0.8]],
      K: [[F.verb, 6, 2.5], [F.fn, 6, 0.5]],
    },
  ];

  const project = (v, W) => {
    const out = new Array(DK).fill(0);
    for (const [r, c, val] of W) out[c] += v[r] * val;
    return out;
  };
  for (const h of HEADS) {
    h.q = x.map((v) => project(v, h.Q));
    h.k = x.map((v) => project(v, h.K));
  }

  /* Scaled dot-product attention for one query row. */
  function attend(head, i, T = 1, causal = true) {
    const h = HEADS[head], q = h.q[i], N = TOKENS.length, sq = Math.sqrt(DK);
    const raw = [], scaled = [], logit = [], masked = [];
    for (let j = 0; j < N; j++) {
      let s = 0; for (let d = 0; d < DK; d++) s += q[d] * h.k[j][d];
      raw.push(s); scaled.push(s / sq); logit.push(s / sq / T); masked.push(causal && j > i);
    }
    const m = Math.max(...logit.filter((_, j) => !masked[j]));
    const ex = logit.map((l, j) => (masked[j] ? 0 : Math.exp(l - m)));
    const Z = ex.reduce((a, b) => a + b, 0);
    const a = ex.map((e) => e / Z);
    const H = -a.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
    let top = 0; a.forEach((p, j) => { if (p > a[top]) top = j; });
    const expAbs = logit.map((l, j) => (masked[j] ? 0 : Math.exp(l)));
    return { raw, scaled, logit, masked, ex: expAbs, Z: expAbs.reduce((s, v) => s + v, 0), a, H, top, q };
  }

  root.AttnModel = { TOKENS, HEADS, FEATS, DM, DK, attend, x };
})(typeof window !== "undefined" ? window : globalThis);
