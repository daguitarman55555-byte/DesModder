import { CalculatorExpressionAdapter } from "./desmos/ExpressionAdapter";
import {
  auditVectorFieldPlan,
  createVectorFieldPlan,
  namespaceForField,
} from "./generator";
import { TEST_FOLDER_ID, TEST_LINE_ID, TEST_NAMESPACE } from "./ids";
import {
  cloneDefaultConfig,
  configForPreset,
  DENSITY_PRESETS,
  isDevelopmentBuild,
  normalizeVectorFieldConfig,
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
      schemaVersion: 2,
      id: "saved_field",
      name: "Saved field",
      components: { xLatex: "", yLatex: "x+y" },
      domain: { x: { mode: "count", count: 5 }, y: { min: -6, max: 6 } },
      color: { fixedColor: "not-a-color" },
    });
  });

  test("fills in and clamps flow settings saved by an older schema", () => {
    const upgraded = normalizeVectorFieldConfig({
      schemaVersion: 1,
      components: { xLatex: "-y", yLatex: "x" },
    });
    expect(upgraded.flow).toEqual(cloneDefaultConfig().flow);

    const clamped = normalizeVectorFieldConfig({
      flow: {
        particleResolution: 999,
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
      particleResolution: 128,
      speed: 8,
      trailPersistence: 0.995,
      dropRate: 0,
      opacity: 0.05,
      pointSize: 6,
      colorMode: "speed",
      normalizeSpeed: true,
    });
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
