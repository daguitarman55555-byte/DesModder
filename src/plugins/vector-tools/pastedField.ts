/**
 * Turning a field pasted from elsewhere — a CAS, a paper, sympy's `latex()` —
 * into the Desmos LaTeX the panel's slots hold.
 *
 * Each rewrite here exists because live Desmos (measured 2026-10-14) reads the
 * pasted form wrongly or not at all:
 *
 * - `\left\langle P, Q \right\rangle` is an "unrecognized symbol". A whole
 *   vector pasted into one slot is split across P and Q (and R).
 * - `\Gamma\left(z\right)` is **silently wrong**: Desmos has no gamma
 *   function, reads Γ as a variable, and offers to make it a slider. Desmos's
 *   factorial is already the gamma function at every z, so Γ(z) is (z−1)!.
 * - `\sum_{j=0}^{\infty}` is refused outright ("infinite bound"). Desmos, like
 *   a shader, has to stop somewhere, so ∞ becomes a last term the user can see
 *   in the slot and change — {@link INFINITE_SUM_LAST}, said so in a note.
 * - `\cos{\left(1\right)}` — a function's bracketed argument wrapped in braces —
 *   Desmos does read, but the GPU compiler would not, and the braces mean
 *   nothing. They are dropped.
 *
 * Everything walks brackets rather than matching regular expressions across
 * them, for the reason `src/symbolic/latex.ts` gives: an argument with a
 * bracket of its own closes the naive match early and still parses.
 */

/**
 * The last index an infinite sum or product is cut at.
 *
 * A default, not a limit: it is written into the slot as a number the user can
 * edit. Twenty because past it the GPU's single-precision gamma overflows
 * (Γ(z) passes 3.4·10³⁸ at z ≈ 35, and a series index is usually doubled),
 * so further terms would add nothing on the live arrows and the flow; Desmos's
 * own double-precision arrows can take more, and the note says how.
 */
export const INFINITE_SUM_LAST = 20;

export interface ImportedField {
  /** One slot's LaTeX, or two or three when a whole vector was pasted. */
  components: string[];
  /** What was rewritten, for the panel's status line. Empty if nothing. */
  notes: string[];
}

export function importPastedField(latex: string): ImportedField {
  const notes: string[] = [];
  const parts = splitVector(latex) ?? [latex];
  if (parts.length > 1)
    notes.push(
      `Split the pasted vector into ${["P and Q", "P, Q and R"][parts.length - 2]}.`
    );
  const rewrite = { gamma: false, infinite: [] as string[] };
  const components = parts.map((part) =>
    replaceInfiniteBounds(
      rewriteGamma(unbraceArguments(part.trim()), rewrite),
      rewrite
    )
  );
  if (rewrite.gamma)
    notes.push(
      "Desmos has no Γ, so Γ(z) is written (z−1)!, which is the same function."
    );
  for (const index of rewrite.infinite)
    notes.push(
      `Desmos cannot sum to ∞, so the sum now stops at ${index} = ${INFINITE_SUM_LAST}. Change the ${INFINITE_SUM_LAST} for more terms or fewer.`
    );
  return { components, notes };
}

// ---- brackets --------------------------------------------------------------

/** Openers and closers, longest first so `\left\langle` wins over `\left`. */
const OPENERS = [
  "\\left\\langle",
  "\\left\\{",
  "\\left(",
  "\\left[",
  "\\left|",
  "\\left.",
  "\\langle",
  "\\{",
  "(",
  "[",
  "{",
];
const CLOSERS = [
  "\\right\\rangle",
  "\\right\\}",
  "\\right)",
  "\\right]",
  "\\right|",
  "\\right.",
  "\\rangle",
  "\\}",
  ")",
  "]",
  "}",
];

/** The token of `list` that `latex` has at `at`, if any. */
function tokenAt(latex: string, at: number, list: readonly string[]) {
  return list.find((token) => latex.startsWith(token, at));
}

/**
 * Walks `latex` from `from`, calling `visit` at each character outside any
 * bracket opened after `from`, and returns the index just past the closer that
 * takes the depth below zero — or `latex.length` if nothing does.
 */
function walk(
  latex: string,
  from: number,
  visit?: (at: number) => void
): number {
  let depth = 0;
  let at = from;
  while (at < latex.length) {
    // A command name is one token: `\rightarrow` is not `\right` then `arrow`.
    const opener = tokenAt(latex, at, OPENERS);
    const closer = opener === undefined && tokenAt(latex, at, CLOSERS);
    if (opener !== undefined && !isLongerCommand(latex, at, opener)) {
      depth++;
      at += opener.length;
    } else if (closer && !isLongerCommand(latex, at, closer)) {
      at += closer.length;
      if (--depth < 0) return at;
    } else {
      if (depth === 0) visit?.(at);
      at += latex[at] === "\\" ? 2 : 1;
    }
  }
  return latex.length;
}

