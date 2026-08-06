import {
  clean,
  Driver,
  testWithPage,
  testWithPageAndOpts,
} from "../../tests/puppeteer-utils";
import type { Calc as CalcType } from "#globals";

declare let Calc: CalcType;
declare let DSM: Window["DSM"];

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

/** Chips replaced the panel's dropdowns; this is how one is read and pressed. */
const selectedChip = (label: string) =>
  [
    ...document.querySelectorAll<HTMLElement>(
      `.dsm-vector-tools-menu [aria-label="${label}"] .dsm-vector-tools-chip`
    ),
  ].find((chip) => chip.getAttribute("aria-pressed") === "true")?.dataset.value;

/**
 * `evaluate` stringifies its callback, so nothing from module scope is in
 * scope inside one. Read the stored config through its own round trip.
 */
const storedConfig = async (driver: Driver) =>
  await driver.evaluate(() =>
    JSON.parse(
      DSM.pluginSettings["vector-tools"]!.serializedFieldConfig as string
    )
  );

async function openTab(driver: Driver, index: number) {
  await driver.click(
    `.dsm-vector-tools-tabs .dcg-segmented-control-btn:nth-child(${index + 1})`
  );
}

testWithPage(
  "Vector Tools panel controls show the stored configuration",
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);

    // The panel opens on Field, and its sampling chips reflect stored state.
    expect(await driver.evaluate(selectedChip, "Sampling by")).toBe("step");

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

    // DCGView writes props as attributes, and `disabled="false"` still
    // disables an input, so every number field used to be unusable.
    const disabled = await driver.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLInputElement>(
          ".dsm-vector-tools-menu input[type=number]"
        ),
      ].map((input) => input.disabled)
    );
    expect(disabled).not.toContain(true);

    // Typing must actually reach the stored configuration.
    await driver.page.click("#dsm-vector-tools-x-minimum", { clickCount: 3 });
    await driver.page.keyboard.type("-4");
    await driver.waitForSync();
    expect((await storedConfig(driver)).domain.x.min).toBe(-4);

    await openTab(driver, 1);
    expect(await driver.evaluate(selectedChip, "Length mode")).toBe(
      "normalized"
    );
    await driver.click('[aria-label="Length mode"] [data-value="compressed"]');
    await driver.waitForSync();
    expect(await driver.evaluate(selectedChip, "Length mode")).toBe(
      "compressed"
    );

    await driver.click(RESET);
    await driver.waitForSync();
    expect(await driver.evaluate(selectedChip, "Length mode")).toBe(
      "normalized"
    );

    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);

testWithPage(
  "Vector Tools panel is resizable and its popover grows with it",
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);

    // Resizing is a corner drag on the panel itself, so the size has to be
    // read back off the element and persisted.
    await driver.evaluate(() => {
      const menu = document.querySelector<HTMLElement>(
        ".dsm-vector-tools-menu"
      )!;
      menu.style.width = "470px";
    });
    // The size is debounced before it is written, and writing a plugin setting
    // is itself deferred, so wait for the value rather than for a duration.
    await driver.page.waitForFunction(
      () =>
        JSON.parse(
          (window as unknown as { DSM: { pluginSettings: any } }).DSM
            .pluginSettings["vector-tools"].serializedFieldConfig
        ).panel.width === 470
    );

    const geometry = await driver.evaluate(() => {
      const menu = document.querySelector<HTMLElement>(
        ".dsm-vector-tools-menu"
      )!;
      const popover = menu.closest<HTMLElement>(".dsm-pillbox-popover")!;
      const body = menu.querySelector<HTMLElement>(".dsm-vector-tools-body")!;
      return {
        resize: getComputedStyle(menu).resize,
        menuWidth: Math.round(menu.getBoundingClientRect().width),
        // A fixed-width pillbox popover would clip the resized panel.
        popoverWidth: Math.round(popover.getBoundingClientRect().width),
        // The body scrolls so the tabs and action buttons stay put.
        bodyScrolls: body.scrollHeight > body.clientHeight,
        footerPresent: menu.querySelector(".dsm-vector-tools-footer") !== null,
        storedWidth: JSON.parse(
          DSM.pluginSettings["vector-tools"]!.serializedFieldConfig as string
        ).panel.width,
      };
    });
    expect(geometry.resize).toBe("both");
    expect(geometry.menuWidth).toBe(470);
    expect(geometry.popoverWidth).toBe(470);
    expect(geometry.bodyScrolls).toBe(true);
    expect(geometry.footerPresent).toBe(true);
    expect(geometry.storedWidth).toBe(470);

    // Closing and reopening must bring the panel back at the chosen size.
    await driver.click(BUTTON);
    await driver.assertSelectorNot(PANEL);
    await driver.click(BUTTON);
    expect(
      await driver.evaluate(() =>
        Math.round(
          document
            .querySelector(".dsm-vector-tools-menu")!
            .getBoundingClientRect().width
        )
      )
    ).toBe(470);

    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);

