import { testWithPage, type Driver } from "../../../tests/puppeteer-utils";
import type { Calc as CalcType } from "#globals";
import { PANEL_TABS } from "../model";

declare let Calc: CalcType;
declare let DSM: Window["DSM"];

const BUTTON = ".dsm-action-menu .dsm-icon-compass2";

/**
 * A graph with one of everything the map has to carry: a function, an
 * implicit curve, a shaded inequality, a point, a parametric curve, a
 * function definition and a polar curve.
 */
const GRAPH = [
  { id: "sine", latex: String.raw`y=\sin x`, color: "#2d70b3" },
  {
    id: "circle",
    latex: String.raw`x^{2}+y^{2}=4`,
    color: "#388c46",
    lineStyle: "DASHED",
  },
  { id: "region", latex: String.raw`y<x-1`, color: "#c74440" },
  { id: "point", latex: String.raw`\left(1,2\right)`, color: "#6042a6" },
  {
    id: "ellipse",
    latex: String.raw`\left(3\cos t,\sin t\right)`,
    color: "#000000",
    parametricDomain: { min: "0", max: "2\\pi" },
  },
  {
    id: "parabola",
    latex: String.raw`f\left(x\right)=\frac{x^{2}}{4}-3`,
    color: "#fa7e19",
  },
];

/**
 * A Matrix tab test that puts everything back whether it passes or fails:
 * the tab is a library setting, and settings outlive the page.
 */
function matrixTest(
  name: string,
  body: (driver: Driver) => Promise<void>,
  timeout: number
) {
  testWithPage(
    name,
    async (driver) => {
      const errors: string[] = [];
      driver.page.on("pageerror", (error) => errors.push(String(error)));
      try {
        await body(driver);
        expect(errors).toEqual([]);
      } finally {
        await driver.evaluate(() => {
          const plugin = DSM.enabledPlugins["vector-tools"] as any;
          if (plugin === undefined) return;
          plugin.matrix.reset();
          plugin.matrix.syncNow();
          plugin.resetConfig();
          plugin.setPanelTab("field");
        });
        await driver.page.waitForFunction(() => !DSM.delaySetPluginSettings);
        await driver.disablePlugin("vector-tools");
        await driver.setBlank();
      }
    },
    timeout
  );
}

async function openMatrixTab(driver: Driver) {
  await driver.click(BUTTON);
  const index = PANEL_TABS.findIndex((tab) => tab.id === "matrix");
  await driver.click(
    `.dsm-vector-tools-tabs .dcg-segmented-control-btn:nth-child(${index + 1})`
  );
  await driver.waitForSelector('[data-vector-tools="matrix"]');
  // The drawing method is folded under More since 2026-11-07.
  await driver.page.evaluate(() =>
    document
      .querySelectorAll<HTMLDetailsElement>(".dsm-vector-tools-body details")
      .forEach((details) => (details.open = true))
  );
}

/** Waits for Desmos to finish evaluating and for the tab to settle. */
async function settle(driver: Driver) {
  await driver.page.waitForFunction(
    () => !(DSM.enabledPlugins["vector-tools"] as any)?.matrix.playing
  );
  await driver.waitForSync();
  await new Promise((resolve) => setTimeout(resolve, 400));
  await driver.waitForSync();
  await new Promise((resolve) => setTimeout(resolve, 300));
}

/**
 * A picture of the graph with the panel closed, then the panel opened again:
 * the panel covers half the graph, and the graph is the evidence.
 */
async function shotOfGraph(driver: Driver, path: string) {
  await driver.click(BUTTON);
  await driver.page.waitForFunction(
    () => document.querySelector('[data-vector-tools="matrix"]') === null
  );
  await new Promise((resolve) => setTimeout(resolve, 200));
  await driver.page.screenshot({ path });
  await openMatrixTab(driver);
}

