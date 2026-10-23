import type { ExpressionState, GraphState } from "graph-state/state";
import {
  DEFAULT_MATRIX_CONFIG,
  FORMULA_PRESETS,
  LINEAR_PRESETS,
  cloneMatrixConfig,
  eigen,
  homotopy,
  inverse,
  isSingular,
  latexNumber,
  matrixLatex,
  normalizeMatrixConfig,
  singularValues,
} from "./matrixModel";
import {
  MATRIX_FOLDER_ID,
  NO_INVERSE_REASON,
  copyId,
  decodeId,
  encodeId,
  ghostId,
  isOwned,
  polygonArguments,
  rewrite,
  sourceOfCopy,
  sourceOfGhost,
  splitComparison,
  withOwnedItems,
  type ExactSource,
} from "./exactRoute";
import { mapPolyline, sketchPrimitives, type PlaneMap } from "./redraw";
import { jacobian, niceStep } from "./MatrixLayer";
import { gridPositions, keptRuns } from "./grid";
import { compileNode } from "./compile";
import { evaluate } from "../../../symbolic/evaluate";
import type { Node } from "../../../symbolic/tree";
import { AugBuilders } from "../../../../text-mode-core";

describe("Matrix tab configuration", () => {
  test("the default normalizes back to exactly itself", () => {
    // The library is compared with its own JSON on every enable, so a block
    // that does not round-trip writes a setting on every page load.
    const json = JSON.stringify(DEFAULT_MATRIX_CONFIG);
    expect(JSON.stringify(normalizeMatrixConfig(JSON.parse(json)))).toBe(json);
    expect(JSON.stringify(cloneMatrixConfig(DEFAULT_MATRIX_CONFIG))).toBe(json);
  });

  test("anything unreadable falls back field by field, never throwing", () => {
    expect(normalizeMatrixConfig(undefined)).toEqual(DEFAULT_MATRIX_CONFIG);
    expect(normalizeMatrixConfig("nonsense")).toEqual(DEFAULT_MATRIX_CONFIG);
    const mixed = normalizeMatrixConfig({
      on: true,
      kind: "formula",
      route: "sideways",
      entries: [1, 2, 3],
      vectors: [[1, 2], [3, "x"], "nope", [NaN, 1]],
      show: { grid: false, ghost: "yes" },
      detail: "fast",
    });
    expect(mixed.on).toBe(true);
    expect(mixed.kind).toBe("formula");
    expect(mixed.route).toBe("exact");
    expect(mixed.entries).toEqual(DEFAULT_MATRIX_CONFIG.entries);
    expect(mixed.vectors).toEqual([[1, 2]]);
    expect(mixed.show.grid).toBe(false);
    expect(mixed.show.ghost).toBe(DEFAULT_MATRIX_CONFIG.show.ghost);
    expect(mixed.detail).toBe("fast");
    expect(mixed.schemaVersion).toBe(DEFAULT_MATRIX_CONFIG.schemaVersion);
  });

  test("off by default, so enabling the plugin never changes the graph", () => {
    expect(DEFAULT_MATRIX_CONFIG.on).toBe(false);
  });

  test("every preset says what to notice", () => {
    for (const preset of [...LINEAR_PRESETS, ...FORMULA_PRESETS])
      expect(preset.takeaway.length).toBeGreaterThan(40);
  });
});

