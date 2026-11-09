# Unified CAS v0.4: tested on Rafael's PC

2026-11-09. Tested `Unified_CAS_v0.4_PC_Audit_Fixes.zip`. Its SHA-256 matches GPT's: `d0a49329…4448`.

Environment: Windows 11, i7-1185G7, Chrome for Testing 131 (headless), native SymPy 1.14.0.

## Its own suites

| Suite                                        | Result                                                      |
| -------------------------------------------- | ----------------------------------------------------------- |
| `npm test`                                   | 34/34                                                       |
| `tests/integration.mjs`                      | 100/100                                                     |
| `tests/exact-regressions.mjs`                | 36/36                                                       |
| `tests/v04-regressions.mjs`                  | 21/21                                                       |
| `tests/browser.cjs` in Chrome, **unpatched** | passes; the v0.3 blocker (missing `exact_core.py`) is fixed |

## The 16 v0.3 failures

All 16 are fixed: Σ sin n/n, the Γ(1/4) Beta integral, π²/6, π⁴/15, the log-sine integral, √tan, ∫tan diverging, Σ1/n!, the alternating product, the three limits, ζ′(0), y′ = −y/x crossing 0, the Cauchy–Euler parse error, and iⁱ.

## New battery: 160 queries not in the v0.3 battery

References come from mpmath numerics (quad, nsum, nprod, limit, diff, odefun), not remembered identities. Antiderivatives and derivatives were checked by differentiating the answer at sample points.

| Outcome                          | Count   |
| -------------------------------- | ------- |
| Correct value or correct refusal | **120** |
| Not answered (no false claim)    | 38      |
| **Wrong**                        | **1**   |
| Convention difference            | 1       |

My first grading reported three items that turned out not to be CAS errors:

- `∫sin²x/x²` = π/2 is right. My own mpmath reference was inaccurate: `quad` gave 1.57145, but the true value is 1.5707963.
- `y″+y = 0, y(0) = 0, y(π) = 1` was correctly reported as having no solution. Its status string is `no solution`, not `no-solution`.
- The linear system a′ = a+b, b′ = 4a+b was solved correctly.

**Wrong.** `solve y'=y^2+1 where y(0)=0 at x=pi/4` (and at x = 1) is refused as "outside the verified solution branch". The same query without `at` correctly returns y = tan x, whose first pole is at π/2. The branch checker rejects points before the pole.

