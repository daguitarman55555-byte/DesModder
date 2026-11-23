/**
 * Special functions Desmos does not have, each three ways: as a number (for
 * evaluating and checking answers here), as the notation an answer is written
 * in, and as Desmos definitions that make that notation work on a graph.
 *
 * Desmos accepts a surprising amount of real notation for a function the user
 * defines (measured against the live API, 2026-11-23): `\Gamma(z)`, `\psi(z)`,
 * `\zeta(s)`, `B(a,b)`, `\operatorname{Li}_{2}(z)`, `\operatorname{Si}(z)`,
 * `\operatorname{Ei}(z)` all parse as names. What it refuses is a comma in a
 * subscript, so the Mittag-Leffler function E_{a,b}(z) is defined as
 * E(a, b, z), and τ, which is 2π there. `erf` is built in and is not
 * redefined.
 *
 * Each definition is a formula Desmos evaluates itself: factorials (Desmos's
 * factorial is Γ(z + 1) at every real z), its numerical integrals and
 * derivatives, and finite sums. Where a definition is valid only on part of the
 * line (Li₂ for z ≤ 1, the Bessel integral for whole orders), `domain` says
 * so, and the panel shows it beside the definition.
 */
import { gamma } from "./evaluate";

const EULER = 0.5772156649015329;

// ---- quadrature for the integral-defined functions ----------------------------

const GL_X = [
  0.1488743389816312, 0.4333953941292472, 0.6794095682990244,
  0.8650633666889845, 0.9739065285171717,
];
const GL_W = [
  0.2955242247147529, 0.2692667193099963, 0.219086362515982, 0.1494513491505806,
  0.0666713443086881,
];

/** ∫ₐᵇ g by 10-point Gauss–Legendre on panels at most `width` wide. */
function integrate(
  g: (t: number) => number,
  a: number,
  b: number,
  width = 0.5
) {
  if (a === b) return 0;
  const panels = Math.max(1, Math.ceil(Math.abs(b - a) / width));
  const h = (b - a) / panels;
  let total = 0;
  for (let p = 0; p < panels; p += 1) {
    const mid = a + (p + 0.5) * h;
    for (let i = 0; i < 5; i += 1) {
      const dx = (h / 2) * GL_X[i];
      total += GL_W[i] * (g(mid - dx) + g(mid + dx));
    }
  }
  return (total * h) / 2;
}

/** (f(t) − f(0))/t near 0 without the 0/0. */
const removable = (f: (t: number) => number, at0: number) => (t: number) =>
  t === 0 ? at0 : (f(t) - f(0)) / t;

// ---- the functions, numerically -------------------------------------------------

export function reciprocalGamma(z: number): number {
  if (Number.isInteger(z) && z <= 0) return 0;
  return 1 / gamma(z);
}

export function digamma(x: number): number {
  if (Number.isInteger(x) && x <= 0) return NaN;
  if (x < 0.5) return digamma(1 - x) - Math.PI / Math.tan(Math.PI * x);
  let shift = 0;
  while (x < 16) {
    shift -= 1 / x;
    x += 1;
  }
  const inv = 1 / (x * x);
  return (
    shift +
    Math.log(x) -
    0.5 / x -
    inv * (1 / 12 - inv * (1 / 120 - inv * (1 / 252 - inv / 240)))
  );
}

export const beta = (a: number, b: number) =>
  (gamma(a) * gamma(b)) / gamma(a + b);

/** ζ(s) by Euler–Maclaurin from N = 10; s ≠ 1. */
export function zeta(s: number): number {
  if (s === 1) return NaN;
  const N = 10;
  let total = 0;
  for (let n = 1; n < N; n += 1) total += n ** -s;
  total += N ** (1 - s) / (s - 1) + N ** -s / 2;
  // Bernoulli terms B₂/2!, B₄/4!, B₆/6!, B₈/8!.
  const B = [1 / 12, -1 / 720, 1 / 30240, -1 / 1209600];
  let rising = s;
  for (let j = 0; j < B.length; j += 1) {
    total += B[j] * rising * N ** (-s - 2 * j - 1);
    rising *= (s + 2 * j + 1) * (s + 2 * j + 2);
  }
  return total;
}

