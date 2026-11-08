/**
 * Compiles the subset of Desmos LaTeX that a vector-field component can
 * realistically use into a GLSL ES 3.00 expression over `vec2 p` — or `vec3 p`
 * for a field on Desmos 3D, see `FieldEnvironment.dimensions`.
 *
 * This exists because the flow visualizer evaluates the field on the GPU, tens
 * of thousands of times per frame; it cannot call back into Desmos's evaluator.
 * Anything outside the subset is reported by name so the panel can explain
 * exactly which piece it could not translate, rather than silently drawing a
 * field that is not the one in the expression list.
 */

import { canonicalIdentifier, IDENTIFIER_SOURCE } from "./identifiers";

/** A single-expression definition read out of the expression list. */
export interface FunctionDefinition {
  /** Canonical parameter names, in order. */
  params: readonly string[];
  /** The right-hand side, as LaTeX. */
  latex: string;
}

/**
 * What a field component may reference beyond `x`, `y` and `e`.
 *
 * The shader cannot call back into Desmos, so anything the expression list
 * defines has to be carried across the boundary before compiling: a function
 * arrives as the LaTeX of its body and is compiled into a GLSL function
 * alongside the field, and a named value arrives as a name alone and becomes a
 * uniform. The value itself deliberately does not appear here — see
 * `CompileResult.params`.
 */
export interface FieldEnvironment {
  functions: ReadonlyMap<string, FunctionDefinition>;
  scalars: ReadonlySet<string>;
  /**
   * What to tell someone who used a name this environment does not have.
   *
   * The default answer names the expression list, because that is where Vector
   * Tools' and Physics Lab's fields get their values from. Audio Lab's do not —
   * its environment is a fixed list of measurements and it deliberately never
   * reads the graph — so pointing someone at the expression list would send
   * them to define a variable that could not possibly be found.
   */
  unknownNameHint?: string;
  /**
   * Whether `z` is a coordinate, and so whether the point is a `vec3 p`.
   *
   * Only Desmos 3D has a z, so it is opt-in: on the 2D graph paper `z` is an
   * ordinary name that the expression list may or may not define, and every
   * 2D caller keeps compiling exactly what it did. In 3D, z is a coordinate
   * the way x and y are, and helpers take `vec3 p` so a definition may read it.
   */
  dimensions?: 2 | 3;
}

export const EMPTY_ENVIRONMENT: FieldEnvironment = {
  functions: new Map(),
  scalars: new Set(),
};

/** A GLSL function compiled from an expression-list definition. */
export interface CompiledHelper {
  /** The Desmos name, so two components can merge helpers without duplicates. */
  name: string;
  glsl: string;
}

export type CompileResult =
  | {
      ok: true;
      glsl: string;
      /** Dependencies first, so the shader can emit them in this order. */
      helpers: readonly CompiledHelper[];
      /**
       * The named values the expression read, as Desmos names.
       *
       * These become uniforms rather than baked-in literals so that dragging a
       * slider uploads a float instead of recompiling and relinking the two
       * shader programs — the same reason `setField` compares fields before
       * rebuilding.
       */
      params: readonly string[];
      /**
       * Whether the expression read the clock, and so whether anything drawing
       * it has to keep drawing rather than settle into a still picture.
       */
      usesTime: boolean;
    }
  | { ok: false; error: string };

/**
 * How deep a chain of definitions may go before this gives up.
 *
 * A chain that long is far more likely to be a mistake than an intent, and the
 * limit is what stops a pathological graph from expanding into a shader no
 * driver will compile.
 */
const MAX_DEFINITION_DEPTH = 12;

const glslIdentifier = (name: string) => name.replace(/[^A-Za-z0-9]/g, "_");

/** One grammar for what a name is, shared with the scanner and the generator. */
const IDENTIFIER_AT_START = new RegExp(`^${IDENTIFIER_SOURCE}`);

export { canonicalIdentifier } from "./identifiers";

/**
 * The letter that means the animation clock, and the uniform behind it.
 *
 * `t` only because that is what a person writes. It is not reserved: a graph
 * that defines `t` as a slider keeps that meaning, and the compiler falls
 * through to the ordinary lookup — see `variableToGLSL`.
 */
export const TIME_NAME = "t";
const GLSL_TIME = "u_time";