/** A large page, and the field's own arrows off, so the map is what shows. */
async function prepare(driver: Driver, bounds: object) {
  await driver.page.setViewport({ width: 1400, height: 900 });
  await driver.enablePlugin("vector-tools");
  await driver.assertSelectorEventually(BUTTON);
  await driver.evaluate(
    (graph, b) => {
      (DSM.enabledPlugins["vector-tools"] as any).setArrowMode("off");
      Calc.setExpressions(graph as any);
      Calc.setMathBounds(b as any);
    },
    GRAPH,
    bounds
  );
  await settle(driver);
}

/**
 * Whether the tab is at rest: nothing written over a second in which
 * nothing changed. A reconcile that disagreed with how Desmos stores what it
 * was given would write on every sync, forever.
 */
async function expectIdle(driver: Driver) {
  const count = async () =>
    await driver.evaluate(
      () => (DSM.enabledPlugins["vector-tools"] as any).matrix.writes
    );
  const before = await count();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(await count()).toBe(before);
}

/** The expression list as it stands, for an exact comparison. */
const listOf = async (driver: Driver) =>
  await driver.evaluate(() => JSON.stringify(Calc.getState().expressions.list));

matrixTest(
  "Matrix tab: a shear drawn exactly and redrawn, and off restores the graph",
  async (driver) => {
    await prepare(driver, { left: -7, right: 7, bottom: -4.5, top: 4.5 });
    const before = await listOf(driver);

    await openMatrixTab(driver);
    await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      plugin.matrix.loadPreset("shear");
      plugin.matrix.setRoute("exact");
    });
    await driver.click('[data-vector-tools="matrix-on"]');
    await settle(driver);

    // Exact: every original is hidden and a copy in the tab's folder stands
    // in for it; the copies are drawn by Desmos itself.
    const exact = await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      const models = Calc.controller.getAllItemModels() as any[];
      const byId = new Map(models.map((m) => [m.id, m]));
      const ids = ["sine", "circle", "region", "point", "ellipse", "parabola"];
      return {
        route: plugin.matrix.routeInUse.route,
        status: plugin.matrix.status,
        hidden: ids.map((id) => byId.get(id)?.hidden === true),
        copies: ids.map((id) => {
          const copy = byId.get(`vector_tools_mx_c_a${id}`);
          return copy === undefined
            ? "missing"
            : (Calc as any).expressionAnalysis[copy.id]?.isError
              ? "error"
              : "ok";
        }),
        sketches: ids.map(
          (id) =>
            (Calc as any).controller.grapher2d.graphSketches[
              `vector_tools_mx_c_a${id}`
            ] !== undefined
        ),
        written: plugin.matrix.writtenLines,
      };
    });
    await expectIdle(driver);
    expect(exact.route).toBe("exact");
    expect(exact.status).toEqual([]);
    expect(exact.hidden).toEqual([true, true, true, true, true, true]);
    expect(exact.copies).toEqual(["ok", "ok", "ok", "ok", "ok", "ok"]);
    expect(exact.sketches).toEqual([true, true, true, true, true, true]);
    expect(exact.written).toContain(
      String.raw`A=\begin{bmatrix}1&1\\0&1\end{bmatrix}`
    );
    expect(exact.written).toContain(String.raw`A\cdot v_{1}`);
    await driver.page.screenshot({ path: "docs/assets/matrix-panel.png" });
    await shotOfGraph(driver, "docs/assets/matrix-shear-exact.png");

    // The image of (1, 2) under the shear is (3, 2), evaluated by Desmos.
    const image = await driver.evaluate(
      () =>
        (Calc.controller.getItemModel("vector_tools_mx_c_apoint") as any)
          ?.formula?.typed_constant_value?.value
    );
    expect(image).toEqual([3, 2]);

    // Redraw: the originals come back into the list untouched and are
    // painted through the map by the tab instead of by Desmos.
    await driver.click('#dsm-vector-tools-matrix-route [data-value="redraw"]');
    await settle(driver);
    const redraw = await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      const models = Calc.controller.getAllItemModels() as any[];
      return {
        route: plugin.matrix.routeInUse.route,
        hidden: models
          .filter((m) => !m.id.startsWith("vector_tools_mx"))
          .some((m) => m.hidden === true),
        copies: models.filter((m) => m.id.startsWith("vector_tools_mx_c_"))
          .length,
        installed: plugin.matrix.layer.isInstalled,
        drawError: plugin.matrix.layer.error,
      };
    });
    expect(redraw).toEqual({
      route: "redraw",
      hidden: false,
      copies: 0,
      installed: true,
      drawError: "",
    });
    await shotOfGraph(driver, "docs/assets/matrix-shear-redraw.png");

    // Off: the list is exactly what it was before the tab was touched.
    await driver.click('[data-vector-tools="matrix-on"]');
    await settle(driver);
    expect(await listOf(driver)).toBe(before);
    expect(
      await driver.evaluate(
        () =>
          (DSM.enabledPlugins["vector-tools"] as any).matrix.layer.isInstalled
      )
    ).toBe(false);
  },
  120_000
);

