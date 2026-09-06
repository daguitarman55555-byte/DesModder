import { intersectBounds, spanOf } from "./FieldRange";

/**
 * The box the colour ramp is measured over is the visible graph clipped to the
 * sampling domain. Which box that is decides what a colour means, and getting
 * it wrong is what made the arrows and the flow disagree.
 */
describe("Vector Tools field range box", () => {
  const view = { xMin: -10, xMax: 10, yMin: -6, yMax: 6 };

  test("is the view when the domain contains it", () => {
    expect(
      intersectBounds(view, { xMin: -400, xMax: 400, yMin: -233, yMax: 233 })
    ).toEqual(view);
  });

  test("is the domain when the domain is inside the view", () => {
    const domain = { xMin: -2, xMax: 2, yMin: -1, yMax: 1 };
    expect(intersectBounds(view, domain)).toEqual(domain);
  });

  test("clips to the overlap when they only partly meet", () => {
    expect(
      intersectBounds(view, { xMin: 0, xMax: 40, yMin: -40, yMax: 2 })
    ).toEqual({ xMin: 0, xMax: 10, yMin: -6, yMax: 2 });
  });

  test("has nothing to measure when they do not meet at all", () => {
    expect(
      intersectBounds(view, { xMin: 100, xMax: 200, yMin: 100, yMax: 200 })
    ).toBeUndefined();
    // Touching along an edge is no area either, and a zero-width box would
    // divide by zero when the samples were placed across it.
    expect(
      intersectBounds(view, { xMin: 10, xMax: 20, yMin: -6, yMax: 6 })
    ).toBeUndefined();
  });
});

/**
 * The range a ramp is spread over decides whether a field is one colour or
 * many. A single enormous sample can take the whole ramp for itself.
 */
describe("Vector Tools magnitude span", () => {
  const evenly = Array.from({ length: 100 }, (_, i) => i / 10);

  test("spans a field whose magnitudes are spread evenly", () => {
    const span = spanOf(evenly)!;
    expect(span.minimum).toBeCloseTo(0.2, 1);
    expect(span.maximum).toBeCloseTo(9.7, 1);
  });

  test("is not taken over by a pole", () => {
    // A denominator that passes through zero reaches magnitudes larger than
    // the entire rest of the field. Spread a ramp from zero to one of those
    // and every ordinary value lands in its first hundredth — one flat colour.
    const withPoles = [...evenly.slice(0, 95), 1e5, 1e6, 1e7, 1e8, 1e9];
    const span = spanOf(withPoles)!;
    // Within a small multiple of what the field does away from the pole, not
    // within a small multiple of the pole.
    expect(span.maximum).toBeLessThan(10 * Math.max(...evenly));
    expect(span.maximum).toBeLessThan(1e5 / 1000);
  });

  test("ignores what is not a number", () => {
    expect(spanOf([NaN, Infinity, -Infinity])).toBeUndefined();
    const span = spanOf([NaN, 1, 2, 3, Infinity])!;
    expect(span.maximum).toBeLessThanOrEqual(3);
  });

  test("still leaves something to divide by on a flat field", () => {
    const span = spanOf([5, 5, 5, 5])!;
    expect(span.maximum).toBeGreaterThan(span.minimum);
  });
});
