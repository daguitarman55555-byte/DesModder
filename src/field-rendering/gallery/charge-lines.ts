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
  /** The picture's half-width, when no `view` is given: |x|, |y| ≤ this. */
  extent: number;
  /**
   * What the graph shows: the lines fill it, and a margin round it so a
   * small pan needs no retrace (Rafael, 2026-11-09: "field lines should
   * fill up this entire region before cutting off"). Steps and the spacing
   * of the points written scale with it, so zoomed out costs no more.
   */
  view?: { left: number; right: number; bottom: number; top: number };
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
/** Where lines are drawn, and how finely, from the options. */
interface Frame {
  left: number;
  right: number;
  bottom: number;
  top: number;
  /** The picture's size against the preset's 20 units across. */
  scale: number;
  /** The frame's half-size: past it, steps lengthen with the distance. */
  half: number;
}

/** The view, or ±extent, widened by half its size each way. */
export function frameOf(options: FieldLineOptions): Frame {
  const e = options.extent;
  const v = options.view ?? { left: -e, right: e, bottom: -e, top: e };
  const w = v.right - v.left;
  const h = v.top - v.bottom;
  // A quarter of the view each way: a pan that small keeps the lines as
  // they are; at half, every retrace drew four times the view, and ten
  // charges took 4,000 points and up to 90 ms (2026-11-09).
  const margin = options.view === undefined ? 0.15 : 0.25;
  const frame = {
    left: v.left - margin * w,
    right: v.right + margin * w,
    bottom: v.bottom - margin * h,
    top: v.top + margin * h,
  };
  return {
    ...frame,
    scale: Math.max(w, h) / 20,
    half: Math.max(
      Math.abs(frame.left),
      Math.abs(frame.right),
      Math.abs(frame.bottom),
      Math.abs(frame.top)
    ),
  };
}

function trace(
  charges: readonly PointCharge[],
  start: readonly [number, number],
  from: number,
  sign: number,
  options: Required<Omit<FieldLineOptions, "view">>,
  frame: Frame
) {
  const { radius, maxSteps } = options;
  const extent = frame.half;
  const s = frame.scale;
  // Followed well past the picture, not cut at its edge: a dipole's outer
  // lines leave the view and come back round to the negative charge. Cut
  // at 1.25 × the extent, they never arrived, and the negative charge made
  // up the lines it was missing from the widest gaps, so the picture was
  // lopsided: a line out of + on one side, none into − on the other
  // (Rafael, 2026-11-09: "the field lines are wrong").
  // Far, for the lines that do come back: the dipole's lines nearest its
  // axis loop out hundreds of units, and at 8 × the extent the two at
  // ±162° were cut, so the picture lost its symmetry again. The steps
  // grow with the distance out there, so the whole loop is a few dozen.
  const limit = extent * 100;
  // Far from every charge the field is the net charge's, outward from the
  // middle of them if the line runs with it: a line that far out, running
  // outward, never comes back, and following it to the limit was most of
  // the work when the charges did not cancel (666 ms for ten of one sign).
  let net = 0;
  let cx = 0;
  let cy = 0;
  for (const c of charges) {
    net += c.q;
    cx += c.x / charges.length;
    cy += c.y / charges.length;
  }
  let spread = 0;
  for (const c of charges)
    spread = Math.max(spread, Math.hypot(c.x - cx, c.y - cy));
  const escapes = sign * net > 0;
  // Out past every corner of the frame, so an escaping line crosses all of
  // what is drawn before it stops.
  const far = Math.max(
    Math.hypot(
      Math.max(Math.abs(frame.left - cx), Math.abs(frame.right - cx)),
      Math.max(Math.abs(frame.bottom - cy), Math.abs(frame.top - cy))
    ),
    3 * spread
  );
  let [x, y] = start;
  const xs = [x];
  const ys = [y];
  let lastKept = [x, y];
  let lastDir: readonly [number, number] | undefined;
  // Headway: a line that wanders a long way and gets nowhere is circling
  // where the field nearly vanishes, and has nothing more to draw.
  let anchor = [x, y];
  let walked = 0;
  for (let n = 0; n < maxSteps; n++) {
    // The step follows the nearest charge: fine near one, where lines bend
    // most, and long far out, where they are nearly straight.
    let nearest = Infinity;
    for (const c of charges)
      nearest = Math.min(nearest, Math.hypot(x - c.x, y - c.y));
    // Out past the picture, where nothing is drawn finely, the steps
    // lengthen with the distance, so a long loop costs few of them.
    const cap = nearest > extent ? 0.1 * nearest : 0.25 * s;
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
    walked += h;
    if (n % 40 === 39) {
      if (Math.hypot(x - anchor[0], y - anchor[1]) < 0.2 * walked)
        return { xs, ys, end: -1 };
      anchor = [x, y];
      walked = 0;
    }
    if (
      escapes &&
      Math.hypot(x - cx, y - cy) > far &&
      (x - cx) * dx + (y - cy) * dy > 0
    ) {
      xs.push(x);
      ys.push(y);
      return { xs, ys, end: -1 };
    }
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
    // runs need few, and Desmos parses every point written. A unit is
    // about forty pixels in the preset's view, so 0.12 is five: a chord
    // that short, bent by six degrees, is off the curve by under a pixel.
    const moved = Math.hypot(x - lastKept[0], y - lastKept[1]);
    if (moved > 0.8 * s || (moved > 0.12 * s && turned(xs, ys, x, y))) {
      xs.push(x);
      ys.push(y);
      lastKept = [x, y];
    }
  }
  return { xs, ys, end: -1 };
}