/** Whether `token` at `at` is only the start of a longer `\command`. */
function isLongerCommand(latex: string, at: number, token: string) {
  return /[A-Za-z]$/.test(token) && /[A-Za-z]/.test(latex[at + token.length]);
}

/** The index just past the bracket that closes one opened just before `from`. */
function closeOf(latex: string, from: number) {
  return walk(latex, from);
}

// ---- the vector itself -----------------------------------------------------

/**
 * `⟨P, Q⟩`, `(P, Q)` or a bare `P, Q` (with an optional third), as its
 * components, or undefined if it is one expression.
 */
export function splitVector(latex: string): string[] | undefined {
  let inner = latex.trim();
  const opener = tokenAt(inner, 0, [
    "\\left\\langle",
    "\\langle",
    "\\left(",
    "(",
  ]);
  if (opener !== undefined && closeOf(inner, opener.length) === inner.length) {
    const closer = CLOSERS.find((c) => inner.endsWith(c));
    if (closer !== undefined)
      inner = inner.slice(opener.length, inner.length - closer.length);
  }
  const commas: number[] = [];
  walk(inner, 0, (at) => {
    if (inner[at] === ",") commas.push(at);
  });
  if (commas.length < 1 || commas.length > 2) return undefined;
  const parts: string[] = [];
  let start = 0;
  for (const comma of [...commas, inner.length]) {
    parts.push(inner.slice(start, comma).trim());
    start = comma + 1;
  }
  return parts.every((part) => part !== "") ? parts : undefined;
}

// ---- the rewrites ----------------------------------------------------------

/** `\cos{\left(1\right)}` as `\cos\left(1\right)`. */
function unbraceArguments(latex: string): string {
  const pattern = /\\(?:operatorname\{[A-Za-z]+\}|[A-Za-z]+)\s*\{/g;
  let out = "";
  let last = 0;
  for (let match; (match = pattern.exec(latex)) !== null; ) {
    // Only functions take an argument this way; `\frac{` and `\sqrt{` keep
    // their braces, which are their syntax.
    const [, command] = /^\\([A-Za-z]+)/.exec(match[0])!;
    if (["frac", "dfrac", "tfrac", "sqrt", "left", "right"].includes(command))
      continue;
    const open = match.index + match[0].length;
    const close = closeOf(latex, open); // just past the }
    const content = latex.slice(open, close - 1).trim();
    const bracket = tokenAt(content, 0, ["\\left(", "("]);
    if (
      bracket === undefined ||
      closeOf(content, bracket.length) !== content.length
    )
      continue;
    out +=
      latex.slice(last, match.index) +
      match[0].slice(0, -1).trimEnd() +
      unbraceArguments(content);
    last = close;
    pattern.lastIndex = close;
  }
  return out + latex.slice(last);
}

/** `\Gamma\left(z\right)` as `\left(z-1\right)!`, nested ones included. */
function rewriteGamma(latex: string, found: { gamma: boolean }): string {
  const pattern = /\\Gamma(?![A-Za-z])\s*/g;
  let out = "";
  let last = 0;
  for (let match; (match = pattern.exec(latex)) !== null; ) {
    let at = match.index + match[0].length;
    const braced = latex[at] === "{";
    if (braced) at++;
    const bracket = tokenAt(latex, at, ["\\left(", "("]);
    if (bracket === undefined) continue;
    const close = closeOf(latex, at + bracket.length);
    const closer = latex.startsWith("\\right)", close - 7) ? 7 : 1;
    let inner = rewriteGamma(
      latex.slice(at + bracket.length, close - closer),
      found
    ).trim();
    // Γ(n + 1) is n!, and sympy writes it that way round constantly.
    const plusOne = /\s*\+\s*1$/.exec(inner);
    inner = plusOne ? inner.slice(0, plusOne.index) : `${inner}-1`;
    let end = close;
    if (braced && latex[end] === "}") end++;
    out += latex.slice(last, match.index) + `\\left(${inner}\\right)!`;
    last = end;
    pattern.lastIndex = end;
    found.gamma = true;
  }
  return out + latex.slice(last);
}

/** `\sum_{j=0}^{\infty}` as `\sum_{j=0}^{20}`, and the same for `\prod`. */
function replaceInfiniteBounds(
  latex: string,
  found: { infinite: string[] }
): string {
  return latex.replace(
    /(\\(?:sum|prod)(?:\\limits)?_\{\s*([^=}]+?)\s*=[^}]*\}\s*\^\s*)(?:\{\s*\\infty\s*\}|\\infty(?![A-Za-z]))/g,
    (_, head: string, index: string) => {
      found.infinite.push(index.trim());
      return `${head}{${INFINITE_SUM_LAST}}`;
    }
  );
}
