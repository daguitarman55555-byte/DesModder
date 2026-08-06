import { CalculatorExpressionAdapter } from "./desmos/ExpressionAdapter";
import {
  auditVectorFieldPlan,
  componentExpressionID,
  componentFunctionLatex,
  createVectorFieldPlan,
  editableSlots,
  namespaceForField,
  parseComponentFromLatex,
  setSlotBody,
  slotBody,
} from "./generator";
import { TEST_FOLDER_ID, TEST_LINE_ID, TEST_NAMESPACE } from "./ids";
import {
  cloneDefaultConfig,
  configForPreset,
  DENSITY_PRESETS,
  FLOW_PARTICLE_MAXIMUM,
  FLOW_PARTICLE_MINIMUM,
  isDevelopmentBuild,
  normalizeVectorFieldConfig,
  PANEL_MAX_WIDTH,
  PANEL_MIN_HEIGHT,
  validateVectorFieldConfig,
  VECTOR_FIELD_PRESETS,
} from "./model";
import type { Calc } from "#globals";

interface FakeItem {
  id: string;
  type: "expression" | "folder";
  latex?: string;
  color?: string;
  colorLatex?: string;
  hidden?: boolean;
  secret?: boolean;
  title?: string;
  collapsed?: boolean;
  folderId?: string;
}

/**
 * Mirrors the parts of Desmos that Vector Tools depends on: state round-trips
 * through `getState`/`setState`, and `getState` omits properties left at their
 * defaults, exactly as the real calculator does.
 */
class FakeCalculator {
  items: FakeItem[] = [];
  setStateCalls = 0;
  lastSetStateOptions: unknown;

  readonly calc = {
    getState: () => ({
      version: 9,
      graph: { viewport: { xmin: -10, xmax: 10, ymin: -6, ymax: 6 } },
      expressions: {
        list: this.items.map((item) => {
          const copy: FakeItem = { ...item };
          if (copy.hidden === false) delete copy.hidden;
          if (copy.secret === false) delete copy.secret;
          return copy;
        }),
      },
    }),
    setState: (
      state: { expressions: { list: FakeItem[] } },
      opts?: unknown
    ) => {
      this.setStateCalls++;
      this.lastSetStateOptions = opts;
      this.items = state.expressions.list.map((item) => ({ ...item }));
    },
    controller: {
      getItemModel: (id: string) => this.getItem(id),
      getAllItemModels: () => this.items,
      updateViews: () => undefined,
    },
  };

  getItem(id: string) {
    return this.items.find((item) => item.id === id);
  }
}

function makeAdapter() {
  const fakeCalculator = new FakeCalculator();
  return {
    fakeCalculator,
    adapter: new CalculatorExpressionAdapter(
      fakeCalculator.calc as unknown as Calc
    ),
  };
}

const TEST_FOLDER = { id: TEST_FOLDER_ID, title: "Vector Tools — Test" };