export function erf(x: number): number {
  if (Math.abs(x) > 6) return Math.sign(x);
  return (
    (2 / Math.sqrt(Math.PI)) * integrate((t) => Math.exp(-t * t), 0, x, 0.25)
  );
}

export const erfc = (x: number) => 1 - erf(x);

export const erfi = (x: number) =>
  (2 / Math.sqrt(Math.PI)) * integrate((t) => Math.exp(t * t), 0, x, 0.25);

export const Si = (x: number) =>
  integrate((t) => (t === 0 ? 1 : Math.sin(t) / t), 0, x);

export const Ci = (x: number) =>
  x <= 0 ? NaN : EULER + Math.log(x) + integrate(removable(Math.cos, 0), 0, x);

export const Shi = (x: number) =>
  integrate((t) => (t === 0 ? 1 : Math.sinh(t) / t), 0, x);

export const Chi = (x: number) =>
  x <= 0 ? NaN : EULER + Math.log(x) + integrate(removable(Math.cosh, 0), 0, x);

export const Ei = (x: number) =>
  x === 0
    ? NaN
    : EULER + Math.log(Math.abs(x)) + integrate(removable(Math.exp, 1), 0, x);

export const li = (x: number) => (x <= 0 || x === 1 ? NaN : Ei(Math.log(x)));

/** Li₂(z) for real z ≤ 1, through the identities that keep the series short. */
export function dilog(z: number): number {
  if (z > 1) return NaN;
  if (z === 1) return (Math.PI * Math.PI) / 6;
  if (z < -1)
    return -(Math.PI * Math.PI) / 6 - 0.5 * Math.log(-z) ** 2 - dilog(1 / z);
  if (z > 0.5)
    return (
      (Math.PI * Math.PI) / 6 - Math.log(z) * Math.log(1 - z) - dilog(1 - z)
    );
  if (z < -0.5) return -dilog(z / (z - 1)) - 0.5 * Math.log(1 - z) ** 2;
  let total = 0;
  let power = z;
  for (let k = 1; k < 200; k += 1) {
    total += power / (k * k);
    power *= z;
    if (Math.abs(power) < 1e-18) break;
  }
  return total;
}

export const fresnelS = (x: number) =>
  integrate((t) => Math.sin((Math.PI * t * t) / 2), 0, x, 0.25);
export const fresnelC = (x: number) =>
  integrate((t) => Math.cos((Math.PI * t * t) / 2), 0, x, 0.25);

/** J_ν(x): Bessel's integral for a whole order, the series otherwise. */
export function besselJ(nu: number, x: number): number {
  if (Number.isInteger(nu))
    return (
      integrate((u) => Math.cos(nu * u - x * Math.sin(u)), 0, Math.PI, 0.1) /
      Math.PI
    );
  let total = 0;
  for (let k = 0; k < 120; k += 1) {
    const term =
      ((-1) ** k * (x / 2) ** (2 * k + nu)) /
      (gamma(k + 1) * gamma(k + nu + 1));
    total += term;
    if (Math.abs(term) < 1e-18 * Math.max(1, Math.abs(total)) && k > x) break;
  }
  return total;
}

/** Lambert W, the principal branch, by Halley's iteration. */
export function lambertW(x: number): number {
  if (x < -1 / Math.E) return NaN;
  if (x === 0) return 0;
  let w = x < 1 ? x * (1 - x) : Math.log(x) - Math.log(Math.log(x) + 1);
  if (x < 0) w = -0.5;
  for (let i = 0; i < 60; i += 1) {
    const e = Math.exp(w);
    const f = w * e - x;
    const next = w - f / (e * (w + 1) - ((w + 2) * f) / (2 * w + 2));
    if (Math.abs(next - w) < 1e-15 * (1 + Math.abs(next))) return next;
    w = next;
  }
  return w;
}

