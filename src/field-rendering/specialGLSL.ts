/**
 * The special functions of `src/symbolic/special.ts`, on the GPU.
 *
 * Desmos has none of them, so the graph gets each as a definition in a
 * locked folder (special.ts, definitionFolderItems). A field component is not
 * evaluated by Desmos, though: it is compiled to GLSL, and the compiler read
 * `\Gamma` or `\operatorname{Ei}` as names it had never heard of. So each has
 * a float implementation here, chosen for a shader rather than copied from
 * the Desmos definition — a series where a series converges without
 * cancelling, a continued fraction or an asymptotic expansion where it does
 * not, the AGM for K — and each is held to the JavaScript value in
 * fieldFunctions.int.test.ts.
 *
 * Needs `vtGamma`, `vtErf` and `vtUndefined` from GLSL_PRELUDE.
 */

export const SPECIAL_GLSL = `
const float VT_EULER = 0.57721566490153286;
const float VT_PI = 3.1415926535897932;
float vtRGamma(float z) {
  if (z <= 0.0 && z == floor(z)) return 0.0;
  return 1.0 / vtGamma(z);
}
float vtBeta(float a, float b) {
  return vtGamma(a) * vtGamma(b) / vtGamma(a + b);
}
float vtDigamma(float x) {
  if (x <= 0.0 && x == floor(x)) return vtUndefined();
  float acc = 0.0;
  // psi(x) = psi(1 - x) - pi cot(pi x)
  if (x < 0.5) {
    acc -= VT_PI / tan(VT_PI * x);
    x = 1.0 - x;
  }
  for (int i = 0; i < 16; i++) {
    if (x >= 8.0) break;
    acc -= 1.0 / x;
    x += 1.0;
  }
  float f = 1.0 / (x * x);
  return acc + log(x) - 0.5 / x
    - f * (1.0 / 12.0 - f * (1.0 / 120.0 - f * (1.0 / 252.0 - f * (1.0 / 240.0 - f / 132.0))));
}
// Euler-Maclaurin at N = 10, the same sum the Desmos definition writes out.
float vtZetaEM(float s) {
  float sum = 0.0;
  for (int n = 1; n < 10; n++) sum += exp(-s * log(float(n)));
  float N = 10.0;
  float Ns = exp(-s * log(N));
  sum += N * Ns / (s - 1.0) + 0.5 * Ns;
  float t = s * Ns / N;
  sum += t / 12.0;
  t *= (s + 1.0) * (s + 2.0) / (N * N);
  sum -= t / 720.0;
  t *= (s + 3.0) * (s + 4.0) / (N * N);
  sum += t / 30240.0;
  t *= (s + 5.0) * (s + 6.0) / (N * N);
  sum -= t / 1209600.0;
  return sum;
}
float vtZeta(float s) {
  if (s == 1.0) return vtUndefined();
  if (s >= 0.0) return vtZetaEM(s);
  // The functional equation, so negative s is exact rather than divergent.
  if (s == floor(s) && mod(-s, 2.0) == 0.0) return 0.0;
  return exp(s * log(2.0)) * exp((s - 1.0) * log(VT_PI)) * sin(VT_PI * s / 2.0)
    * vtGamma(1.0 - s) * vtZetaEM(1.0 - s);
}
float vtErfc(float z) { return 1.0 - vtErf(z); }
// Every term has the sign of z, so the series never cancels.
float vtErfi(float z) {
  float z2 = z * z;
  float term = z;
  float sum = z;
  for (int n = 1; n < 200; n++) {
    term *= z2 / float(n);
    float add = term / float(2 * n + 1);
    sum += add;
    if (abs(add) < 1e-8 * abs(sum)) break;
  }
  return 1.1283791670955126 * sum;
}
// E1(x) for x > 1, by the continued fraction (modified Lentz).
float vtE1Fraction(float x) {
  float b = x + 1.0;
  float c = 1e30;
  float d = 1.0 / b;
  float h = d;
  for (int i = 1; i < 80; i++) {
    float an = -float(i * i);
    b += 2.0;
    d = 1.0 / (an * d + b);
    c = b + an / c;
    float del = c * d;
    h *= del;
    if (abs(del - 1.0) < 1e-7) break;
  }
  return h * exp(-x);
}
float vtEi(float x) {
  if (x == 0.0) return vtUndefined();
  if (x < -1.0) return -vtE1Fraction(-x);
  float term = 1.0;
  float sum = 0.0;
  for (int n = 1; n < 400; n++) {
    term *= x / float(n);
    float add = term / float(n);
    sum += add;
    if (abs(add) < 1e-8 * abs(sum)) break;
  }
  return VT_EULER + log(abs(x)) + sum;
}
float vtLi(float z) {
  if (z <= 0.0 || z == 1.0) return vtUndefined();
  return vtEi(log(z));
}
// Shi and Chi: every term positive, so the series is safe at any size.
float vtShi(float z) {
  float z2 = z * z;
  float term = z;
  float sum = z;
  for (int n = 1; n < 300; n++) {
    term *= z2 / float((2 * n) * (2 * n + 1));
    float add = term / float(2 * n + 1);
    sum += add;
    if (abs(add) < 1e-8 * abs(sum)) break;
  }
  return sum;
}
float vtChi(float z) {
  if (z <= 0.0) return vtUndefined();
  float z2 = z * z;
  float term = 1.0;
  float sum = 0.0;
  for (int n = 1; n < 300; n++) {
    term *= z2 / float((2 * n - 1) * (2 * n));
    float add = term / float(2 * n);
    sum += add;
    if (abs(add) < 1e-8 * abs(sum)) break;
  }
  return VT_EULER + log(z) + sum;
}
vec2 vtCMul(vec2 a, vec2 b) {
  return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}
vec2 vtCInv(vec2 b) { return vec2(b.x, -b.y) / dot(b, b); }
// Ci and Si together, as (Ci, Si), for t > 0: the series below 2, where
// no term is above 2, and above it E1(it) by the complex continued
// fraction (modified Lentz), which takes 25 steps at 2 and 4 at 30. Both
// hold to about 2e-7, at any size; the Simpson's rule this replaced took
// 128 sines and lost its accuracy past 16.
vec2 vtCiSi(float t) {
  if (t > 2.0) {
    vec2 b = vec2(1.0, t);
    vec2 c = vec2(1e30, 0.0);
    vec2 d = vtCInv(b);
    vec2 h = d;
    for (int i = 2; i < 100; i++) {
      float a = -float((i - 1) * (i - 1));
      b.x += 2.0;
      d = vtCInv(a * d + b);
      c = b + a * vtCInv(c);
      vec2 del = vtCMul(c, d);
      h = vtCMul(h, del);
      if (abs(del.x - 1.0) + abs(del.y) < 1e-7) break;
    }
    h = vtCMul(vec2(cos(t), -sin(t)), h);
    return vec2(-h.x, VT_PI / 2.0 + h.y);
  }
  float si = 0.0;
  float ci = 0.0;
  float term = 1.0;
  for (int k = 1; k < 40; k++) {
    term *= t / float(k);
    float add = term / float(k);
    // k odd feeds Si, k even feeds Ci, each with signs + - + - ...
    if (mod(float(k), 2.0) > 0.5) si += mod(float(k - 1), 4.0) < 0.5 ? add : -add;
    else ci += mod(float(k), 4.0) > 1.5 ? -add : add;
    if (add < 1e-8) break;
  }
  return vec2(VT_EULER + log(t) + ci, si);
}
float vtSi(float z) {
  if (z == 0.0) return 0.0;
  return sign(z) * vtCiSi(abs(z)).y;
}
float vtCi(float z) {
  if (z <= 0.0) return vtUndefined();
  return vtCiSi(z).x;
}
// Li2: the series inside |z| <= 1/2, and the reflection and inversion
// identities to bring every z <= 1 there.
float vtLi2Series(float z) {
  float term = 1.0;
  float sum = 0.0;
  for (int k = 1; k < 60; k++) {
    term *= z;
    float add = term / float(k * k);
    sum += add;
    if (abs(add) < 1e-9) break;
  }
  return sum;
}
float vtLi2(float z) {
  if (z > 1.0) return vtUndefined();
  if (z == 1.0) return VT_PI * VT_PI / 6.0;
  if (abs(z) <= 0.5) return vtLi2Series(z);
  if (z > 0.5) return VT_PI * VT_PI / 6.0 - log(z) * log(1.0 - z) - vtLi2Series(1.0 - z);
  if (z >= -1.0) {
    float l = log(1.0 - z);
    return -vtLi2Series(z / (z - 1.0)) - 0.5 * l * l;
  }
  // z < -1: inversion, then 1/z lies in (-1, 0).
  float l = log(-z);
  float w = 1.0 / z;
  float inner = w >= -0.5 ? vtLi2Series(w)
    : -vtLi2Series(w / (w - 1.0)) - 0.5 * log(1.0 - w) * log(1.0 - w);
  return -VT_PI * VT_PI / 6.0 - 0.5 * l * l - inner;
}
// Fresnel C and S together, as (C, S): the series below 1.5, and above it
// the complex continued fraction for erfc, which takes 13 steps at 1.5 and
// 3 at 8. About 2e-7 everywhere; Simpson's rule here took 257 steps.
vec2 vtFresnelCS(float z) {
  float t = abs(z);
  float s = sign(z);
  if (t < 1.5) {
    float p = VT_PI / 2.0 * t * t;
    float sc = 0.0;
    float ss = 0.0;
    float term = t;
    for (int k = 0; k < 40; k++) {
      if (k > 0) term *= p / float(k);
      float add = term / float(2 * k + 1);
      // k = 0, 1, 2, 3 ... gives +C, +S, -C, -S, then repeats.
      float sgn = mod(float(k), 4.0) < 1.5 ? 1.0 : -1.0;
      if (mod(float(k), 2.0) < 0.5) sc += sgn * add;
      else ss += sgn * add;
      if (add < 1e-9) break;
    }
    return s * vec2(sc, ss);
  }
  float pt2 = VT_PI * t * t;
  vec2 b = vec2(1.0, -pt2);
  vec2 c = vec2(1e30, 0.0);
  vec2 d = vtCInv(b);
  vec2 h = d;
  float n = -1.0;
  for (int k = 2; k < 100; k++) {
    n += 2.0;
    float a = -n * (n + 1.0);
    b.x += 4.0;
    d = vtCInv(a * d + b);
    c = b + a * vtCInv(c);
    vec2 del = vtCMul(c, d);
    h = vtCMul(h, del);
    if (abs(del.x - 1.0) + abs(del.y) < 1e-7) break;
  }
  h = vtCMul(vec2(t, -t), h);
  vec2 e = vec2(cos(0.5 * pt2), sin(0.5 * pt2));
  return s * vtCMul(vec2(0.5, 0.5), vec2(1.0, 0.0) - vtCMul(e, h));
}
float vtFresnel(float z, bool sine) {
  vec2 cs = vtFresnelCS(z);
  return sine ? cs.y : cs.x;
}
// Bessel's integral, for whole orders. The integrand is even and 2pi
// periodic, so the trapezoid rule converges geometrically once its N
// passes |z|: 16 + |z| points (at most 64) hold to 2e-7 where Simpson's
// rule took 129 and did worse.
float vtBesselJ(float n, float z) {
  float N = clamp(ceil(abs(z)) + 16.0, 16.0, 64.0);
  float h = VT_PI / N;
  float sum = 0.5 * (1.0 + cos(n * VT_PI));
  for (int i = 1; i < 64; i++) {
    if (float(i) >= N) break;
    float u = h * float(i);
    sum += cos(n * u - z * sin(u));
  }
  return sum * h / VT_PI;
}
// W0 by Halley's iteration; near -1/e it starts from the branch-point series.
float vtW0(float z) {
  float em = -0.36787944117144233;
  if (z < em) return vtUndefined();
  if (z == 0.0) return 0.0;
  float w;
  if (z < -0.25) {
    float p = sqrt(max(2.0 * (2.718281828459045 * z + 1.0), 0.0));
    w = -1.0 + p - p * p / 3.0 + 11.0 / 72.0 * p * p * p;
    if (p < 1e-3) return w;
  } else if (z < 3.0) {
    w = log(1.0 + z);
  } else {
    float l1 = log(z);
    float l2 = log(l1);
    w = l1 - l2 + l2 / l1;
  }
  for (int i = 0; i < 16; i++) {
    float ew = exp(w);
    float f = w * ew - z;
    float wp = w + 1.0;
    float d = f / (ew * wp - (w + 2.0) * f / (2.0 * wp));
    w -= d;
    if (abs(d) < 1e-7 * (1.0 + abs(w))) break;
  }
  return w;
}
// K(k) = pi / (2 AGM(1, sqrt(1 - k^2))).
float vtEllipticK(float k) {
  if (abs(k) >= 1.0) return vtUndefined();
  float a = 1.0;
  float b = sqrt(1.0 - k * k);
  for (int i = 0; i < 12; i++) {
    float m = 0.5 * (a + b);
    b = sqrt(a * b);
    a = m;
  }
  return VT_PI / (2.0 * a);
}
// ln Gamma for x >= 10, by Stirling.
float vtLnGammaLarge(float x) {
  float r = 1.0 / x;
  return (x - 0.5) * log(x) - x + 0.91893853320467274 + r / 12.0 - r * r * r / 360.0;
}
// E_{a,b}(z): the series, with each large term taken through logarithms so
// that z^k / Gamma(ak + b) does not overflow a float on the way.
float vtMittagLeffler(float a, float b, float z) {
  float sum = 0.0;
  float lz = log(abs(z));
  for (int k = 0; k <= 100; k++) {
    float arg = a * float(k) + b;
    float term;
    if (k == 0) term = vtRGamma(b);
    else if (z == 0.0) term = 0.0;
    else if (arg >= 10.0) {
      float sgn = (z < 0.0 && mod(float(k), 2.0) > 0.5) ? -1.0 : 1.0;
      term = sgn * exp(float(k) * lz - vtLnGammaLarge(arg));
    } else term = vtPow(z, float(k)) * vtRGamma(arg);
    sum += term;
    // Past the last pole of 1/Γ (arg > 2) the terms only shrink once they
    // are small, so a negligible one ends the sum: 101 terms took 8.9 ms a
    // 1024² draw on Iris Xe, the slowest of all 21.
    if (arg > 2.0 && abs(term) <= 1e-9 * abs(sum)) break;
  }
  return sum;
}
`;