describe("2×2 algebra", () => {
  test("a shear has one eigenvalue and keeps only the x-axis", () => {
    const e = eigen([1, 1, 0, 1]);
    expect(e.complex).toBeUndefined();
    expect(e.real?.map((r) => r.value)).toEqual([1]);
    expect(e.real?.[0].vector).toEqual([1, 0]);
    expect(e.everyVector).toBe(false);
  });

  test("a rotation's eigenvalues are ±i", () => {
    expect(eigen([0, -1, 1, 0]).complex).toEqual([0, 1]);
  });

  test("a stretch has its axes for eigenvectors", () => {
    const e = eigen([2, 0, 0, 0.5]);
    expect(e.real?.map((r) => [r.value, r.vector])).toEqual([
      [2, [1, 0]],
      [0.5, [0, 1]],
    ]);
  });

  test("a multiple of the identity makes every vector an eigenvector", () => {
    expect(eigen([3, 0, 0, 3]).everyVector).toBe(true);
  });

  test("[[1,2],[3,4]]: eigenvectors satisfy Av = λv", () => {
    const m = [1, 2, 3, 4] as const;
    for (const { value, vector } of eigen(m).real!) {
      expect(m[0] * vector[0] + m[1] * vector[1]).toBeCloseTo(
        value * vector[0],
        12
      );
      expect(m[2] * vector[0] + m[3] * vector[1]).toBeCloseTo(
        value * vector[1],
        12
      );
    }
  });

  test("singular values, inverse and the homotopy", () => {
    expect(singularValues([2, 0, 0, 0.5])).toEqual([2, 0.5]);
    expect(inverse([1, 1, 0, 1])).toEqual([1, -1, -0, 1]);
    expect(inverse([1, 0, 0, 0])).toBeUndefined();
    expect(isSingular([1e-6, 0, 0, 1e-6])).toBe(false);
    expect(homotopy([0, -1, 1, 0], 0).map((v) => v + 0)).toEqual([1, 0, 0, 1]);
    expect(homotopy([0, -1, 1, 0], 1)).toEqual([0, -1, 1, 0]);
    // Halfway along the straight path from I to a reflection is singular.
    expect(isSingular(homotopy([1, 0, 0, -1], 0.5))).toBe(true);
  });

  test("numbers for Desmos are short, exact enough, and parseable", () => {
    expect(latexNumber(0.5)).toBe("0.5");
    expect(latexNumber(-0)).toBe("0");
    expect(latexNumber(0.1 + 0.2)).toBe("0.3");
    expect(latexNumber(1e-20)).toBe("1\\cdot10^{-20}");
    expect(matrixLatex([1, 1, 0, 1])).toBe(
      String.raw`\begin{bmatrix}1&1\\0&1\end{bmatrix}`
    );
  });
});