/** K(k), the complete elliptic integral of the first kind, by the AGM. */
export function ellipticK(k: number): number {
  if (Math.abs(k) >= 1) return NaN;
  let a = 1;
  let b = Math.sqrt(1 - k * k);
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-16; i += 1)
    [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return Math.PI / (2 * a);
}

/** E_{a,b}(z) = Σ zᵏ/Γ(ak + b). */
export function mittagLeffler(a: number, b: number, z: number): number {
  let sum = 0;
  let quiet = 0;
  for (let k = 0; k < 600; k += 1) {
    const term = z === 0 && k > 0 ? 0 : z ** k * reciprocalGamma(a * k + b);
    sum += term;
    if (Math.abs(term) <= 1e-17 * Math.max(1, Math.abs(sum))) {
      quiet += 1;
      if (quiet > 6 && k > 2 * Math.abs(z)) break;
    } else quiet = 0;
  }
  return sum;
}

// ---- the catalogue --------------------------------------------------------------

export interface SpecialFunction {
  /** The callee's symbol in a tree: `Gamma`, `Li_2`, `Si`. */
  symbol: string;
  /** What it is, in words. */
  name: string;
  /** How a call reads, as LaTeX with #1, #2 for the arguments. */
  notation: string;
  arity: number;
  evaluate: (...args: number[]) => number;
  /** Desmos expressions defining it, in order. Built-ins have none. */
  definitions: string[];
  /** Functions its definitions call. */
  needs: string[];
  /** Where the definition gives the right value, when not everywhere. */
  domain?: string;
}

const L = (s: string) => `\\left(${s}\\right)`;

