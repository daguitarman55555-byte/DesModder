/**
 * Antiderivatives written with special functions, for integrands that have
 * no elementary one.
 *
 * `∫ eˣ/x dx` has no elementary antiderivative (nonElementary.ts proves the
 * shapes), but it has an exact one: Ei(x). Every function used here is
 * defined in Desmos by src/symbolic/special.ts, so the answer graphs with its
 * real notation, and `evaluate` knows each one, so the answer is checked by
 * differentiating it back like any other.
 *
 * The shapes, for linear arguments and a constant multiple c:
 *
 * - e^{ax+b}/(px+q) = (e^{b−aq/p}/p)·Ei(a(px+q)/p)
 * - sin(ax)/x = Si(ax), cos(ax)/x = Ci(|a|x), sinh(ax)/x = Shi(ax),
 *   cosh(ax)/x = Chi(|a|x)
 * - 1/ln(ax+b) = li(ax+b)/a
 * - e^{−kx²} = (√π/(2√k))·erf(√k x), e^{kx²} = (√π/(2√k))·erfi(√k x)
 * - sin(kx²) = √(π/(2k))·S(√(2k/π)x), cos(kx²) the same with C (Fresnel)
 * - ln(1 + ax)/x = −Li₂(−ax)
 *
 * A sum is answered term by term when every term is either elementary or one
 * of these.
 */
import {
  add,
  call,
  dependsOn,
  divide,
  evaluate,
  fold,
  id,
  multiply,
  negative,
  number,
  power,
  quotientFactors,
  topLevelTerms,
  type Node,
} from "../../../symbolic";

export interface SpecialAntiderivative {
  value: Node;
  /** The special functions it is written with, by symbol. */
  uses: string[];
}

/** `a` when the node is `a·x + b`, with `b`; numbers only. */
function linear(node: Node, variable: string) {
  const b = evaluate(node, { [variable]: 0 });
  const a = evaluate(node, { [variable]: 1 }) - b;
  const check = evaluate(node, { [variable]: 2.5 });
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return undefined;
  if (Math.abs(check - (a * 2.5 + b)) > 1e-12 * Math.max(1, Math.abs(check)))
    return undefined;
  return { a, b };
}

/** `k` when the node is `k·x²`. */
function pureSquare(node: Node, variable: string): number | undefined {
  const k = evaluate(node, { [variable]: 1 });
  if (!Number.isFinite(k) || k === 0) return undefined;
  for (const x of [0, 2, -1.5])
    if (Math.abs(evaluate(node, { [variable]: x }) - k * x * x) > 1e-12)
      return undefined;
  return k;
}

const num = (v: number): Node => (v < 0 ? negative(number(-v)) : number(v));

function exponent(node: Node): Node | undefined {
  if (
    node.type === "BinaryOperator" &&
    node.name === "Exponent" &&
    node.left.type === "Identifier" &&
    node.left.symbol === "e"
  )
    return node.right;
  if (node.type === "FunctionCall" && node.callee.symbol === "exp")
    return node.args[0];
  return undefined;
}

/** One term: a constant times a shape, or undefined. */
function oneTerm(
  node: Node,
  variable: string
): SpecialAntiderivative | undefined {
  const factors: { node: Node; inNumerator: boolean }[] = [];
  quotientFactors(fold(node), true, factors);
  let constant: Node = number(1);
  const top: Node[] = [];
  const bottom: Node[] = [];
  for (const f of factors) {
    if (!dependsOn(f.node, variable))
      constant = f.inNumerator
        ? multiply(constant, f.node)
        : divide(constant, f.node);
    else (f.inNumerator ? top : bottom).push(f.node);
  }
  const shaped = shape(top, bottom, variable);
  if (shaped === undefined) return undefined;
  return { value: fold(multiply(constant, shaped.value)), uses: shaped.uses };
}

