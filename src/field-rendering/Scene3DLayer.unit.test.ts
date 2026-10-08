import { invert } from "./Scene3DLayer";

/** Column-major a · b. */
function multiply(a: readonly number[], b: readonly number[]) {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 4; row++)
      for (let k = 0; k < 4; k++)
        out[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
  return out;
}

describe("the inverse the 3D probe drag unprojects through", () => {
  test("undoes a perspective camera's whole transform", () => {
    // A perspective projection after a turn and a shift: the kind of matrix
    // mathToClip gives.
    const m = [
      0.9, 0.2, -0.4, -0.4, -0.1, 1.3, 0.3, 0.3, 0.5, -0.2, 1.1, 1.1, 0.2, -0.3,
      4.5, 5,
    ];
    const inverse = invert(m);
    expect(inverse).toBeDefined();
    const product = multiply(m, inverse!);
    for (let i = 0; i < 16; i++)
      expect(product[i]).toBeCloseTo(i % 5 === 0 ? 1 : 0, 9);
  });

  test("has none for a singular matrix", () => {
    expect(invert(new Array(16).fill(1))).toBeUndefined();
  });
});