export const SPECIAL_FUNCTIONS: readonly SpecialFunction[] = [
  {
    symbol: "Gamma",
    name: "the gamma function",
    notation: `\\Gamma${L("#1")}`,
    arity: 1,
    evaluate: gamma,
    definitions: [`\\Gamma${L("z")}=${L("z-1")}!`],
    needs: [],
  },
  {
    symbol: "Gamma_r",
    name: "1/Γ, which is 0 at Γ's poles",
    notation: `\\frac{1}{\\Gamma${L("#1")}}`,
    arity: 1,
    evaluate: reciprocalGamma,
    definitions: [
      `\\Gamma_{r}${L("z")}=\\left\\{z>0:\\frac{1}{${L("z-1")}!},\\frac{${L("-z")}!\\sin${L("\\pi z")}}{\\pi}\\right\\}`,
    ],
    needs: [],
  },
  {
    symbol: "B",
    name: "the beta function",
    notation: `B${L("#1,#2")}`,
    arity: 2,
    evaluate: beta,
    definitions: [
      `B${L("a,b")}=\\frac{\\Gamma${L("a")}\\Gamma${L("b")}}{\\Gamma${L("a+b")}}`,
    ],
    needs: ["Gamma"],
  },
  {
    symbol: "psi",
    name: "the digamma function ψ = Γ′/Γ",
    notation: `\\psi${L("#1")}`,
    arity: 1,
    evaluate: digamma,
    definitions: [
      `\\psi${L("z")}=\\frac{d}{dz}\\ln${L("\\left|\\Gamma\\left(z\\right)\\right|")}`,
    ],
    needs: ["Gamma"],
  },
  {
    symbol: "zeta",
    name: "the Riemann zeta function",
    notation: `\\zeta${L("#1")}`,
    arity: 1,
    evaluate: zeta,
    definitions: [
      `\\zeta${L("s")}=\\sum_{n=1}^{9}n^{-s}+\\frac{10^{1-s}}{s-1}+\\frac{10^{-s}}{2}+\\frac{s\\cdot10^{-s-1}}{12}-\\frac{s${L("s+1")}${L("s+2")}10^{-s-3}}{720}+\\frac{s${L("s+1")}${L("s+2")}${L("s+3")}${L("s+4")}10^{-s-5}}{30240}-\\frac{s${L("s+1")}${L("s+2")}${L("s+3")}${L("s+4")}${L("s+5")}${L("s+6")}10^{-s-7}}{1209600}`,
    ],
    needs: [],
    domain: "s > −3, s ≠ 1",
  },
  {
    symbol: "erf",
    name: "the error function",
    notation: `\\operatorname{erf}${L("#1")}`,
    arity: 1,
    evaluate: erf,
    definitions: [],
    needs: [],
  },
  {
    symbol: "erfc",
    name: "the complementary error function",
    notation: `\\operatorname{erfc}${L("#1")}`,
    arity: 1,
    evaluate: erfc,
    definitions: [
      `\\operatorname{erfc}${L("z")}=1-\\operatorname{erf}${L("z")}`,
    ],
    needs: [],
  },
  {
    symbol: "erfi",
    name: "the imaginary error function",
    notation: `\\operatorname{erfi}${L("#1")}`,
    arity: 1,
    evaluate: erfi,
    definitions: [
      `\\operatorname{erfi}${L("z")}=\\frac{2}{\\sqrt{\\pi}}\\int_{0}^{z}e^{t^{2}}dt`,
    ],
    needs: [],
  },
  {
    symbol: "Si",
    name: "the sine integral",
    notation: `\\operatorname{Si}${L("#1")}`,
    arity: 1,
    evaluate: Si,
    definitions: [
      `\\operatorname{Si}${L("z")}=\\int_{0}^{z}\\frac{\\sin${L("t")}}{t}dt`,
    ],
    needs: [],
  },
  {
    symbol: "Ci",
    name: "the cosine integral",
    notation: `\\operatorname{Ci}${L("#1")}`,
    arity: 1,
    evaluate: Ci,
    definitions: [
      `\\operatorname{Ci}${L("z")}=${EULER}+\\ln${L("z")}+\\int_{0}^{z}\\frac{\\cos${L("t")}-1}{t}dt`,
    ],
    needs: [],
    domain: "z > 0",
  },
  {
    symbol: "Shi",
    name: "the hyperbolic sine integral",
    notation: `\\operatorname{Shi}${L("#1")}`,
    arity: 1,
    evaluate: Shi,
    definitions: [
      `\\operatorname{Shi}${L("z")}=\\int_{0}^{z}\\frac{\\sinh${L("t")}}{t}dt`,
    ],
    needs: [],
  },
  {
    symbol: "Chi",
    name: "the hyperbolic cosine integral",
    notation: `\\operatorname{Chi}${L("#1")}`,
    arity: 1,
    evaluate: Chi,
    definitions: [
      `\\operatorname{Chi}${L("z")}=${EULER}+\\ln${L("z")}+\\int_{0}^{z}\\frac{\\cosh${L("t")}-1}{t}dt`,
    ],
    needs: [],
    domain: "z > 0",
  },
  {
    symbol: "Ei",
    name: "the exponential integral",
    notation: `\\operatorname{Ei}${L("#1")}`,
    arity: 1,
    evaluate: Ei,
    definitions: [
      `\\operatorname{Ei}${L("z")}=${EULER}+\\ln${L("\\left|z\\right|")}+\\int_{0}^{z}\\frac{e^{t}-1}{t}dt`,
    ],
    needs: [],
    domain: "z ≠ 0",
  },
  {
    symbol: "li",
    name: "the logarithmic integral",
    notation: `\\operatorname{li}${L("#1")}`,
    arity: 1,
    evaluate: li,
    definitions: [
      `\\operatorname{li}${L("z")}=\\operatorname{Ei}${L("\\ln" + L("z"))}`,
    ],
    needs: ["Ei"],
    domain: "z > 0, z ≠ 1",
  },
  {
    symbol: "Li_2",
    name: "the dilogarithm",
    notation: `\\operatorname{Li}_{2}${L("#1")}`,
    arity: 1,
    evaluate: dilog,
    definitions: [
      `\\operatorname{Li}_{2}${L("z")}=-\\int_{0}^{z}\\frac{\\ln${L("1-t")}}{t}dt`,
    ],
    needs: [],
    domain: "z ≤ 1 (beyond 1 it is complex)",
  },
  {
    symbol: "S",
    name: "the Fresnel sine integral",
    notation: `S${L("#1")}`,
    arity: 1,
    evaluate: fresnelS,
    definitions: [
      `S${L("z")}=\\int_{0}^{z}\\sin${L("\\frac{\\pi t^{2}}{2}")}dt`,
    ],
    needs: [],
  },
  {
    symbol: "C",
    name: "the Fresnel cosine integral",
    notation: `C${L("#1")}`,
    arity: 1,
    evaluate: fresnelC,
    definitions: [
      `C${L("z")}=\\int_{0}^{z}\\cos${L("\\frac{\\pi t^{2}}{2}")}dt`,
    ],
    needs: [],
  },
  {
    symbol: "J",
    name: "the Bessel function of the first kind",
    notation: `J${L("#1,#2")}`,
    arity: 2,
    evaluate: besselJ,
    definitions: [
      `J${L("n,z")}=\\frac{1}{\\pi}\\int_{0}^{\\pi}\\cos${L("nu-z\\sin" + L("u"))}du`,
    ],
    needs: [],
    domain: "whole orders n (Bessel's integral); J(n, z) is J_n(z)",
  },
  {
    symbol: "W",
    name: "the Lambert W function (principal branch)",
    notation: `W${L("#1")}`,
    arity: 1,
    evaluate: lambertW,
    definitions: [
      `W${L("z")}=\\frac{1}{\\pi}\\int_{0}^{\\pi}\\ln${L("1+\\frac{z\\sin" + L("u") + "}{u}e^{u\\cot" + L("u") + "}")}du`,
    ],
    needs: [],
    domain: "z ≥ −1/e",
  },
  {
    symbol: "K",
    name: "the complete elliptic integral of the first kind",
    notation: `K${L("#1")}`,
    arity: 1,
    evaluate: ellipticK,
    definitions: [
      `K${L("k")}=\\int_{0}^{\\frac{\\pi}{2}}\\frac{1}{\\sqrt{1-k^{2}\\sin^{2}${L("u")}}}du`,
    ],
    needs: [],
    domain: "−1 < k < 1",
  },
  {
    symbol: "E",
    name: "the Mittag-Leffler function E_{a,b}",
    notation: `E${L("#1,#2,#3")}`,
    arity: 3,
    evaluate: mittagLeffler,
    definitions: [
      `E${L("a,b,z")}=\\sum_{k=0}^{100}z^{k}\\Gamma_{r}${L("ak+b")}`,
    ],
    needs: ["Gamma_r"],
    domain: "E(a, b, z) is E_{a,b}(z); |z| up to about 30",
  },
];

