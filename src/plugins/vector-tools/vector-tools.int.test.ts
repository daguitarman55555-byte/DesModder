import { clean, testWithPage } from "../../tests/puppeteer-utils";
import type { Calc as CalcType } from "#globals";

declare let Calc: CalcType;

const BUTTON = ".dsm-action-menu .dsm-icon-compass2";
const PANEL = ".dsm-vector-tools-menu";
const GENERATE = ".dsm-vector-tools-generate";
const REMOVE = ".dsm-vector-tools-remove";
const RESET = ".dsm-vector-tools-reset";
const VISUALIZE = ".dsm-vector-tools-visualize";
const TEST_LAB = ".dsm-vector-tools-test-lab";
const FLOW_CANVAS = "#dsm-vector-tools-flow-canvas";
const NAMESPACE = "vector_tools_vf_default";
const FOLDER_ID = `${NAMESPACE}_folder`;
const UNRELATED_LINE_ID = "unrelated_line";

testWithPage(
  "Vector Tools generates a stable production field and does not expose its development lab in a production build",
  async (driver) => {
    expect(await driver.getEnabledPlugins()).not.toContain("vector-tools");
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    expect(await driver.$$(BUTTON)).toHaveLength(1);

    await driver.click(BUTTON);
    await driver.assertSelector(PANEL, GENERATE, REMOVE);
    await driver.assertSelectorNot(TEST_LAB);
    await driver.click(GENERATE);
    await driver.waitForSync();

    let items = (await driver.getState()).expressions.list;
    expect(items.filter((item) => item.id === FOLDER_ID)).toHaveLength(1);
    expect(items.find((item) => item.id === FOLDER_ID)).toMatchObject({
      type: "folder",
      title: "Vector Tools — Vector Field",
    });
    expect(
      items.filter((item) => item.id?.startsWith(`${NAMESPACE}_`)).length
    ).toBe(20);
    expect(
      items.find((item) => item.id === `${NAMESPACE}_shafts`)
    ).toMatchObject({
      type: "expression",
      folderId: FOLDER_ID,
      // Desmos drops colorLatex from setExpression and ignores the
      // set-item-colorLatex action, so a regression here means every arrow
      // silently renders in the same flat color.
      colorLatex: "v_{tfdc}",
    });
    expect(
      items.find((item) => item.id === `${NAMESPACE}_p_function`)
    ).toMatchObject({
      latex: "v_{tfdp}\\left(x,y\\right)=\\left(-y\\right)",
      hidden: true,
    });
    const semanticSnapshot = await driver.evaluate(
      (namespace) =>
        Calc.controller
          .getAllItemModels()
          .filter((item) => item.id.startsWith(`${namespace}_`))
          .map((item) => {
            const expression = item as typeof item & {
              formula?: { expression_type?: string };
              error?: unknown;
            };
            return {
              id: item.id,
              expressionType: expression.formula?.expression_type,
              hasError: expression.error !== undefined,
              error:
                expression.error === undefined
                  ? undefined
                  : JSON.stringify(expression.error),
            };
          }),
      NAMESPACE
    );
    expect(semanticSnapshot).toHaveLength(20);
    expect(semanticSnapshot.filter((item) => item.hasError)).toEqual([]);
    await driver.click(GENERATE);
    await driver.waitForSync();
    items = (await driver.getState()).expressions.list;
    expect(
      items.filter((item) => item.id?.startsWith(`${NAMESPACE}_`))
    ).toHaveLength(20);

    await driver.evaluate(
      (id) => Calc.setExpression({ id, latex: "y=x^2" }),
      UNRELATED_LINE_ID
    );
    await driver.waitForSync();
    await driver.click(REMOVE);
    await driver.waitForSync();

    items = (await driver.getState()).expressions.list;
    expect(items.find((item) => item.id === FOLDER_ID)).toBeUndefined();
    expect(
      items.find((item) => item.id?.startsWith(`${NAMESPACE}_`))
    ).toBeUndefined();
    expect(items.find((item) => item.id === UNRELATED_LINE_ID)).toMatchObject({
      type: "expression",
      latex: "y=x^2",
    });

    await driver.disablePlugin("vector-tools");
    await driver.assertSelectorNot(BUTTON, PANEL);
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    expect(await driver.$$(BUTTON)).toHaveLength(1);
    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();

    return clean;
  },
  90000
);