matrixTest(
  "Matrix tab: the fisheye, exactly through its inverse and redrawn",
  async (driver) => {
    await prepare(driver, { left: -7, right: 7, bottom: -4.5, top: 4.5 });
    const before = await listOf(driver);

    await openMatrixTab(driver);
    await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      plugin.matrix.loadPreset("fisheye");
      plugin.matrix.setRoute("exact");
      plugin.matrix.setOn(true);
    });
    await settle(driver);
    const exact = await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      return {
        route: plugin.matrix.routeInUse.route,
        frozen: plugin.matrix.frozen,
        t: plugin.matrix.t,
        status: plugin.matrix.status,
        copies: (Calc.controller.getAllItemModels() as any[]).filter((m) =>
          m.id.startsWith("vector_tools_mx_c_")
        ).length,
      };
    });
    expect(exact).toEqual({
      route: "exact",
      frozen: true,
      t: 1,
      status: [],
      copies: 6,
    });
    await shotOfGraph(driver, "docs/assets/matrix-fisheye-exact.png");

    await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      plugin.matrix.setRoute("redraw");
    });
    await settle(driver);
    expect(
      await driver.evaluate(() => {
        const plugin = DSM.enabledPlugins["vector-tools"] as any;
        return [plugin.matrix.routeInUse.route, plugin.matrix.frozen];
      })
    ).toEqual(["redraw", false]);
    await shotOfGraph(driver, "docs/assets/matrix-fisheye-redraw.png");

    // Each preset that offers a T⁻¹ means it: T(T⁻¹(q)) = q, read through
    // Desmos's own parse of the presets' LaTeX. The fisheye's inverse is
    // defined only inside the disc of radius 4, which is all T reaches.
    const roundTrips = await driver.evaluate(() => {
      const { matrix } = DSM.enabledPlugins["vector-tools"] as any;
      const worst: Record<string, number> = {};
      for (const id of ["swirl", "fisheye"]) {
        matrix.loadPreset(id);
        matrix.setT(1);
        const forward = matrix.baseMap;
        const back = matrix.inverseAtT;
        let error = 0;
        for (let i = 0; i < 40; i++) {
          const angle = i * 2.4;
          const radius = 0.1 + (3.8 * i) / 40;
          const q = [radius * Math.cos(angle), radius * Math.sin(angle)];
          const p = back(q[0], q[1]);
          const r = forward(p[0], p[1]);
          error = Math.max(error, Math.hypot(r[0] - q[0], r[1] - q[1]));
        }
        worst[id] = error;
      }
      return worst;
    });
    expect(roundTrips.swirl).toBeLessThan(1e-9);
    expect(roundTrips.fisheye).toBeLessThan(1e-9);

    await driver.evaluate(() =>
      (DSM.enabledPlugins["vector-tools"] as any).matrix.setOn(false)
    );
    await settle(driver);
    expect(await listOf(driver)).toBe(before);
  },
  120_000
);