describe("Vector Tools expression adapter", () => {
  test("uses stable IDs and rewrites the generated set in place", () => {
    const { adapter, fakeCalculator } = makeAdapter();
    adapter.applyGeneratedSet(TEST_NAMESPACE, TEST_FOLDER, [
      {
        id: TEST_LINE_ID,
        latex: "y=x",
        color: "#6042a6",
        folderId: TEST_FOLDER_ID,
      },
    ]);
    adapter.applyGeneratedSet(TEST_NAMESPACE, TEST_FOLDER, [
      {
        id: TEST_LINE_ID,
        latex: "y=2x",
        color: "#6042a6",
        folderId: TEST_FOLDER_ID,
      },
    ]);

    expect(fakeCalculator.items).toEqual([
      { id: TEST_FOLDER_ID, type: "folder", title: "Vector Tools — Test" },
      {
        id: TEST_LINE_ID,
        type: "expression",
        latex: "y=2x",
        color: "#6042a6",
        hidden: false,
        folderId: TEST_FOLDER_ID,
      },
    ]);
    expect(adapter.expressionExists(TEST_LINE_ID)).toBe(true);
    expect(fakeCalculator.lastSetStateOptions).toEqual({ allowUndo: true });
  });

  test("keeps mapped colors, folder assignment, and the field's list position", () => {
    const { adapter, fakeCalculator } = makeAdapter();
    fakeCalculator.items = [
      { id: "before_line", type: "expression", latex: "y=1" },
      { id: "after_line", type: "expression", latex: "y=2" },
    ];
    adapter.applyGeneratedSet(TEST_NAMESPACE, TEST_FOLDER, [
      {
        id: TEST_LINE_ID,
        latex: "y=x",
        folderId: TEST_FOLDER_ID,
        colorLatex: "v_{tftc}",
      },
    ]);
    // Regenerating must not move the field to the end of the list.
    fakeCalculator.items.push({
      id: "trailing_line",
      type: "expression",
      latex: "y=3",
    });
    adapter.applyGeneratedSet(TEST_NAMESPACE, TEST_FOLDER, [
      {
        id: TEST_LINE_ID,
        latex: "y=x",
        folderId: TEST_FOLDER_ID,
        colorLatex: "v_{tftc}",
      },
    ]);

    expect(fakeCalculator.items.map((item) => item.id)).toEqual([
      "before_line",
      "after_line",
      TEST_FOLDER_ID,
      TEST_LINE_ID,
      "trailing_line",
    ]);
    expect(fakeCalculator.getItem(TEST_LINE_ID)).toMatchObject({
      colorLatex: "v_{tftc}",
      folderId: TEST_FOLDER_ID,
    });
    expect(adapter.getGeneratedItems(TEST_NAMESPACE)).toEqual([
      {
        id: TEST_FOLDER_ID,
        type: "folder",
        latex: undefined,
        hidden: undefined,
        secret: false,
        colorLatex: undefined,
        folderId: undefined,
      },
      {
        id: TEST_LINE_ID,
        type: "expression",
        latex: "y=x",
        hidden: false,
        secret: false,
        colorLatex: "v_{tftc}",
        folderId: TEST_FOLDER_ID,
      },
    ]);
  });

  test("removes only items in the requested generated namespace", () => {
    const { adapter, fakeCalculator } = makeAdapter();
    adapter.applyGeneratedSet(TEST_NAMESPACE, TEST_FOLDER, [
      { id: TEST_LINE_ID, latex: "y=x", folderId: TEST_FOLDER_ID },
    ]);
    fakeCalculator.items.push({
      id: "unrelated_line",
      type: "expression",
      latex: "y=x^2",
    });

    adapter.removeGeneratedSet(TEST_NAMESPACE);

    expect(fakeCalculator.items).toEqual([
      { id: "unrelated_line", type: "expression", latex: "y=x^2" },
    ]);
  });

  test("rejects malformed generated specs before touching calculator state", () => {
    const { adapter, fakeCalculator } = makeAdapter();
    const apply = (
      namespace: string,
      folder: { id: string; title: string },
      expressions: Parameters<typeof adapter.applyGeneratedSet>[2]
    ) => adapter.applyGeneratedSet(namespace, folder, expressions);

    expect(() =>
      apply(TEST_NAMESPACE, { id: "vector-tools", title: "T" }, [])
    ).toThrow("valid Desmos identifier");
    expect(() =>
      apply(TEST_NAMESPACE, TEST_FOLDER, [{ id: TEST_LINE_ID, latex: "   " }])
    ).toThrow("LaTeX must not be empty");
    expect(() =>
      apply(TEST_NAMESPACE, TEST_FOLDER, [
        { id: TEST_LINE_ID, latex: "y=x", color: "purple" },
      ])
    ).toThrow("hex color");
    expect(() =>
      apply(TEST_NAMESPACE, TEST_FOLDER, [{ id: "escaped_id", latex: "y=x" }])
    ).toThrow("outside the vector_tools_test namespace");
    expect(fakeCalculator.setStateCalls).toBe(0);
  });

  test("refuses to overwrite a foreign item that shares the namespace prefix", () => {
    const { adapter, fakeCalculator } = makeAdapter();
    fakeCalculator.items = [
      { id: TEST_LINE_ID, type: "folder", title: "Mine" },
    ];

    expect(() =>
      adapter.applyGeneratedSet(TEST_NAMESPACE, TEST_FOLDER, [
        { id: TEST_LINE_ID, latex: "y=x", folderId: TEST_FOLDER_ID },
      ])
    ).toThrow("already used by a folder");
    expect(fakeCalculator.setStateCalls).toBe(0);
  });
});