/** Whether the last kept segment and the one to (x, y) bend by over ~6°. */
function turned(xs: number[], ys: number[], x: number, y: number) {
  const n = xs.length;
  if (n < 2) return true;
  const ax = xs[n - 1] - xs[n - 2];
  const ay = ys[n - 1] - ys[n - 2];
  const bx = x - xs[n - 1];
  const by = y - ys[n - 1];
  const cross = Math.abs(ax * by - ay * bx);
  return cross > 0.1 * Math.hypot(ax, ay) * Math.hypot(bx, by);
}

/** Where each of a charge's `count` lines starts, round its rim. */
function starts(c: PointCharge, count: number, radius: number, phase: number) {
  return Array.from({ length: count }, (_, k) => {
    const a = phase + (2 * Math.PI * (k + 0.5)) / count;
    return [c.x + radius * Math.cos(a), c.y + radius * Math.sin(a)] as const;
  });
}

/** The most points the lists may hold, under Desmos's 10,000 a list. */
export const MAX_POINTS = 9000;

export function traceFieldLines(
  charges: readonly PointCharge[],
  options: FieldLineOptions
): FieldLines {
  const o: Required<Omit<FieldLineOptions, "view">> = {
    // Ten a unit charge: eight looked sparse round a ±1 pair (Rafael,
    // 2026-11-09). Ten charges of ±1 are a hundred lines, 2 ms to trace.
    perUnit: 10,
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
  // What is written: the lines inside a margin round the picture. A loop
  // far outside it is followed (it decides where the line comes back) but
  // not drawn, so it is a gap in the list: Desmos parses every number
  // written, and parsing, not tracing, was most of a retrace (2026-11-09).
  const frame = frameOf(options);
  const inside = (line: { xs: number[]; ys: number[] }, k: number) =>
    k >= 0 &&
    k < line.xs.length &&
    line.xs[k] >= frame.left &&
    line.xs[k] <= frame.right &&
    line.ys[k] >= frame.bottom &&
    line.ys[k] <= frame.top;
  const add = (line: { xs: number[]; ys: number[] }) => {
    if (line.xs.length < 2) return;
    const vx: number[] = [];
    const vy: number[] = [];
    for (let k = 0; k < line.xs.length; k++) {
      // A point is kept if it or a neighbour is inside, so a segment
      // that crosses into the picture keeps both its ends.
      if (inside(line, k - 1) || inside(line, k) || inside(line, k + 1)) {
        vx.push(line.xs[k]);
        vy.push(line.ys[k]);
      } else if (vx.length > 0 && Number.isFinite(vx[vx.length - 1])) {
        vx.push(NaN);
        vy.push(NaN);
      }
    }
    while (vx.length > 0 && !Number.isFinite(vx[vx.length - 1])) {
      vx.pop();
      vy.pop();
    }
    if (vx.length < 2) return;
    // Desmos refuses a list of more than 10,000, and the lines would then
    // be an error instead of a picture: a line that would pass this is
    // left out. The worst arrangement measured took 5,400.
    if (xs.length + vx.length + 1 > MAX_POINTS) return;
    if (lines > 0) {
      xs.push(NaN);
      ys.push(NaN);
    }
    xs.push(...vx);
    ys.push(...vy);
    lines++;
  };
  // Angles at which lines arrived at each negative charge.
  const arrived = used.map(() => [] as number[]);
  used.forEach((c, i) => {
    if (c.q <= 0) return;
    // A start ring a whisker outside the disc, so the first step does not
    // count as arriving back in it.
    for (const s of starts(c, count(c), o.radius * 1.02, 0)) {
      const line = trace(used, s, i, 1, o, frame);
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
      const line = trace(used, s, i, -1, o, frame);
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
