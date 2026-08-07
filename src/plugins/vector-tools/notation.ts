/**
 * Derivative notation people actually write, kept on screen and understood.
 *
 * Desmos accepts exactly two spellings of a derivative, `\frac{d}{dx}f(x)` and
 * `f'(x)`, so the notation a multivariable calculus course is written in cannot
 * be typed into it. Two facts, both established against a real Desmos, decide
 * how that is fixed:
 *
 *  - `\partial` and `\nabla` render as **nothing at all** — Desmos's MathQuill
 *    build has no such symbol. The literal Unicode characters `∂` and `∇` do
 *    render, correctly and at the right size.
 *  - Neither character parses. Desmos calls both an unrecognized symbol.
 *
 * So a row can show the notation or evaluate, never both, and this module
 * chooses to show it: `par` becomes `∂` and `grad` becomes `∇` as you type, the
 * row keeps the mathematics you wrote, and the plugin reads that row, works out
 * the derivative symbolically, and reports it separately. The Desmos error that
 * the unrecognized symbol causes is suppressed for exactly the rows recognized
 * here.
 *
 * ## Why `par` and not `del`
 *
 * The trigger words go into MathQuill's `autoOperatorNames`, which converts on
 * the shortest match: a `del` trigger fires the moment those three letters are
 * typed, so `delta` becomes `\operatorname{del}ta` and the Greek letter can no
 * longer be typed at all. `par` shadows nothing Desmos or DesModder reserves.
 */

/** Injected into `autoOperatorNames`, so typing them makes one token. */
export const NOTATION_TRIGGERS = ["par", "grad"] as const;

export const PARTIAL = "∂";
export const NABLA = "∇";

/**
 * A single-letter name with an optional subscript, which is what Desmos allows
 * as an identifier. `\ ` is MathQuill's escaped space, which turns up after an
 * operator name.
 */
const NAME = String.raw`([a-zA-Z](?:_\{[a-zA-Z0-9]+\})?)`;
const SPACE = String.raw`(?:\\ |\s)*`;

/**
 * Turns the typed trigger tokens into the characters they stand for.
 *
 * MathQuill can only produce `\operatorname{par}` from a typed word — its
 * operator-name list cannot emit a character — so the glyph substitution
 * happens here instead. Returns undefined when there was nothing to change.
 */
export function substituteGlyphs(latex: string): string | undefined {
  const next = latex
    .replace(/\\operatorname\{par\}(?:\\ )?/g, PARTIAL)
    .replace(/\\operatorname\{grad\}(?:\\ )?/g, NABLA);
  return next === latex ? undefined : next;
}

/** What a recognized row is asking for. */
export type DerivativeRow =
  | {
      kind: "partial";
      /** The variable being differentiated with respect to. */
      variable: string;
      /** The expression being differentiated, as LaTeX. */
      body: string;
    }
  | { kind: "gradient"; body: string };

/** Looks up the parameter names of a user-defined function, e.g. f -> [x, y]. */
export type ArgumentLookup = (name: string) => readonly string[] | undefined;

/** `∂/∂x <body>`, the operator form. */
const PARTIAL_OPERATOR = new RegExp(
  String.raw`^${SPACE}\\frac\{${SPACE}${PARTIAL}${SPACE}\}\{${SPACE}${PARTIAL}${SPACE}${NAME}${SPACE}\}(.+)$`
);

/** `∂f/∂x` and `df/dx`, the Leibniz forms, which name a function instead. */
const LEIBNIZ = new RegExp(
  String.raw`^${SPACE}\\frac\{${SPACE}(?:${PARTIAL}|d)${NAME}${SPACE}\}\{${SPACE}(?:${PARTIAL}|d)${NAME}${SPACE}\}${SPACE}$`
);

/** `∇f(x,y)` or `∇` applied to an expression. */
const GRADIENT = new RegExp(String.raw`^${SPACE}${NABLA}${SPACE}(.+)$`);

/**
 * Reads a row as derivative notation, or returns undefined if it is not.
 *
 * A Leibniz form names a function but not its arguments, so it needs
 * `lookupArguments` to find what `f` was defined with. An undefined function is
 * not recognized at all: calling it with guessed arguments would silently
 * answer a different question than the one asked.
 */
export function recognizeRow(
  latex: string,
  lookupArguments: ArgumentLookup
): DerivativeRow | undefined {
  const operator = PARTIAL_OPERATOR.exec(latex);
  if (operator !== null) {
    return { kind: "partial", variable: operator[1], body: operator[2] };
  }

  const leibniz = LEIBNIZ.exec(latex);
  if (leibniz !== null) {
    const [, functionName, variable] = leibniz;
    const args = lookupArguments(functionName);
    if (args !== undefined && args.length > 0) {
      return {
        kind: "partial",
        variable,
        body: `${functionName}\\left(${args.join(",")}\\right)`,
      };
    }
    return undefined;
  }

  const gradient = GRADIENT.exec(latex);
  if (gradient !== null) return { kind: "gradient", body: gradient[1] };

  return undefined;
}

/** Whether a row carries notation Desmos cannot evaluate but this can read. */
export function hasNotationGlyph(latex: string) {
  return latex.includes(PARTIAL) || latex.includes(NABLA);
}

/**
 * A cheap test for whether a row is worth reading properly.
 *
 * `recognizeRow` has to look up function definitions, which means parsing the
 * whole expression list, and this runs after every keystroke in every row. The
 * `d` Leibniz form carries no special character, so the glyph test alone would
 * miss `df/dx` — but a leading `\frac{d` is enough to rule out almost
 * everything else.
 */
export function mightBeDerivativeNotation(latex: string) {
  return hasNotationGlyph(latex) || /^\s*\\frac\{\s*d/.test(latex);
}