matrixTest(
  "Matrix tab: a formula with no inverse is drawn where it can be, says why, and probes J",
  async (driver) => {
    await prepare(driver, { left: -7, right: 7, bottom: -4.5, top: 4.5 });
    await openMatrixTab(driver);
    await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      plugin.matrix.loadPreset("wave");
      plugin.matrix.setRoute("exact");
      plugin.matrix.setOn(true);
    });
    await settle(driver);
    const wave = await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      const { matrix } = plugin;
      return {
        route: matrix.routeInUse,
        frozen: matrix.frozen,
        note: document.querySelector('[data-vector-tools="matrix-route-note"]')
          ?.textContent,
        takeaway: document.querySelector(
          '[data-vector-tools="matrix-takeaway"]'
        )?.textContent,
        facts: matrix.facts.rows.map((row: string[]) => row[0]),
        copies: (Calc.controller.getAllItemModels() as any[]).filter((m) =>
          m.id.startsWith("vector_tools_mx_c_")
        ).length,
        image: (Calc.controller.getItemModel("vector_tools_mx_w1") as any)
          ?.formula?.typed_constant_value?.value,
      };
    });
    // No T⁻¹, and still the exact route: everything that goes forwards (the
    // sine, the point, the ellipse, the parabola) is drawn by Desmos, and only
    // the circle and the half-plane, which need T⁻¹, are redrawn.
    expect(wave.route).toEqual({
      route: "exact",
      why: "This formula has no T⁻¹ typed in: points, parametric and y = f(x) curves are still drawn exactly by Desmos, and regions and implicit curves are redrawn.",
    });
    expect(wave.note).toBe(wave.route.why);
    // Not frozen: nothing drawn needs the inverse, so the formula scrubs.
    expect(wave.frozen).toBe(false);
    expect(wave.takeaway).toContain("Jacobian");
    expect(wave.facts).toEqual(["p", "T(p)", "J(p)", "det J(p)"]);
    expect(wave.copies).toBe(4);
    expect(
      await driver.evaluate(
        () => (DSM.enabledPlugins["vector-tools"] as any).matrix.status
      )
    ).toEqual([
      "2 expressions are redrawn rather than rewritten: it needs T⁻¹, which this map has no formula for.",
    ]);
    // T(v₁) for v₁ = (1, 2): (1 + 0.4 sin 2, 2 + 0.4 sin 1), by Desmos.
    expect(wave.image[0]).toBeCloseTo(1 + 0.4 * Math.sin(2), 9);
    expect(wave.image[1]).toBeCloseTo(2 + 0.4 * Math.sin(1), 9);
    await shotOfGraph(driver, "docs/assets/matrix-wave-exact.png");

    // Half way along, Desmos's own copy of (1, 2) is half way to T(1, 2).
    await driver.evaluate(() =>
      (DSM.enabledPlugins["vector-tools"] as any).matrix.setT(0.5)
    );
    await settle(driver);
    const half = await driver.evaluate(
      () =>
        (Calc.controller.getItemModel("vector_tools_mx_c_apoint") as any)
          ?.formula?.typed_constant_value?.value
    );
    expect(half[0]).toBeCloseTo(1 + 0.2 * Math.sin(2), 9);
    expect(half[1]).toBeCloseTo(2 + 0.2 * Math.sin(1), 9);
    await shotOfGraph(driver, "docs/assets/matrix-wave-half.png");
    await driver.evaluate(() =>
      (DSM.enabledPlugins["vector-tools"] as any).matrix.setT(1)
    );
    await settle(driver);

    // The Field toggle hands T to the live arrows, whatever they were set
    // to, and hands it back when it is turned off.
    await driver.click('#dsm-vector-tools-matrix-shows [data-value="field"]');
    await settle(driver);
    expect(
      await driver.evaluate(() => {
        const plugin = DSM.enabledPlugins["vector-tools"] as any;
        return [plugin.arrowOverlay.isRunning, plugin.arrowMessage];
      })
    ).toEqual([true, ""]);
    await shotOfGraph(driver, "docs/assets/matrix-wave-field.png");
    await driver.click('#dsm-vector-tools-matrix-shows [data-value="field"]');
    await settle(driver);
    expect(
      await driver.evaluate(
        () => (DSM.enabledPlugins["vector-tools"] as any).arrowOverlay.isRunning
      )
    ).toBe(false);

    // Full adds the deeper rows behind the Simple/Full control.
    await driver.click('#dsm-vector-tools-matrix-level [data-value="full"]');
    expect(
      await driver.evaluate(() =>
        (DSM.enabledPlugins["vector-tools"] as any).matrix.facts.rows.map(
          (row: string[]) => row[0]
        )
      )
    ).toEqual([
      "p",
      "T(p)",
      "J(p)",
      "det J(p)",
      "eigenvalues of J",
      "stretch range",
      "locally invertible",
    ]);
  },
  120_000
);