describe("the exact route's rewrite", () => {
  const source = (partial: Partial<ExactSource>): ExactSource => ({
    id: "1",
    latex: "",
    type: "X_OR_Y",
    inequality: false,
    ...partial,
  });
  const pre = String.raw`X_{vtmx}\left(x,y\right),Y_{vtmx}\left(x,y\right)`;

  test("splits at the top level only", () => {
    expect(splitComparison(String.raw`y=\sin x`)).toEqual({
      parts: ["y", String.raw`\sin x`],
      ops: ["="],
    });
    expect(splitComparison(String.raw`y=x^{2}\left\{x>0\right\}`)?.ops).toEqual(
      ["="]
    );
    expect(splitComparison("-1<y<1")).toEqual({
      parts: ["-1", "y", "1"],
      ops: ["<", "<"],
    });
    expect(splitComparison(String.raw`x\le y`)?.ops).toEqual(["\\le"]);
    expect(splitComparison(String.raw`\left(1,2\right)`)).toBeUndefined();
    expect(splitComparison("y=")).toBeUndefined();
  });

  test("an equation becomes its sides as functions, called at T⁻¹", () => {
    const result = rewrite(source({ latex: String.raw`y=\sin x` }), "0");
    expect(result).toEqual({
      ok: true,
      helpers: [
        String.raw`H_{vtmx0n0}\left(x,y\right)=y`,
        String.raw`H_{vtmx0n1}\left(x,y\right)=\sin x`,
      ],
      copy: String.raw`H_{vtmx0n0}\left(${pre}\right)=H_{vtmx0n1}\left(${pre}\right)`,
      inverse: true,
    });
  });

  test("a derivative keeps its own x, because it stays inside a definition", () => {
    const result = rewrite(
      source({ latex: String.raw`y=\frac{d}{dx}x^{3}` }),
      "4"
    );
    expect(result.ok && result.helpers[1]).toBe(
      String.raw`H_{vtmx4n1}\left(x,y\right)=\frac{d}{dx}x^{3}`
    );
  });

  test("an inequality keeps its operator, so Desmos shades the image", () => {
    const result = rewrite(source({ latex: "y<x-1", inequality: true }), "2");
    expect(result.ok && result.copy).toContain(String.raw`\right)<H_{vtmx2n1}`);
  });

  test("a function definition is called, and never redefined", () => {
    expect(
      rewrite(
        source({ latex: String.raw`f\left(x\right)=x^{2}`, functionName: "f" }),
        "0"
      )
    ).toEqual({
      ok: true,
      helpers: [],
      copy: String.raw`Y_{vtmx}\left(x,y\right)-f\left(X_{vtmx}\left(x,y\right)\right)=0`,
      inverse: true,
    });
    const sideways = rewrite(
      source({
        latex: String.raw`g_{1}\left(y\right)=y^{2}`,
        functionName: "g_1",
      }),
      "0"
    );
    expect(sideways.ok && sideways.copy).toBe(
      String.raw`X_{vtmx}\left(x,y\right)-g_{1}\left(Y_{vtmx}\left(x,y\right)\right)=0`
    );
  });

  test("points and parametrics go forwards through T", () => {
    expect(
      rewrite(
        source({ type: "SINGLE_POINT", latex: String.raw`\left(1,2\right)` }),
        "0"
      )
    ).toEqual({
      ok: true,
      helpers: [],
      copy: String.raw`T_{vtmx}\left(\left(1,2\right)\right)`,
    });
    // A named point is used by name, not defined a second time.
    expect(
      rewrite(
        source({
          type: "POINT_LIST",
          latex: String.raw`L_{2}=\left[\left(1,2\right)\right]`,
          assignment: "L_2",
        }),
        "0"
      )
    ).toMatchObject({ copy: String.raw`T_{vtmx}\left(L_{2}\right)` });
  });

  test("a polar curve becomes a parametric over the θ Desmos sampled", () => {
    const result = rewrite(
      source({
        type: "POLAR",
        latex: String.raw`r=1+\cos\theta`,
        domain: { min: 0, max: 6.25 },
      }),
      "3"
    );
    expect(result).toEqual({
      ok: true,
      helpers: [String.raw`R_{vtmx3}\left(\theta\right)=1+\cos\theta`],
      copy: String.raw`T_{vtmx}\left(\left(R_{vtmx3}\left(t\right)\cos t,R_{vtmx3}\left(t\right)\sin t\right)\right)`,
      parametric: [0, 6.25],
    });
    // A global t would turn the parametric into a point (brief §5.1).
    expect(
      rewrite(source({ type: "POLAR", latex: "r=2" }), "3", undefined, true).ok
    ).toBe(false);
  });

  test("what it cannot copy, it says why", () => {
    const polygon = rewrite(source({ type: "POLYGON", latex: "p" }), "0");
    expect(polygon).toEqual({
      ok: false,
      reason: "Desmos keeps a polygon's edges straight",
    });
    const polar = rewrite(
      source({ type: "POLAR", latex: "r<2", inequality: true }),
      "0"
    );
    expect(polar.ok).toBe(false);
  });
});

