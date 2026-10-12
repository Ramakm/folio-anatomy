/* The true model behind Plate II: a lumped-parameter model of the human circulation.
   Four heart chambers are time-varying elastances, P = E(t)(V - V0). The pulmonary and
   systemic circuits are compliances joined by resistances. Valves are diodes; a damaged
   valve becomes a narrow orifice (stenosis) or leaks backwards (regurgitation).
   Units: volume mL, pressure mmHg, flow mL/s, time s. */
(function (root) {
  "use strict";
  const CH = ["RA", "RV", "PA", "PV", "LA", "LV", "SA", "SV"];
  const NAME = {
    RA: "Right atrium", RV: "Right ventricle", PA: "Pulmonary arteries", PV: "Pulmonary veins",
    LA: "Left atrium", LV: "Left ventricle", SA: "Systemic arteries", SV: "Systemic veins",
  };
  const P0 = {
    // chambers: Emax, Emin (mmHg/mL), V0 (mL)
    RA: { Emax: 0.25, Emin: 0.12, V0: 4 },
    RV: { Emax: 0.55, Emin: 0.05, V0: 10 },
    LA: { Emax: 0.30, Emin: 0.15, V0: 4 },
    LV: { Emax: 2.5, Emin: 0.07, V0: 8 },
    // vessels: compliance C (mL/mmHg), V0 (mL, unstressed)
    PA: { C: 4.0, V0: 120 }, PV: { C: 18, V0: 180 }, SA: { C: 1.6, V0: 700 }, SV: { C: 65, V0: 2600 },
    // resistances, mmHg·s/mL
    R: { tri: 0.004, pulv: 0.004, pul: 0.08, pv: 0.012, mit: 0.004, aov: 0.005, sys: 1.1, sv: 0.03 },
  };
  const FAULTS = {
    normal: { id: "normal", name: "Healthy", note: "every valve opens wide and seals" },
    as: { id: "as", name: "Aortic stenosis", note: "a narrowed aortic valve the ventricle must force blood through" },
    mr: { id: "mr", name: "Mitral regurgitation", note: "a leaking mitral valve; some blood flows back each beat" },
  };

  function make(opts = {}) {
    const s = {
      HR: opts.HR ?? 72, contract: opts.contract ?? 1, fault: opts.fault ?? "normal",
      t: 0, tc: 0, V: { RA: 50, RV: 120, PA: 190, PV: 330, LA: 60, LV: 120, SA: 820, SV: 3070 },
      P: {}, Q: {}, phase: "", valves: {},
    };
    s.total = Object.values(s.V).reduce((a, b) => a + b, 0);
    return s;
  }

  /* Ventricular and atrial activation, 0..1, from the time since the last ventricular onset. */
  function activation(tc, T) {
    const Ts1 = 0.42 * Math.sqrt(T), Ts2 = 0.2 * Ts1;
    let v = 0;
    if (tc < Ts1) v = 0.5 * (1 - Math.cos((Math.PI * tc) / Ts1));
    else if (tc < Ts1 + Ts2) v = 0.5 * (1 + Math.cos((Math.PI * (tc - Ts1)) / Ts2));
    const Ta = Math.min(0.2, 0.25 * T), ta0 = T - Ta - 0.02;
    let a = 0;
    if (tc > ta0 && tc < ta0 + Ta) a = 0.5 * (1 - Math.cos((2 * Math.PI * (tc - ta0)) / Ta));
    return { v, a, Ts1, Ts2 };
  }

  function pressures(s) {
    const T = 60 / s.HR, act = activation(s.tc, T), P = {};
    for (const c of ["RA", "LA"]) { const p = P0[c]; P[c] = (p.Emin + (p.Emax - p.Emin) * act.a) * (s.V[c] - p.V0); }
    for (const c of ["RV", "LV"]) {
      const p = P0[c], Emax = c === "LV" ? p.Emax * s.contract : p.Emax * (0.6 + 0.4 * s.contract);
      P[c] = (p.Emin + (Emax - p.Emin) * act.v) * (s.V[c] - p.V0);
    }
    for (const c of ["PA", "PV", "SA", "SV"]) P[c] = (s.V[c] - P0[c].V0) / P0[c].C;
    return { P, act };
  }

  function flows(s, P) {
    const R = P0.R, f = s.fault, d = (a, b, r) => Math.max(0, (a - b) / r);
    const Q = {
      sv: (P.SV - P.RA) / R.sv,
      tri: d(P.RA, P.RV, R.tri),
      pulv: d(P.RV, P.PA, R.pulv),
      pul: (P.PA - P.PV) / R.pul,
      pv: (P.PV - P.LA) / R.pv,
      mit: d(P.LA, P.LV, R.mit),
      aov: d(P.LV, P.SA, f === "as" ? 0.16 : R.aov),
      sys: (P.SA - P.SV) / R.sys,
    };
    if (f === "mr" && P.LV > P.LA) Q.mit = -(P.LV - P.LA) / 0.32;
    return Q;
  }

  function step(s, dt) {
    const T = 60 / s.HR;
    const { P } = pressures(s);
    const Q = flows(s, P);
    s.V.SV += (Q.sys - Q.sv) * dt;
    s.V.RA += (Q.sv - Q.tri) * dt;
    s.V.RV += (Q.tri - Q.pulv) * dt;
    s.V.PA += (Q.pulv - Q.pul) * dt;
    s.V.PV += (Q.pul - Q.pv) * dt;
    s.V.LA += (Q.pv - Q.mit) * dt;
    s.V.LV += (Q.mit - Q.aov) * dt;
    s.V.SA += (Q.aov - Q.sys) * dt;
    s.t += dt; s.tc += dt;
    let beat = false;
    if (s.tc >= T) { s.tc -= T; beat = true; }
    return beat;
  }

  /* Read everything the plate shows at the current instant. */
  function read(s) {
    const T = 60 / s.HR, { P, act } = pressures(s), Q = flows(s, P);
    const lvSys = s.tc < act.Ts1 + act.Ts2;
    let phase;
    if (Q.aov > 0.5) phase = "ejection";
    else if (Q.mit > 0.5) phase = act.a > 0.05 ? "atrial kick" : "filling";
    else if (s.tc < act.Ts1) phase = "isovolumic contraction";
    else if (P.LV > P.LA && s.tc < act.Ts1 + act.Ts2 + 0.12) phase = "isovolumic relaxation";
    else phase = "filling";
    const valves = {
      tri: Q.tri > 0.5 ? 1 : 0, pulv: Q.pulv > 0.5 ? 1 : 0,
      mit: Q.mit > 0.5 ? 1 : Q.mit < -0.5 ? -1 : 0, aov: Q.aov > 0.5 ? 1 : 0,
    };
    return { P, Q, V: { ...s.V }, act, phase, valves, T, tc: s.tc, lvSys };
  }

  /* Run to a steady beat, then record one full cycle at fine resolution. */
  function settle(s, beats = 14, dt = 0.0005) {
    let n = 0;
    while (n < beats) if (step(s, dt)) n++;
    const T = 60 / s.HR, rec = [];
    let k = 0;
    const N = Math.round(T / dt);
    for (let i = 0; i < N; i++) { if (i % 8 === 0) rec.push({ t: s.tc, ...read(s) }); step(s, dt); k++; }
    return summarise(rec, T);
  }

  function summarise(rec, T) {
    const mx = (f) => Math.max(...rec.map(f)), mn = (f) => Math.min(...rec.map(f));
    const EDV = mx((r) => r.V.LV), ESV = mn((r) => r.V.LV);
    let fwd = 0, back = 0;
    for (let i = 1; i < rec.length; i++) {
      const dt = rec[i].t - rec[i - 1].t > 0 ? rec[i].t - rec[i - 1].t : 0;
      fwd += Math.max(0, rec[i].Q.aov) * dt;
      back += Math.max(0, -rec[i].Q.mit) * dt;
    }
    const SV = fwd;
    return {
      rec, T,
      LV: [mn((r) => r.P.LV), mx((r) => r.P.LV)], SA: [mn((r) => r.P.SA), mx((r) => r.P.SA)],
      RV: [mn((r) => r.P.RV), mx((r) => r.P.RV)], PA: [mn((r) => r.P.PA), mx((r) => r.P.PA)],
      LA: [mn((r) => r.P.LA), mx((r) => r.P.LA)], RA: [mn((r) => r.P.RA), mx((r) => r.P.RA)],
      EDV, ESV, SV, EF: (EDV - ESV) / EDV, CO: (SV * 60) / T / 1000, regurg: back,
      MAP: rec.reduce((a, r) => a + r.P.SA, 0) / rec.length,
    };
  }

  root.HeartModel = { CH, NAME, P0, FAULTS, make, step, read, settle, activation };
})(typeof window !== "undefined" ? window : globalThis);
