/**
 * Electric field lines of point charges anywhere in the plane, traced.
 *
 * The charges preset drew its lines as contours of the flux function
 * S = Σ qᵢ cos θᵢ, which is exact but exists only while every charge sits on
 * one line. Rafael found on 2026-11-08 that with more than two charges the
 * lines vanished, because any third charge he placed was off that line. No
 * closed form exists for charges placed anywhere, so the lines are traced
 * instead: fourth-order Runge–Kutta along the field's direction, from a ring
 * round each charge, and written into the graph as one list of points with a
 * gap between lines.
 *
 * The field is Coulomb's in space, E = Σ qᵢ (r − rᵢ)/|r − rᵢ|³, the same
 * the arrows and the flow draw, so the lines are tangent to them. A line
 * leaves a positive charge or arrives at a negative one; each charge sends
 * out a number in proportion to |q| (the textbook's density). Lines are
 * traced out of the positive charges first; a negative charge then sends
 * back only the lines it needs beyond those that already reached it, so a
 * dipole's lines are drawn once, not twice.
 */

export interface PointCharge {
  q: number;
  x: number;
  y: number;
}

export interface FieldLineOptions {
  /** A charge's drawn radius: lines start on it and end when they reach one. */
  radius: number;
  /** Lines stop once they leave the square |x|, |y| ≤ this. */
  extent: number;
  /** Lines per unit of charge. */
  perUnit?: number;
  /** The most lines in all, whatever the charges. */
  maxLines?: number;
  /** The most points one line may take. */
  maxSteps?: number;
}

export interface FieldLines {
  /** The lines' points, a line after another, with NaN between them. */
  xs: number[];
  ys: number[];
  lines: number;
}

/** E at (x, y), from charges in space. */
function field(charges: readonly PointCharge[], x: number, y: number) {
  let ex = 0;
  let ey = 0;
  for (const c of charges) {
    const dx = x - c.x;
    const dy = y - c.y;
    const r2 = dx * dx + dy * dy;
    const inv = c.q / (r2 * Math.sqrt(r2) || 1e-300);
    ex += dx * inv;
    ey += dy * inv;
  }
  return [ex, ey] as const;
}

/** The unit direction of E times `sign`, or undefined where E vanishes. */
function direction(
  charges: readonly PointCharge[],
  x: number,
  y: number,
  sign: number
) {
  const [ex, ey] = field(charges, x, y);
  const m = Math.hypot(ex, ey);
  if (!(m > 1e-12) || !Number.isFinite(m)) return undefined;
  return [(sign * ex) / m, (sign * ey) / m] as const;
}

/** Which charge, if any, (x, y) is inside of. */
function insideCharge(
  charges: readonly PointCharge[],
  x: number,
  y: number,
  radius: number,
  except: number
) {
  for (let i = 0; i < charges.length; i++) {
    if (i === except) continue;
    if (Math.hypot(x - charges[i].x, y - charges[i].y) < radius) return i;
  }
  return -1;
}

/**
 * One line from (x, y), along E (sign 1) or against it (sign −1). Returns
 * its points and the charge it ended in, or −1 if it left the picture or
 * stalled where the field vanishes.
 */
