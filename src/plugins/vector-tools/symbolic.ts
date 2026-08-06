/**
 * Symbolic partial differentiation over Desmos expressions.
 *
 * Desmos evaluates `\frac{d}{dx}f(x,y)` exactly, but it only ever *evaluates*
 * it — there is no simplified form to read, so `f(x,y)=2xy` never shows you
 * that the derivative is `2y`. Getting that requires actually differentiating
 * the expression, which is what this does.
 *
 * It needs no computer algebra system. Desmos's own parser already produces a
 * full syntax tree (through `text-mode-core`'s Aug layer), differentiation of
 * that tree is mechanical, and the same layer emits LaTeX back out. The result
 * is exact for everything it accepts, and it refuses everything else rather
 * than guessing — an almost-right derivative is worse than none.
 *
 * Every other identifier is held constant, which is exactly what makes this a
 * *partial* derivative: differentiating `2xy` by `x` treats `y` as a constant
 * and gives `2y`.
 */
import {
  Aug,
  AugBuilders,
  latexTreeToString,
  type Config,
} from "../../../text-mode-core";

const { number, binop, functionCall, id, negative } = AugBuilders;

type Node = Aug.Latex.AnyChild;

/** Thrown for anything this cannot differentiate exactly. */
export class SymbolicError extends Error {}

/**
 * Emits a tree as LaTeX, with implicit multiplication where Desmos reads it
 * identically. The Aug emitter always writes `\cdot`, so a derivative comes out
 * as `2\cdot y` — correct, and noise to read next to the `2y` a person would
 * write.
 *
 * The dot is only dropped before a letter or a LaTeX command, which is the case
 * where juxtaposition means multiplication and nothing else. It is kept before
 * digits (`2\cdot 3` must not become `23`) and before signs (`2\cdot -3` must
 * not become a subtraction). Only ever applied to trees this module built, never
 * to anything the user typed.
 */
export function toLatex(cfg: Config, node: Node): string {
  return latexTreeToString(cfg, node).replace(/\\cdot (?=[A-Za-z\\])/g, "");
}

/**
 * Derivatives of the named functions, as a factor to multiply the chain-rule
 * term by. Everything here is spelled with functions Desmos itself has, so the
 * emitted derivative is ordinary vanilla LaTeX.
 */
const FUNCTION_DERIVATIVES: Record<string, (arg: Node) => Node> = {
  sin: (u) => call("cos", u),
  cos: (u) => negative(call("sin", u)),
  tan: (u) => divide(number(1), power(call("cos", u), number(2))),
  cot: (u) => negative(divide(number(1), power(call("sin", u), number(2)))),
  sec: (u) => multiply(call("sec", u), call("tan", u)),
  csc: (u) => negative(multiply(call("csc", u), call("cot", u))),
  exp: (u) => call("exp", u),
  ln: (u) => divide(number(1), u),
  log: (u) => divide(number(1), multiply(u, call("ln", number(10)))),
  sqrt: (u) => divide(number(1), multiply(number(2), call("sqrt", u))),
  arcsin: (u) =>
    divide(number(1), call("sqrt", subtract(number(1), square(u)))),
  arccos: (u) =>
    negative(divide(number(1), call("sqrt", subtract(number(1), square(u))))),
  arctan: (u) => divide(number(1), add(number(1), square(u))),
  sinh: (u) => call("cosh", u),
  cosh: (u) => call("sinh", u),
  tanh: (u) => divide(number(1), power(call("cosh", u), number(2))),
  abs: (u) => call("sign", u),
};

/**
 * The partial derivative of `node` with respect to `variable`, simplified.
 *
 * Throws {@link SymbolicError} if the expression contains anything it cannot
 * differentiate exactly, including a call to a function it does not know.
 */
export function differentiate(node: Node, variable: string): Node {
  return simplify(derivative(node, variable));
}

function derivative(node: Node, variable: string): Node {
  switch (node.type) {
    case "Constant":
      return number(0);
    case "Identifier":
      // Every other name is a constant with respect to this variable, which is
      // precisely what makes the result a partial derivative.
      return number(node.symbol === variable ? 1 : 0);
    case "Negative":
      return negative(derivative(node.arg, variable));
    case "BinaryOperator":
      return binaryDerivative(node, variable);
    case "FunctionCall":
      return functionCallDerivative(node, variable);
    default:
      throw new SymbolicError(
        `${describe(node)} cannot be differentiated symbolically.`
      );
  }
}

function binaryDerivative(node: Aug.Latex.BinaryOperator, variable: string) {
  const { left, right } = node;
  const dLeft = derivative(left, variable);
  const dRight = derivative(right, variable);
  switch (node.name) {
    case "Add":
      return add(dLeft, dRight);
    case "Subtract":
      return subtract(dLeft, dRight);
    case "Multiply":
    case "CrossMultiply":
      // Product rule.
      return add(multiply(dLeft, right), multiply(left, dRight));
    case "Divide":
      // Quotient rule.
      return divide(
        subtract(multiply(dLeft, right), multiply(left, dRight)),
        square(right)
      );
    case "Exponent":
      return exponentDerivative(left, right, dLeft, dRight, variable);
  }
}

/**
 * `u^v` splits into the two cases people actually write. A constant exponent
 * is the power rule; anything else needs the general form, which is only real
 * where `u > 0`.
 */