interface SpecialSpec {
  arity: readonly number[];
  emit: (args: string[]) => string;
}

/**
 * The compiler's names for them: what the tokenizer reads `\Gamma`,
 * `\operatorname{Ei}`, `\operatorname{Li}_{2}`, `W_{0}` and `E_{ML}` as.
 */
export const SPECIAL_GLSL_FUNCTIONS: Record<string, SpecialSpec> = {
  Gamma: { arity: [1], emit: ([a]) => `vtGamma(${a})` },
  Gamma_r: { arity: [1], emit: ([a]) => `vtRGamma(${a})` },
  Beta: { arity: [2], emit: ([a, b]) => `vtBeta(${a}, ${b})` },
  psi: { arity: [1], emit: ([a]) => `vtDigamma(${a})` },
  zeta: { arity: [1], emit: ([a]) => `vtZeta(${a})` },
  erfc: { arity: [1], emit: ([a]) => `vtErfc(${a})` },
  erfi: { arity: [1], emit: ([a]) => `vtErfi(${a})` },
  Si: { arity: [1], emit: ([a]) => `vtSi(${a})` },
  Ci: { arity: [1], emit: ([a]) => `vtCi(${a})` },
  Shi: { arity: [1], emit: ([a]) => `vtShi(${a})` },
  Chi: { arity: [1], emit: ([a]) => `vtChi(${a})` },
  Ei: { arity: [1], emit: ([a]) => `vtEi(${a})` },
  li: { arity: [1], emit: ([a]) => `vtLi(${a})` },
  Li_2: { arity: [1], emit: ([a]) => `vtLi2(${a})` },
  FresnelS: { arity: [1], emit: ([a]) => `vtFresnel(${a}, true)` },
  FresnelC: { arity: [1], emit: ([a]) => `vtFresnel(${a}, false)` },
  BesselJ: { arity: [2], emit: ([n, z]) => `vtBesselJ(${n}, ${z})` },
  W_0: { arity: [1], emit: ([a]) => `vtW0(${a})` },
  EllipticK: { arity: [1], emit: ([a]) => `vtEllipticK(${a})` },
  E_ML: {
    arity: [3],
    emit: ([a, b, z]) => `vtMittagLeffler(${a}, ${b}, ${z})`,
  },
};

/** Subscripted names that are special functions, not variables, when called. */
export const SPECIAL_SUBSCRIPTED = new Set(["W_0", "E_ML"]);