describe("Vector Tools field configuration", () => {
  test("normalizes persisted data to the current serializable schema", () => {
    const config = normalizeVectorFieldConfig({
      schemaVersion: 0,
      id: "saved_field",
      name: "Saved field",
      components: { xLatex: "", yLatex: "x+y" },
      domain: { x: { min: -2, max: 2, mode: "count", count: 5 }, y: {} },
      color: { fixedColor: "not-a-color" },
    });

    expect(config).toMatchObject({
      schemaVersion: 3,
      id: "saved_field",
      name: "Saved field",
      components: { xLatex: "", yLatex: "x+y" },
      domain: { x: { mode: "count", count: 5 }, y: { min: -6, max: 6 } },
      color: { fixedColor: "not-a-color" },
      // Schema 2 and earlier had no source. Those are all component fields,
      // and reading one as a gradient would silently replace the user's field.
      source: "components",
    });
    expect(config.scalar.fLatex).toBe(cloneDefaultConfig().scalar.fLatex);
  });

  test("keeps a saved gradient field a gradient field", () => {
    const config = normalizeVectorFieldConfig({
      schemaVersion: 3,
      source: "gradient",
      scalar: { fLatex: "\\sin(x)+y^{2}" },
    });
    expect(config.source).toBe("gradient");
    expect(config.scalar.fLatex).toBe("\\sin(x)+y^{2}");

    // Anything else in `source` is not a field the plugin knows how to build.
    expect(normalizeVectorFieldConfig({ source: "curl" }).source).toBe(
      "components"
    );
  });

  test("fills in and clamps flow settings saved by an older schema", () => {
    const upgraded = normalizeVectorFieldConfig({
      schemaVersion: 1,
      components: { xLatex: "-y", yLatex: "x" },
    });
    expect(upgraded.flow).toEqual(cloneDefaultConfig().flow);

    // Schema 2 stored a texture edge length instead of a particle count.
    expect(
      normalizeVectorFieldConfig({ flow: { particleResolution: 192 } }).flow
        .particleCount
    ).toBe(192 * 192);

    const clamped = normalizeVectorFieldConfig({
      flow: {
        particleCount: 1e9,
        speed: 1e9,
        trailPersistence: 5,
        dropRate: -1,
        opacity: 0,
        pointSize: 100,
        colorMode: "nonsense",
        normalizeSpeed: "yes",
      },
    });
    expect(clamped.flow).toEqual({
      particleCount: FLOW_PARTICLE_MAXIMUM,
      speed: 8,
      trailPersistence: 0.995,
      dropRate: 0,
      opacity: 0.05,
      pointSize: 6,
      colorMode: "speed",
      normalizeSpeed: true,
    });
    expect(
      normalizeVectorFieldConfig({ flow: { particleCount: 1 } }).flow
        .particleCount
    ).toBe(FLOW_PARTICLE_MINIMUM);
  });

  test("clamps persisted panel geometry and falls back to a known tab", () => {
    expect(
      normalizeVectorFieldConfig({
        panel: { width: 10_000, height: 4, tab: "nope" },
      }).panel
    ).toEqual({
      width: PANEL_MAX_WIDTH,
      height: PANEL_MIN_HEIGHT,
      tab: "field",
    });
    expect(
      normalizeVectorFieldConfig({ panel: { width: 460, tab: "flow" } }).panel
    ).toMatchObject({ width: 460, tab: "flow" });
  });

  test("rejects incomplete fields and unsafe sampling while requiring a warning confirmation", () => {
    const invalid = cloneDefaultConfig();
    invalid.components.xLatex = "x+";
    invalid.domain.x.step = 0;
    invalid.color.rangeMode = "manual";
    invalid.color.minimum = 1;
    invalid.color.maximum = 1;
    const invalidValidation = validateVectorFieldConfig(invalid);
    expect(invalidValidation.canGenerate).toBe(false);
    expect(invalidValidation.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("P(x,y) appears incomplete"),
        expect.stringContaining("x step"),
        expect.stringContaining("Manual color"),
      ])
    );

    const warning = cloneDefaultConfig();
    warning.domain.x = { ...warning.domain.x, mode: "count", count: 52 };
    warning.domain.y = { ...warning.domain.y, mode: "count", count: 50 };
    const warningValidation = validateVectorFieldConfig(warning);
    expect(warningValidation).toMatchObject({
      canGenerate: true,
      requiresConfirmation: true,
      estimatedVectorCount: 2600,
    });

    warning.domain.x.count = 201;
    warning.domain.y.count = 51;
    expect(validateVectorFieldConfig(warning).canGenerate).toBe(false);
  });

  test("keeps the developer lab out of a production build", () => {
    expect(isDevelopmentBuild(false)).toBe(false);
    expect(
      DENSITY_PRESETS.find((preset) => preset.id === "warning")
    ).toMatchObject({
      xCount: 52,
      yCount: 50,
    });
  });
});