matrixTest(
  "Matrix tab: a matrix from the list follows its slider, and v follows a drag",
  async (driver) => {
    await prepare(driver, { left: -7, right: 7, bottom: -4.5, top: 4.5 });
    await driver.evaluate(() => {
      Calc.setExpressions([
        { id: "slider", latex: "a=0.5" },
        {
          id: "matrix",
          latex: String.raw`A=\begin{bmatrix}1&a\\0&1\end{bmatrix}`,
        },
      ]);
    });
    await settle(driver);
    await openMatrixTab(driver);
    await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      plugin.matrix.loadPreset("shear");
      plugin.matrix.setSource("expression");
      plugin.matrix.setExpressionName("A");
      plugin.matrix.setOn(true);
    });
    await settle(driver);
    const read = async () =>
      await driver.evaluate(() => {
        const plugin = DSM.enabledPlugins["vector-tools"] as any;
        const item = (id: string) =>
          Calc.controller.getItemModel(id) as any | undefined;
        return {
          base: plugin.matrix.baseMatrix,
          inverse: item("vector_tools_mx_ix")?.latex,
          image: item("vector_tools_mx_c_apoint")?.formula?.typed_constant_value
            ?.value,
          writesA: item("vector_tools_mx_A") !== undefined,
          product: item("vector_tools_mx_w1")?.latex,
        };
      });
    const first = await read();
    expect(first.base).toEqual({ ok: true, m: [1, 0.5, 0, 1] });
    expect(first.inverse).toBe(String.raw`X_{vtmx}\left(x,y\right)=1x-0.5y`);
    // (1, 2) sheared by a half: (2, 2).
    expect(first.image).toEqual([2, 2]);
    // The user's A is used, not written over.
    expect(first.writesA).toBe(false);
    expect(first.product).toBe(String.raw`A\cdot v_{1}`);

    await driver.evaluate(() =>
      Calc.setExpression({ id: "slider", latex: "a=2" })
    );
    await settle(driver);
    await expectIdle(driver);
    const second = await read();
    expect(second.base).toEqual({ ok: true, m: [1, 2, 0, 1] });
    expect(second.inverse).toBe(String.raw`X_{vtmx}\left(x,y\right)=1x-2y`);
    expect(second.image).toEqual([5, 2]);

    // A drag on the graph rewrites the point's LaTeX; the tab takes the new
    // place as v₁.
    await driver.evaluate(() =>
      Calc.setExpression({
        id: "vector_tools_mx_v1",
        latex: String.raw`v_{1}=\left(3,1\right)`,
      })
    );
    await settle(driver);
    expect(
      await driver.evaluate(
        () =>
          (DSM.enabledPlugins["vector-tools"] as any).matrix.config.vectors[0]
      )
    ).toEqual([3, 1]);

    // A matrix that stops being one is said so, and the tab waits quietly
    // rather than writing or drawing anything from it.
    await driver.evaluate(() =>
      Calc.setExpression({ id: "matrix", latex: "A=1" })
    );
    await settle(driver);
    expect(
      await driver.evaluate(
        () => (DSM.enabledPlugins["vector-tools"] as any).matrix.status
      )
    ).toContain("A is not a 2×2 matrix of numbers yet.");
    await expectIdle(driver);
  },
  120_000
);

