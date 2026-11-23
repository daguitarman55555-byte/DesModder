/**
 * Special functions at the points where they are known constants.
 *
 * Γ(1/2) is √π, ζ(2) is π²/6, ψ(1) is −γ, Li₂(1/2) is π²/12 − (ln 2)²/2. A
 * calculator that answers those with decimals has thrown away what the user
 * asked about. These are the textbook special values, and their families:
 *
 * - Γ at whole numbers, (n − 1)!, and at half-integers, from Γ(1/2) = √π by
 *   Γ(z + 1) = zΓ(z) both ways;
 * - ψ at whole numbers, −γ + Hₙ₋₁, and at half-integers,
 *   −γ − 2 ln 2 + Σ 2/(2k − 1);
 * - ζ at the even integers, (−1)^{n+1}B₂ₙ(2π)²ⁿ/(2(2n)!), at 0 and the
 *   negative integers, (−1)ⁿBₙ₊₁/(n + 1), and at 3, 5 and 7 as the named
 *   constants ζ(3), ζ(5), ζ(7);
 * - B(a, b) as Γ(a)Γ(b)/Γ(a + b), whenever those three are known;
 * - Li₂ at 0, ±1 and 1/2; W₀(a·eᵃ) = a for a ≥ −1;
 * - and the zeros: erf, erfi, Si, Shi and the Fresnel integrals at 0,
 *   erfc(0) = 1, K(0) = π/2, Jₙ(0), E_{1,1}(z) = eᶻ, E_{1,2}(z) = (eᶻ − 1)/z.
 *
 * Every value returned here is checked against the float by the caller
 * (`exactConstant`), as every reduction is.
 */
import { id } from "../../../symbolic";
import * as X from "./exact";
import * as Q from "./rational";

const EULER = 0.5772156649015329;

const gammaConstant = () => X.opaque(id("gamma"), EULER);
const half = Q.rational(1n, 2n);
const sqrtPi = () => X.power(X.PI_VALUE, half);
const ln2 = () => X.logarithm(Q.rational(2n)) ?? X.ZERO;

function factorial(n: bigint): bigint {
  let out = 1n;
  for (let k = 2n; k <= n; k += 1n) out *= k;
  return out;
}

function binomial(n: bigint, k: bigint): bigint {
  return factorial(n) / (factorial(k) * factorial(n - k));
}

/** Bernoulli numbers B₀ … Bₘ, with B₁ = −1/2. */
const bernoulliCache: Q.Rational[] = [Q.ONE];
function bernoulli(m: number): Q.Rational {
  for (let n = bernoulliCache.length; n <= m; n += 1) {
    let sum = Q.ZERO;
    for (let k = 0; k < n; k += 1)
      sum = Q.add(
        sum,
        Q.multiply(
          Q.rational(binomial(BigInt(n + 1), BigInt(k))),
          bernoulliCache[k]
        )
      );
    bernoulliCache.push(Q.negate(Q.divide(sum, Q.rational(BigInt(n + 1)))));
  }
  return bernoulliCache[m];
}

/** Γ(q) for whole and half-integer q. */
function gammaAt(q: Q.Rational): X.ExactValue | undefined {
  if (Q.isInteger(q)) {
    if (q.n <= 0n) return undefined;
    return X.fromRational(Q.rational(factorial(q.n - 1n)));
  }
  if (q.d !== 2n) return undefined;
  // q = n + 1/2
  const n = (q.n - 1n) / 2n;
  const root = sqrtPi();
  if (root === undefined) return undefined;
  if (n >= 0n) {
    // (2n)! / (4ⁿ n!) √π
    const c = Q.rational(factorial(2n * n), 4n ** n * factorial(n));
    return X.multiply(X.fromRational(c), root);
  }
  // Γ(1/2 − m) = (−4)^m m! / (2m)! √π
  const m = -n;
  const c = Q.rational((-4n) ** m * factorial(m), factorial(2n * m));
  return X.multiply(X.fromRational(c), root);
}

/** ψ(q) for whole and half-integer q > 0. */
function digammaAt(q: Q.Rational): X.ExactValue | undefined {
  if (!(q.n > 0n)) return undefined;
  if (Q.isInteger(q)) {
    let harmonic = Q.ZERO;
    for (let k = 1n; k < q.n; k += 1n)
      harmonic = Q.add(harmonic, Q.rational(1n, k));
    return X.add(X.negate(gammaConstant()), X.fromRational(harmonic));
  }
  if (q.d !== 2n) return undefined;
  const n = (q.n - 1n) / 2n;
  let sum = Q.ZERO;
  for (let k = 1n; k <= n; k += 1n)
    sum = Q.add(sum, Q.rational(2n, 2n * k - 1n));
  return X.add(
    X.subtract(X.negate(gammaConstant()), X.multiply(X.fromInteger(2), ln2())),
    X.fromRational(sum)
  );
}