const BY_SYMBOL = new Map(SPECIAL_FUNCTIONS.map((f) => [f.symbol, f]));

export function specialFunction(symbol: string): SpecialFunction | undefined {
  return BY_SYMBOL.get(symbol);
}

/**
 * The Desmos definitions for every special function in `symbols`, with what
 * they depend on first, each once.
 */
export function desmosDefinitions(symbols: Iterable<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (symbol: string) => {
    if (seen.has(symbol)) return;
    seen.add(symbol);
    const f = BY_SYMBOL.get(symbol);
    if (f === undefined) return;
    f.needs.forEach(add);
    out.push(...f.definitions);
  };
  for (const symbol of symbols) add(symbol);
  return out;
}

/** How each function is called in Desmos LaTeX, for finding it in an answer. */
const CALL_PATTERNS: [string, RegExp][] = SPECIAL_FUNCTIONS.map((f) => {
  const source = f.definitions[0] ?? f.notation;
  const head = source.slice(0, source.indexOf("\\left("));
  const literal = head.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  // Not after a letter or a backslash, so E is not found inside \operatorname
  // or another name; after a brace is fine: x^{-\pi}E\left(…\right).
  return [f.symbol, new RegExp(String.raw`(?<![a-zA-Z_\\])${literal}\\left\(`)];
});

/** Every special function a piece of Desmos LaTeX calls. */
export function specialFunctionsIn(latex: string): string[] {
  return CALL_PATTERNS.filter(([, re]) => re.test(latex)).map(([s]) => s);
}