describe("the tab's folder in the graph", () => {
  const expression = (id: string, extra: Partial<ExpressionState> = {}) =>
    ({
      type: "expression",
      id,
      latex: "y=x",
      color: "#000",
      ...extra,
    }) as const;
  const graph = (list: GraphState["expressions"]["list"]): GraphState =>
    ({ version: 11, expressions: { list } }) as unknown as GraphState;

  test("ids carry the original's id, whatever it is", () => {
    for (const id of ["1", "abc", "my-id", "a b_ü"]) {
      expect(decodeId(encodeId(id))).toBe(id);
      expect(sourceOfCopy(copyId(id))).toBe(id);
      expect(sourceOfGhost(ghostId(id))).toBe(id);
      expect(/^[A-Za-z][A-Za-z0-9_]*$/.test(copyId(id))).toBe(true);
    }
    expect(sourceOfCopy(ghostId("1"))).toBeUndefined();
    expect(isOwned("vector_tools_mx_c_a1")).toBe(true);
    expect(isOwned("vector_tools_mxx")).toBe(false);
  });

  test("hides what it copies, and putting it back is exact", () => {
    const before = graph([
      expression("1"),
      expression("2", { hidden: true }),
      expression("3"),
    ]);
    const owned = [
      { type: "folder" as const, id: MATRIX_FOLDER_ID, title: "t" },
      expression(copyId("1"), { folderId: MATRIX_FOLDER_ID }),
    ];
    const on = withOwnedItems(before, owned, new Set(["1"]));
    expect(on.expressions.list.map((i) => [i.id, (i as any).hidden])).toEqual([
      ["1", true],
      ["2", true],
      ["3", undefined],
      [MATRIX_FOLDER_ID, undefined],
      [copyId("1"), undefined],
    ]);
    // A folder rebuilt in place keeps its place in the list.
    const again = withOwnedItems(on, owned, new Set(["1"]));
    expect(again.expressions.list.map((i) => i.id)).toEqual(
      on.expressions.list.map((i) => i.id)
    );
    // Off: the user's own "2" stays hidden, "1" comes back.
    const off = withOwnedItems(on, [], new Set());
    expect(off.expressions.list.map((i) => [i.id, (i as any).hidden])).toEqual([
      ["1", false],
      ["2", true],
      ["3", undefined],
    ]);
  });
});

describe("the redraw route", () => {
  const bounds = { left: -10, right: 10, bottom: -5, top: 5 };

  test("y < f(x) is shaded down to the bottom of the screen", () => {
    const primitives = sketchPrimitives(
      {
        color: "#c74440",
        branches: [
          {
            branchMode: 2,
            operator: "<",
            segments: [[-10, -11, 10, 9]],
            color: "#c74440",
            lineWidth: 2.5,
            lineOpacity: 1,
            fillOpacity: 0.4,
          },
        ],
      },
      bounds
    );
    expect(primitives.map((p) => p.kind)).toEqual(["fill", "stroke"]);
    expect(primitives[0].kind === "fill" && primitives[0].rings[0]).toEqual([
      -10, -11, 10, 9, 10, -5, -10, -5,
    ]);
    // A strict inequality's edge is dashed, as Desmos draws it.
    expect(primitives[1].kind === "stroke" && primitives[1].dash).toBe(
      "DASHED"
    );
  });

  test("points, and regions Desmos filled itself, come through", () => {
    const primitives = sketchPrimitives(
      {
        branches: [
          {
            branchMode: 7,
            segments: [[0, 0, 1, 0, 0, 1, 0, 0]],
            color: "#f00",
          },
          {
            branchMode: 3,
            segments: [
              [
                [1, 2],
                [NaN, 0],
              ],
            ],
            color: "#00f",
            style: "OPEN",
            pointSize: 8,
          },
        ],
      },
      bounds
    );
    expect(primitives).toMatchObject([
      { kind: "fill", rings: [[0, 0, 1, 0, 0, 1, 0, 0]] },
      { kind: "dot", x: 1, y: 2, style: "OPEN", size: 8 },
    ]);
  });

  const options = {
    linear: false,
    tolerance: 1,
    maxDepth: 10,
    scale: [50, 50] as const,
  };

  test("a linear map needs only the vertices", () => {
    const shear: PlaneMap = (x, y) => [x + y, y];
    expect(
      mapPolyline([0, 0, 1, 1], shear, { ...options, linear: true })
    ).toEqual([[0, 0, 2, 1]]);
  });

  test("a curved map bends a straight segment until it is smooth", () => {
    const polar: PlaneMap = (r, theta) => [
      r * Math.cos(theta),
      r * Math.sin(theta),
    ];
    // A vertical segment r = 1 becomes a half circle, 50 px in radius: every
    // vertex lies on it, and no chord sags more than the 1 px tolerance.
    const [run] = mapPolyline([1, 0, 1, Math.PI], polar, options);
    expect(run.length / 2).toBeGreaterThan(4);
    for (let i = 0; i < run.length; i += 2)
      expect(Math.hypot(run[i], run[i + 1])).toBeCloseTo(1, 12);
    for (let i = 0; i + 3 < run.length; i += 2) {
      const mid = Math.hypot(
        (run[i] + run[i + 2]) / 2,
        (run[i + 1] + run[i + 3]) / 2
      );
      expect((1 - mid) * 50).toBeLessThanOrEqual(1);
    }
    // A finer tolerance asks for more of it.
    const [fine] = mapPolyline([1, 0, 1, Math.PI], polar, {
      ...options,
      tolerance: 0.1,
    });
    expect(fine.length).toBeGreaterThan(run.length);
  });

  test("a curve stops where the map stops being defined", () => {
    const disc: PlaneMap = (x, y) =>
      Math.hypot(x, y) < 1 ? [x, y] : [NaN, NaN];
    const runs = mapPolyline([-2, 0, 2, 0], disc, options);
    expect(runs).toHaveLength(1);
    const xs = runs[0].filter((_, i) => i % 2 === 0);
    expect(Math.min(...xs)).toBeLessThan(-0.99);
    expect(Math.max(...xs)).toBeGreaterThan(0.99);
  });

  test("a closed ring comes back to its start", () => {
    const [ring] = mapPolyline([0, 0, 1, 0, 1, 1], (x, y) => [x, y], {
      ...options,
      linear: true,
      closed: true,
    });
    expect(ring.slice(-2)).toEqual([0, 0]);
  });
});

