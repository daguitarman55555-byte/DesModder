/**
 * Compiles the subset of Desmos LaTeX that a vector-field component can
 * realistically use into a GLSL ES 3.00 expression over `vec2 p`.
 *
 * This exists because the flow visualizer evaluates the field on the GPU, tens
 * of thousands of times per frame; it cannot call back into Desmos's evaluator.
 * Anything outside the subset is reported by name so the panel can explain
 * exactly which piece it could not translate, rather than silently drawing a
 * field that is not the one in the expression list.
 */

export type CompileResult =
  | { ok: true; glsl: string }
  | { ok: false; error: string };

/** Emitted once per shader; every compiled expression may reference these. */
export const GLSL_PRELUDE = `
float vtPow(float base, float power) {
  if (base > 0.0) return exp(power * log(base));
  if (base == 0.0) return power == 0.0 ? 1.0 : 0.0;
  // Negative bases are only real for integral powers.
  float rounded = floor(power + 0.5);
  if (abs(power - rounded) > 1e-6) return 0.0;
  float magnitude = exp(power * log(-base));
  return mod(abs(rounded), 2.0) < 0.5 ? magnitude : -magnitude;
}
float vtDiv(float a, float b) { return a / (abs(b) < 1e-12 ? (b < 0.0 ? -1e-12 : 1e-12) : b); }
float vtCot(float a) { return cos(a) / (abs(sin(a)) < 1e-12 ? 1e-12 : sin(a)); }
float vtSec(float a) { return 1.0 / (abs(cos(a)) < 1e-12 ? 1e-12 : cos(a)); }
float vtCsc(float a) { return 1.0 / (abs(sin(a)) < 1e-12 ? 1e-12 : sin(a)); }
float vtLog10(float a) { return log(a) / log(10.0); }
float vtMod(float a, float b) { return b == 0.0 ? 0.0 : mod(a, b); }
`;

const PI = "3.1415926535897932";

interface FunctionSpec {
  /** Accepted argument counts. */
  arity: readonly number[];
  emit: (args: string[]) => string;
}

const FUNCTIONS: Record<string, FunctionSpec> = {
  sin: { arity: [1], emit: ([a]) => `sin(${a})` },
  cos: { arity: [1], emit: ([a]) => `cos(${a})` },
  tan: { arity: [1], emit: ([a]) => `tan(${a})` },
  cot: { arity: [1], emit: ([a]) => `vtCot(${a})` },
  sec: { arity: [1], emit: ([a]) => `vtSec(${a})` },
  csc: { arity: [1], emit: ([a]) => `vtCsc(${a})` },
  arcsin: { arity: [1], emit: ([a]) => `asin(clamp(${a}, -1.0, 1.0))` },
  arccos: { arity: [1], emit: ([a]) => `acos(clamp(${a}, -1.0, 1.0))` },
  // Desmos's two-argument arctan is arctan(y, x), matching GLSL's atan(y, x).
  arctan: {
    arity: [1, 2],
    emit: (args) =>
      args.length === 1 ? `atan(${args[0]})` : `atan(${args[0]}, ${args[1]})`,
  },
  sinh: { arity: [1], emit: ([a]) => `sinh(${a})` },
  cosh: { arity: [1], emit: ([a]) => `cosh(${a})` },
  tanh: { arity: [1], emit: ([a]) => `tanh(${a})` },
  exp: { arity: [1], emit: ([a]) => `exp(${a})` },
  ln: { arity: [1], emit: ([a]) => `log(max(${a}, 1e-12))` },
  log: { arity: [1], emit: ([a]) => `vtLog10(max(${a}, 1e-12))` },
  sqrt: { arity: [1], emit: ([a]) => `sqrt(max(${a}, 0.0))` },
  abs: { arity: [1], emit: ([a]) => `abs(${a})` },
  sign: { arity: [1], emit: ([a]) => `sign(${a})` },
  floor: { arity: [1], emit: ([a]) => `floor(${a})` },
  ceil: { arity: [1], emit: ([a]) => `ceil(${a})` },
  round: { arity: [1], emit: ([a]) => `floor(${a} + 0.5)` },
  mod: { arity: [2], emit: ([a, b]) => `vtMod(${a}, ${b})` },
  min: { arity: [1, 2, 3, 4], emit: naryEmit("min") },
  max: { arity: [1, 2, 3, 4], emit: naryEmit("max") },
};

