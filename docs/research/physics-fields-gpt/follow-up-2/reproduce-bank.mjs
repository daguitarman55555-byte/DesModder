// Dependency-free ES module: browser or Node. Reference reproduction, not a production integrator.
export function screen(data, hmax = 0.005, T = 100) {
  let p = data.positions.map((v) => [...v]),
    v = data.velocities.map((v) => [...v]);
  const m = data.masses,
    R = data.radii;
  const dot = (a, b) => a.reduce((s, x, k) => s + x * b[k], 0);
  const sub = (a, b) => a.map((x, k) => x - b[k]);
  function acc(p) {
    const a = m.map(() => [0, 0, 0]);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < i; j++) {
        const d = sub(p[j], p[i]),
          f = dot(d, d) ** -1.5;
        for (let k = 0; k < 3; k++) {
          a[i][k] += m[j] * d[k] * f;
          a[j][k] -= m[i] * d[k] * f;
        }
      }
    return a;
  }
  function energy(p, v) {
    let K = 0,
      U = 0;
    for (let i = 0; i < 3; i++) K += 0.5 * m[i] * dot(v[i], v[i]);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < i; j++)
        U += (m[i] * m[j]) / Math.sqrt(dot(sub(p[i], p[j]), sub(p[i], p[j])));
    return K - U;
  }
  let a = acc(p),
    e0 = energy(p, v),
    err = 0,
    t = 0,
    steps = 0;
  while (t < T) {
    let h = Math.min(hmax, T - t);
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < i; j++) {
        const d = sub(p[i], p[j]),
          r = Math.sqrt(dot(d, d)),
          dv = sub(v[i], v[j]),
          speed = Math.sqrt(dot(dv, dv));
        h = Math.min(
          h,
          0.025 * Math.sqrt(r ** 3 / (m[i] + m[j])),
          (0.025 * r) / Math.max(speed, 1e-12)
        );
      }
    const pn = p.map((w, i) =>
      w.map((x, k) => x + v[i][k] * h + 0.5 * a[i][k] * h * h)
    );
    let collision = null;
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < i; j++) {
        const d = sub(p[i], p[j]),
          dn = sub(pn[i], pn[j]),
          delta = sub(dn, d);
        const s = Math.max(
          0,
          Math.min(1, -dot(d, delta) / Math.max(dot(delta, delta), 1e-30))
        );
        const near = d.map((x, k) => x + s * delta[k]);
        if (dot(near, near) <= (R[i] + R[j]) ** 2) collision = [i, j];
      }
    if (collision)
      return {
        collision_time: t + h,
        collision_pair: collision,
        max_relative_energy_error: err,
        steps,
      };
    const an = acc(pn);
    v = v.map((w, i) => w.map((x, k) => x + 0.5 * (a[i][k] + an[i][k]) * h));
    p = pn;
    a = an;
    t += h;
    steps++;
    if (steps % 100 === 0)
      err = Math.max(err, Math.abs((energy(p, v) - e0) / e0));
    if (Math.max(...p.map((w) => Math.sqrt(dot(w, w)))) > 15)
      return { escaped_time: t, max_relative_energy_error: err, steps };
  }
  return { survived_to: T, max_relative_energy_error: err, steps };
}

export function verifyBank(bank) {
  return bank.cases.map((c) => {
    const started = performance.now();
    const coarse = screen(c, 0.005),
      fine = screen(c, 0.0025);
    const dc = Math.abs(coarse.collision_time - c.screen.collision_time);
    const df = Math.abs(fine.collision_time - c.half_step_check.collision_time);
    return {
      id: c.id,
      coarse,
      fine,
      coarseTimeDifference: dc,
      fineTimeDifference: df,
      passesReference:
        dc < 0.01 &&
        df < 0.01 &&
        JSON.stringify(coarse.collision_pair) ===
          JSON.stringify(c.screen.collision_pair) &&
        JSON.stringify(fine.collision_pair) ===
          JSON.stringify(c.half_step_check.collision_pair),
      elapsedMs: performance.now() - started,
    };
  });
}
