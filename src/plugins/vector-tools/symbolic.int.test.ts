import { clean, testWithPage } from "../../tests/puppeteer-utils";
import type { Calc as CalcType } from "#globals";

declare let Calc: CalcType;
declare let DSM: Window["DSM"];

interface Symbolic {
  partialDerivative: (
    latex: string,
    variable: string
  ) => { ok: true; latex: string } | { ok: false; error: string };
  gradient: (
    latex: string,
    variables?: readonly string[]
  ) =>
    | { ok: true; variables: string[]; latex: string[] }
    | { ok: false; error: string };
}

/**
 * The unit tests pin the derivative rules. This checks the two things only a
 * real Desmos can answer: that Desmos's parser feeds the differentiator what it
 * expects, and that the LaTeX it emits is something Desmos evaluates back to
 * the right numbers.
 */
testWithPage(
  "Vector Tools differentiates real Desmos expressions symbolically",
  async (driver) => {
    await driver.enablePlugin("vector-tools");

    const derivatives = await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as unknown as Symbolic;
      return {
        // The case that motivates the whole thing: f(x,y)=2xy, so ∂f/∂x = 2y.
        product: plugin.partialDerivative("2xy", "x"),
        productY: plugin.partialDerivative("2xy", "y"),
        polynomial: plugin.partialDerivative("x^{3}+y^{2}", "x"),
        chain: plugin.partialDerivative("\\sin\\left(xy\\right)", "y"),
        quotient: plugin.partialDerivative("\\frac{x}{y}", "x"),
        // Refused rather than guessed.
        unknown: plugin.partialDerivative("\\operatorname{mystery}(x)", "x"),
      };
    });
    expect(derivatives.product).toEqual({ ok: true, latex: "2y" });
    expect(derivatives.productY).toEqual({ ok: true, latex: "2x" });
    expect(derivatives.polynomial).toEqual({ ok: true, latex: "3x^{2}" });
    expect(derivatives.unknown.ok).toBe(false);

    // Whatever spelling it emits, Desmos has to accept it and get the right
    // number. This is the check that a string comparison cannot make.
    const evaluated = await driver.evaluate(
      async (latexes) => {
        const read = async (latex: string) => {
          const helper = Calc.HelperExpression({ latex });
          return await new Promise<number>((resolve) => {
            const timer = setTimeout(() => resolve(Number.NaN), 3000);
            helper.observe("numericValue", () => {
              clearTimeout(timer);
              resolve(helper.numericValue);
            });
          });
        };
        const out: Record<string, number> = {};
        for (const [name, latex] of Object.entries(latexes)) {
          // Wrapping in a definition evaluates the emitted LaTeX exactly as
          // Desmos would use it, with no substitution into the string.
          Calc.setBlank();
          Calc.setExpression({
            id: "g",
            latex: `g_{1}\\left(x,y\\right)=${latex}`,
          });
          out[name] = await read("g_{1}\\left(3,4\\right)");
        }
        Calc.setBlank();
        return out;
      },
      {
        // d/dy sin(xy) = x cos(xy); at (3,4) that is 3cos(12).
        chain: (derivatives.chain as { latex: string }).latex,
        // d/dx (x/y) at (3,4) is 1/4.
        quotient: (derivatives.quotient as { latex: string }).latex,
      }
    );
    expect(evaluated.chain).toBeCloseTo(3 * Math.cos(12), 9);
    expect(evaluated.quotient).toBeCloseTo(0.25, 9);

    // The gradient adapts to whichever variables the expression uses, which is
    // what lets ∇ work for f(x,y) and f(u,v,w) alike.
    const gradients = await driver.evaluate(() => {
      const plugin = DSM.enabledPlugins["vector-tools"] as unknown as Symbolic;
      return {
        twoVariables: plugin.gradient("x^{2}+y^{2}"),
        threeVariables: plugin.gradient("uvw"),
        explicit: plugin.gradient("x^{2}", ["x", "y"]),
      };
    });
    expect(gradients.twoVariables).toEqual({
      ok: true,
      variables: ["x", "y"],
      latex: ["2x", "2y"],
    });
    expect(gradients.threeVariables).toEqual({
      ok: true,
      variables: ["u", "v", "w"],
      latex: ["vw", "uw", "uv"],
    });
    // Naming the arguments keeps a variable that does not appear, so a field
    // built from f(x,y)=x² still gets both components.
    expect(gradients.explicit).toEqual({
      ok: true,
      variables: ["x", "y"],
      latex: ["2x", "0"],
    });

    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
    return clean;
  },
  90000
);