testWithPage(
  "Vector Tools mirrors P and Q through the expression list",
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);

    await driver.click(".dsm-vector-tools-link-components");
    await driver.waitForSync();

    // Only the folder and the two definitions: this must not conjure a whole
    // field the user did not ask to generate.
    expect(
      await driver.evaluate(() =>
        Calc.getState()
          .expressions.list.filter((item) =>
            item.id?.startsWith("vector_tools_vf_default")
          )
          .map((item) => item.id)
      )
    ).toEqual([
      FOLDER_ID,
      `${NAMESPACE}_p_function`,
      `${NAMESPACE}_q_function`,
    ]);

    // Editing the definition in the expression list reaches the panel.
    await driver.evaluate(() =>
      Calc.controller.dispatch({
        type: "set-item-latex",
        id: "vector_tools_vf_default_p_function",
        latex: "v_{tfdp}\\left(x,y\\right)=\\left(-3y\\right)",
      })
    );
    await driver.waitForSync();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect((await storedConfig(driver)).components).toEqual({
      xLatex: "-3y",
      yLatex: "x",
    });

    // A definition renamed out from under the plugin is reported, not adopted.
    await driver.evaluate(() =>
      Calc.controller.dispatch({
        type: "set-item-latex",
        id: "vector_tools_vf_default_q_function",
        latex: "g\\left(x,y\\right)=x",
      })
    );
    await driver.waitForSync();
    await new Promise((resolve) => setTimeout(resolve, 400));
    const afterRename = await driver.evaluate(() => ({
      hint: document.querySelector(
        ".dsm-vector-tools-link-row .dsm-vector-tools-hint"
      )?.textContent,
      components: JSON.parse(
        DSM.pluginSettings["vector-tools"]!.serializedFieldConfig as string
      ).components,
    }));
    expect(afterRename.hint).toContain("no longer matches");
    expect(afterRename.components.yLatex).toBe("x");

    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);

testWithPage(
  "Vector Tools fills the sampling domain from the visible graph",
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);
    // The open tab is persisted, so this test cannot assume the panel opens on
    // the tab that holds the sampling domain.
    await openTab(driver, 0);

    await driver.evaluate(() =>
      Calc.setMathBounds({ left: -3, right: 7, bottom: -2, top: 5 })
    );
    await driver.waitForSync();
    await driver.click(".dsm-vector-tools-match-viewport");
    await driver.waitForSync();

    // Desmos adjusts the requested bounds to the graph paper's aspect ratio, so
    // the check is against what the viewport actually became.
    const { domain, bounds } = await driver.evaluate(() => ({
      domain: JSON.parse(
        DSM.pluginSettings["vector-tools"]!.serializedFieldConfig as string
      ).domain,
      bounds: Calc.graphpaperBounds.mathCoordinates,
    }));
    const round = (value: number) => Math.round(value * 1000) / 1000;
    expect(domain.x.min).toBe(round(bounds.left));
    expect(domain.x.max).toBe(round(bounds.right));
    expect(domain.y.min).toBe(round(bounds.bottom));
    expect(domain.y.max).toBe(round(bounds.top));
    expect(domain.x.min).toBe(-3);
    expect(domain.x.max).toBe(7);
    // Only the four bounds move: the sampling mode and step are the user's.
    expect(domain.x.mode).toBe("step");
    expect(domain.x.step).toBe(1);

    // The panel's own number fields have to show the new bounds too.
    expect(
      await driver.evaluate(
        () =>
          document.querySelector<HTMLInputElement>(
            "#dsm-vector-tools-x-maximum"
          )?.value
      )
    ).toBe("7");

    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);

