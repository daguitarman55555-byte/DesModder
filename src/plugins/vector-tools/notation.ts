/**
 * Derivative notation people actually write, rewritten into what Desmos reads.
 *
 * Desmos accepts exactly two spellings of a derivative: `\frac{d}{dx}f(x)` and
 * `f'(x)`. It does not accept `df/dx`, which parses as `(d·f)/(d·x)` — three
 * undefined variables — and it has no `\partial` at all. So the notation a
 * multivariable calculus course is written in cannot be typed into Desmos.
 *
 * This closes that gap by rewriting the notation into the spelling Desmos
 * understands. The result is ordinary vanilla LaTeX that Desmos evaluates and
 * graphs on its own, so nothing here depends on the plugin staying enabled.
 *
 * ## Why `par` and not `del`
 *
 * The trigger words are injected into MathQuill's `autoOperatorNames`, and that
 * list converts on the shortest match: a `del` trigger fires the moment those
 * three letters are typed, so `delta` becomes `\operatorname{del}ta` and the
 * Greek letter can no longer be typed at all. `par` shadows nothing Desmos or
 * DesModder reserves.
 */

/** Injected into `autoOperatorNames`, so typing them makes one token. */
export const NOTATION_TRIGGERS = ["par", "grad"] as const;

export interface NotationRewrite {
  /** The rewritten LaTeX, which Desmos can evaluate. */
  latex: string;
  /** What was recognized, for the panel to report. */
  description: string;
}

/** Looks up the parameter names of a user-defined function, e.g. f -> [x, y]. */
export type ArgumentLookup = (name: string) => readonly string[] | undefined;

/**
 * A single-letter name with an optional subscript, which is what Desmos allows
 * as an identifier. `\ ` is MathQuill's escaped space and turns up between an
 * operator name and whatever follows it.
 */
const NAME = String.raw`([a-zA-Z](?:_\{[a-zA-Z0-9]+\})?)`;
const SPACE = String.raw`(?:\\ |\s)*`;

/** `∂/∂x` written as `par/par x`, once MathQuill has made the fraction. */
const PARTIAL_OPERATOR = new RegExp(
  String.raw`\\frac\{${SPACE}\\operatorname\{par\}${SPACE}\}\{${SPACE}\\operatorname\{par\}${SPACE}${NAME}${SPACE}\}`,
  "g"
);

/** `df/dx`, which Desmos reads as a product of undefined variables. */
const LEIBNIZ = new RegExp(
  String.raw`\\frac\{${SPACE}d${NAME}${SPACE}\}\{${SPACE}d${NAME}${SPACE}\}`,
  "g"
);

/** `∂f/∂x` written as `parf/par x`. */
const PARTIAL_LEIBNIZ = new RegExp(
  String.raw`\\frac\{${SPACE}\\operatorname\{par\}${SPACE}${NAME}${SPACE}\}\{${SPACE}\\operatorname\{par\}${SPACE}${NAME}${SPACE}\}`,
  "g"
);

/**
 * Rewrites every piece of recognized notation in `latex`, or returns undefined
 * if there was nothing to rewrite.
 *
 * The Leibniz forms name a function but not its arguments, so they need
 * `lookupArguments` to find what `f` was defined with. When the function is not
 * defined yet the notation is left exactly as typed: rewriting it to a call
 * with guessed arguments would turn a typo into a different, wrong expression.
 */
export function rewriteNotation(
  latex: string,
  lookupArguments: ArgumentLookup
): NotationRewrite | undefined {
  const found: string[] = [];

  let next = latex.replace(PARTIAL_OPERATOR, (_match, variable: string) => {
    found.push(`∂/∂${plain(variable)}`);
    return `\\frac{d}{d${variable}}`;
  });

  // Both Leibniz forms mean the same thing and differ only in their `d`.
  for (const [pattern, label] of [
    [PARTIAL_LEIBNIZ, "∂"],
    [LEIBNIZ, "d"],
  ] as const) {
    next = next.replace(
      pattern,
      (match, functionName: string, variable: string) => {
        const args = lookupArguments(functionName);
        if (args === undefined || args.length === 0) return match;
        found.push(`${label}${plain(functionName)}/${label}${plain(variable)}`);
        const call = args.join(",");
        return `\\frac{d}{d${variable}}${functionName}\\left(${call}\\right)`;
      }
    );
  }

  if (found.length === 0) return undefined;
  return {
    latex: next,
    description: `Rewrote ${found.join(", ")} into the form Desmos evaluates.`,
  };
}

/** Strips the LaTeX subscript braces, so `x_{1}` reads as `x_1`. */
function plain(name: string) {
  return name.replace(/_\{([a-zA-Z0-9]+)\}/, "_$1");
}