function trace(
  charges: readonly PointCharge[],
  start: readonly [number, number],
  from: number,
  sign: number,
  options: Required<FieldLineOptions>
) {
  const { radius, extent, maxSteps } = options;
  // Followed well past the picture, not cut at its edge: a dipole's outer
  // lines leave the view and come back round to the negative charge. Cut
  // at 1.25 × the extent, they never arrived, and the negative charge made
  // up the lines it was missing from the widest gaps, so the picture was
  // lopsided: a line out of + on one side, none into − on the other
  // (Rafael, 2026-11-09: "the field lines are wrong").
  const limit = extent * 8;
  let [x, y] = start;
  const xs = [x];
  const ys = [y];
  let lastKept = [x, y];
  let lastDir: readonly [number, number] | undefined;
  for (let n = 0; n < maxSteps; n++) {
    // The step follows the nearest charge: fine near one, where lines bend
    // most, and long far out, where they are nearly straight.
    let nearest = Infinity;
    for (const c of charges)
      nearest = Math.min(nearest, Math.hypot(x - c.x, y - c.y));
    // Out past the picture, where nothing is drawn finely, the steps
    // lengthen with the distance, so a long loop costs few of them.
    const cap = nearest > extent ? 0.1 * nearest : 0.25;
    const h = Math.min(cap, Math.max(0.01, 0.15 * nearest));
    const k1 = direction(charges, x, y, sign);
    if (k1 === undefined) return { xs, ys, end: -1 };
    const k2 = direction(
      charges,
      x + (h / 2) * k1[0],
      y + (h / 2) * k1[1],
      sign
    );
    if (k2 === undefined) return { xs, ys, end: -1 };
    const k3 = direction(
      charges,
      x + (h / 2) * k2[0],
      y + (h / 2) * k2[1],
      sign
    );
    if (k3 === undefined) return { xs, ys, end: -1 };
    const k4 = direction(charges, x + h * k3[0], y + h * k3[1], sign);
    if (k4 === undefined) return { xs, ys, end: -1 };
    const dx = (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    const dy = (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    // A line that turns back on itself has reached a null point, where the
    // field vanishes and its direction flips from step to step.
    if (lastDir !== undefined && dx * lastDir[0] + dy * lastDir[1] < -0.5 * h)
      return { xs, ys, end: -1 };
    lastDir = [dx / h, dy / h];
    x += dx;
    y += dy;
    const hit = insideCharge(charges, x, y, radius, n < 3 ? from : -1);
    if (hit >= 0) {
      // End on the charge's rim, not inside the disc drawn over it.
      const c = charges[hit];
      const r = Math.hypot(x - c.x, y - c.y) || 1;
      xs.push(c.x + ((x - c.x) * radius) / r);
      ys.push(c.y + ((y - c.y) * radius) / r);
      return { xs, ys, end: hit };
    }
    if (Math.abs(x) > limit || Math.abs(y) > limit) {
      xs.push(x);
      ys.push(y);
      return { xs, ys, end: -1 };
    }
    // Keep a point only once the line has turned or gone a way: straight
    // runs need few, and Desmos parses every point written.
    const moved = Math.hypot(x - lastKept[0], y - lastKept[1]);
    if (moved > 0.4 || (moved > 0.04 && turned(xs, ys, x, y))) {
      xs.push(x);
      ys.push(y);
      lastKept = [x, y];
    }
  }
  return { xs, ys, end: -1 };
}

/** Whether the last kept segment and the one to (x, y) bend by over ~3°. */
function turned(xs: number[], ys: number[], x: number, y: number) {
  const n = xs.length;
  if (n < 2) return true;
  const ax = xs[n - 1] - xs[n - 2];
  const ay = ys[n - 1] - ys[n - 2];
  const bx = x - xs[n - 1];
  const by = y - ys[n - 1];
  const cross = Math.abs(ax * by - ay * bx);
  return cross > 0.05 * Math.hypot(ax, ay) * Math.hypot(bx, by);
}

/** Where each of a charge's `count` lines starts, round its rim. */
function starts(c: PointCharge, count: number, radius: number, phase: number) {
  return Array.from({ length: count }, (_, k) => {
    const a = phase + (2 * Math.PI * (k + 0.5)) / count;
    return [c.x + radius * Math.cos(a), c.y + radius * Math.sin(a)] as const;
  });
}

export function traceFieldLines(
  charges: readonly PointCharge[],
  options: FieldLineOptions
): FieldLines {
  const o: Required<FieldLineOptions> = {
    perUnit: 8,
    maxLines: 160,
    maxSteps: 1500,
    ...options,
  };
  const used = charges.filter((c) => c.q !== 0 && Number.isFinite(c.q));
  const total = used.reduce((s, c) => s + Math.abs(c.q), 0);
  // Fewer lines per unit when the charges are large, so the whole stays
  // within the budget and each still sends lines in proportion to it.
  const perUnit = total === 0 ? 0 : Math.min(o.perUnit, o.maxLines / total);
  const count = (c: PointCharge) =>
    Math.max(2, Math.round(Math.abs(c.q) * perUnit));
  const xs: number[] = [];
  const ys: number[] = [];
  let lines = 0;
  const add = (line: { xs: number[]; ys: number[] }) => {
    if (line.xs.length < 2) return;
    if (lines > 0) {
      xs.push(NaN);
      ys.push(NaN);
    }
    xs.push(...line.xs);
    ys.push(...line.ys);
    lines++;
  };
  // Angles at which lines arrived at each negative charge.
  const arrived = used.map(() => [] as number[]);
  used.forEach((c, i) => {
    if (c.q <= 0) return;
    // A start ring a whisker outside the disc, so the first step does not
    // count as arriving back in it.
    for (const s of starts(c, count(c), o.radius * 1.02, 0)) {
      const line = trace(used, s, i, 1, o);
      if (line.end >= 0) {
        const e = used[line.end];
        arrived[line.end].push(
          Math.atan2(
            line.ys[line.ys.length - 1] - e.y,
            line.xs[line.xs.length - 1] - e.x
          )
        );
      }
      add(line);
    }
  });
  used.forEach((c, i) => {
    if (c.q >= 0) return;
    // The lines a negative charge still needs, traced back against E, each
    // from the angle furthest from those already arriving.
    const missing = count(c) - arrived[i].length;
    if (missing <= 0) return;
    const angles = [...arrived[i]];
    for (let k = 0; k < missing; k++) {
      const a = widestGap(angles);
      angles.push(a);
      const s = [
        c.x + o.radius * 1.02 * Math.cos(a),
        c.y + o.radius * 1.02 * Math.sin(a),
      ] as const;
      const line = trace(used, s, i, -1, o);
      // One that runs into a positive charge duplicates a line already
      // traced out of it.
      if (line.end >= 0 && used[line.end].q > 0) continue;
      add(line);
    }
  });
  return { xs, ys, lines };
}

/** The middle of the widest gap between angles, or 0 for none. */
function widestGap(angles: readonly number[]) {
  if (angles.length === 0) return Math.PI / 8;
  const sorted = angles
    .map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI))
    .sort((a, b) => a - b);
  let best = 0;
  let at = 0;
  for (let i = 0; i < sorted.length; i++) {
    const next =
      i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 2 * Math.PI;
    const gap = next - sorted[i];
    if (gap > best) {
      best = gap;
      at = sorted[i] + gap / 2;
    }
  }
  return at;
}

/**
 * The lines as Desmos LaTeX for two lists, `name_x=[…]` and `name_y=[…]`,
 * three decimals each, with 0/0 for the gaps.
 */
export function fieldLinesLatex(lines: FieldLines): [string, string] {
  const list = (values: number[]) =>
    String.raw`\left[` +
    values
      .map((v) =>
        Number.isFinite(v)
          ? String(Math.round(v * 1000) / 1000)
          : String.raw`\frac{0}{0}`
      )
      .join(",") +
    String.raw`\right]`;
  return [list(lines.xs), list(lines.ys)];
}
