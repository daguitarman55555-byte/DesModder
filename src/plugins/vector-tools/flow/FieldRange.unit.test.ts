import { intersectBounds } from "./FieldRange";

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