testWithPage(
  "Vector Tools rewrites typed derivative notation into what Desmos evaluates",
  async (driver) => {
    await driver.enablePlugin("vector-tools");

    const typeInto = async (index: number, text: string) => {
      await driver.evaluate((index) => {
        const { list } = Calc.getState().expressions;
        Calc.controller.dispatch({
          type: "move-focus-to-item",
          id: list[index].id,
        });
      }, index);
      await driver.keyboard.type(text, { delay: 25 });
      await new Promise((resolve) => setTimeout(resolve, 400));
      return await driver.evaluate((index) => {
        const { list } = Calc.getState().expressions;
        const model = Calc.controller.getItemModel(list[index].id) as any;
        return {
          latex: model?.latex as string,
          hasError: model?.error !== undefined,
        };
      }, index);
    };
    const newRow = async () =>
      await driver.evaluate(() =>
        Calc.controller.dispatch({ type: "new-expression-at-end" })
      );

    // The Greek letter has to survive: a `del` trigger would have eaten it.
    await driver.evaluate(() =>
      DSM.setPluginSetting("custom-mathquill-config", "extendedGreek", true)
    );
    await driver.enablePlugin("custom-mathquill-config");
    const greek = await typeInto(0, "delta");
    expect(greek.latex).toBe("\\delta");
    await driver.disablePlugin("custom-mathquill-config");

    // par/par x becomes the form Desmos evaluates, and stops being an error.
    await newRow();
    const partial = await typeInto(1, "par/par x");
    expect(partial.latex).toBe("\\frac{d}{dx}");

    // df/dx expands using f's own argument list.
    await newRow();
    await typeInto(2, "f(x,y)=2xy");
    await newRow();
    const leibniz = await typeInto(3, "df/dx");
    expect(leibniz.latex).toBe("\\frac{d}{dx}f\\left(x,y\\right)");
    await driver.waitForSync();
    const definition = await driver.evaluate(() => {
      const { list } = Calc.getState().expressions;
      return (Calc.controller.getItemModel(list[2].id) as any)?.latex;
    });
    expect(definition).toBe("f\\left(x,y\\right)=2xy");

    // And it is real math, not just the right string: ∂(2xy)/∂x is 2y, so at
    // y=4 it is 8. Desmos will not graph `2y` as a bare row — an expression in
    // y alone is not a graphable equation — so it is evaluated as a call, the
    // way it would actually be used.
    const value = await driver.evaluate(async () => {
      Calc.setExpression({
        id: "probe",
        latex: "p_{1}\\left(x,y\\right)=\\frac{d}{dx}f\\left(x,y\\right)",
      });
      const helper = Calc.HelperExpression({
        latex: "p_{1}\\left(1,4\\right)",
      });
      return await new Promise<number>((resolve) => {
        const timer = setTimeout(() => resolve(Number.NaN), 3000);
        helper.observe("numericValue", () => {
          clearTimeout(timer);
          resolve(helper.numericValue);
        });
      });
    });
    expect(value).toBeCloseTo(8, 9);

    // An undefined function is left exactly as typed rather than guessed at.
    await newRow();
    const unknown = await typeInto(5, "dh/dx");
    expect(unknown.latex).toBe("\\frac{dh}{dx}");

    await driver.disablePlugin("vector-tools");
    await driver.setBlank();
    await driver.waitForSync();
  },
  90000
);