/** A referenced value, as a uniform. Desmos names cannot collide once flattened. */
export const glslParamName = (name: string) => `u_vp_${glslIdentifier(name)}`;
const glslFunctionName = (name: string) => `vtu_${glslIdentifier(name)}`;
const glslLocalName = (name: string) => `vl_${glslIdentifier(name)}`;

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
// What a piecewise with no branch that holds is: undefined. The field reads
// a non-finite component as no arrow at all, which is what Desmos draws.
float vtUndefined() { return uintBitsToFloat(0x7fc00000u); }
float vtCoth(float a) { float t = tanh(a); return 1.0 / (abs(t) < 1e-12 ? 1e-12 : t); }
float vtCsch(float a) { float s = sinh(a); return 1.0 / (abs(s) < 1e-12 ? 1e-12 : s); }
// The gamma function, for Desmos's factorial: z! is gamma(z + 1) at every z,
// not only whole ones. Stirling's series after shifting z up past 8, where its
// next term is below float precision, rather than Lanczos: Lanczos sums
// coefficients of alternating sign in the hundreds and keeps three or four
// digits in single precision; this sums nothing that cancels.
float vtGammaShifted(float z) {
  float shift = 1.0;
  while (z < 8.0) { shift *= z; z += 1.0; }
  float inv = 1.0 / z;
  float inv2 = inv * inv;
  float lg = (z - 0.5) * log(z) - z + 0.91893853320467274
    + inv * (1.0 / 12.0 - inv2 * (1.0 / 360.0 - inv2 / 1260.0));
  return exp(lg) / shift;
}
float vtGamma(float z) {
  // The poles: Desmos's (-1)! is undefined, not infinite.
  if (z <= 0.0 && z == floor(z)) return vtUndefined();
  if (z < 0.5) return 3.1415926535897932 / (sin(3.1415926535897932 * z) * vtGammaShifted(1.0 - z));
  return vtGammaShifted(z);
}
// erf by Abramowitz and Stegun 7.1.26: within 1.5e-7, below float precision
// for every value a field is drawn from.
float vtErf(float x) {
  float s = sign(x);
  x = abs(x);
  float t = 1.0 / (1.0 + 0.3275911 * x);
  float poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return s * (1.0 - poly * exp(-x * x));
}
// gcd and lcm of whole numbers, as Desmos takes them: rounded, made positive.
// Euclid needs at most about 46 steps below 2^32; 64 covers every float.
float vtGcd(float a, float b) {
  a = abs(floor(a + 0.5));
  b = abs(floor(b + 0.5));
  for (int i = 0; i < 64; i++) {
    if (b < 0.5) break;
    float r = mod(a, b);
    a = b;
    b = r;
  }
  return a;
}
float vtLcm(float a, float b) {
  float g = vtGcd(a, b);
  return g < 0.5 ? 0.0 : abs(floor(a + 0.5) * floor(b + 0.5)) / g;
}
// nCr and nPr: a running product for whole numbers, exact while the result
// fits a float and with no gamma rounding; gamma between them, as Desmos does.
float vtNCr(float n, float r) {
  if (n == floor(n) && r == floor(r)) {
    if (r < 0.0 || (n >= 0.0 && r > n)) return 0.0;
    float k = n >= 0.0 ? min(r, n - r) : r;
    float acc = 1.0;
    for (int i = 0; i < 1024; i++) {
      if (float(i) >= k) break;
      acc *= (n - float(i)) / (float(i) + 1.0);
    }
    return floor(acc + 0.5);
  }
  return vtGamma(n + 1.0) / (vtGamma(r + 1.0) * vtGamma(n - r + 1.0));
}
float vtNPr(float n, float r) {
  if (n == floor(n) && r == floor(r) && r >= 0.0) {
    if (n >= 0.0 && r > n) return 0.0;
    float acc = 1.0;
    for (int i = 0; i < 1024; i++) {
      if (float(i) >= r) break;
      acc *= n - float(i);
    }
    return acc;
  }
  return vtGamma(n + 1.0) / vtGamma(n - r + 1.0);
}
`;

const PI = "3.1415926535897932";

interface FunctionSpec {
  /** Accepted argument counts, or "any" for one or more (a list's worth). */
  arity: readonly number[] | "any";
  emit: (args: string[]) => string;
}

/** Desmos's inverse for `f^{-1}`: `\sin^{-1}x` is arcsin x (measured 2026-11-07). */
const INVERSES: Record<string, string> = {
  sin: "arcsin",
  cos: "arccos",
  tan: "arctan",
  cot: "arccot",
  sec: "arcsec",
  csc: "arccsc",
  sinh: "arcsinh",
  cosh: "arccosh",
  tanh: "arctanh",
  coth: "arccoth",
  sech: "arcsech",
  csch: "arccsch",
};

/**
 * Functions that read a list: given `\left[…\right]` or several arguments,
 * they take every element. In a shader a list is its elements, written out.
 */
export const LIST_FUNCTIONS = new Set([
  "total",
  "mean",
  "length",
  "min",
  "max",
  "median",
  "stdev",
  "stddev",
  "stdevp",
  "stddevp",
  "var",
  "variance",
  "varp",
  "mad",
  "gcd",
  "lcm",
]);

/** The sum of GLSL terms, bracketed. */
const sumOf = (args: readonly string[]) => `(${args.join(" + ")})`;
const meanOf = (args: readonly string[]) =>
  `(${sumOf(args)} / ${args.length}.0)`;
/** Σ(a − mean)², each term against one shared mean. */
const squaredDeviations = (args: readonly string[]) => {
  const mean = meanOf(args);
  return `(${args.map((a) => `vtPow((${a}) - ${mean}, 2.0)`).join(" + ")})`;
};
/**
 * The median of a fixed number of values: a sorting network written out, so
 * no array and no loop. Fine for the handful of elements a formula lists.
 */
function medianOf(args: readonly string[]): string {
  if (args.length === 1) return args[0];
  if (args.length === 2) return `((${args[0]} + ${args[1]}) / 2.0)`;
  // The median is the value with as many below it as above: written as a
  // sum of each value weighted by whether it is the middle one. Ties are
  // broken by position, so equal values still give one median.
  const n = args.length;
  const rank = (i: number) =>
    args
      .map((b, j) =>
        j === i
          ? ""
          : j < i
            ? `step(${b}, ${args[i]})`
            : `(1.0 - step(${args[i]}, ${b}))`
      )
      .filter((s) => s !== "")
      .join(" + ");
  const pick = (k: number) =>
    `(${args.map((a, i) => `(${a}) * (1.0 - step(0.5, abs((${rank(i)}) - ${k}.0)))`).join(" + ")})`;
  return n % 2 === 1
    ? pick((n - 1) / 2)
    : `((${pick(n / 2 - 1)} + ${pick(n / 2)}) / 2.0)`;
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
  // Desmos's arccot is π/2 − arctan, continuous through 0, not arctan(1/x).
  arccot: {
    arity: [1],
    emit: ([a]) => `(${PI} / 2.0 - atan(${a}))`,
  },
  arcsec: {
    arity: [1],
    emit: ([a]) => `acos(clamp(vtDiv(1.0, ${a}), -1.0, 1.0))`,
  },
  arccsc: {
    arity: [1],
    emit: ([a]) => `asin(clamp(vtDiv(1.0, ${a}), -1.0, 1.0))`,
  },
  sinh: { arity: [1], emit: ([a]) => `sinh(${a})` },
  cosh: { arity: [1], emit: ([a]) => `cosh(${a})` },
  tanh: { arity: [1], emit: ([a]) => `tanh(${a})` },
  coth: { arity: [1], emit: ([a]) => `vtCoth(${a})` },
  sech: { arity: [1], emit: ([a]) => `(1.0 / cosh(${a}))` },
  csch: { arity: [1], emit: ([a]) => `vtCsch(${a})` },
  arcsinh: { arity: [1], emit: ([a]) => `asinh(${a})` },
  arccosh: { arity: [1], emit: ([a]) => `acosh(max(${a}, 1.0))` },
  arctanh: {
    arity: [1],
    emit: ([a]) => `atanh(clamp(${a}, -0.999999, 0.999999))`,
  },
  arccsch: { arity: [1], emit: ([a]) => `asinh(vtDiv(1.0, ${a}))` },
  arcsech: { arity: [1], emit: ([a]) => `acosh(max(vtDiv(1.0, ${a}), 1.0))` },
  arccoth: {
    arity: [1],
    emit: ([a]) => `atanh(clamp(vtDiv(1.0, ${a}), -0.999999, 0.999999))`,
  },
  exp: { arity: [1], emit: ([a]) => `exp(${a})` },
  ln: { arity: [1], emit: ([a]) => `log(max(${a}, 1e-12))` },
  log: { arity: [1], emit: ([a]) => `vtLog10(max(${a}, 1e-12))` },
  /** `\log_{b}(a)`, rewritten by `rewriteLatexSugar` with the base first. */
  logbase: {
    arity: [2],
    emit: ([b, a]) => `vtDiv(log(max(${a}, 1e-12)), log(max(${b}, 1e-12)))`,
  },
  sqrt: { arity: [1], emit: ([a]) => `sqrt(max(${a}, 0.0))` },
  abs: { arity: [1], emit: ([a]) => `abs(${a})` },
  sign: { arity: [1], emit: ([a]) => `sign(${a})` },
  sgn: { arity: [1], emit: ([a]) => `sign(${a})` },
  floor: { arity: [1], emit: ([a]) => `floor(${a})` },
  ceil: { arity: [1], emit: ([a]) => `ceil(${a})` },
  // round(x, n) is x to n decimal places.
  round: {
    arity: [1, 2],
    emit: ([a, n]) =>
      n === undefined
        ? `floor(${a} + 0.5)`
        : `(floor(${a} * vtPow(10.0, floor(${n} + 0.5)) + 0.5) / vtPow(10.0, floor(${n} + 0.5)))`,
  },
  mod: { arity: [2], emit: ([a, b]) => `vtMod(${a}, ${b})` },
  erf: { arity: [1], emit: ([a]) => `vtErf(${a})` },
  nCr: { arity: [2], emit: ([n, r]) => `vtNCr(${n}, ${r})` },
  nPr: { arity: [2], emit: ([n, r]) => `vtNPr(${n}, ${r})` },
  gcd: { arity: "any", emit: naryEmit("vtGcd") },
  lcm: { arity: "any", emit: naryEmit("vtLcm") },
  min: { arity: "any", emit: naryEmit("min") },
  max: { arity: "any", emit: naryEmit("max") },
  total: { arity: "any", emit: sumOf },
  mean: { arity: "any", emit: meanOf },
  length: { arity: "any", emit: (args) => `${args.length}.0` },
  median: { arity: "any", emit: medianOf },
  // Desmos's stdev and var are the sample's (n − 1); the p forms divide by n.
  stdev: {
    arity: "any",
    emit: (args) =>
      args.length < 2
        ? "vtUndefined()"
        : `sqrt(${squaredDeviations(args)} / ${args.length - 1}.0)`,
  },
  stdevp: {
    arity: "any",
    emit: (args) => `sqrt(${squaredDeviations(args)} / ${args.length}.0)`,
  },
  var: {
    arity: "any",
    emit: (args) =>
      args.length < 2
        ? "vtUndefined()"
        : `(${squaredDeviations(args)} / ${args.length - 1}.0)`,
  },
  varp: {
    arity: "any",
    emit: (args) => `(${squaredDeviations(args)} / ${args.length}.0)`,
  },
  mad: {
    arity: "any",
    emit: (args) =>
      `(${args.map((a) => `abs((${a}) - ${meanOf(args)})`).join(" + ")}) / ${args.length}.0`,
  },
};
/**
 * A builtin's GLSL from already-compiled arguments, for the strict compiler
 * (`sim/strictGLSL.ts`), so the two cannot disagree about a list function or
 * nCr. It needs `GLSL_PRELUDE`'s helpers, which the strict prelude includes.
 */
export function emitBuiltinGLSL(name: string, args: string[]): string {
  return FUNCTIONS[name].emit(args);
}

// Desmos's other spellings of the same functions.
FUNCTIONS.arsinh = FUNCTIONS.arcsinh;
FUNCTIONS.arcosh = FUNCTIONS.arccosh;
FUNCTIONS.artanh = FUNCTIONS.arctanh;
FUNCTIONS.arcsch = FUNCTIONS.arccsch;
FUNCTIONS.arsech = FUNCTIONS.arcsech;
FUNCTIONS.arcoth = FUNCTIONS.arccoth;
FUNCTIONS.stddev = FUNCTIONS.stdev;
FUNCTIONS.stddevp = FUNCTIONS.stdevp;
FUNCTIONS.variance = FUNCTIONS.var;

/**
 * Why a function Desmos knows cannot draw a field, where there is a reason
 * better than "not supported": the field is real numbers at a point.
 */
export function unsupportedFunction(name: string): string {
  if (["real", "imag", "conj", "arg"].includes(name))
    return `"${name}" works on complex numbers, and a field's components are real. Write the real part out in x and y.`;
  if (name === "random")
    return `"random" gives a new value each time Desmos evaluates it, so a field drawn from it could never hold still.`;
  if (["distance", "midpoint", "polygon", "area", "perimeter"].includes(name))
    return `"${name}" works on points and shapes; a field component is one number. Write it from coordinates, e.g. \\sqrt{x^{2}+y^{2}}.`;
  if (["sort", "shuffle", "join", "unique"].includes(name))
    return `"${name}" makes a new list; a field component is one number. Use total, mean, min, max or median of the list instead.`;
  return `The function "${name}" is not supported by the flow visualizer.`;
}

