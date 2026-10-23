/**
 * A formula for T, turned into a JavaScript function once.
 *
 * The redraw route, the grid and the probe evaluate T thousands of times a
 * frame: every crossing of the grid, every halving of every redrawn segment.
 * Walking the syntax tree for each of those re-reads every node's type and
 * re-dispatches on it; a tree of closures does that work once, when T is
 * typed, and leaves each evaluation a chain of plain calls.
 *
 * It means exactly what `evaluate` means — the same functions, the same NaN
 * for anything undefined — because anything it does not compile itself is
 * handed to `evaluate` whole. A unit test holds the two to the same answers.
 */
import { FUNCTIONS, evaluate } from "../../../symbolic/evaluate";
import type { Node } from "../../../symbolic/tree";

export type Compiled = (bindings: Record<string, number>) => number;

export function compileNode(node: Node): Compiled {
  switch (node.type) {
    case "Constant": {
      const { value } = node;
      return () => value;
    }
    case "Identifier": {
      const name = node.symbol;
      if (name === "pi") return () => Math.PI;
      if (name === "e") return () => Math.E;
      return (b) => b[name] ?? NaN;
    }
    case "Negative": {
      const arg = compileNode(node.arg);
      return (b) => -arg(b);
    }
    case "FunctionCall": {
      const fn = FUNCTIONS[node.callee.symbol];
      if (fn === undefined || node.args.length !== 1) return () => NaN;
      const arg = compileNode(node.args[0]);
      return (b) => fn(arg(b));
    }
    case "BinaryOperator": {
      const left = compileNode(node.left);
      const right = compileNode(node.right);
      switch (node.name) {
        case "Add":
          return (b) => left(b) + right(b);
        case "Subtract":
          return (b) => left(b) - right(b);
        case "Multiply":
        case "CrossMultiply":
          return (b) => left(b) * right(b);
        case "Divide":
          return (b) => left(b) / right(b);
        case "Exponent":
          return (b) => Math.pow(left(b), right(b));
      }
      return () => NaN;
    }
    default:
      // Piecewise, sums, factorials: rare in a map, and exactly what
      // `evaluate` already does.
      return (b) => evaluate(node, b);
  }
}
