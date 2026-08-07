import { NOTATION_TRIGGERS, rewriteNotation } from "./notation";

/** f(x,y) and g(t) are defined; h is not. */
const lookup = (name: string) =>
  ({ f: ["x", "y"], g: ["t"] })[name] as string[] | undefined;

const rewrite = (latex: string) => rewriteNotation(latex, lookup)?.latex;

describe("Vector Tools derivative notation", () => {
  test("never uses a trigger that shadows something typeable", () => {
    // `del` fires on its own three letters, so `delta` could never be typed
    // again. This is the regression guard for that.
    expect(NOTATION_TRIGGERS).not.toContain("del");
    expect(NOTATION_TRIGGERS).toContain("par");
  });

  test("turns the partial operator into the form Desmos evaluates", () => {
    // par/par x, once MathQuill has made it a fraction.
    expect(
      rewrite(
        "\\frac{\\operatorname{par}}{\\operatorname{par}\\ x}f\\left(x,y\\right)"
      )
    ).toBe("\\frac{d}{dx}f\\left(x,y\\right)");
    // The escaped space MathQuill inserts is optional.
    expect(
      rewrite("\\frac{\\operatorname{par}}{\\operatorname{par}y}x^{2}y")
    ).toBe("\\frac{d}{dy}x^{2}y");
  });

  test("expands df/dx into a call, using the function's own arguments", () => {
    // Desmos reads df/dx as (d*f)/(d*x) and errors; this is the whole point.
    expect(rewrite("\\frac{df}{dx}")).toBe("\\frac{d}{dx}f\\left(x,y\\right)");
    // The argument list comes from the definition, not from an assumption.
    expect(rewrite("\\frac{dg}{dt}")).toBe("\\frac{d}{dt}g\\left(t\\right)");
    // A partial spelled the same way means the same thing.
    expect(
      rewrite("\\frac{\\operatorname{par}f}{\\operatorname{par}\\ y}")
    ).toBe("\\frac{d}{dy}f\\left(x,y\\right)");
  });

  test("leaves an undefined function alone rather than guessing its arguments", () => {
    // h is not defined, so there is no argument list to call it with. Guessing
    // would turn a typo into a different, wrong expression.
    expect(rewrite("\\frac{dh}{dx}")).toBeUndefined();
  });

  test("handles subscripted names", () => {
    expect(
      rewrite("\\frac{\\operatorname{par}}{\\operatorname{par}x_{1}}x_{1}^{2}")
    ).toBe("\\frac{d}{dx_{1}}x_{1}^{2}");
  });

  test("rewrites every occurrence, including a nested second derivative", () => {
    const twice =
      "\\frac{\\operatorname{par}}{\\operatorname{par}x}\\frac{\\operatorname{par}}{\\operatorname{par}y}f\\left(x,y\\right)";
    expect(rewrite(twice)).toBe(
      "\\frac{d}{dx}\\frac{d}{dy}f\\left(x,y\\right)"
    );
  });

  test("reports nothing when there is no notation to rewrite", () => {
    expect(rewrite("x^{2}+y^{2}")).toBeUndefined();
    expect(rewrite("\\frac{d}{dx}f\\left(x,y\\right)")).toBeUndefined();
    // A plain fraction of variables is not derivative notation.
    expect(rewrite("\\frac{a}{b}")).toBeUndefined();
  });

  test("says what it recognized", () => {
    expect(
      rewriteNotation(
        "\\frac{\\operatorname{par}}{\\operatorname{par}x}f\\left(x,y\\right)",
        lookup
      )?.description
    ).toContain("∂/∂x");
    expect(rewriteNotation("\\frac{df}{dx}", lookup)?.description).toContain(
      "df/dx"
    );
  });
});