describe("the layer's numbers", () => {
  test("grid steps are 1, 2 or 5 times a power of ten", () => {
    expect(niceStep(0.875)).toBe(1);
    expect(niceStep(1.5)).toBe(2);
    expect(niceStep(30)).toBe(50);
    expect(niceStep(NaN)).toBe(1);
  });

  test("the Jacobian of a linear map is the matrix", () => {
    const J = jacobian((x, y) => [x + 2 * y, 3 * x + 4 * y], [5, -7]);
    [1, 2, 3, 4].forEach((value, i) => expect(J[i]).toBeCloseTo(value, 6));
  });
});

describe("the grid's walk outward", () => {
  const view = { left: -7, right: 7, bottom: -4.5, top: 4.5 };
  const base = {
    centre: [0, 0] as const,
    step: 1,
    view,
    scale: [68, 68] as const,
    limit: 64,
  };

  test("the fisheye's grid reaches its rim, to within a pixel", () => {
    const fisheye: PlaneMap = (x, y) => {
      const k = 1 + Math.hypot(x, y) / 4;
      return [x / k, y / k];
    };
    const xs = gridPositions({ ...base, map: fisheye }, 0);
    const outermost = Math.max(...xs);
    const [reach] = fisheye(outermost, 0);
    expect((4 - reach) * 68).toBeLessThan(1.5);
    // Near the middle it is still the grid of whole numbers.
    for (let x = -4; x <= 4; x++) expect(xs).toContain(x);
    // And it got there in a few dozen lines, not a thousand.
    expect(xs.length).toBeLessThan(140);
  });

  test("a linear map's grid stops just past the edge of the screen", () => {
    const shear: PlaneMap = (x, y) => [x + y, y];
    const ys = gridPositions({ ...base, map: shear }, 1);
    expect(Math.max(...ys)).toBeGreaterThan(4.5);
    expect(Math.max(...ys)).toBeLessThan(10);
    expect(Math.min(...ys)).toBeLessThan(-4.5);
  });

  test("a map that wraps round stops at the Detail control's limit", () => {
    const polar: PlaneMap = (r, t) => [r * Math.cos(t), r * Math.sin(t)];
    const ts = gridPositions({ ...base, map: polar, limit: 10 }, 1);
    expect(ts).toHaveLength(21);
  });
});