testWithPage(
  "Vector Tools panel controls show the stored configuration",
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);

    // Every select is populated from persisted state; DCGView only re-reads a
    // prop passed as a function, and a `value` attribute never moves a
    // `<select>`'s selection at all.
    const initial = await driver.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll(".dsm-vector-tools-menu select")].map(
          (select) => [select.id, (select as HTMLSelectElement).value]
        )
      )
    );
    expect(initial["dsm-vector-tools-length-mode"]).toBe("normalized");
    expect(initial["dsm-vector-tools-color-mode"]).toBe("fixed");
    expect(initial["dsm-vector-tools-x-sampling"]).toBe("step");

    // Number inputs must be unique per axis, or the labels point at the wrong
    // field and the y axis mirrors the x axis.
    const numberIDs = await driver.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".dsm-vector-tools-menu input[type=number]"
        ),
      ].map((input) => input.id)
    );
    expect(new Set(numberIDs).size).toBe(numberIDs.length);
    expect(numberIDs).toContain("dsm-vector-tools-x-minimum");
    expect(numberIDs).toContain("dsm-vector-tools-y-minimum");

    await driver.evaluate(() => {
      const select = document.getElementById(
        "dsm-vector-tools-color-mode"
      ) as HTMLSelectElement;
      select.value = "magnitude";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await driver.waitForSync();
    expect(
      await driver.evaluate(
        () =>
          (
            document.getElementById(
              "dsm-vector-tools-color-mode"
            ) as HTMLSelectElement
          ).value
      )
    ).toBe("magnitude");

    await driver.click(RESET);
    await driver.waitForSync();
    expect(
      await driver.evaluate(() => ({
        colorMode: (
          document.getElementById(
            "dsm-vector-tools-color-mode"
          ) as HTMLSelectElement
        ).value,
        xMin: (
          document.getElementById(
            "dsm-vector-tools-x-minimum"
          ) as HTMLInputElement
        ).value,
      }))
    ).toEqual({ colorMode: "fixed", xMin: "-10" });

    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);

testWithPage(
  "Vector Tools flow visualizer covers the graph paper and cleans up after itself",
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);

    await driver.assertSelectorNot(FLOW_CANVAS);
    await driver.click(VISUALIZE);
    await driver.assertSelectorEventually(FLOW_CANVAS);

    const geometry = await driver.evaluate(() => {
      const overlay = document.querySelector<HTMLCanvasElement>(
        "#dsm-vector-tools-flow-canvas"
      )!;
      const graph = document.querySelector<HTMLCanvasElement>(
        "canvas.dcg-graph-inner"
      )!;
      const a = overlay.getBoundingClientRect();
      const b = graph.getBoundingClientRect();
      return {
        aligned:
          Math.abs(a.x - b.x) < 1 &&
          Math.abs(a.y - b.y) < 1 &&
          Math.abs(a.width - b.width) < 1 &&
          Math.abs(a.height - b.height) < 1,
        pointerEvents: getComputedStyle(overlay).pointerEvents,
        hasBuffer: overlay.width > 0 && overlay.height > 0,
        // The overlay must sit above the graph paper, not replace it.
        drawnAfterGraph:
          graph.compareDocumentPosition(overlay) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      };
    });
    expect(geometry.aligned).toBe(true);
    expect(geometry.pointerEvents).toBe("none");
    expect(geometry.hasBuffer).toBe(true);
    expect(geometry.drawnAfterGraph).toBeGreaterThan(0);

    // A component the GPU cannot evaluate must disable the button with a
    // reason rather than failing when it is pressed.
    await driver.evaluate(() => {
      const dsm = (window as any).DSM;
      const config = JSON.parse(
        dsm.pluginSettings["vector-tools"].serializedFieldConfig
      );
      config.components.xLatex = "a_{1}";
      dsm.setPluginSetting(
        "vector-tools",
        "serializedFieldConfig",
        JSON.stringify(config)
      );
    });
    await driver.waitForSync();
    const blocked = await driver.evaluate(() => {
      const button = document.querySelector<HTMLElement>(
        ".dsm-vector-tools-visualize"
      )!;
      return {
        disabled: button.classList.contains("dsm-btn-disabled"),
        warning: document.querySelector(
          ".dsm-vector-tools-flow .dsm-vector-tools-warning"
        )?.textContent,
      };
    });
    expect(blocked.warning).toContain("refers to another expression");

    await driver.disablePlugin("vector-tools");
    await driver.assertSelectorNot(FLOW_CANVAS);
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);