function exponentDerivative(
  base: Node,
  exponent: Node,
  dBase: Node,
  dExponent: Node,
  variable: string
): Node {
  if (!dependsOn(exponent, variable)) {
    return multiply(
      multiply(exponent, power(base, subtract(exponent, number(1)))),
      dBase
    );
  }
  if (!dependsOn(base, variable)) {
    // a^v: a^v * ln(a) * v'
    return multiply(
      multiply(power(base, exponent), call("ln", base)),
      dExponent
    );
  }
  // u^v: u^v * (v' ln u + v u' / u)
  return multiply(
    power(base, exponent),
    add(
      multiply(dExponent, call("ln", base)),
      divide(multiply(exponent, dBase), base)
    )
  );
}

function functionCallDerivative(
  node: Aug.Latex.FunctionCall,
  variable: string
) {
  const name = node.callee.symbol;
  if (node.args.length !== 1) {
    throw new SymbolicError(
      `${name} takes more than one argument, so it cannot be differentiated here.`
    );
  }
  const rule = FUNCTION_DERIVATIVES[name];
  if (rule === undefined) {
    throw new SymbolicError(`The derivative of ${name} is not known.`);
  }
  const [arg] = node.args;
  // Chain rule.
  return multiply(rule(arg), derivative(arg, variable));
}

/** Whether `variable` appears anywhere in the tree. */
export function dependsOn(node: Node, variable: string): boolean {
  let found = false;
  visit(node, (child) => {
    if (child.type === "Identifier" && child.symbol === variable) found = true;
  });
  return found;
}

/** Every identifier in the tree, in first-seen order. */
export function identifiersIn(node: Node): string[] {
  const names: string[] = [];
  visit(node, (child) => {
    if (child.type === "Identifier" && !names.includes(child.symbol))
      names.push(child.symbol);
  });
  return names;
}

function visit(node: Node, callback: (node: Node) => void) {
  callback(node);
  for (const value of Object.values(
    node as unknown as Record<string, unknown>
  )) {
    if (Array.isArray(value)) {
      for (const child of value) {
        if (isNode(child)) visit(child, callback);
      }
    } else if (isNode(value)) {
      visit(value, callback);
    }
  }
}

function isNode(value: unknown): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

/**
 * Folds the arithmetic identities that differentiation produces in bulk.
 *
 * Without this the derivative of `2xy` by `x` comes out as
 * `0*x*y + 2*(1*y + x*0)` rather than `2y`, which is technically correct and
 * completely useless to read.
 */
export function simplify(node: Node): Node {
  switch (node.type) {
    case "Negative": {
      const arg = simplify(node.arg);
      if (arg.type === "Constant") return number(-arg.value);
      if (arg.type === "Negative") return arg.arg;
      return negative(arg);
    }
    case "FunctionCall":
      return {
        ...node,
        args: node.args.map(simplify),
      };
    case "BinaryOperator":
      return simplifyBinary(node);
    default:
      return node;
  }
}

function simplifyBinary(node: Aug.Latex.BinaryOperator): Node {
  const left = simplify(node.left);
  const right = simplify(node.right);
  const lc = constantValue(left);
  const rc = constantValue(right);
  switch (node.name) {
    case "Add":
      if (lc === 0) return right;
      if (rc === 0) return left;
      if (lc !== undefined && rc !== undefined) return number(lc + rc);
      break;
    case "Subtract":
      if (rc === 0) return left;
      if (lc === 0) return simplify(negative(right));
      if (lc !== undefined && rc !== undefined) return number(lc - rc);
      break;
    case "Multiply":
    case "CrossMultiply":
      if (lc === 0 || rc === 0) return number(0);
      if (lc === 1) return right;
      if (rc === 1) return left;
      if (lc !== undefined && rc !== undefined) return number(lc * rc);
      // Keep numbers on the left, so `y*2` reads as `2y`.
      if (rc !== undefined && lc === undefined)
        return binop("Multiply", right, left);
      break;
    case "Divide":
      if (lc === 0) return number(0);
      if (rc === 1) return left;
      if (lc !== undefined && rc !== undefined && rc !== 0)
        return number(lc / rc);
      break;
    case "Exponent":
      if (rc === 1) return left;
      if (rc === 0) return number(1);
      if (lc !== undefined && rc !== undefined) return number(lc ** rc);
      break;
  }
  // `binop` does not accept CrossMultiply, which carries the same meaning here.
  return node.name === "CrossMultiply"
    ? { ...node, left, right }
    : binop(node.name, left, right);
}

function constantValue(node: Node): number | undefined {
  if (node.type === "Constant") return node.value;
  if (node.type === "Negative") {
    const inner = constantValue(node.arg);
    return inner === undefined ? undefined : -inner;
  }
  return undefined;
}

function describe(node: Node) {
  switch (node.type) {
    case "Integral":
      return "An integral";
    case "Derivative":
    case "Prime":
      return "A derivative";
    case "List":
    case "Range":
    case "ListComprehension":
      return "A list";
    case "Piecewise":
      return "A piecewise";
    case "RepeatedOperator":
      return "A sum or product";
    default:
      return `\`${node.type}\``;
  }
}

// ---- small builders ------------------------------------------------------

function call(name: string, arg: Node) {
  return functionCall(id(name), [arg]);
}

function add(left: Node, right: Node) {
  return binop("Add", left, right);
}

function subtract(left: Node, right: Node) {
  return binop("Subtract", left, right);
}

function multiply(left: Node, right: Node) {
  return binop("Multiply", left, right);
}

function divide(left: Node, right: Node) {
  return binop("Divide", left, right);
}

function power(base: Node, exponent: Node) {
  return binop("Exponent", base, exponent);
}

function square(node: Node) {
  return power(node, number(2));
}