describe("explicit curves drawn forwards", () => {
  const source = (partial: Partial<ExactSource>): ExactSource => ({
    id: "1",
    latex: "",
    type: "X_OR_Y",
    inequality: false,
    ...partial,
  });

  test("y = f(x) becomes T(t, f(t)) over the reach it is given", () => {
    expect(
      rewrite(
        source({ latex: String.raw`y=\sin x` }),
        "0",
        undefined,
        false,
        64
      )
    ).toEqual({
      ok: true,
      helpers: [String.raw`H_{vtmx0}\left(x\right)=\sin x`],
      copy: String.raw`T_{vtmx}\left(\left(t,H_{vtmx0}\left(t\right)\right)\right)`,
      parametric: [-64, 64],
    });
    // Either way round.
    expect(
      rewrite(source({ latex: String.raw`\sin x=y` }), "0", undefined, false, 8)
    ).toMatchObject({ helpers: [String.raw`H_{vtmx0}\left(x\right)=\sin x`] });
  });

  test("x = g(y) runs along y", () => {
    expect(
      rewrite(source({ latex: "x=y^{2}" }), "2", undefined, false, 8)
    ).toEqual({
      ok: true,
      helpers: [String.raw`H_{vtmx2}\left(y\right)=y^{2}`],
      copy: String.raw`T_{vtmx}\left(\left(H_{vtmx2}\left(t\right),t\right)\right)`,
      parametric: [-8, 8],
    });
  });

  test("a function definition is called along t", () => {
    expect(
      rewrite(
        source({ latex: String.raw`f\left(x\right)=x^{2}`, functionName: "f" }),
        "0",
        undefined,
        false,
        16
      )
    ).toMatchObject({
      helpers: [],
      copy: String.raw`T_{vtmx}\left(\left(t,f\left(t\right)\right)\right)`,
    });
  });

  test("what is not a function of one coordinate stays implicit", () => {
    // y on both sides, an inequality (which has to shade), and a graph that
    // defines its own t, which would turn a parametric into a point.
    for (const [latex, inequality, reservedT] of [
      ["y=xy+1", false, false],
      ["x^{2}+y^{2}=4", false, false],
      ["y<x-1", true, false],
      [String.raw`y=\sin x`, false, true],
    ] as const) {
      const result = rewrite(
        source({ latex, inequality }),
        "0",
        undefined,
        reservedT,
        64
      );
      expect(result.ok && result.parametric).toBeUndefined();
    }
  });
});

describe("a compiled T means what the evaluator means", () => {
  const { binop, functionCall, id, negative, number } = AugBuilders;
  const fn = (name: string, arg: Node) => functionCall(id(name), [arg]);
  // The fisheye's x′ = x / (1 + √(x² + y²)/4), and a wave with π and a minus.
  const fisheye = binop(
    "Divide",
    id("x"),
    binop(
      "Add",
      number(1),
      binop(
        "Divide",
        fn(
          "sqrt",
          binop(
            "Add",
            binop("Exponent", id("x"), number(2)),
            binop("Exponent", id("y"), number(2))
          )
        ),
        number(4)
      )
    )
  );
  const wave = binop(
    "Subtract",
    negative(id("y")),
    binop("Multiply", id("a"), fn("sin", binop("Multiply", id("pi"), id("x"))))
  );

  test.each([
    ["the fisheye", fisheye],
    ["a wave reading a slider", wave],
    ["an unknown function", fn("nope", id("x"))],
  ])("%s", (_, tree) => {
    const compiled = compileNode(tree);
    for (const [x, y] of [
      [0, 0],
      [1.5, -2],
      [-7, 3.25],
      [1e6, 1e-6],
    ]) {
      const bindings = { x, y, a: 0.4 };
      const want = evaluate(tree, bindings);
      const got = compiled(bindings);
      if (Number.isNaN(want)) expect(got).toBeNaN();
      else expect(got).toBe(want);
    }
  });
});

