import { testWithPage } from "../../tests/puppeteer-utils";
import type { Calc as CalcType } from "#globals";

declare let Calc: CalcType;
declare let DSM: Window["DSM"];

const RESULT = ".dsm-vector-tools-derivative";

/**
 * The notation only earns its keep if it survives a real Desmos: the trigger
 * has to become Desmos's own operator, the `d` has to be *drawn* as `∂` without
 * the LaTeX changing, and none of it may happen while the user is still typing
 * into the row.
 */
testWithPage(
  "Vector Tools types a real partial derivative and draws it as one",
  async (driver) => {
    await driver.enablePlugin("vector-tools");

    const focusFirstRow = async () =>
      await driver.evaluate(() => {
        const { list } = Calc.getState().expressions;
        Calc.controller.dispatch({
          type: "move-focus-to-item",
          id: list[0].id,
        });
      });
    // Leaving the row is what commits the swap, so it is done explicitly
    // rather than by pressing Enter, which also creates a row.
    const leaveRow = async () => {
      await driver.evaluate(() =>
        Calc.controller.dispatch({ type: "set-none-selected" })
      );
      await new Promise((resolve) => setTimeout(resolve, 600));
    };
    const firstRowLatex = async () =>
      await driver.evaluate(() => {
        const { list } = Calc.getState().expressions;
        return (Calc.controller.getItemModel(list[0].id) as any)?.latex;
      });

    await focusFirstRow();
    // Right arrow leaves the denominator, the same as writing it by hand;
    // typing straight on would give `x_2` from Desmos's numeral auto-subscript.
    await driver.keyboard.type("par/par x", { delay: 25 });
    await driver.keyboard.press("ArrowRight");
    await driver.keyboard.type("2xy", { delay: 25 });
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Still being typed in, so the row is untouched — replacing a field mid-edit
    // resets the cursor and throws the user out of the fraction.
    expect(await firstRowLatex()).toContain("\\operatorname{par}");

    await leaveRow();

    // Now it is Desmos's real derivative operator, which evaluates and graphs.
    expect(await firstRowLatex()).toBe("\\frac{d}{dx}2xy");

    const row = await driver.evaluate((selector) => {
      const { list } = Calc.getState().expressions;
      const model = Calc.controller.getItemModel(list[0].id) as any;
      return {
        // Painted as ∂ through a class, with the text still `d`.
        painted: (model?.rootViewNode as Element | undefined)?.querySelectorAll(
          ".dsm-vector-tools-partial-d"
        ).length,
        glyphText: (model?.rootViewNode as Element | undefined)?.querySelector(
          ".dcg-mq-numerator"
        )?.textContent,
        result: [...document.querySelectorAll(selector)].map(
          (box) => box.textContent
        ),
      };
    }, RESULT);
    expect(row.painted).toBe(2);
    // The LaTeX and the DOM both still say `d`; only the paint differs.
    expect(row.glyphText).toBe("d");
    expect(row.result.join(" ")).toContain("2y");

    await driver.disablePlugin("vector-tools");
    await driver.assertSelectorNot(RESULT);
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);
