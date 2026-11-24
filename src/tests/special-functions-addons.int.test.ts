import { testWithPage } from "./puppeteer-utils";
import type { Calc as CalcType } from "#globals";

declare let Calc: CalcType;
declare let DSM: Window["DSM"];

/**
 * Γ, Ei and the rest are switched on by whichever plugin uses them
 * (src/symbolic/graphInstall.ts), not by Physics Lab alone: a Vector Tools
 * field can be written in them with Physics Lab off. And the install is
 * counted, so disabling one plugin leaves them working for the other.
 */

const VECTOR_BUTTON = ".dsm-action-menu .dsm-icon-compass2";
const GENERATE = ".dsm-vector-tools-generate";
const FOLDER = "dsm-special-functions";

const pause = async (ms: number) =>
  await new Promise((resolve) => setTimeout(resolve, ms));

testWithPage(
  "special functions work with only Vector Tools enabled, and survive its field",
  async (driver) => {
    await driver.disablePlugin("physics-lab");
    await driver.enablePlugin("vector-tools");
    await driver.setBlank();
    await driver.focusIndex(0);
    for (const key of "Gamma(0.5") await driver.keyboard.type(key);
    await driver.keyboard.press("Escape");
    await pause(1500);
    await driver.waitForSync();

    const read = async () =>
      await driver.evaluate((folderId: string) => {
        const list = Calc.getState().expressions.list as {
          id: string;
          latex?: string;
          folderId?: string;
          secret?: boolean;
        }[];
        const typed = list.find(
          (e) => e.latex?.startsWith("\\Gamma\\left(0") === true
        );
        const analysis = (
          Calc.expressionAnalysis as Record<
            string,
            { evaluation?: { value?: number } }
          >
        )[typed?.id ?? ""];
        return {
          latex: typed?.latex,
          value: analysis?.evaluation?.value,
          folder: list.find((e) => e.id === folderId)?.secret,
          definitions: list.filter((e) => e.folderId === folderId).length,
        };
      }, FOLDER);

    const typed = await read();
    expect(typed.latex).toBe(String.raw`\Gamma\left(0.5\right)`);
    expect(typed.value).toBeCloseTo(Math.sqrt(Math.PI), 10);
    expect(typed.folder).toBe(true);
    expect(typed.definitions).toBeGreaterThanOrEqual(20);

    // Generating a field rebuilds the whole list through setState; the
    // locked folder and its definitions must come through it.
    await driver.click(VECTOR_BUTTON);
    await driver.click(GENERATE);
    await driver.waitForSync();
    await pause(800);
    const afterField = await read();
    expect(afterField.value).toBeCloseTo(Math.sqrt(Math.PI), 10);
    expect(afterField.folder).toBe(true);
    expect(afterField.definitions).toBe(typed.definitions);

    // Physics Lab on and off again: Vector Tools still holds the names, so
    // Ei typed by hand is still one name.
    await driver.enablePlugin("physics-lab");
    await driver.disablePlugin("physics-lab");
    await driver.evaluate(() =>
      Calc.setExpression({ id: "typed-ei", latex: "" })
    );
    await driver.waitForSync();
    await driver.evaluate(() =>
      Calc.controller.dispatch({ type: "move-focus-to-item", id: "typed-ei" })
    );
    for (const key of "Ei(2") await driver.keyboard.type(key);
    await driver.keyboard.press("Escape");
    await pause(1500);
    await driver.waitForSync();
    const ei = await driver.evaluate(() => {
      const e = Calc.getState().expressions.list.find(
        (x) => x.id === "typed-ei"
      );
      const analysis = (
        Calc.expressionAnalysis as Record<
          string,
          { evaluation?: { value?: number } }
        >
      )["typed-ei"];
      return {
        latex: e && "latex" in e ? e.latex : undefined,
        value: analysis?.evaluation?.value,
      };
    });
    expect(ei.latex).toBe(String.raw`\operatorname{Ei}\left(2\right)`);
    expect(ei.value).toBeCloseTo(4.954234356001891, 8);

    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);

testWithPage(
  "special functions type as one name in Vector Tools' own field inputs",
  async (driver) => {
    await driver.disablePlugin("physics-lab");
    await driver.enablePlugin("vector-tools");
    await driver.setBlank();
    await driver.click(VECTOR_BUTTON);
    await driver.click(".dsm-vector-tools-math-input .dcg-mq-editable-field");
    await driver.keyboard.down("Control");
    await driver.keyboard.press("a");
    await driver.keyboard.up("Control");
    await driver.keyboard.press("Backspace");
    for (const key of "Ei(x)+Gamma(y") await driver.keyboard.type(key);
    await pause(500);
    const config = await driver.evaluate(() =>
      JSON.stringify(DSM.vectorTools!.getConfig())
    );
    expect(config).toContain(
      String.raw`\\operatorname{Ei}\\left(x\\right)+\\Gamma\\left(y\\right)`
    );
    await driver.keyboard.press("Escape");
    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
  },
  60000
);
