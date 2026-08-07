import { testWithPage } from "../../tests/puppeteer-utils";
import type { Calc as CalcType } from "#globals";

declare let Calc: CalcType;
declare let DSM: Window["DSM"];

const RESULT = ".dsm-vector-tools-derivative";

/**
 * The notation is only worth anything if it survives the round trip through a
 * real Desmos: the trigger has to become a character MathQuill draws, the row
 * has to keep it, and the answer has to appear where Desmos would have put an
 * evaluation.
 */
testWithPage(
  "Vector Tools keeps derivative notation on screen and answers it",
  async (driver) => {
    await driver.enablePlugin("vector-tools");

    // Focus the first row once, then drive it the way a person does: type,
    // press Enter for the next row, type again.
    await driver.evaluate(() => {
      const { list } = Calc.getState().expressions;
      Calc.controller.dispatch({ type: "move-focus-to-item", id: list[0].id });
    });
    const type = async (text: string) => {
      await driver.keyboard.type(text, { delay: 25 });
      await new Promise((resolve) => setTimeout(resolve, 500));
    };
    const newRow = async () => {
      await driver.keyboard.press("Enter");
      await new Promise((resolve) => setTimeout(resolve, 300));
    };
    const rowLatex = async (index: number) =>
      await driver.evaluate((index) => {
        const { list } = Calc.getState().expressions;
        return (Calc.controller.getItemModel(list[index].id) as any)?.latex;
      }, index);

    // `par` has to become the character, because \partial renders as nothing.
    await type("par");
    expect(await rowLatex(0)).toBe("∂");

    // The operator form, applied to an expression written out in full. Right
    // arrow leaves the denominator, the same as writing it by hand — typing
    // straight on would give `x_2` from Desmos's numeral auto-subscript.
    await newRow();
    await type("par/par x");
    await driver.keyboard.press("ArrowRight");
    await type("2xy");
    expect(await rowLatex(1)).toBe("\\frac{∂}{∂x}2xy");

    // The answer appears under the row, as typeset math.
    const partial = await driver.evaluate((selector) => {
      const boxes = [...document.querySelectorAll(selector)];
      return boxes.map((box) => box.textContent);
    }, RESULT);
    expect(partial.join(" ")).toContain("2y");

    // Desmos cannot parse ∂, so the row is an error to it — hidden, because
    // this row is one the plugin understands.
    expect(
      await driver.evaluate(() => {
        const { list } = Calc.getState().expressions;
        return DSM.hideErrors?.isErrorHidden(list[1].id);
      })
    ).toBe(true);

    // The gradient, adapting to the variables the expression uses.
    await newRow();
    await type("grad x^2+y^2");
    // The typed space survives as MathQuill's `\ `, which the recognizer
    // tolerates, so it is normalized away here rather than asserted on.
    expect((await rowLatex(2)).replace(/\\ /g, "")).toBe("∇x^{2}+y^{2}");
    const gradient = await driver.evaluate((selector) => {
      const boxes = [...document.querySelectorAll(selector)];
      return boxes.map((box) => box.textContent).join(" ");
    }, RESULT);
    expect(gradient).toContain("2x");
    expect(gradient).toContain("2y");

    await driver.disablePlugin("vector-tools");
    // Nothing of the plugin's is left behind on the rows.
    await driver.assertSelectorNot(RESULT);
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);