function shape(
  top: Node[],
  bottom: Node[],
  variable: string
): SpecialAntiderivative | undefined {
  const x = id(variable);
  // Over a linear denominator.
  if (top.length === 1 && bottom.length === 1) {
    const den = linear(bottom[0], variable);
    const [t] = top;
    if (den !== undefined) {
      const { a: p, b: q } = den;
      const ex = exponent(t);
      if (ex !== undefined) {
        const e = linear(ex, variable);
        if (e !== undefined) {
          // ∫ e^{ax+b}/(px+q) = e^{b − aq/p}/p · Ei(a(px+q)/p)
          const shift = e.b - (e.a * q) / p;
          const frontNode =
            shift === 0
              ? divide(number(1), num(p))
              : divide(power(id("e"), num(shift)), num(p));
          return {
            value: multiply(
              frontNode,
              call("Ei", multiply(num(e.a / p), bottom[0]))
            ),
            uses: ["Ei"],
          };
        }
      }
      if (
        q === 0 &&
        t.type === "FunctionCall" &&
        t.args.length === 1 &&
        ["sin", "cos", "sinh", "cosh"].includes(t.callee.symbol)
      ) {
        const w = linear(t.args[0], variable);
        if (w !== undefined && w.b === 0) {
          // ∫ g(ax)/(px) = (1/p)·G(ax); the cosines are even, so |a|.
          const name = { sin: "Si", cos: "Ci", sinh: "Shi", cosh: "Chi" }[
            t.callee.symbol
          ]!;
          const even = t.callee.symbol === "cos" || t.callee.symbol === "cosh";
          const rate = even ? Math.abs(w.a) : w.a;
          return {
            value: divide(call(name, multiply(num(rate), x)), num(p)),
            uses: [name],
          };
        }
      }
      if (
        q === 0 &&
        t.type === "FunctionCall" &&
        t.callee.symbol === "ln" &&
        t.args.length === 1
      ) {
        // ∫ ln(1 + ax)/(px) = −Li₂(−ax)/p
        const inner = linear(t.args[0], variable);
        if (inner !== undefined && inner.b === 1)
          return {
            value: negative(
              divide(call("Li_2", multiply(num(-inner.a), x)), num(p))
            ),
            uses: ["Li_2"],
          };
      }
    }
  }
  // 1/ln(ax + b)
  if (top.length === 0 && bottom.length === 1) {
    const [l] = bottom;
    if (l.type === "FunctionCall" && l.callee.symbol === "ln") {
      const inner = linear(l.args[0], variable);
      if (inner !== undefined)
        return {
          value: divide(call("li", l.args[0]), num(inner.a)),
          uses: ["li"],
        };
    }
  }
  if (top.length === 1 && bottom.length === 0) {
    const [t] = top;
    // e^{kx²}
    const ex = exponent(t);
    if (ex !== undefined) {
      const k = pureSquare(ex, variable);
      if (k !== undefined) {
        const front = divide(
          power(id("pi"), divide(number(1), number(2))),
          multiply(
            number(2),
            power(num(Math.abs(k)), divide(number(1), number(2)))
          )
        );
        const name = k < 0 ? "erf" : "erfi";
        return {
          value: multiply(
            front,
            call(
              name,
              multiply(power(num(Math.abs(k)), divide(number(1), number(2))), x)
            )
          ),
          uses: [name],
        };
      }
    }
    // sin(kx²), cos(kx²), k > 0: Fresnel.
    if (
      t.type === "FunctionCall" &&
      (t.callee.symbol === "sin" || t.callee.symbol === "cos") &&
      t.args.length === 1
    ) {
      const k = pureSquare(t.args[0], variable);
      if (k !== undefined && k > 0) {
        const name = t.callee.symbol === "sin" ? "FresnelS" : "FresnelC";
        const half = divide(number(1), number(2));
        // √(π/(2k)) · F(√(2k/π) x)
        return {
          value: multiply(
            power(divide(id("pi"), num(2 * k)), half),
            call(name, multiply(power(divide(num(2 * k), id("pi")), half), x))
          ),
          uses: [name],
        };
      }
    }
  }
  return undefined;
}

/**
 * An antiderivative in special functions, or undefined. `elementary` is the
 * ordinary integrator, for the terms of a sum that need no special function;
 * passed in so this module does not import it.
 */
export function specialAntiderivative(
  node: Node,
  variable: string,
  elementary: (term: Node) => Node | undefined
): SpecialAntiderivative | undefined {
  const terms = topLevelTerms(fold(node));
  let total: Node = number(0);
  const uses = new Set<string>();
  let special = false;
  for (const { term, negated } of terms) {
    const found = oneTerm(term, variable);
    let value: Node;
    if (found !== undefined) {
      special = true;
      found.uses.forEach((u) => uses.add(u));
      ({ value } = found);
    } else {
      const plain = elementary(term);
      if (plain === undefined) return undefined;
      value = plain;
    }
    total = add(total, negated ? negative(value) : value);
  }
  return special ? { value: fold(total), uses: [...uses] } : undefined;
}
