/**
 * Names for an answer on its way into a graph that already has things in it.
 *
 * An answer brings arbitrary constants with it — the `+C` of an
 * antiderivative, the C₁ and C₂ of a second-order solution — and Desmos
 * resolves a name globally. Added beside a graph that already uses C (a
 * slider, an earlier antiderivative, the user's own C = 4), the new curve
 * would quietly share that C, or the answer's `C = 3` would redefine it and
 * break every line that already meant something else by it. So each
 * constant the answer introduces gets a name nothing in the graph uses yet,
 * C₁, then C₂, and so on, renamed consistently across every line the answer
 * adds.
 *
 * Definitions are the other half: a definition already in the graph, letter
 * for letter, is not added twice; one whose name the graph already uses for
 * something else is renamed rather than overwriting it.
 */
import {
  canonicalIdentifier,
  identifierLatex,
  identifierNames,
  renameIdentifier,
} from "../../field-rendering/identifiers";

/**
 * The constants the engine introduces: C, and K or D when the integrand
 * already says C, each maybe with a numeric subscript. A user's own capital
 * letter, reached through a definition in the graph, is not one of them.
 */
const CONSTANT = /^[CKD](?:_[0-9]+)?$/;

/** The name a definition line defines, when it is a plain identifier. */
function definedName(latex: string): string | undefined {
  const match =
    /^\s*([A-Za-z](?:_(?:\{[A-Za-z0-9]*\}|[A-Za-z0-9]))?)\s*(?:=|\\left\(|\()/.exec(
      latex
    );
  return match === null ? undefined : canonicalIdentifier(match[1]);
}

export interface PlacedAnswer {
  /** The answer's lines, renamed. */
  items: string[];
  /** The definitions still to add, renamed; those already present are gone. */
  definitions: string[];
  /** What was renamed, canonical old name to LaTeX new name. */
  renamed: Map<string, string>;
}

/**
 * @param items The lines the answer adds, curves and `C = value` alike.
 * @param existing Every expression's LaTeX already in the graph.
 * @param options.input What the user typed: a name it mentions is theirs,
 *   not one the answer introduced, and is never renamed.
 * @param options.definitions Supporting definitions the answer needs.
 */
export function placeAnswer(
  items: readonly string[],
  existing: readonly string[],
  options: { input?: string; definitions?: readonly string[] } = {}
): PlacedAnswer {
  const taken = new Set<string>();
  for (const latex of existing)
    for (const name of identifierNames(latex)) taken.add(name);
  const inInput = identifierNames(options.input ?? "");
  const inAnswer = new Set<string>();
  for (const latex of [...items, ...(options.definitions ?? [])])
    for (const name of identifierNames(latex)) inAnswer.add(name);

  const renamed = new Map<string, string>();
  const fresh = (name: string) => {
    const [base] = name;
    for (let k = 1; ; k++) {
      const candidate = `${base}_${k}`;
      if (!taken.has(candidate) && !inAnswer.has(candidate)) {
        taken.add(candidate);
        inAnswer.add(candidate);
        return candidate;
      }
    }
  };

  const definitions: string[] = [];
  const existingSet = new Set(existing.map((latex) => latex.trim()));
  for (const definition of options.definitions ?? []) {
    if (existingSet.has(definition.trim())) continue;
    const name = definedName(definition);
    if (name === undefined) {
      // A Greek or command name: kept as it was, once.
      const head = definition.slice(0, definition.indexOf("=") + 1);
      if (head !== "" && existing.some((latex) => latex.startsWith(head)))
        continue;
    }
    if (name !== undefined && taken.has(name) && !inInput.has(name))
      renamed.set(name, identifierLatex(fresh(name)));
    definitions.push(definition);
  }

  // A snapshot: fresh() adds to inAnswer, and a Set's iterator visits what
  // is added during the loop, so C_1 would be renamed again, and so on.
  for (const name of [...inAnswer]) {
    if (renamed.has(name) || inInput.has(name)) continue;
    if (!CONSTANT.test(name) || !taken.has(name)) continue;
    renamed.set(name, identifierLatex(fresh(name)));
  }

  const apply = (latex: string) => {
    let out = latex;
    for (const [from, to] of renamed) out = renameIdentifier(out, from, to);
    return out;
  };
  return {
    items: items.map(apply),
    definitions: definitions.map(apply),
    renamed,
  };
}