testWithPageAndOpts(
  "Vector Tools flow visualizer runs on the geometry graph paper",
  { path: "/geometry", timeout: 90000 },
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);
    await openTab(driver, 3);

    await driver.click(VISUALIZE);
    await driver.assertSelectorEventually(FLOW_CANVAS);

    // Geometry is the same 2D graph paper, so the overlay registers with it
    // exactly as it does in the calculator.
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
      };
    });
    expect(geometry.aligned).toBe(true);
    expect(geometry.pointerEvents).toBe("none");
    expect(geometry.hasBuffer).toBe(true);

    await driver.disablePlugin("vector-tools");
    await driver.assertSelectorNot(FLOW_CANVAS);
  }
);

testWithPageAndOpts(
  "Vector Tools refuses to flow over the 3D calculator",
  { path: "/3d", timeout: 90000 },
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);
    await openTab(driver, 3);

    // The overlay maps math coordinates linearly onto the graph paper's rect,
    // which the 3D product's rotatable x/y/z box does not support — and the 3D
    // canvas paints over the overlay anyway. Say so instead of animating a
    // wrong, invisible field.
    const state = await driver.evaluate(() => ({
      disabled: document
        .querySelector(".dsm-vector-tools-visualize")
        ?.classList.contains("dsm-btn-disabled"),
      warning: document.querySelector(
        ".dsm-vector-tools-flow .dsm-vector-tools-warning"
      )?.textContent,
    }));
    expect(state.disabled).toBe(true);
    expect(state.warning).toContain("3D calculator");

    await driver.click(VISUALIZE);
    await driver.assertSelectorNot(FLOW_CANVAS);
    // Generation is unaffected: the field is ordinary Desmos expressions.
    await driver.click(GENERATE);
    await driver.waitForSync();
    expect(
      (await driver.getState()).expressions.list.filter((item) =>
        item.id?.startsWith(`${NAMESPACE}_`)
      )
    ).toHaveLength(20);

    await driver.click(REMOVE);
    await driver.waitForSync();
    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
  }
);

testWithPage(
  "Vector Tools flow visualizer covers the graph paper and cleans up after itself",
  async (driver) => {
    await driver.enablePlugin("vector-tools");
    await driver.assertSelectorEventually(BUTTON);
    await driver.click(BUTTON);
    await openTab(driver, 3);

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

    // Particle count is a free number, not a menu of fixed sizes.
    await driver.page.click("#dsm-vector-tools-particle-count", {
      clickCount: 3,
    });
    await driver.page.keyboard.type("37500");
    await driver.page.keyboard.press("Tab");
    await driver.waitForSync();
    expect((await storedConfig(driver)).flow.particleCount).toBe(37500);

    // A component the GPU cannot evaluate must disable the button with a
    // reason rather than failing when it is pressed.
    await driver.evaluate(() => {
      const config = JSON.parse(
        DSM.pluginSettings["vector-tools"]!.serializedFieldConfig as string
      );
      config.components.xLatex = "a_{1}";
      DSM.setPluginSetting(
        "vector-tools",
        "serializedFieldConfig",
        JSON.stringify(config)
      );
    });
    await driver.waitForSync();
    expect(
      await driver.evaluate(
        () =>
          document.querySelector(
            ".dsm-vector-tools-flow .dsm-vector-tools-warning"
          )?.textContent
      )
    ).toContain("refers to another expression");

    await driver.disablePlugin("vector-tools");
    await driver.assertSelectorNot(FLOW_CANVAS);
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);