describe("Vector Tools Desmos expression plans", () => {
  test("creates namespaced helper expressions and visible arrow geometry", () => {
    const config = cloneDefaultConfig();
    config.id = "orbit";
    config.name = "Orbit";
    const plan = createVectorFieldPlan(config);

    expect(plan.namespace).toBe(namespaceForField(config));
    expect(plan.folder.id).toBe("vector_tools_vf_orbit_folder");
    expect(
      new Set(plan.expressions.map((expression) => expression.id)).size
    ).toBe(plan.expressions.length);
    expect(
      plan.expressions.find((expression) => expression.purpose === "shafts")
    ).toMatchObject({ hidden: false, colorLatex: "v_{tfdc}" });
    expect(
      plan.expressions.find(
        (expression) => expression.purpose === "x component function"
      )?.latex
    ).toContain("v_{tfdp}");
    expect(
      plan.expressions.find((expression) => expression.purpose === "color list")
        ?.latex
    ).toContain("rgb");
  });

  test("derives P and Q from f for a gradient field", () => {
    const config = cloneDefaultConfig();
    config.source = "gradient";
    config.scalar.fLatex = "x^{2}+y^{2}";
    const plan = createVectorFieldPlan(config);
    const latexFor = (purpose: string) =>
      plan.expressions.find((expression) => expression.purpose === purpose)
        ?.latex;

    // The scalar is an ordinary expression in the folder, and the components
    // are Desmos's own partials of it — `\frac{d}{dx}` of a two-argument
    // function, which is the only spelling a real Desmos accepts.
    expect(latexFor("scalar function")).toBe(
      "v_{tfdf}\\left(x,y\\right)=\\left(x^{2}+y^{2}\\right)"
    );
    expect(latexFor("x component function")).toBe(
      "v_{tfdp}\\left(x,y\\right)=\\left(\\frac{d}{dx}v_{tfdf}\\left(x,y\\right)\\right)"
    );
    expect(latexFor("y component function")).toBe(
      "v_{tfdq}\\left(x,y\\right)=\\left(\\frac{d}{dy}v_{tfdf}\\left(x,y\\right)\\right)"
    );
    // Everything downstream is unchanged: the arrows do not know or care that
    // the components were derived.
    expect(latexFor("shafts")).toBe(
      createVectorFieldPlan(cloneDefaultConfig()).expressions.find(
        (expression) => expression.purpose === "shafts"
      )?.latex
    );
    expect(
      new Set(plan.expressions.map((expression) => expression.id)).size
    ).toBe(plan.expressions.length);
  });

  test("carries the scalar function only for a gradient field", () => {
    const components = createVectorFieldPlan(cloneDefaultConfig());
    const gradient = cloneDefaultConfig();
    gradient.source = "gradient";

    expect(
      components.expressions.some(
        (expression) => expression.purpose === "scalar function"
      )
    ).toBe(false);
    expect(createVectorFieldPlan(gradient).expressions).toHaveLength(
      components.expressions.length + 1
    );
  });

  test("mirrors only the slots the user types into", () => {
    const config = cloneDefaultConfig();
    expect(editableSlots(config)).toEqual(["p", "q"]);
    config.source = "gradient";
    // P and Q are derived, so adopting an edit to them would overwrite the
    // derivative the generator owns.
    expect(editableSlots(config)).toEqual(["f"]);

    expect(componentExpressionID(config, "f")).toBe(
      "vector_tools_vf_default_f_function"
    );
    expect(
      parseComponentFromLatex(config, "f", componentFunctionLatex(config, "f"))
    ).toBe(config.scalar.fLatex);

    setSlotBody(config, "f", "\\sin(xy)");
    expect(slotBody(config, "f")).toBe("\\sin(xy)");
    expect(config.scalar.fLatex).toBe("\\sin(xy)");
  });

  test.each([
    "actual",
    "normalized",
    "scaled",
    "clamped",
    "compressed",
    "direction-only",
  ] as const)("supports the %s arrow-length mode", (mode) => {
    const config = cloneDefaultConfig();
    config.length.mode = mode;
    const plan = createVectorFieldPlan(config);
    const display = plan.expressions.find(
      (expression) => expression.purpose === "displayed x components"
    );
    expect(display?.latex).toContain("v_{tfddu}");
  });

  test("round-trips components through their expression-list definitions", () => {
    const config = cloneDefaultConfig();
    expect(componentExpressionID(config, "p")).toBe(
      "vector_tools_vf_default_p_function"
    );
    expect(componentFunctionLatex(config, "p")).toBe(
      "v_{tfdp}\\left(x,y\\right)=\\left(-y\\right)"
    );
    expect(
      parseComponentFromLatex(config, "p", componentFunctionLatex(config, "p"))
    ).toBe("-y");
    // Bodies a person would type by hand, with and without wrapping.
    expect(
      parseComponentFromLatex(config, "q", "v_{tfdq}\\left(x,y\\right)=3x")
    ).toBe("3x");
    // Only a paired outer group is stripped, never two adjacent ones.
    expect(
      parseComponentFromLatex(
        config,
        "q",
        "v_{tfdq}\\left(x,y\\right)=\\left(x\\right)+\\left(y\\right)"
      )
    ).toBe("\\left(x\\right)+\\left(y\\right)");
    // A renamed or re-signatured definition is no longer this field's.
    expect(
      parseComponentFromLatex(config, "p", "g\\left(x,y\\right)=-y")
    ).toBeUndefined();
    expect(
      parseComponentFromLatex(config, "p", "v_{tfdp}\\left(t\\right)=-y")
    ).toBeUndefined();
    expect(parseComponentFromLatex(config, "p", undefined)).toBeUndefined();
  });

  test("audits missing and unexpected expressions without treating a manual probe as a pass", () => {
    const config = configForPreset(
      VECTOR_FIELD_PRESETS[0],
      DENSITY_PRESETS[0],
      "normalized",
      "magnitude"
    );
    const plan = createVectorFieldPlan(config);
    const current = [
      { id: plan.folder.id, type: "folder" as const },
      ...plan.expressions.slice(0, 2).map((expression) => ({
        id: expression.id,
        type: "expression" as const,
        latex: expression.latex,
        hidden: expression.hidden,
        folderId: plan.folder.id,
      })),
      { id: `${plan.namespace}_manual_probe`, type: "expression" as const },
    ];
    const audit = auditVectorFieldPlan(plan, current);

    expect(audit.missing).toHaveLength(plan.expressions.length - 2);
    expect(audit.unexpected).toEqual([`${plan.namespace}_manual_probe`]);
    expect(audit.renderMissing).toBe(true);
  });
});
