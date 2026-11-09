import {
  fieldLinesLatex,
  traceFieldLines,
  type PointCharge,
} from "./charge-lines";

const opts = { radius: 0.3, extent: 10 };

function segments(xs: number[], ys: number[]) {
  const out: [number, number, number, number][] = [];
  for (let i = 1; i < xs.length; i++)
    if (Number.isFinite(xs[i - 1]) && Number.isFinite(xs[i]))
      out.push([xs[i - 1], ys[i - 1], xs[i], ys[i]]);
  return out;
}

function fieldAt(charges: PointCharge[], x: number, y: number) {
  let ex = 0;
  let ey = 0;
  for (const c of charges) {
    const dx = x - c.x;
    const dy = y - c.y;
    const r3 = Math.hypot(dx, dy) ** 3;
    ex += (c.q * dx) / r3;
    ey += (c.q * dy) / r3;
  }
  return [ex, ey];
}

describe("traceFieldLines", () => {
  test("three charges off one line still get lines, tangent to E", () => {
    const charges = [
      { q: 1, x: -3, y: 0 },
      { q: -1, x: 3, y: 0 },
      { q: 2, x: 0, y: 4 },
    ];
    const lines = traceFieldLines(charges, opts);
    expect(lines.lines).toBeGreaterThan(20);
    // Every short segment points along E at its midpoint, within a few
    // degrees: the lines are the field's, not a drawing of it.
    let worst = 0;
    for (const [x0, y0, x1, y1] of segments(lines.xs, lines.ys)) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len > 0.2) continue;
      const [ex, ey] = fieldAt(charges, (x0 + x1) / 2, (y0 + y1) / 2);
      const cos =
        ((x1 - x0) * ex + (y1 - y0) * ey) / (len * Math.hypot(ex, ey));
      worst = Math.max(worst, 1 - Math.abs(cos));
    }
    expect(worst).toBeLessThan(0.01);
  });

  test("a dipole's lines are traced once, from the positive charge", () => {
    const lines = traceFieldLines(
      [
        { q: 1, x: -2, y: 0 },
        { q: -1, x: 2, y: 0 },
      ],
      opts
    );
    // 8 per unit charge out of the positive one; the negative one needs
    // only the few that escaped past the picture's edge.
    expect(lines.lines).toBeGreaterThanOrEqual(8);
    expect(lines.lines).toBeLessThanOrEqual(12);
  });

  test("an equal dipole's lines are its mirror image", () => {
    // The preset's own pair. Each line out of + is a line into −: the
    // picture reflected left to right is itself, which the lines cut at
    // the picture's edge were not.
    const charges = [
      { q: 1, x: -2.5, y: 0 },
      { q: -1, x: 2.5, y: 0 },
    ];
    const lines = traceFieldLines(charges, { radius: 0.4, extent: 10 });
    const points: [number, number][] = [];
    for (let i = 0; i < lines.xs.length; i++)
      if (Math.abs(lines.xs[i]) < 7 && Math.abs(lines.ys[i]) < 7)
        points.push([lines.xs[i], lines.ys[i]]);
    // Every visible point has a point near its mirror image, as far as a
    // line's points are spaced.
    let worst = 0;
    for (const [x, y] of points) {
      let best = Infinity;
      for (const [u, v] of points)
        best = Math.min(best, Math.hypot(u + x, v - y));
      worst = Math.max(worst, best);
    }
    expect(worst).toBeLessThan(0.45);
  });

  test("a lone negative charge sends its lines back out", () => {
    const lines = traceFieldLines([{ q: -1, x: 0, y: 0 }], opts);
    expect(lines.lines).toBe(8);
  });

  test("ten charges stay within the line budget", () => {
    const charges = Array.from({ length: 10 }, (_, i) => ({
      q: i % 2 === 0 ? 5 : -5,
      x: 6 * Math.cos(i),
      y: 6 * Math.sin(i),
    }));
    const lines = traceFieldLines(charges, opts);
    expect(lines.lines).toBeLessThanOrEqual(170);
    expect(lines.xs.length).toBeLessThan(40_000);
  });

  test("no charges, no lines", () => {
    expect(traceFieldLines([{ q: 0, x: 0, y: 0 }], opts).lines).toBe(0);
    expect(fieldLinesLatex({ xs: [], ys: [], lines: 0 })).toEqual([
      String.raw`\left[\right]`,
      String.raw`\left[\right]`,
    ]);
  });

  test("gaps are written as 0/0", () => {
    const [x] = fieldLinesLatex({
      xs: [1, NaN, -2.12345],
      ys: [0, NaN, 0],
      lines: 2,
    });
    expect(x).toBe(String.raw`\left[1,\frac{0}{0},-2.123\right]`);
  });
});