function naryEmit(name: string) {
  return (args: string[]) =>
    args.length === 1 ? args[0] : args.reduce((a, b) => `${name}(${a}, ${b})`);
}

export function compileFieldComponentToGLSL(latex: string): CompileResult {
  try {
    const tokens = tokenize(latex);
    const parser = new Parser(tokens);
    const glsl = parser.parseExpression();
    parser.expectEnd();
    return { ok: true, glsl };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof CompileError
          ? error.message
          : "Could not read this expression.",
    };
  }
}

class CompileError extends Error {}

type Token =
  | { kind: "number"; value: string }
  | { kind: "variable"; value: string }
  | { kind: "function"; value: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | {
      kind:
        | "open"
        | "close"
        | "openBrace"
        | "closeBrace"
        | "openBracket"
        | "closeBracket";
    }
  | { kind: "bar" }
  | { kind: "comma" }
  | { kind: "frac" | "sqrt" };

const COMMAND_ALIASES: Record<string, string> = {
  cdot: "*",
  times: "*",
  div: "/",
};

function tokenize(latex: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const pushBar = () => tokens.push({ kind: "bar" });

  while (i < latex.length) {
    const char = latex[i];
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    if (/[\d.]/.test(char)) {
      const match = /^\d*\.?\d+|^\d+\./.exec(latex.slice(i));
      if (match === null)
        throw new CompileError(
          `Could not read the number near "${latex.slice(i, i + 8)}".`
        );
      tokens.push({ kind: "number", value: match[0] });
      i += match[0].length;
      continue;
    }
    if (char === "\\") {
      const nameMatch = /^\\([A-Za-z]+)/.exec(latex.slice(i));
      if (nameMatch === null) {
        // `\ ` is MathQuill's escaped space, and `\{`/`\}` are literal braces.
        if (latex[i + 1] === " ") {
          i += 2;
          continue;
        }
        throw new CompileError(`"${latex.slice(i, i + 2)}" is not supported.`);
      }
      const [command, name] = nameMatch;
      i += command.length;
      if (name === "left" || name === "right") {
        const delimiter = latex[i];
        i++;
        if (delimiter === "(")
          tokens.push({ kind: name === "left" ? "open" : "close" });
        else if (delimiter === ")")
          tokens.push({ kind: name === "left" ? "open" : "close" });
        else if (delimiter === "|") pushBar();
        else if (delimiter === "\\") {
          // \left\{ ... \right\} — restrictions and piecewises are not supported.
          throw new CompileError(
            "Piecewise and restriction braces are not supported."
          );
        } else
          throw new CompileError(
            `The "${delimiter}" bracket is not supported.`
          );
        continue;
      }
      if (name === "operatorname") {
        const opMatch = /^\{([A-Za-z]+)\}/.exec(latex.slice(i));
        if (opMatch === null)
          throw new CompileError("Could not read an operator name.");
        i += opMatch[0].length;
        tokens.push({ kind: "function", value: opMatch[1] });
        continue;
      }
      if (name === "frac" || name === "dfrac" || name === "tfrac") {
        tokens.push({ kind: "frac" });
        continue;
      }
      if (name === "sqrt") {
        tokens.push({ kind: "sqrt" });
        continue;
      }
      if (name === "pi") {
        tokens.push({ kind: "number", value: PI });
        continue;
      }
      if (name === "tau") {
        tokens.push({ kind: "number", value: `(2.0*${PI})` });
        continue;
      }
      if (name in COMMAND_ALIASES) {
        tokens.push({ kind: "op", value: COMMAND_ALIASES[name] as "*" | "/" });
        continue;
      }
      if (name in FUNCTIONS) {
        tokens.push({ kind: "function", value: name });
        continue;
      }
      throw new CompileError(
        `\\${name} is not supported by the flow visualizer.`
      );
    }
    if (/[A-Za-z]/.test(char)) {
      // Reject subscripted identifiers: they refer to other expressions that
      // the GPU shader has no way to resolve.
      if (latex[i + 1] === "_") {
        throw new CompileError(
          `The variable "${char}_..." refers to another expression, which the flow visualizer cannot evaluate.`
        );
      }
      tokens.push({ kind: "variable", value: char });
      i++;
      continue;
    }
    i++;
    switch (char) {
      case "(":
        tokens.push({ kind: "open" });
        continue;
      case ")":
        tokens.push({ kind: "close" });
        continue;
      case "{":
        tokens.push({ kind: "openBrace" });
        continue;
      case "}":
        tokens.push({ kind: "closeBrace" });
        continue;
      case "[":
        tokens.push({ kind: "openBracket" });
        continue;
      case "]":
        tokens.push({ kind: "closeBracket" });
        continue;
      case "|":
        pushBar();
        continue;
      case ",":
        tokens.push({ kind: "comma" });
        continue;
      case "+":
      case "-":
      case "*":
      case "/":
      case "^":
        tokens.push({ kind: "op", value: char });
        continue;
      case "=":
        throw new CompileError(
          "A field component must be an expression, not an equation."
        );
      default:
        throw new CompileError(`"${char}" is not supported.`);
    }
  }
  return tokens;
}

class Parser {
  private index = 0;
  /**
   * `|` opens and closes absolute value with the same character, so an inner
   * bar must be read as "close" rather than as the start of another factor.
   */
  private barDepth = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  expectEnd() {
    if (this.index < this.tokens.length) {
      throw new CompileError("There is leftover input after the expression.");
    }
  }

  parseExpression(): string {
    let left = this.parseTerm();
    for (;;) {
      const token = this.peek();
      if (token?.kind !== "op" || (token.value !== "+" && token.value !== "-"))
        break;
      this.index++;
      const right = this.parseTerm();
      left = `(${left} ${token.value} ${right})`;
    }
    return left;
  }

  private parseTerm(): string {
    let left = this.parseUnary();
    for (;;) {
      const token = this.peek();
      if (
        token?.kind === "op" &&
        (token.value === "*" || token.value === "/")
      ) {
        this.index++;
        const right = this.parseUnary();
        left =
          token.value === "*"
            ? `(${left} * ${right})`
            : `vtDiv(${left}, ${right})`;
        continue;
      }
      if (this.startsPrimary(token)) {
        const right = this.parseUnary();
        left = `(${left} * ${right})`;
        continue;
      }
      break;
    }
    return left;
  }

  private parseUnary(): string {
    const token = this.peek();
    if (token?.kind === "op" && token.value === "-") {
      this.index++;
      return `(-${this.parseUnary()})`;
    }
    if (token?.kind === "op" && token.value === "+") {
      this.index++;
      return this.parseUnary();
    }
    return this.parsePower();
  }

  private parsePower(): string {
    const base = this.parsePrimary();
    const token = this.peek();
    if (token?.kind === "op" && token.value === "^") {
      this.index++;
      // Exponents bind right-to-left, and a unary minus is allowed: x^{-2}.
      const exponent = this.parseGroupOrAtom();
      return powerGLSL(base, exponent);
    }
    return base;
  }

  /** A braced group `{...}`, or a single atom for shorthand like `x^2`. */
  private parseGroupOrAtom(): string {
    const token = this.peek();
    if (token?.kind === "openBrace") {
      this.index++;
      const inner = this.parseExpression();
      this.expect("closeBrace", "a closing }");
      return inner;
    }
    if (token?.kind === "op" && token.value === "-") {
      this.index++;
      return `(-${this.parseGroupOrAtom()})`;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): string {
    const token = this.peek();
    if (token === undefined)
      throw new CompileError("The expression ends too early.");

    switch (token.kind) {
      case "number":
        this.index++;
        return glslFloat(token.value);
      case "variable":
        this.index++;
        return variableToGLSL(token.value);
      case "open": {
        this.index++;
        const inner = this.parseExpression();
        this.expect("close", "a closing parenthesis");
        return `(${inner})`;
      }
      case "openBrace": {
        this.index++;
        const inner = this.parseExpression();
        this.expect("closeBrace", "a closing }");
        return `(${inner})`;
      }
      case "bar": {
        this.index++;
        this.barDepth++;
        const inner = this.parseExpression();
        this.barDepth--;
        this.expect("bar", "a closing |");
        return `abs(${inner})`;
      }
      case "frac": {
        this.index++;
        const numerator = this.parseBracedGroup();
        const denominator = this.parseBracedGroup();
        return `vtDiv(${numerator}, ${denominator})`;
      }
      case "sqrt": {
        this.index++;
        if (this.peek()?.kind === "openBracket") {
          this.index++;
          const degree = this.parseExpression();
          this.expect("closeBracket", "a closing ]");
          const radicand = this.parseBracedGroup();
          return `vtPow(${radicand}, vtDiv(1.0, ${degree}))`;
        }
        return `sqrt(max(${this.parseBracedGroup()}, 0.0))`;
      }
      case "function": {
        this.index++;
        return this.parseFunctionCall(token.value);
      }
      default:
        throw new CompileError(
          "The expression has a bracket or symbol in an unexpected place."
        );
    }
  }

  private parseFunctionCall(name: string): string {
    const spec = FUNCTIONS[name];
    if (spec === undefined) {
      throw new CompileError(
        `The function "${name}" is not supported by the flow visualizer.`
      );
    }
    let args: string[];
    if (this.peek()?.kind === "open") {
      this.index++;
      args = [this.parseExpression()];
      while (this.peek()?.kind === "comma") {
        this.index++;
        args.push(this.parseExpression());
      }
      this.expect("close", "a closing parenthesis");
    } else {
      // Desmos allows `\sin x`; the bare argument binds as tightly as a power.
      args = [this.parsePower()];
    }
    if (!spec.arity.includes(args.length)) {
      throw new CompileError(
        `"${name}" cannot take ${args.length} argument${args.length === 1 ? "" : "s"}.`
      );
    }
    return spec.emit(args);
  }

  private parseBracedGroup(): string {
    if (this.peek()?.kind !== "openBrace") {
      throw new CompileError("Expected a braced group.");
    }
    this.index++;
    const inner = this.parseExpression();
    this.expect("closeBrace", "a closing }");
    return `(${inner})`;
  }

  private startsPrimary(token: Token | undefined) {
    if (token === undefined) return false;
    if (token.kind === "bar") return this.barDepth === 0;
    return (
      token.kind === "number" ||
      token.kind === "variable" ||
      token.kind === "open" ||
      token.kind === "frac" ||
      token.kind === "sqrt" ||
      token.kind === "function"
    );
  }

  private expect(kind: Token["kind"], description: string) {
    if (this.peek()?.kind !== kind) {
      throw new CompileError(`Expected ${description}.`);
    }
    this.index++;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }
}

/**
 * `x^2 + y^2` is by far the most common thing a field component does, and
 * `vtPow` costs an exp/log pair. Small integer powers become plain products.
 */
function powerGLSL(base: string, exponent: string) {
  const literal = /^\(?-?\d+\.\d+\)?$/.test(exponent)
    ? Number(exponent.replace(/[()]/g, ""))
    : NaN;
  if (literal === 0) return "1.0";
  // Only inline short bases; repeating a long subexpression would cost more
  // than the exp/log pair it saves.
  if (
    Number.isInteger(literal) &&
    literal >= -4 &&
    literal <= 4 &&
    base.length <= 24
  ) {
    const positive = Math.abs(literal);
    const product =
      positive === 1
        ? base
        : `(${Array.from({ length: positive }, () => base).join(" * ")})`;
    return literal > 0 ? product : `vtDiv(1.0, ${product})`;
  }
  return `vtPow(${base}, ${exponent})`;
}

function variableToGLSL(name: string) {
  switch (name) {
    case "x":
      return "p.x";
    case "y":
      return "p.y";
    case "e":
      return "2.7182818284590452";
    default:
      throw new CompileError(
        `"${name}" is not a coordinate. The flow visualizer only knows x and y.`
      );
  }
}

function glslFloat(value: string) {
  if (value.startsWith("(")) return value;
  return value.includes(".") ? value : `${value}.0`;
}
