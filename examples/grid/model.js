/* The true model behind Plate III: a power grid in miniature.
   One generator feeds one town through a step-up transformer, a three-phase line and a
   step-down transformer. The model keeps two balances:
   - Power: the turbine's mechanical power Pm against the electrical load Pe. Any mismatch
     speeds or slows the spinning machine (the swing equation), which is what grid frequency is.
   - Losses: the line's I²R heating, which falls with the square of the transmission voltage.
   A flyball governor answers frequency within seconds (droop); slower automatic control
   brings it back to 50 Hz. Units: MW, kV, A, Hz, s. */
(function (root) {
  "use strict";
  const P0 = {
    f0: 50, S: 150,          // nominal frequency, machine rating (MW)
    H: 6,                    // inertia constant (s): kinetic energy at speed / rating
    droop: 0.04,             // 4 % droop: a 2 Hz fall would open the valve fully
    Tg: 0.9,                 // turbine and governor lag (s)
    Pnl: 1.2,                // no-load losses at 50 Hz: friction, windage, excitation (MW)
    overspeed: 51.2,         // above this the valves close fast
    Ki: 0.03,                // automatic generation control, per second
    D: 1.5,                  // load relief: % of load per Hz
    R: 9.0,                  // line resistance per phase (ohm): about 110 km of conductor
    Vgen: 11,                // generator terminal voltage (kV)
    Vdist: 11,               // town distribution voltage (kV)
    Vhome: 0.23,             // household supply (kV)
    ufls: 48.8,              // under-frequency: the town is disconnected below this
  };
  const TX_KV = [33, 66, 132, 220, 400];

  function make(o = {}) {
    return {
      t: 0, f: 50, Pm: o.demand ?? 60, Pref: o.demand ?? 60, demand: o.demand ?? 60, kv: o.kv ?? 220,
      closed: true, tripped: false, rot: 0, ac: 0, noise: 0, ramp: 1,
    };
  }

  /* What the line delivers for a given sending power: losses and voltage drop, unity power factor. */
  function line(Pload, kv) {
    // Solve Ps = Pload + Ps² R / V² for the sending power Ps (MW, kV, ohm).
    const a = P0.R / (kv * kv); // per MW
    const disc = 1 - 4 * a * Pload;
    if (disc <= 0) {
      // More than the line can carry: it delivers its maximum, V²/4R, at half the sending voltage.
      const Ps = 1 / (2 * a), got = 1 / (4 * a);
      return { Ps, got, loss: Ps - got, ok: false, drop: 0.5, I: (Ps / (Math.sqrt(3) * kv)) * 1000 };
    }
    const Ps = (1 - Math.sqrt(disc)) / (2 * a);
    const I = (Ps / (Math.sqrt(3) * kv)) * 1000; // A
    return { Ps, got: Pload, loss: Ps - Pload, ok: true, drop: (Ps - Pload) / Ps, I };
  }

  function step(s, dt) {
    const f0 = P0.f0, df = s.f - f0;
    // slowly wandering demand keeps the grid alive, as every real evening does
    s.noise += (-s.noise * 0.3 + (Math.random() - 0.5) * 2.2) * dt;
    // after a reconnection the town's load is picked up at about 5 MW a second, block by block
    s.ramp = s.closed ? Math.min(1, s.ramp + (dt * 5) / Math.max(5, s.demand)) : 0;
    const want = s.closed ? Math.max(0, (s.demand * (1 + (P0.D / 100) * df) + s.noise) * s.ramp) : 0;
    const L = line(want, s.kv);
    const Pe = (s.closed ? L.Ps : 0) + P0.Pnl * (s.f / f0) * (s.f / f0);
    // swing equation: 2H/f0 · df/dt = (Pm - Pe)/S
    s.f += ((f0 / (2 * P0.H)) * ((s.Pm - Pe) / P0.S)) * dt;
    // governor: droop sets the target, the turbine follows with a lag
    const target = s.Pref - (df / f0 / P0.droop) * P0.S;
    s.Pm += ((Math.max(0, Math.min(P0.S, target)) - s.Pm) / P0.Tg) * dt;
    if (s.f > P0.overspeed) s.Pm *= Math.exp(-dt / 0.15); // fast valving against overspeed
    // automatic generation control: nudges the set point until 50 Hz returns
    s.Pref = Math.max(0, Math.min(P0.S, s.Pref - P0.Ki * df * P0.S * dt));
    // protection: a deep frequency fall disconnects the town
    if (s.closed && s.f < P0.ufls) { s.closed = false; s.tripped = true; }
    // the machine turns: 2 poles, so one revolution per cycle; drawn 100 times slower
    s.rot += 2 * Math.PI * (s.f / 100) * dt;
    s.ac += 2 * Math.PI * (s.f / 100) * dt;
    s.t += dt;
    s.last = { want, got: s.closed ? L.got : 0, Pe, loss: s.closed ? L.loss : 0, I: s.closed ? L.I : 0, drop: s.closed ? L.drop : 0, ok: L.ok };
  }

  function read(s) {
    const l = s.last || { want: 0, got: 0, Pe: 0, loss: 0, I: 0, drop: 0, ok: true };
    const Vtown = s.closed ? 1 - l.drop : 0;
    const Igen = s.closed ? (l.Pe / (Math.sqrt(3) * P0.Vgen)) * 1000 : 0;
    return {
      f: s.f, Pm: s.Pm, Pe: l.Pe, load: l.got, want: l.want, loss: l.loss, I: l.I, Igen, Vtown, kv: s.kv,
      eff: l.Pe > 0 ? l.got / Math.max(l.got + l.loss, 1e-6) : 1, short: l.want > 0 ? 1 - l.got / l.want : 0, closed: s.closed, tripped: s.tripped, ok: l.ok,
      rot: s.rot, ac: s.ac, emf: Math.sin(s.ac), demand: s.demand, governor: Math.max(0, Math.min(1, s.Pm / P0.S)),
      turns: s.kv / P0.Vgen, home: Vtown * P0.Vhome * 1000,
    };
  }

  /* Losses for the current demand at every available voltage: the chart in wall text III. */
  function lossCurve(demand) { return TX_KV.map((kv) => ({ kv, ...line(demand, kv) })); }

  root.GridModel = { P0, TX_KV, make, step, read, line, lossCurve };
})(typeof window !== "undefined" ? window : globalThis);