**Convention.** `(-8)^(1/3)` returns −2, the real cube root (Desmos's convention). The principal complex value is 1+√3i. Meanwhile `sqrt(-4)*sqrt(-9)` uses principal complex roots and returns −6, so the two conventions are mixed. Pick one deliberately.

**Regression: divergence is no longer reported.** v0.3 said these diverge; v0.4 says "convergence not established":

- Σ1/√n, Σ1/(n ln n), Σn, Σ(−1)ⁿ
- Π(1+1/n), Π(1+1/√n), Πn/(n+1)
- Σn/(n²+1), Σ1/ln n, Σ sin n, Σ3ⁿn!/nⁿ

Only Σ1/n is still called divergent. This is GPT's "more conservative divergence certificates": safe, but basic textbook divergence is now silent.

**Fixes that look case-specific, not general.** Each v0.3 failure was fixed, but its nearest neighbour still fails:

| Fixed in v0.4       | Neighbour still unanswered                  |
| ------------------- | ------------------------------------------- |
| ∫₀^{π/2} ln sin x   | ∫₀^{π/2} ln cos x (domain guard)            |
| ζ′(0)               | ζ′(2), and Σ ln n/n² = −ζ′(2)               |
| Σ sin n / n         | Σ sin² n / n² = (π−1)/2                     |
| ∫ dx/√(1−x⁴) (Beta) | ∫₀¹ x^(1/3)(1−x)^(2/3) (Beta; domain guard) |

**Other unanswered:**

- _Integrals:_
  - ∫ atan x/x (Catalan's G), ∫ ln(1+x²)/(1+x²) (π ln 2), ∫ ln x ln(1−x), ∫ x/sinh x
  - ∫₀^{2π} dx/(2+cos x) (domain guard)
  - ∫₀^{π/2} 1/sin x diverging (domain guard)
  - ∫ dx/(x√(x²−1)): a complex Piecewise "candidate" instead of arcsec
- _Series:_ Σ1/C(2n,n) and Σn/(2n+1)! (domain guard on factorials and binomials)
- _Products:_ Π cos(1/2ⁿ) = sin 1 and Π e^(1/n²) = e^(π²/6)
- _Functions:_ `harmonic(n)` is an unknown function
- _ODEs_ (point evaluation needs "a verified explicit solution", and these classes have none):
  - first-order linear with 1/x
  - Bernoulli
  - homogeneous
  - y′ = xy² (and its blow-up)
  - y′ = e^(−x²), whose solution is √π/2·erf
  - variation of parameters with sech
  - Airy
  - Bessel of order ½
- _ODE family:_ y′ = y^(1/3), y(0) = 0 returns an unverified CalcForge candidate. The nonunique-family handling covers √y only.
- _PDEs:_
  - variable-speed transport
  - Burgers
  - Poisson with a constant source
  - heat with a non-eigenfunction initial state
  - reaction–diffusion u_t = u_xx + u

**Strong areas:**

- **Limits:** 17 of 18; the only miss was `harmonic` as an unknown function.
- **Antiderivatives:** 14 of 15 verified by differentiation.
- **Derivatives:** all 10 symbolic and point derivatives were correct, including the 10th derivative and mixed partials. ζ′(2) was the only miss.
- **Exact constants and branch traps:** log(e^(4i)) = 2i(2−π) and √−4·√−9 = −6.
- **Linear constant-coefficient ODEs,** including 4th order.
- **Separable PDEs:** Neumann heat, wave with velocity, multi-mode heat, Laplace.

**Speed in Chrome:**

- The first symbolic query takes 8.5 s (cold boot).
- After that, the median is 77 ms, p90 is 1.0 s, and the slowest is 14.9 s: a declined ∫e^(−x²)ln(1+x).

## Prompt for GPT Work (v0.5)

> Continue Unified CAS from v0.4 (attach the ZIP and this file). Rafael's PC audit is in this file. Rules: fix **methods**, not cases. Every fix must be shown on at least two unseen neighbours of the reported case (for example ln cos as well as ln sin, ζ′(s) at several s), and those neighbours go in the regression suite.
>
> 1. **Wrong:** `solve y'=y^2+1 where y(0)=0 at x=pi/4` is refused although y = tan x is regular on [0, π/2). Fix the branch/pole checker. Test points before, at and after the first pole for tan, 1/(1−x) and 2/(2−x²).
> 2. **Regression:** v0.4 stopped reporting divergence for Σ1/√n, Σ1/(n ln n), Σn, Σ(−1)ⁿ, Π(1+1/n) and the rest of this file's list. Restore divergence proofs: the nth-term test, p-series and limit comparison, the integral test, the ratio/root tests, and Σln(1+aₙ) for products. Keep "convergence not established" only when no test applies.
> 3. **Domain guard:** it still blocks ln cos on [0, π/2], (1−x)^(2/3)x^(1/3) on [0, 1], 1/(2+cos x), 1/sin x, and factorial or binomial summands. Establish the domain on the open interval or integer range. Report "divergent" when the guard finds a non-integrable endpoint.
> 4. **General exact families:**
>    - Beta integrals ∫₀¹ x^(a−1)(1−x)^(b−1) for rational a, b
>    - ζ′(s) and polygamma at rationals
>    - log-trig integrals over [0, π/2] and [0, π/4]
>    - Σ ln n/n^s
>    - Fourier series Σ cos(kn)/n^s and Σ sin(kn)/n^s (with sin²)
>    - Π cos(x/2ⁿ) and Π exp(aₙ)
>    - add `harmonic`
> 5. **ODE point evaluation** for every class the solver already solves symbolically: first-order linear, Bernoulli, homogeneous, Riccati, separable with erf or Ei, Airy and Bessel (as special functions), and variation of parameters. Add the nonunique family for y′ = y^p with 0 < p < 1, not only √y.
> 6. **PDE:** variable-speed transport and Burgers by characteristics (with the shock time), Poisson with polynomial or constant sources, heat and wave with arbitrary initial data as labelled finite Fourier sums, and u_t = u_xx + cu.
> 7. **Convention:** decide real or principal roots for (−8)^(1/3) and make √ and ^(1/n) consistent, with a visible note.
>
> Report every claim against an independent mpmath value at 30 digits, and run the browser suite in an unrestricted Chrome.