/** ζ(s) at whole s ≠ 1. */
function zetaAt(q: Q.Rational): X.ExactValue | undefined {
  if (!Q.isInteger(q) || q.n === 1n) return undefined;
  const s = Number(q.n);
  if (s <= 0) {
    // ζ(−n) = (−1)ⁿ Bₙ₊₁ / (n + 1)
    const n = -s;
    const b = bernoulli(n + 1);
    const sign = n % 2 === 0 ? Q.ONE : Q.rational(-1n);
    return X.fromRational(
      Q.multiply(sign, Q.divide(b, Q.rational(BigInt(n + 1))))
    );
  }
  if (s % 2 === 0) {
    const n = s / 2;
    // (−1)^{n+1} B₂ₙ (2π)^{2n} / (2 (2n)!)
    const c = Q.multiply(
      Q.multiply(n % 2 === 0 ? Q.rational(-1n) : Q.ONE, bernoulli(s)),
      Q.rational(2n ** BigInt(s), 2n * factorial(BigInt(s)))
    );
    const piPower = X.power(X.PI_VALUE, Q.rational(BigInt(s)));
    return piPower === undefined
      ? undefined
      : X.multiply(X.fromRational(c), piPower);
  }
  const named: Record<number, number> = {
    3: 1.2020569031595942,
    5: 1.03692775514337,
    7: 1.008349277381923,
  };
  return named[s] === undefined
    ? undefined
    : X.opaque(id(`zeta_${s}`), named[s]);
}

/** W₀(a eᵃ) = a, for a rational a ≥ −1. */
function lambertAt(v: X.ExactValue): X.ExactValue | undefined {
  if (v.length === 0) return X.ZERO;
  const single = X.atomsOf(v);
  if (single === undefined || single.factors.size !== 1) return undefined;
  const [[atom, exponent]] = [...single.factors];
  if (atom !== "e" || !Q.equals(single.coeff, exponent)) return undefined;
  if (Q.compare(exponent, Q.rational(-1n)) < 0) return undefined;
  return X.fromRational(exponent);
}

/**
 * The exact value of `name(args)`, where it is a known constant; undefined
 * anywhere else.
 */
export function specialValue(
  name: string,
  args: X.ExactValue[]
): X.ExactValue | undefined {
  const r = args.map((a) => X.asRational(a));
  const [q] = r;
  const isZero = (i: number) => args[i]?.length === 0;
  switch (name) {
    case "Gamma":
      return q === undefined ? undefined : gammaAt(q);
    case "Gamma_r": {
      if (q === undefined) return undefined;
      if (Q.isInteger(q) && q.n <= 0n) return X.ZERO;
      const g = gammaAt(q);
      return g === undefined ? undefined : X.divide(X.fromInteger(1), g);
    }
    case "psi":
      return q === undefined ? undefined : digammaAt(q);
    case "zeta":
      return q === undefined ? undefined : zetaAt(q);
    case "Beta": {
      const [a, b] = r;
      if (a === undefined || b === undefined) return undefined;
      const ga = gammaAt(a);
      const gb = gammaAt(b);
      const gab = gammaAt(Q.add(a, b));
      if (ga === undefined || gb === undefined || gab === undefined)
        return undefined;
      return X.divide(X.multiply(ga, gb), gab);
    }
    case "erf":
    case "erfi":
    case "Si":
    case "Shi":
    case "FresnelS":
    case "FresnelC":
      return isZero(0) ? X.ZERO : undefined;
    case "erfc":
      return isZero(0) ? X.fromInteger(1) : undefined;
    case "Li_2": {
      if (q === undefined) return undefined;
      const piSquared = X.power(X.PI_VALUE, Q.rational(2n));
      if (piSquared === undefined) return undefined;
      const times = (c: Q.Rational) => X.multiply(X.fromRational(c), piSquared);
      if (Q.isZero(q)) return X.ZERO;
      if (Q.isOne(q)) return times(Q.rational(1n, 6n));
      if (Q.equals(q, Q.rational(-1n))) return times(Q.rational(-1n, 12n));
      if (Q.equals(q, half))
        return X.subtract(
          times(Q.rational(1n, 12n)),
          X.multiply(X.fromRational(half), X.multiply(ln2(), ln2()))
        );
      return undefined;
    }
    case "W_0":
      return args[0] === undefined ? undefined : lambertAt(args[0]);
    case "EllipticK":
      return isZero(0)
        ? X.multiply(X.PI_VALUE, X.fromRational(half))
        : undefined;
    case "BesselJ": {
      const [n] = r;
      if (n === undefined || !Q.isInteger(n) || !isZero(1)) return undefined;
      return X.fromInteger(n.n === 0n ? 1 : 0);
    }
    case "E_ML": {
      const [a, b] = r;
      const [, , z] = r;
      if (a === undefined || b === undefined) return undefined;
      if (isZero(2)) {
        const g = gammaAt(b);
        return g === undefined ? undefined : X.divide(X.fromInteger(1), g);
      }
      if (z === undefined || !Q.isOne(a)) return undefined;
      const ez = X.power(X.E_VALUE, z);
      if (ez === undefined) return undefined;
      if (Q.isOne(b)) return ez;
      if (Q.equals(b, Q.rational(2n)))
        return X.divide(X.subtract(ez, X.fromInteger(1)), X.fromRational(z));
      return undefined;
    }
    default:
      return undefined;
  }
}

/** Every function {@link specialValue} knows values of. */
export const SPECIAL_VALUE_FUNCTIONS = new Set([
  "Gamma",
  "Gamma_r",
  "psi",
  "zeta",
  "Beta",
  "erf",
  "erfi",
  "erfc",
  "Si",
  "Shi",
  "FresnelS",
  "FresnelC",
  "Li_2",
  "W_0",
  "EllipticK",
  "BesselJ",
  "E_ML",
]);
