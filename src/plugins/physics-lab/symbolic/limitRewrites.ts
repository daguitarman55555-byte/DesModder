/**
 * Two limits the engine (`limit.ts`) does not reach on its own, each turned
 * into one it does, or into a formula it can check.
 *
 * ## A parameter: sin(ax)/x → a
 *
 * The engine decides with exact numbers, so a letter it has no value for
 * stops it. A parametric limit at a finite point is done here by L'Hôpital's
 * rule on the tree itself: while numerator and denominator both fold to 0 at
 * the point, for every value of the parameters (they fold to the constant 0,
 * which is structural, not sampled), each is differentiated. Once the
 * denominator is not 0 there, the quotient of the two at the point is the
 * limit, wherever that denominator is not 0 — the case split the answer
 * states. The formula is then held to the engine's own proved limit at
 * several values of the parameters, and refused if they disagree.
 *
 * ## An iterated logarithm: ln(ln x)/ln x → 0
 *
 * When x appears only through ln x, t = ln x turns the limit into one in t:
 * x → ∞ is t → ∞, and x → 0⁺ is t → −∞. ln(ln x)/ln x is ln t/t, which the
 * engine's growth rules settle. This is the slot `ln ln t` would need on the
 * growth scale, reached by a change of variable instead (UPGRADE_ROADMAP,
 * limits still unknown).
 */
import {
  asRatio,
  call,
  dependsOn,
  differentiate,
  divide,
  evaluate,
  fold,
  freshName,
  id,
  identifiersIn,
  replaceIdentifier,
  replaceSubtree,
  visit,
  constantValue,
  type Node,
} from "../../../symbolic";
import type { Bound } from "./definite";
import { findLimit, type LimitSide } from "./limit";
import * as X from "./exact";

export interface ParametricLimit {
  /** The limit as a formula in the parameters. */
  value: Node;
  parameters: string[];
  /** How many times L'Hôpital's rule was applied. */
  applications: number;
  /** The denominator at the point; the formula holds where it is not 0. */
  condition?: Node;
  /** Parameter values at which the engine's proved limit agreed. */
  checkedAt: Record<string, number>[];
}

const NOT_PARAMETERS = new Set(["e", "pi", "tau"]);

function parametersOf(node: Node, variable: string): string[] {
  const callees = new Set<string>();
  visit(node, (child) => {
    if (child.type === "FunctionCall") callees.add(child.callee.symbol);
  });
  return [...new Set(identifiersIn(node))].filter(
    (name) =>
      name !== variable && !NOT_PARAMETERS.has(name) && !callees.has(name)
  );
}

const isZero = (node: Node) => constantValue(fold(node)) === 0;

/** Parameter values to check at: away from 0, 1 and each other, and
 * exact, since the engine decides with exact numbers and 0.7 as a double is
 * not 7/10. */
const SAMPLES = [2, -3, 5, 0.5];

export function parametricLimit(
  node: Node,
  variable: string,
  at: Bound,
  side: LimitSide
): ParametricLimit | undefined {
  if (at.kind !== "finite") return undefined;
  const parameters = parametersOf(node, variable);
  if (parameters.length === 0 || parameters.length > 3) return undefined;
  const ratio = asRatio(fold(node));
  let top = ratio.numerator;
  let bottom = ratio.denominator;
  const atPoint = (n: Node) => fold(replaceIdentifier(n, variable, at.node));
  let applications = 0;
  let value: Node | undefined;
  let condition: Node | undefined;
  for (; applications <= 3; applications++) {
    const t = atPoint(top);
    const b = atPoint(bottom);
    if (isZero(t) && isZero(b)) {
      if (applications === 3) return undefined;
      top = differentiate(top, variable);
      bottom = differentiate(bottom, variable);
      continue;
    }
    if (isZero(b) || dependsOn(t, variable) || dependsOn(b, variable))
      return undefined;
    value = fold(divide(t, b));
    if (constantValue(b) === undefined) condition = b;
    break;
  }
  if (value === undefined || applications === 0) return undefined;

  // Held to the engine's proved limits with numbers in place of the letters.
  const checkedAt: Record<string, number>[] = [];
  for (let i = 0; i < SAMPLES.length; i++) {
    const bindings: Record<string, number> = {};
    parameters.forEach((p, j) => {
      bindings[p] = SAMPLES[(i + j) % SAMPLES.length];
    });
    const expected = evaluate(value, bindings);
    if (!Number.isFinite(expected)) continue;
    let numeric = node;
    for (const p of parameters)
      numeric = replaceIdentifier(numeric, p, {
        type: "Constant",
        value: bindings[p],
      });
    const found = findLimit(numeric, variable, at, side).answer;
    if (found.kind !== "value" || found.limit.kind !== "finite") continue;
    const got = X.toNumber(found.limit.value);
    if (Math.abs(got - expected) > 1e-9 * Math.max(1, Math.abs(expected)))
      return undefined;
    checkedAt.push(bindings);
  }
  if (checkedAt.length < 2) return undefined;
  return { value, parameters, applications, condition, checkedAt };
}

export interface LogSubstitution {
  /** The expression in t = ln x. */
  node: Node;
  name: string;
  at: Bound;
}

/**
 * The limit rewritten in t = ln x, when x appears only through ln x and the
 * approach is to ∞ or to 0 from the right.
 */
export function logSubstitution(
  node: Node,
  variable: string,
  at: Bound,
  side: LimitSide
): LogSubstitution | undefined {
  let target: Bound;
  if (at.kind === "infinite" && at.sign > 0)
    target = { kind: "infinite", sign: 1 };
  else if (at.kind === "finite" && at.value === 0 && side === "right")
    target = { kind: "infinite", sign: -1 };
  else return undefined;
  const name = freshName(node, ["t", "u", "s"]);
  const replaced = fold(
    replaceSubtree(node, call("ln", id(variable)), id(name))
  );
  if (dependsOn(replaced, variable) || !dependsOn(replaced, name))
    return undefined;
  // Only worth it when the logarithm was nested: ln x/x is already the
  // engine's, and would come back unchanged in all but name.
  let nested = false;
  visit(replaced, (child) => {
    if (
      child.type === "FunctionCall" &&
      child.args.some((arg) => dependsOn(arg, name))
    )
      nested = true;
  });
  if (!nested) return undefined;
  return { node: replaced, name, at: target };
}