function naryEmit(name: string) {
  return (args: string[]) =>
    args.length === 1 ? args[0] : args.reduce((a, b) => `${name}(${a}, ${b})`);
}

export function compileFieldComponentToGLSL(
  latex: string,
  env: FieldEnvironment = EMPTY_ENVIRONMENT
): CompileResult {
  try {
    const context = new CompileContext(env);
    const parser = new Parser(tokenize(latex), context, new Map());
    const glsl = parser.parseExpression();
    parser.expectEnd();
    return {
      ok: true,
      glsl,
      helpers: context.helpers,
      params: [...context.params],
      usesTime: context.usesTime,
    };
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

/**
 * Exported for the strict geometry compiler (`sim/strictParse.ts`), which reads
 * the same LaTeX through the same tokenizer so that the two can never disagree
 * about what was typed, only about what it means.
 */
export class CompileError extends Error {}

/**
 * What one compilation accumulates: the helper functions it had to build, and
 * the named values it read.
 *
 * A referenced function becomes a real GLSL function rather than being inlined
 * at the call site, because a body that uses its argument more than once would
 * otherwise duplicate the whole argument expression each time, and a chain of
 * such calls multiplies. Compiling it once also means the shader reads the way
 * the graph does.
 */
class CompileContext {
  readonly params = new Set<string>();
  /** Set by `variableToGLSL` when anything, at any depth, read the clock. */
  usesTime = false;
  readonly helpers: CompiledHelper[] = [];
  private readonly compiled = new Map<string, string>();
  private readonly expanding: string[] = [];

  constructor(readonly env: FieldEnvironment) {}

  /** The GLSL function for a definition, compiling it the first time it is used. */
  declare(name: string, definition: FunctionDefinition): string {
    const already = this.compiled.get(name);
    if (already !== undefined) return already;
    if (this.expanding.includes(name)) {
      throw new CompileError(
        `"${name}" is defined in terms of itself, and a shader cannot evaluate a recursive definition.`
      );
    }
    if (this.expanding.length >= MAX_DEFINITION_DEPTH) {
      throw new CompileError(
        `Definitions starting at "${name}" nest more than ${MAX_DEFINITION_DEPTH} deep.`
      );
    }
    this.expanding.push(name);
    const scope = new Map(
      definition.params.map((param) => [param, glslLocalName(param)] as const)
    );
    const parser = new Parser(tokenize(definition.latex), this, scope);
    const body = parser.parseExpression();
    parser.expectEnd();
    this.expanding.pop();

    // `p` is passed to every helper whether it reads a coordinate or not, so a
    // definition is free to mention x and y without the caller knowing whether
    // it does. Registered only now, after its own body compiled, so anything it
    // called is already ahead of it and the shader can emit them in order.
    const glslName = glslFunctionName(name);
    const signature = [
      this.env.dimensions === 3 ? "vec3 p" : "vec2 p",
      ...definition.params.map((param) => `float ${glslLocalName(param)}`),
    ].join(", ");
    this.helpers.push({
      name,
      glsl: `float ${glslName}(${signature}) { return ${body}; }`,
    });
    this.compiled.set(name, glslName);
    return glslName;
  }

  /**
   * The helper that evaluates one sum or product, named after its own text.
   *
   * P and Q are compiled separately and their helpers merged by name, so a
   * name has to mean one body: a counter would give P's first sum and Q's
   * first sum the same name and the merge would silently keep only one.
   */
  declareRepeated(
    kind: "sum" | "prod",
    term: string,
    index: string,
    outer: readonly string[]
  ): string {
    const params = [
      this.env.dimensions === 3 ? "vec3 p" : "vec2 p",
      ...outer.map((glsl) => `float ${glsl}`),
      "float vtLo",
      "float vtHi",
    ].join(", ");
    const [start, op] = kind === "sum" ? ["0.0", "+="] : ["1.0", "*="];
    const body =
      `{ float vtAcc = ${start}; ` +
      `for (float vtK = floor(vtLo + 0.5); vtK <= floor(vtHi + 0.5); vtK += 1.0) ` +
      `{ float ${index} = vtK; vtAcc ${op} ${term}; } return vtAcc; }`;
    const name = `vt${kind === "sum" ? "Sum" : "Prod"}_${textHash(params + body)}`;
    if (!this.helpers.some((helper) => helper.name === name))
      this.helpers.push({ name, glsl: `float ${name}(${params}) ${body}` });
    return name;
  }
}

/**
 * A helper for a derivative's or an integral's body, named after its own
 * text for the same reason as a sum's: P's and Q's helpers merge by name.
 */
function declareBodyHelper(
  context: CompileContext,
  prefix: string,
  params: string,
  body: string
): string {
  const name = `${prefix}_${textHash(params + body)}`;
  if (!context.helpers.some((helper) => helper.name === name))
    context.helpers.push({ name, glsl: `float ${name}(${params}) ${body}` });
  return name;
}

/** Simpson's rule over this many intervals: even, and plenty for a float. */
const INTEGRAL_INTERVALS = 64;

/** A short stable name for a piece of text (djb2, in base 36). */
function textHash(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++)
    hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

export type Token =
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
  | { kind: "frac" | "sqrt" }
  /** `\left\{` and `\right\}`: a piecewise or a restriction. */
  | { kind: "pieceOpen" | "pieceClose" | "colon" }
  | { kind: "cmp"; value: "<" | ">" | "<=" | ">=" | "=" }
  /** `\sum` or `\prod`, then `_{n=a}^{b}` — the `_` is its own token. */
  | { kind: "repeated"; value: "sum" | "prod" }
  | { kind: "underscore" }
  /** A factorial's `!`. */
  | { kind: "bang" }
  /** `f'`: a derivative of a function the graph defines. */
  | { kind: "prime" }
  /** `\int`, then `_{a}^{b}`, a body, and `d` with its variable. */
  | { kind: "integral" };

/** The comparison commands Desmos writes, as GLSL operators. */
const COMPARISONS: Record<string, "<=" | ">="> = {
  le: "<=",
  leq: "<=",
  ge: ">=",
  geq: ">=",
};

const COMMAND_ALIASES: Record<string, string> = {
  cdot: "*",
  times: "*",
  div: "/",
};

/**
 * Where a function's argument written without brackets ends, as live Desmos
 * reads it, or undefined where Desmos refuses it ("Use parentheses around the
 * argument of 'sin'"). `start` is the token after the function's name. Both
 * this file's compiler and the strict one (`sim/strictParse.ts`) use it.
 *
 * Measured in live Desmos on 2026-10-03:
 * - **The argument is the whole product that follows.** `\sin 2x` is sin(2x),
 *   `\sin xy` is sin(xy), `\sin 2x/3` is sin(2x/3), `\sin x\cdot3` is sin(3x),
 *   `\sin x^{2}x` is sin(x³), `\sin 2(x+1)` is sin(2(x+1)), and
 *   `\sin x^{2}(2)` is sin(2x²).
 * - **It ends** at `+` or `−`, a comparison, a comma or a closing bracket:
 *   `\sin 2x-1` is sin(2x) − 1.
 * - **Desmos refuses** another function, a root, `|x|`, a piecewise, a leading
 *   minus, and a bracket straight after a letter (`\sin x(2)`, which reads
 *   like a call) anywhere in such an argument. So does this, rather than
 *   guess at a reading Desmos never draws.
 */
export function bareArgumentEnd(
  tokens: readonly Token[],
  start: number,
  insideBars: boolean
): number | undefined {
  /** The index after a balanced group opening at `at`, if it is one. */
  const skipGroup = (
    at: number,
    open: Token["kind"],
    close: Token["kind"]
  ): number | undefined => {
    if (tokens[at]?.kind !== open) return undefined;
    let depth = 0;
    for (let i = at; i < tokens.length; i++) {
      if (tokens[i].kind === open) depth++;
      else if (tokens[i].kind === close && --depth === 0) return i + 1;
    }
    return undefined;
  };
  /** An exponent after `^`: a braced group, or a signed number or letter. */
  const skipExponent = (at: number): number | undefined => {
    const token = tokens[at];
    if (token?.kind === "openBrace")
      return skipGroup(at, "openBrace", "closeBrace");
    if (token?.kind === "op" && token.value === "-")
      return skipExponent(at + 1);
    if (token?.kind === "number" || token?.kind === "variable") return at + 1;
    return undefined;
  };

  let i: number | undefined = start;
  let afterLetter = false;
  for (;;) {
    // A factor.
    const token: Token | undefined = tokens[i];
    switch (token?.kind) {
      case "number":
        i++;
        afterLetter = false;
        break;
      case "variable":
        i++;
        afterLetter = true;
        break;
      case "frac":
        i = skipGroup(i + 1, "openBrace", "closeBrace");
        if (i === undefined) return undefined;
        i = skipGroup(i, "openBrace", "closeBrace");
        afterLetter = false;
        break;
      case "open":
        if (afterLetter) return undefined;
        i = skipGroup(i, "open", "close");
        afterLetter = false;
        break;
      default:
        return undefined;
    }
    if (i === undefined) return undefined;
    const power = tokens[i];
    if (power?.kind === "op" && power.value === "^") {
      i = skipExponent(i + 1);
      if (i === undefined) return undefined;
      afterLetter = false;
    }
    // What joins it to the next factor, if anything does.
    const next = tokens[i];
    switch (next?.kind) {
      case "op":
        if (next.value === "*" || next.value === "/") {
          i++;
          afterLetter = false;
          continue;
        }
        return i;
      case "number":
      case "variable":
      case "frac":
      case "open":
        continue;
      case "bar":
        // Inside |…| a bar closes it; anywhere else it would open another.
        return insideBars ? i : undefined;
      case "function":
      case "sqrt":
      case "pieceOpen":
        return undefined;
      default:
        return i;
    }
  }
}

/**
 * Desmos notation that is shorthand for something the parser already reads,
 * written out before tokenizing, so both compilers (this one and the strict
 * one for fluid solids) learn it at once:
 *
 * - `\log_{b}(a)` becomes `\operatorname{logbase}{b}(a)`: the base as the
 *   first braced group of a two-argument call. The tokenizer's own `_`
 *   belongs to `\sum` and `\int`.
 * - `50\%\operatorname{of}x` is 0.5·x. Desmos refuses a bare `50\%`, a
 *   `30^{\circ}` and `\operatorname{gamma}` (measured 2026-11-07), so this
 *   does too.
 */
export function rewriteLatexSugar(latex: string): string {
  // The space after the last \cdot keeps it from running into a letter
  // after it, which would read as one command, `\cdotx`.
  let out = latex.replace(
    /\\%\s*\\operatorname\{of\}/g,
    String.raw`\cdot0.01\cdot `
  );
  let rewritten = "";
  let i = 0;
  for (;;) {
    const at = out.indexOf("\\log_", i);
    if (at < 0) {
      rewritten += out.slice(i);
      break;
    }
    rewritten += out.slice(i, at);
    let j = at + "\\log_".length;
    let base: string;
    if (out[j] === "{") {
      let depth = 0;
      const start = j;
      for (; j < out.length; j++) {
        if (out[j] === "{") depth++;
        else if (out[j] === "}" && --depth === 0) break;
      }
      if (depth !== 0) throw new CompileError("A log base is missing its }.");
      base = out.slice(start + 1, j);
    } else {
      base = out[j] ?? "";
    }
    rewritten += `\\operatorname{logbase}{${base}}`;
    i = j + 1;
  }
  out = rewritten;
  return out;
}

export function tokenize(source: string): Token[] {
  const latex = rewriteLatexSugar(source);
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
        else if (delimiter === "[")
          tokens.push({
            kind: name === "left" ? "openBracket" : "closeBracket",
          });
        else if (delimiter === "]")
          tokens.push({
            kind: name === "left" ? "openBracket" : "closeBracket",
          });
        else if (delimiter === "\\" && latex[i] === "{") {
          i++;
          tokens.push({ kind: name === "left" ? "pieceOpen" : "pieceClose" });
        } else if (delimiter === "\\" && latex[i] === "}") {
          i++;
          tokens.push({ kind: name === "left" ? "pieceOpen" : "pieceClose" });
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
      if (name in COMPARISONS) {
        tokens.push({ kind: "cmp", value: COMPARISONS[name] });
        continue;
      }
      if (name === "sum" || name === "prod") {
        tokens.push({ kind: "repeated", value: name });
        continue;
      }
      if (name === "int") {
        tokens.push({ kind: "integral" });
        continue;
      }
      // `\sum\limits_{…}` only moves where the bounds are typeset.
      if (name === "limits") continue;
      if (name === "infty") {
        // Desmos refuses an infinite bound too (measured 2026-10-14), and a
        // shader has to stop somewhere; the panel's paste import rewrites one
        // to a number of terms the user can see and change.
        throw new CompileError(
          "A sum or product to ∞ cannot be evaluated: give it a last term."
        );
      }
      throw new CompileError(
        `\\${name} is not supported by the flow visualizer.`
      );
    }
    if (/[A-Za-z]/.test(char)) {
      // A Desmos identifier is one letter and an optional subscript, and both
      // forms MathQuill can produce are accepted. These used to be refused
      // outright as unreachable; they are now looked up in the environment the
      // caller read out of the expression list.
      const [identifier] = IDENTIFIER_AT_START.exec(latex.slice(i))!;
      tokens.push({ kind: "variable", value: canonicalIdentifier(identifier) });
      i += identifier.length;
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
      case "<":
      case ">":
        // An `=` outside a condition is an equation, and the parser says so.
        tokens.push({ kind: "cmp", value: char });
        continue;
      case ":":
        tokens.push({ kind: "colon" });
        continue;
      case "_":
        tokens.push({ kind: "underscore" });
        continue;
      case "!":
        tokens.push({ kind: "bang" });
        continue;
      case "'":
        tokens.push({ kind: "prime" });
        continue;
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

  constructor(
    private readonly tokens: readonly Token[],
    private readonly context: CompileContext,
    /** Parameter names bound by the definition being compiled, if any. */
    private readonly scope: ReadonlyMap<string, string>
  ) {}

  expectEnd() {
    const next = this.peek();
    if (next?.kind === "cmp" && next.value === "=")
      throw new CompileError(
        "A field component must be an expression, not an equation."
      );
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
    let base = this.parsePrimary();
    // Desmos's factorial is gamma(z + 1) everywhere, and binds tighter than a
    // power: `2!^{2}` is 4 (measured 2026-10-14).
    while (this.peek()?.kind === "bang") {
      this.index++;
      base = `vtGamma(${base} + 1.0)`;
    }
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
      case "variable": {
        this.index++;
        // `f(...)` is a call when f is a definition and a multiplication when
        // it is a value, which is exactly how Desmos reads it too.
        const definition = this.context.env.functions.get(token.value);
        if (definition !== undefined && this.peek()?.kind === "prime") {
          return this.parsePrimedCall(token.value, definition);
        }
        if (definition !== undefined && this.peek()?.kind === "open") {
          return this.parseDefinedCall(token.value, definition);
        }
        return this.variableToGLSL(token.value);
      }
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
        const variable = this.derivativeVariable();
        if (variable !== undefined) return this.parseDerivative(variable);
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
      case "pieceOpen": {
        this.index++;
        return this.parsePiecewise();
      }
      case "repeated": {
        this.index++;
        return this.parseRepeated(token.value);
      }
      case "openBracket":
        return this.parseIndexedList();
      case "integral":
        this.index++;
        return this.parseIntegral();
      default:
        throw new CompileError(
          "The expression has a bracket or symbol in an unexpected place."
        );
    }
  }

  /**
   * A name the caller resolved out of the expression list: a coordinate, the
   * constant e, a parameter of the definition being compiled, or a value the
   * graph binds — which becomes a uniform rather than a literal.
   */
  private variableToGLSL(name: string): string {
    const bound = this.scope.get(name);
    if (bound !== undefined) return bound;
    switch (name) {
      case "x":
        return "p.x";
      case "y":
        return "p.y";
      case "e":
        return "2.7182818284590452";
      default:
        break;
    }
    if (name === "z" && this.context.env.dimensions === 3) return "p.z";
    // `t` means the animation clock, but only where the graph has not said
    // otherwise. A definition the user wrote down is an explicit statement of
    // what the letter means and beats an implicit one — the ordinary scoping
    // rule, and the one that leaves `t` usable as a plain slider. Falling
    // through to the lookup below is what implements that.
    if (name === TIME_NAME && !this.context.env.scalars.has(TIME_NAME)) {
      this.context.usesTime = true;
      return GLSL_TIME;
    }
    if (this.context.env.scalars.has(name)) {
      this.context.params.add(name);
      return glslParamName(name);
    }
    throw new CompileError(
      `"${name}" is not defined. ${
        this.context.env.unknownNameHint ??
        "The flow visualizer knows x and y, and anything the expression list defines as a number or a function of numbers."
      }`
    );
  }

  private parseDefinedCall(name: string, definition: FunctionDefinition) {
    this.index++;
    const args = [this.parseExpression()];
    while (this.peek()?.kind === "comma") {
      this.index++;
      args.push(this.parseExpression());
    }
    this.expect("close", "a closing parenthesis");
    if (args.length !== definition.params.length) {
      throw new CompileError(
        `"${name}" takes ${definition.params.length} argument${
          definition.params.length === 1 ? "" : "s"
        }, but was given ${args.length}.`
      );
    }
    const glslName = this.context.declare(name, definition);
    return `${glslName}(p${args.map((arg) => `, ${arg}`).join("")})`;
  }

  private parseFunctionCall(called: string): string {
    let name = called;
    // `\sin^{2}x` is (sin x)², and `\sin^{-1}x` is arcsin x, as Desmos
    // reads them (measured 2026-11-07).
    let power: string | undefined;
    if (
      this.peek()?.kind === "op" &&
      (this.peek() as { value: string }).value === "^"
    ) {
      this.index++;
      if (this.isMinusOneGroup()) {
        this.index += 4;
        const inverse = INVERSES[name];
        if (inverse === undefined)
          throw new CompileError(`"${name}" has no inverse to write as ^{-1}.`);
        name = inverse;
      } else {
        power = this.parseGroupOrAtom();
      }
    }
    const spec = FUNCTIONS[name];
    if (spec === undefined) {
      throw new CompileError(unsupportedFunction(name));
    }
    // A log's base comes first, as its own braced group.
    const leading = name === "logbase" ? [this.parseBracedGroup()] : [];
    let args: string[];
    if (this.peek()?.kind === "open") {
      this.index++;
      args = this.parseArguments(LIST_FUNCTIONS.has(name));
      this.expect("close", "a closing parenthesis");
    } else if (
      LIST_FUNCTIONS.has(name) &&
      this.peek()?.kind === "openBracket"
    ) {
      args = this.parseListLiteral();
    } else {
      args = [this.parseBareArgument(name)];
    }
    args = [...leading, ...args];
    if (
      spec.arity === "any"
        ? args.length === 0
        : !spec.arity.includes(args.length)
    ) {
      throw new CompileError(
        `"${name}" cannot take ${args.length} argument${args.length === 1 ? "" : "s"}.`
      );
    }
    const value = spec.emit(args);
    return power === undefined ? value : powerGLSL(value, power);
  }

  /** `{-1}` or `-1` after a `^`, the four or two tokens of an inverse. */
  private isMinusOneGroup(): boolean {
    const t = this.tokens.slice(this.index, this.index + 4);
    return (
      t[0]?.kind === "openBrace" &&
      t[1]?.kind === "op" &&
      t[1].value === "-" &&
      t[2]?.kind === "number" &&
      Number(t[2].value) === 1 &&
      t[3]?.kind === "closeBrace"
    );
  }

  /**
   * A call's arguments up to its closing parenthesis. A function that reads
   * lists takes the elements of a list literal among them as arguments of
   * its own: `\operatorname{total}\left(\left[a,b\right],c\right)` is a+b+c.
   */
  private parseArguments(listsAllowed: boolean): string[] {
    const args: string[] = [];
    do {
      if (args.length > 0) this.index++;
      if (
        listsAllowed &&
        this.peek()?.kind === "openBracket" &&
        this.isWholeArgumentList()
      )
        args.push(...this.parseListLiteral());
      else args.push(this.parseExpression());
    } while (this.peek()?.kind === "comma");
    return args;
  }

  /** Whether the list opening here is the whole argument, not `[a,b][1]+c`. */
  private isWholeArgumentList(): boolean {
    let depth = 0;
    for (let i = this.index; i < this.tokens.length; i++) {
      const { kind } = this.tokens[i];
      if (kind === "openBracket") depth++;
      else if (kind === "closeBracket" && --depth === 0) {
        const next = this.tokens[i + 1]?.kind;
        return next === "comma" || next === "close" || next === undefined;
      }
    }
    return false;
  }

  /**
   * `\left[a, b, c\right]`: its elements, each a GLSL expression. A shader
   * has no lists, so one is only ever its elements written out, read by a
   * function of lists or indexed with `[k]`.
   */
  private parseListLiteral(): string[] {
    this.expect("openBracket", "a [");
    if (this.peek()?.kind === "closeBracket")
      throw new CompileError("An empty list has no value to draw.");
    const elements = [this.parseExpression()];
    while (this.peek()?.kind === "comma") {
      this.index++;
      elements.push(this.parseExpression());
    }
    this.expect("closeBracket", "a closing ]");
    return elements;
  }

  /**
   * A list standing on its own in a formula: only `[a, b, c][k]` has a
   * single value, element k counting from 1, undefined outside the list.
   */
  private parseIndexedList(): string {
    const elements = this.parseListLiteral();
    if (this.peek()?.kind !== "openBracket")
      throw new CompileError(
        "A list draws many fields, not one. Use one element, [a,b][1], or a function of the list such as total or mean."
      );
    this.index++;
    const k = this.parseExpression();
    this.expect("closeBracket", "a closing ]");
    return elements.reduceRight(
      (rest, element, i) =>
        `(abs(floor(${k} + 0.5) - ${i + 1}.0) < 0.5 ? ${element} : ${rest})`,
      "vtUndefined()"
    );
  }

  /**
   * A function's argument written without brackets, as in `\sin 2x`, read
   * the way live Desmos reads it (measured 2026-10-03; see
   * `bareArgumentEnd`): the whole product that follows, so `\sin 2x` is
   * sin(2x), not sin(2)·x.
   */
  private parseBareArgument(name: string): string {
    const start = this.index;
    const end = bareArgumentEnd(this.tokens, start, this.barDepth > 0);
    if (end === undefined) {
      throw new CompileError(
        `Use parentheses around the argument of "${name}".`
      );
    }
    const argument = new Parser(
      this.tokens.slice(start, end),
      this.context,
      this.scope
    ).parseExpression();
    this.index = end;
    return argument;
  }

  /**
   * `\sum_{n=a}^{b} body` or `\prod`, as live Desmos reads it (measured
   * 2026-10-14): the body is the whole product that follows and ends at the
   * next `+` or `−` (`\sum_{n=1}^{3}n+1` is 7, `\sum_{n=1}^{3}2n\cdot2` is 24,
   * and `2\sum n\sum m` nests), the bounds are rounded to whole numbers, and a
   * range that runs backwards is empty.
   *
   * A loop cannot sit inside a GLSL expression, so each one becomes a helper
   * function. It is handed the point, every name the surrounding definition
   * binds, and the two bounds, and declares the index itself.
   */
  /**
   * The variable of a `\frac{d}{dx}` starting here, or undefined if this is
   * an ordinary fraction. Desmos reads `\frac{d}{dx}` as a derivative always.
   */
  private derivativeVariable(): string | undefined {
    const t = this.tokens.slice(this.index, this.index + 8);
    const isD = (k: number) =>
      t[k]?.kind === "variable" && (t[k] as { value: string }).value === "d";
    if (
      t[0]?.kind === "frac" &&
      t[1]?.kind === "openBrace" &&
      isD(2) &&
      t[3]?.kind === "closeBrace" &&
      t[4]?.kind === "openBrace" &&
      isD(5) &&
      t[6]?.kind === "variable" &&
      t[7]?.kind === "closeBrace"
    )
      return (t[6] as { value: string }).value;
    return undefined;
  }

  /**
   * `\frac{d}{dx}f`: the derivative of the product that follows, as Desmos
   * reads it (`\frac{d}{dx}x^{2}+1` is 2x + 1), by a central difference.
   *
   * A shader cannot differentiate a formula, but it can evaluate one twice.
   * The body becomes a helper of the point and of every name the
   * surrounding definition binds; the derivative is that helper a small step
   * either side along the variable, the step scaled to the variable's size so
   * single precision keeps about five digits.
   */
  private parseDerivative(variable: string): string {
    this.index += 8;
    const body = new Parser(this.tokens, this.context, this.scope);
    body.index = this.index;
    body.barDepth = this.barDepth;
    const term = body.parseTerm();
    this.index = body.index;

    const outer = [...this.scope.values()];
    const dims = this.context.env.dimensions === 3 ? 3 : 2;
    const vec = dims === 3 ? "vec3" : "vec2";
    const helper = declareBodyHelper(
      this.context,
      "vtD",
      [`${vec} p`, ...outer.map((glsl) => `float ${glsl}`)].join(", "),
      `{ return ${term}; }`
    );
    const call = (point: string, args: readonly string[]) =>
      `${helper}(${point}${args.map((a) => `, ${a}`).join("")})`;

    const axis = ["x", "y", "z"].slice(0, dims).indexOf(variable);
    const local = this.scope.get(variable);
    if (local !== undefined) {
      const h = `(1e-3 * max(1.0, abs(${local})))`;
      const shifted = (sign: string) =>
        outer.map((glsl) => (glsl === local ? `${glsl} ${sign} ${h}` : glsl));
      return `vtDiv(${call("p", shifted("+"))} - ${call("p", shifted("-"))}, 2.0 * ${h})`;
    }
    if (axis >= 0) {
      const coordinate = ["p.x", "p.y", "p.z"][axis];
      const h = `(1e-3 * max(1.0, abs(${coordinate})))`;
      const step = Array.from({ length: dims }, (_, k) =>
        k === axis ? h : "0.0"
      ).join(", ");
      return `vtDiv(${call(`p + ${vec}(${step})`, outer)} - ${call(`p - ${vec}(${step})`, outer)}, 2.0 * ${h})`;
    }
    if (variable === TIME_NAME)
      throw new CompileError(
        "A derivative in t cannot be drawn: the clock is one number for the whole picture. Differentiate in x or y."
      );
    throw new CompileError(
      `A derivative in "${variable}" cannot be drawn: "${variable}" is a slider, the same everywhere in the field.`
    );
  }

  /**
   * `f'(a)` and `f''(a)` for a one-argument definition, by central
   * differences of the compiled definition.
   */
  private parsePrimedCall(
    name: string,
    definition: FunctionDefinition
  ): string {
    let order = 0;
    while (this.peek()?.kind === "prime") {
      this.index++;
      order++;
    }
    if (order > 2)
      throw new CompileError(
        `Only first and second derivatives, f' and f'', can be drawn.`
      );
    if (definition.params.length !== 1)
      throw new CompileError(
        `"${name}'" needs "${name}" to take one argument; it takes ${definition.params.length}.`
      );
    this.expect("open", `( after ${name}'`);
    const a = this.parseExpression();
    this.expect("close", "a closing parenthesis");
    const glslName = this.context.declare(name, definition);
    const at = (shift: string) => `${glslName}(p, ${a} ${shift})`;
    if (order === 1) {
      const h = `(1e-3 * max(1.0, abs(${a})))`;
      return `vtDiv(${at(`+ ${h}`)} - ${at(`- ${h}`)}, 2.0 * ${h})`;
    }
    // A wider step for the second difference: its error is h² against
    // rounding's ε/h², least near h = ε^¼, about 0.03 in single precision.
    const h = `(3e-2 * max(1.0, abs(${a})))`;
    return `vtDiv(${at(`+ ${h}`)} - 2.0 * ${at("+ 0.0")} + ${at(`- ${h}`)}, ${h} * ${h})`;
  }

  /**
   * `\int_{a}^{b} body\,dt`, by Simpson's rule. The body runs up to the
   * `d` and its variable that close it; the variable is bound inside it.
   */
  private parseIntegral(): string {
    const example = String.raw`\int_{0}^{x}t\,dt`;
    this.expect("underscore", `_{…} after \\int, as in ${example}`);
    const lower = this.parseGroupOrAtom();
    const caret = this.peek();
    if (caret?.kind !== "op" || caret.value !== "^")
      throw new CompileError(
        `An integral needs an upper limit, as in ${example}.`
      );
    this.index++;
    const upper = this.parseGroupOrAtom();

    // Where the body ends: the first `d` then a letter at its own depth.
    let depth = 0;
    let end = -1;
    for (let i = this.index; i < this.tokens.length - 1; i++) {
      const { kind } = this.tokens[i];
      if (["open", "openBrace", "openBracket", "pieceOpen"].includes(kind))
        depth++;
      else if (
        ["close", "closeBrace", "closeBracket", "pieceClose"].includes(kind)
      )
        depth--;
      const next = this.tokens[i + 1];
      if (
        depth === 0 &&
        this.tokens[i].kind === "variable" &&
        (this.tokens[i] as { value: string }).value === "d" &&
        next.kind === "variable"
      ) {
        end = i;
        break;
      }
    }
    if (end < 0)
      throw new CompileError(
        `An integral needs its d and variable at the end, as in ${example}.`
      );
    const variable = (this.tokens[end + 1] as { value: string }).value;
    const local = glslLocalName(variable);
    const scope = new Map(this.scope);
    scope.set(variable, local);
    const outer = [...this.scope]
      .filter(([name]) => name !== variable)
      .map(([, glsl]) => glsl);
    const body = new Parser(
      this.tokens.slice(this.index, end),
      this.context,
      scope
    ).parseExpression();
    this.index = end + 2;

    const vec = this.context.env.dimensions === 3 ? "vec3" : "vec2";
    const n = INTEGRAL_INTERVALS;
    const helper = declareBodyHelper(
      this.context,
      "vtInt",
      [
        `${vec} p`,
        ...outer.map((glsl) => `float ${glsl}`),
        "float vtLo",
        "float vtHi",
      ].join(", "),
      `{ float vtH = (vtHi - vtLo) / ${n}.0; float vtAcc = 0.0; ` +
        `for (int vtI = 0; vtI <= ${n}; vtI++) { float ${local} = vtLo + float(vtI) * vtH; ` +
        `float vtW = (vtI == 0 || vtI == ${n}) ? 1.0 : ((vtI % 2) == 1 ? 4.0 : 2.0); ` +
        `vtAcc += vtW * (${body}); } return vtAcc * vtH / 3.0; }`
    );
    return `${helper}(p${outer.map((glsl) => `, ${glsl}`).join("")}, ${lower}, ${upper})`;
  }

  private parseRepeated(kind: "sum" | "prod"): string {
    const example = `\\${kind}_{n=1}^{10}`;
    this.expect("underscore", `_{n=…} after \\${kind}, as in ${example}`);
    this.expect("openBrace", `{ after the _, as in ${example}`);
    const indexToken = this.peek();
    const equals = this.tokens[this.index + 1];
    if (
      indexToken?.kind !== "variable" ||
      equals?.kind !== "cmp" ||
      equals.value !== "="
    )
      throw new CompileError(`A ${kind} needs an index, as in ${example}.`);
    this.index += 2;
    const lower = this.parseExpression();
    this.expect("closeBrace", "a closing }");
    const caret = this.peek();
    if (caret?.kind !== "op" || caret.value !== "^")
      throw new CompileError(`A ${kind} needs a last term, as in ${example}.`);
    this.index++;
    const upper = this.parseGroupOrAtom();

    const index = indexToken.value;
    const local = glslLocalName(index);
    const scope = new Map(this.scope);
    scope.set(index, local);
    const outer = [...this.scope]
      .filter(([name]) => name !== index)
      .map(([, glsl]) => glsl);
    const body = new Parser(this.tokens, this.context, scope);
    body.index = this.index;
    body.barDepth = this.barDepth;
    const term = body.parseTerm();
    this.index = body.index;

    const name = this.context.declareRepeated(kind, term, local, outer);
    return `${name}(p${outer.map((glsl) => `, ${glsl}`).join("")}, ${lower}, ${upper})`;
  }

  /**
   * `{c₁: v₁, c₂: v₂, …, otherwise}`, as Desmos reads it: the first branch
   * whose condition holds, the last bare value if none does, and undefined if
   * there is no such value. A branch with no value is 1 where it holds, so a
   * restriction `{x > 0}` multiplies by 1 there and is undefined elsewhere.
   */
  private parsePiecewise(): string {
    const branches: { condition: string; value: string }[] = [];
    let otherwise = "vtUndefined()";
    if (this.peek()?.kind === "pieceClose") {
      this.index++;
      return "1.0";
    }
    for (;;) {
      const first = this.parseExpression();
      if (this.peek()?.kind === "cmp") {
        const condition = this.parseConditionFrom(first);
        let value = "1.0";
        if (this.peek()?.kind === "colon") {
          this.index++;
          value = this.parseExpression();
        }
        branches.push({ condition, value });
      } else {
        // A bare value is the otherwise branch, and has to be the last one.
        otherwise = first;
        if (this.peek()?.kind !== "pieceClose")
          throw new CompileError(
            "Only the last branch of a piecewise can have no condition."
          );
      }
      const next = this.peek();
      if (next?.kind === "comma") {
        this.index++;
        continue;
      }
      this.expect("pieceClose", "a closing \\}");
      break;
    }
    return branches.reduceRight(
      (rest, { condition, value }) => `((${condition}) ? (${value}) : ${rest})`,
      otherwise
    );
  }

  /** `a < b ≤ c`, a chain, as each link joined by `&&`. */
  private parseConditionFrom(first: string): string {
    const links: string[] = [];
    let left = first;
    while (this.peek()?.kind === "cmp") {
      const token = this.peek() as { kind: "cmp"; value: string };
      this.index++;
      const right = this.parseExpression();
      const op = token.value === "=" ? "==" : token.value;
      links.push(`(${left} ${op} ${right})`);
      left = right;
    }
    return links.join(" && ");
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
      token.kind === "function" ||
      token.kind === "pieceOpen" ||
      token.kind === "repeated"
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

function glslFloat(value: string) {
  if (value.startsWith("(")) return value;
  return value.includes(".") ? value : `${value}.0`;
}
