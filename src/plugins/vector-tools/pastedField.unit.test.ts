import { compileFieldComponentToGLSL } from "../../field-rendering/latexToGLSL";
import {
  importPastedField,
  INFINITE_SUM_LAST,
  splitVector,
} from "./pastedField";
import { SYMPY_FRACTIONAL_FIELD } from "./pastedField.fixtures";

describe("splitting a pasted vector", () => {
  test.each([
    [String.raw`\left\langle -y,x\right\rangle`, ["-y", "x"]],
    [String.raw`\langle -y, x \rangle`, ["-y", "x"]],
    [String.raw`\left(-y,x\right)`, ["-y", "x"]],
    [String.raw`-y, x, 1`, ["-y", "x", "1"]],
  ])("%s", (latex, parts) => {
    expect(splitVector(latex)).toEqual(parts);
  });

  test.each([
    String.raw`\max\left(x,y\right)`,
    String.raw`\left(x+1\right)\cdot\max\left(x,y\right)`,
    String.raw`\frac{x}{y}`,
    String.raw`\left\{x>0:1,2\right\}`,
  ])("a comma inside a bracket is not a component: %s", (latex) => {
    expect(splitVector(latex)).toBeUndefined();
  });
});

describe("the rewrites Desmos needs", () => {
  test("Γ(z) is (z−1)!, and Γ(n+1) is n!", () => {
    expect(
      importPastedField(String.raw`\Gamma\left(x\right)`).components[0]
    ).toBe(String.raw`\left(x-1\right)!`);
    expect(
      importPastedField(String.raw`\Gamma\left(2 j - \pi + 1\right)`)
        .components[0]
    ).toBe(String.raw`\left(2 j - \pi\right)!`);
    expect(
      importPastedField(String.raw`\Gamma{\left(\Gamma\left(x\right)\right)}`)
        .components[0]
    ).toBe(String.raw`\left(\left(x-1\right)!-1\right)!`);
  });

  test("an infinite sum stops at a last term the user can see", () => {
    const { components, notes } = importPastedField(
      String.raw`\sum_{n=1}^{\infty}\frac{1}{n^{2}}`
    );
    expect(components[0]).toBe(
      String.raw`\sum_{n=1}^{${INFINITE_SUM_LAST}}\frac{1}{n^{2}}`
    );
    expect(notes.join(" ")).toContain(`n = ${INFINITE_SUM_LAST}`);
  });

  test("braces round a function's bracketed argument are dropped", () => {
    expect(
      importPastedField(String.raw`\cos{\left(1 \right)}+\frac{x}{2}`)
        .components[0]
    ).toBe(String.raw`\cos\left(1 \right)+\frac{x}{2}`);
  });

  test("ordinary LaTeX passes through untouched, with no notes", () => {
    const latex = String.raw`\sin\left(x\right)+\frac{y}{2}`;
    expect(importPastedField(latex)).toEqual({
      components: [latex],
      notes: [],
    });
  });
});

describe("the sympy field of 2026-10-14", () => {
  const imported = importPastedField(SYMPY_FRACTIONAL_FIELD);

  test("splits into P and Q with nothing Desmos would misread", () => {
    expect(imported.components).toHaveLength(2);
    for (const part of imported.components) {
      expect(part).not.toMatch(/\\Gamma|\\infty|\\langle|\\rangle/);
      expect(part).not.toMatch(/\\(sin|cos)\{/);
    }
    expect(imported.notes).toHaveLength(3);
  });

  test("both components compile for the GPU", () => {
    for (const part of imported.components) {
      const compiled = compileFieldComponentToGLSL(part);
      expect(compiled).toMatchObject({ ok: true });
    }
  });
});