matrixTest(
  "Matrix tab: an original edited while the map is on is carried with it",
  async (driver) => {
    await prepare(driver, { left: -7, right: 7, bottom: -4.5, top: 4.5 });
    await openMatrixTab(driver);
    await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as any;
      plugin.matrix.loadPreset("rotate");
      plugin.matrix.setRoute("exact");
      plugin.matrix.setOn(true);
    });
    await settle(driver);
    await driver.evaluate(() =>
      Calc.setExpression({ id: "sine", latex: String.raw`y=\cos x` })
    );
    await settle(driver);
    const after = await driver.evaluate(() => {
      const item = (id: string) => Calc.controller.getItemModel(id) as any;
      return {
        hidden: item("sine").hidden,
        helper: item("vector_tools_mx_h_asine_0")?.latex,
        error: (Calc as any).expressionAnalysis.vector_tools_mx_c_asine
          ?.isError,
      };
    });
    expect(after).toEqual({
      hidden: true,
      // Explicit, so drawn forwards: one helper, f(x) itself.
      helper: String.raw`H_{vtmx0}\left(x\right)=\cos x`,
      error: false,
    });
    await shotOfGraph(driver, "docs/assets/matrix-rotate-exact.png");
  },
  120_000
);

matrixTest(
  "Matrix tab: the fisheye's sine follows its grid to the rim, within a pixel",
  async (driver) => {
    await prepare(driver, { left: -7, right: 7, bottom: -4.5, top: 4.5 });
    await openMatrixTab(driver);
    await driver.evaluate(() => {
      // Only the sine, so the copy measured is the one drawn.
      for (const id of ["circle", "region", "point", "ellipse", "parabola"])
        Calc.removeExpression({ id });
      const { matrix } = DSM.enabledPlugins["vector-tools"] as any;
      matrix.loadPreset("fisheye");
      matrix.setRoute("exact");
      matrix.setOn(true);
    });
    await settle(driver);
    await settle(driver);
    // Every sample of the true image T(x, sin x), out to where the fisheye
    // has squeezed x = ±400 into the last pixels before the rim, against the
    // polyline Desmos actually drew. The implicit copy this replaced strayed
    // by up to four pixels there, and visibly left the grid.
    const result = await driver.evaluate(() => {
      const { matrix } = DSM.enabledPlugins["vector-tools"] as any;
      const T = matrix.baseMap;
      const b = Calc.graphpaperBounds;
      const px =
        b.pixelCoordinates.width /
        (b.mathCoordinates.right - b.mathCoordinates.left);
      const sketch = (Calc as any).controller.grapher2d.graphSketches
        .vector_tools_mx_c_asine;
      const segments: number[][] = [];
      for (const branch of sketch?.branches ?? [])
        for (const seg of branch.segments ?? [])
          for (let i = 0; i + 3 < seg.length; i += 2)
            segments.push([seg[i], seg[i + 1], seg[i + 2], seg[i + 3]]);
      const distance = (x: number, y: number) => {
        let best = Infinity;
        for (const [ax, ay, bx, by] of segments) {
          const dx = bx - ax;
          const dy = by - ay;
          const l = dx * dx + dy * dy;
          const t =
            l === 0
              ? 0
              : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l));
          best = Math.min(best, Math.hypot(ax + t * dx - x, ay + t * dy - y));
        }
        return best * px;
      };
      let worst = 0;
      let worstAt = 0;
      for (let x = -400; x <= 400; x += 0.01) {
        const q = T(x, Math.sin(x));
        const d = distance(q[0], q[1]);
        if (d > worst) {
          worst = d;
          worstAt = x;
        }
      }
      return {
        worst,
        worstAt,
        domain: Calc.getState().expressions.list.find(
          (e: any) => e.id === "vector_tools_mx_c_asine"
        ),
        kind: sketch?.branches.map((branch: any) => branch.branchMode),
        latex: (Calc.controller.getItemModel("vector_tools_mx_c_asine") as any)
          ?.latex,
      };
    });
    // Drawn forwards, as a parametric (branch 5), not through T⁻¹.
    expect(result.kind).toEqual([5]);
    expect(result.latex).toBe(
      String.raw`T\left(\left(t,H_{vtmx0}\left(t\right)\right)\right)`
    );
    expect(result.worst).toBeLessThan(1);
    await shotOfGraph(driver, "docs/assets/matrix-fisheye-follows.png");
  },
  120_000
);