describe("the exact route without an inverse", () => {
  const source = (partial: Partial<ExactSource>): ExactSource => ({
    id: "1",
    latex: "",
    type: "X_OR_Y",
    inequality: false,
    ...partial,
  });

  test("what goes forwards is still copied", () => {
    for (const s of [
      source({ latex: String.raw`y=\sin x` }),
      source({ type: "SINGLE_POINT", latex: String.raw`\left(1,2\right)` }),
      source({ type: "POLAR", latex: String.raw`r=1+\cos\theta` }),
    ]) {
      const result = rewrite(s, "0", undefined, false, 64, false);
      expect(result.ok).toBe(true);
      expect(result.ok && result.inverse).toBeFalsy();
    }
  });

  test("what needs T⁻¹ says so, and what has it is marked", () => {
    const region = source({ latex: "y<x-1", inequality: true });
    expect(rewrite(region, "0", undefined, false, 64, false)).toEqual({
      ok: false,
      reason: NO_INVERSE_REASON,
    });
    expect(rewrite(region, "0", undefined, false, 64, true)).toMatchObject({
      ok: true,
      inverse: true,
    });
  });
});

describe("a polygon under a matrix", () => {
  test("its vertices are split at its own commas only", () => {
    expect(
      polygonArguments(
        String.raw`\operatorname{polygon}\left(\left(0,0\right),\left(1,0\right),P\right)`
      )
    ).toEqual([
      String.raw`\left(0,0\right)`,
      String.raw`\left(1,0\right)`,
      "P",
    ]);
    expect(
      polygonArguments(String.raw`\operatorname{polygon}\left(L\right)`)
    ).toEqual(["L"]);
    expect(polygonArguments("y=x")).toBeUndefined();
  });

  test("is carried vertex by vertex, but only by a linear map", () => {
    const polygon: ExactSource = {
      id: "1",
      type: "POLYGON",
      inequality: false,
      latex: String.raw`\operatorname{polygon}\left(\left(0,0\right),L\right)`,
    };
    expect(
      rewrite(polygon, "0", undefined, false, 64, true, true)
    ).toMatchObject({
      ok: true,
      copy: String.raw`\operatorname{polygon}\left(T_{vtmx}\left(\left(0,0\right)\right),T_{vtmx}\left(L\right)\right)`,
    });
    expect(rewrite(polygon, "0", undefined, false, 64, true, false).ok).toBe(
      false
    );
  });
});

describe("thinning a crowded grid", () => {
  const xs = [-4, -3, -2, -1, 0, 1, 2, 3, 4];

  test("a grid with room to breathe keeps every line whole", () => {
    const runs = keptRuns(xs, 5, (i, k) => [xs[i], k], 1, [40, 40]);
    expect(runs).toHaveLength(9);
    for (const run of runs) expect([run.from, run.to]).toEqual([0, 4]);
  });

  test("lines a pixel apart keep only every second or fourth", () => {
    // One step is 1 px across: to be 3 px apart, every fourth line.
    const runs = keptRuns(xs, 5, (i, k) => [xs[i], k], 1, [1, 40], 3);
    expect(runs.map((run) => xs[run.line])).toEqual([-4, 0, 4]);
  });

  test("an undefined crossing breaks the line there", () => {
    const runs = keptRuns(
      [0],
      5,
      (_, k) => (k === 2 ? [NaN, NaN] : [0, k]),
      1,
      [40, 40]
    );
    expect(runs).toEqual([
      { line: 0, from: 0, to: 1 },
      { line: 0, from: 3, to: 4 },
    ]);
  });
});
