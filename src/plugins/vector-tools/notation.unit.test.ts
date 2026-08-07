import {
  hasNotationGlyph,
  NOTATION_TRIGGERS,
  recognizeRow,
  substituteGlyphs,
} from "./notation";

/** f(x,y) and g(t) are defined; h is not. */
const lookup = (name: string) =>
  ({ f: ["x", "y"], g: ["t"] })[name] as string[] | undefined;

const read = (latex: string) => recognizeRow(latex, lookup);

describe("Vector Tools derivative notation", () => {
  test("never uses a trigger that shadows something typeable", () => {
    // `del` fires on its own three letters, so `delta` could never be typed
    // again. This is the regression guard for that.
    expect(NOTATION_TRIGGERS).not.toContain("del");
    expect(NOTATION_TRIGGERS).toContain("par");
  });

  test("turns the partial trigger into Desmos's real derivative operator", () => {
    // `par` becomes a plain `d`, so the row is literally \frac{d}{dx} — the
    // operator Desmos evaluates, graphs, and lets other expressions use. It is
    // only *drawn* as ∂.
    expect(substituteGlyphs("\\operatorname{par}")).toBe("d");
    // The escaped space MathQuill leaves behind goes with it.
    expect(substituteGlyphs("\\operatorname{par}\\ x")).toBe("dx");
    expect(
      substituteGlyphs(
        "\\frac{\\operatorname{par}}{\\operatorname{par}\\ x}f\\left(x,y\\right)"
      )
    ).toBe("\\frac{d}{dx}f\\left(x,y\\right)");
  });

  test("keeps the gradient as a character, having no real operator to be", () => {
    // Desmos has no gradient operator, so ∇ cannot be made real the way ∂ can.
    expect(substituteGlyphs("\\operatorname{grad}")).toBe("∇");
  });

  test("reads the real operator form", () => {
    expect(read("\\frac{d}{dx}f\\left(x,y\\right)")).toEqual({
      kind: "partial",
      variable: "x",
      body: "f\\left(x,y\\right)",
    });
    expect(read("\\frac{d}{dy}2xy")).toEqual({
      kind: "partial",
      variable: "y",
      body: "2xy",
    });
  });

  test("leaves alone what has no trigger in it", () => {
    expect(substituteGlyphs("x^{2}+y^{2}")).toBeUndefined();
    expect(substituteGlyphs("\\frac{d}{dx}f\\left(x\\right)")).toBeUndefined();
  });

  test("reads the operator form and keeps the body it applies to", () => {
    expect(read("\\frac{∂}{∂x}f\\left(x,y\\right)")).toEqual({
      kind: "partial",
      variable: "x",
      body: "f\\left(x,y\\right)",
    });
    expect(read("\\frac{∂}{∂y}2xy")).toEqual({
      kind: "partial",
      variable: "y",
      body: "2xy",
    });
  });

  test("reads both Leibniz spellings, using the function's own arguments", () => {
    // The argument list comes from the definition, not from an assumption.
    expect(read("\\frac{∂f}{∂x}")).toEqual({
      kind: "partial",
      variable: "x",
      body: "f\\left(x,y\\right)",
    });
    expect(read("\\frac{dg}{dt}")).toEqual({
      kind: "partial",
      variable: "t",
      body: "g\\left(t\\right)",
    });
  });

  test("does not recognize a derivative of an undefined function", () => {
    // h has no argument list, and guessing one would answer a different
    // question than the one asked.
    expect(read("\\frac{dh}{dx}")).toBeUndefined();
  });

  test("reads the gradient and what it applies to", () => {
    expect(read("∇f\\left(x,y\\right)")).toEqual({
      kind: "gradient",
      body: "f\\left(x,y\\right)",
    });
    expect(read("∇x^{2}+y^{2}")).toEqual({
      kind: "gradient",
      body: "x^{2}+y^{2}",
    });
  });

  test("is not fooled by ordinary expressions", () => {
    expect(read("x^{2}+y^{2}")).toBeUndefined();
    expect(read("\\frac{a}{b}")).toBeUndefined();
  });

  test("spots a row carrying notation Desmos cannot evaluate", () => {
    // This is what decides whose error gets suppressed.
    expect(hasNotationGlyph("\\frac{∂}{∂x}2xy")).toBe(true);
    expect(hasNotationGlyph("∇f\\left(x,y\\right)")).toBe(true);
    expect(hasNotationGlyph("x^{2}")).toBe(false);
  });
});