matrixTest(
  "Matrix tab: a polygon goes through a matrix, and a projection still draws",
  async (driver) => {
    await prepare(driver, { left: -7, right: 7, bottom: -4.5, top: 4.5 });
    await driver.evaluate(() => {
      Calc.setExpression({
        id: "triangle",
        latex: String.raw`\operatorname{polygon}\left(\left(0,0\right),\left(2,0\right),\left(0,2\right)\right)`,
        color: "#6042a6",
      });
    });
    await settle(driver);
    await openMatrixTab(driver);
    await driver.evaluate(() => {
      const { matrix } = DSM.enabledPlugins["vector-tools"] as any;
      matrix.loadPreset("shear");
      matrix.setRoute("exact");
      matrix.setOn(true);
    });
    await settle(driver);
    // The shear carries the triangle vertex by vertex: its copy is Desmos's
    // own polygon, filled and outlined, and the original is hidden.
    const sheared = await driver.evaluate(() => ({
      hidden: (Calc.controller.getItemModel("triangle") as any).hidden,
      modes: (
        Calc as any
      ).controller.grapher2d.graphSketches.vector_tools_mx_c_atriangle?.branches.map(
        (branch: any) => branch.branchMode
      ),
      error: (Calc as any).expressionAnalysis.vector_tools_mx_c_atriangle
        ?.isError,
    }));
    expect(sheared).toEqual({ hidden: true, modes: [7, 5], error: false });
    await shotOfGraph(driver, "docs/assets/matrix-shear-polygon.png");

    // A projection has no inverse. Points, parametrics and explicit curves
    // are still Desmos's own copies; only the regions and implicit curves
    // that need A⁻¹ are redrawn, and the panel says which and why.
    await driver.evaluate(() =>
      (DSM.enabledPlugins["vector-tools"] as any).matrix.loadPreset("project")
    );
    await settle(driver);
    const projected = await driver.evaluate(() => {
      const { matrix } = DSM.enabledPlugins["vector-tools"] as any;
      const copies = (Calc.controller.getAllItemModels() as any[])
        .filter((m) => m.id.startsWith("vector_tools_mx_c_"))
        .map((m) => m.id.slice("vector_tools_mx_c_a".length))
        .sort((a: string, b: string) => a.localeCompare(b));
      return {
        route: matrix.routeInUse.route,
        copies,
        point: (Calc.controller.getItemModel("vector_tools_mx_c_apoint") as any)
          ?.formula?.typed_constant_value?.value,
        status: matrix.status,
      };
    });
    expect(projected.route).toBe("exact");
    expect(projected.copies).toEqual([
      "ellipse",
      "parabola",
      "point",
      "sine",
      "triangle",
    ]);
    // (1, 2) projected onto the x-axis.
    expect(projected.point).toEqual([1, 0]);
    expect(projected.status).toEqual([
      "2 expressions are redrawn rather than rewritten: it needs T⁻¹, which this map has no formula for.",
    ]);
    await shotOfGraph(driver, "docs/assets/matrix-project-exact.png");
  },
  120_000
);
