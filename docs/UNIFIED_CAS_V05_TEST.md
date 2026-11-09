# Unified CAS v0.5: tested on Rafael's PC

2026-11-09. Tested `Unified_CAS_v0.5_Methods_and_Certificates.zip`. Its SHA-256 matches GPT's: `3d1bee51…e5fb`.

Environment: Windows 11, i7-1185G7, Chrome for Testing 131 (headless, Puppeteer), native SymPy 1.14.0.

## Its own suites

| Suite                                    | Result                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm test`                               | 34/34                                                                                          |
| `tests/integration.mjs`                  | 100/100                                                                                        |
| `tests/exact-regressions.mjs`            | 36/36                                                                                          |
| `tests/v04-regressions.mjs`              | 21/21                                                                                          |
| `tests/v05-regressions.mjs`              | 86/86, after a Windows fix (below)                                                             |
| `tests/v04-30digit.py`, `v05-30digit.py` | 17/17, 40/40                                                                                   |
| `tests/browser.cjs` in Chrome            | passes                                                                                         |
| The 27 cases of `tests/browser-v05.py`   | **27/27 in Chrome**, no page errors (run through Puppeteer, since Playwright is not installed) |

**The browser gate GPT could not run passes on Windows.**

**Windows bug in the test runner:** `v05-regressions.mjs` sets `PYTHONPATH` from `new URL('../calcforge', import.meta.url).pathname`. On Windows that gives `/C:/…`, so Python cannot import `unified`. Use `fileURLToPath`. The other runners rely on the caller's `PYTHONPATH`. The app itself is not affected.

## v0.4's battery, run again (176 queries)

- **The 16 rechecks:** all still pass.
- **The divergence regression is fixed.** Every series and product on v0.4's list is called divergent again. Σ sin n/n stays (π−1)/2.
- **The tan branch bug is fixed:** y′ = y²+1, y(0) = 0 at π/4 gives 1, and at π/2 it is refused.
- **Of the 160:** 155 are now right. Last time 120 were right and 38 were unanswered.

Left over from that battery:

- `int(1/(x*sqrt(x^2-1)),x)` is still a complex Piecewise "candidate", not arcsec.
- Three ODEs still get "a verified explicit solution is required":
  - first-order linear y′+y/x = x²
  - variation of parameters with sech
  - homogeneous y′ = (y²+xy)/x²
- Poisson with source −2 is labelled approximate. It returns 5696/(405π⁴) = 0.1443 against the true 0.1473, which is 2% off.

Correction to the v0.4 report: Σ sin²n/n² = (π−1)/2 was already right in v0.4. My `nsum` reference was inaccurate there, as `quadosc` was for ∫sin²x/x².

## New battery: 209 queries in no earlier battery and none of GPT's tests

Most queries are **neighbours of the families v0.5 claims**, using parameters GPT's tests do not use. They check whether a method was fixed or only the case. References are mpmath numerics, not remembered closed forms. Three of my references turned out to be inaccurate, and the CAS was right on all three: ∫sin x/√x, Σ ln n/n⁴, and lim n!^(1/n)/n.

| Outcome                                               | Count   |
| ----------------------------------------------------- | ------- |
| Correct value, correct refusal, or correctly declined | **162** |
| Not answered (no false claim)                         | 39      |
| **Wrong**                                             | **6**   |
| Labelled approximate but 0.5–2% off                   | 2       |

### The six wrong answers

Five are **false "divergent" claims**, made where the method's own check failed. That is worse than v0.4's silence: it is a false statement, not a missing one.

| Query                                  | True value     | v0.5 said                                                          |
| -------------------------------------- | -------------- | ------------------------------------------------------------------ |
| `int(x/(exp(2*x)-1),x,0,Infinity)`     | π²/24          | divergent ("does not converge on a subinterval")                   |
| `int(sqrt(x)/(exp(x)-1),x,0,Infinity)` | Γ(3/2)ζ(3/2)   | divergent                                                          |
| `int(1/(x*(1+log(x)^2)),x,1,Infinity)` | π/2            | divergent                                                          |
| `sum(1/(n*(2*n+1)),n,1,Infinity)`      | 2 − 2 ln 2     | divergent                                                          |
| `limit(zeta(s)-1/(s-1),s,1)`           | γ              | divergent, because SymPy could not evaluate either one-sided limit |
| `limit(x*sin(x),x,Infinity)`           | does not exist | **exact** `oo*sign(AccumBounds(-1, 1))`                            |

The Bose integral x/(eˣ−1) works, but x/(e^(2x)−1) is called divergent. The same check that restored divergence for Σ1/√n now fires on convergent inputs.

### Did the claimed families generalise?

**Yes:**

- **Beta integrals in the form x^a(1−x)^b:** 5/5, including x^(−1/2)(1−x)^(−1/3), 1/√(1−x⁶) and x²/√(1−x⁴).
- **Rational trig over a full period:** 4/4.
- **Fermi and Bose with unit scale:** x³/(eˣ+1) = 7π⁴/120, x²/(eˣ−1) = 2ζ(3).
- **ζ′:** at 1/2, 4 and −1, and Σ ln n/n⁴.
- **Fourier:** Σcos 2n/n², Σsin 2n/n, Σsin n/n³ and Σsin²2n/n².
- **Products:** cos(3/2ⁿ) = sin 3/3, Viète's 2/π, exp(1/n³) and exp((−1)ⁿ/n) = 1/2.
- **Riccati:** 5/5, including both poles (tan(x+π/4) and 1/(1−x²)).
- **Airy:** 2/2 with new initial conditions.
- **Bessel:** order ½ with new initial conditions, and **order 0**.
- **Constant-coefficient ODEs:** 3rd and 5th order.
- **Transport and Burgers:** 6/6, including the shock refusal.
- **Other PDEs:** reaction–diffusion with −u, polynomial Poisson, 2D heat, and Neumann heat.
- **Nonunique family:** y′ = y^(3/5).

**No:**

| Family               | Fails on                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| log-trig             | 0/6 outside GPT's four cases: ∫₀^π ln sin, ∫₀^{π/4} ln tan (domain guard), x ln sin, ln² sin, ln(1+cos x), ln(2 sin(x/2)) |
| Beta by substitution | 1/(1−x³)^(1/3), √sin x, 1/√sin x on [0, π/2]                                                                              |
| ζ and ln-power       | Σ ln n/n^(3/2), Σ ln²n/n² = ζ″(2), ζ″(0)                                                                                  |
| Fourier powers       | Σ sin³n/n = π/4, Σ sin⁴n/n⁴                                                                                               |
| Euler sums           | Σ Hₙ/2ⁿ = 2 ln 2, Σ Hₙ/n² = 2ζ(3)                                                                                         |
| Domain guard         | ∫x^(1/3)e^(−x) = Γ(4/3), Σ 1/(n!(n+2)) = 1                                                                                |
| Elementary           | ∫₀¹ ln x/√x = −4 is left unevaluated                                                                                      |
| Alternating          | Σ(−1)ⁿ/√n, Σ(−1)ⁿ ln n/n; and Σ(−1)ⁿ n/(n+1) is not called divergent (nth-term test)                                      |
| Products             | Π n^(1/n²) = e^(−ζ′(2)); Π(1+(−1)ⁿ/√n) → 0 is not called divergent                                                        |

**ODE point evaluation (item 5 of the v0.5 prompt) is mostly not done.** Only Riccati, Airy and half-integer Bessel were added. Still "a verified explicit solution is required":

- first-order linear with a 1/x coefficient (3 cases across the two batteries)
- Bernoulli (y′+y = xy³)
- y′ = y³ (no value at 1/4, and the blow-up at 1/2 is not refused)
- homogeneous (y′ = (x+y)/x)
- quadratures giving Ei and Si
- variation of parameters (y″+y = tan x)
- Legendre and Hermite equations whose solutions are polynomials

**PDE:**

- Heat with u(x,0) = x is unanswered.
- The Fourier "approximate" answers use about 3 terms with no error bound. The wave equation with x(π−x) is 0.5% off and Poisson with −1 is 2% off.
- Heat with sin³x data is labelled approximate, although the 2-term sum is exact.

**Output:**

- ∫₀^{π/2} dx/(1+sin²x) = π/(2√2) comes back right but as a 512-character nest of radicals and arctangents.
- The power convention is applied consistently: (−27)^(2/3) = 9, (−32)^(1/5) = −2, (−8)^(2/6) = −2 and √−2·√−8 = −4.

**Speed in Chrome:**

- The first symbolic query takes 4.7 s; v0.4 took 8.5 s.
- After that, the median is 71 ms and p90 is 1.35 s. Five queries took over 5 s.
- One timed out at 15 s: ∫₀¹ ln(1+x)/(1+x²) = π ln 2/8, a classic.

## Prompt for GPT Work (v0.6)

> Continue Unified CAS from v0.5 (attach the ZIP and this file). Rafael's PC audit is in this file. The browser gate passed on Windows (27/27). The same rule applies: fix **methods**, not cases. Show each fix on at least two unseen neighbours, and expect a fresh battery again.
>
> 1. **False divergence (5 wrong answers).** "Divergent" must come from a named test whose hypotheses were checked: the nth-term test, comparison with a stated series, the integral test, a non-integrable endpoint with its order, or a product → 0 or ∞. Name the test in the output. A failed or unknown check means "unevaluated", never "divergent".
>    - Fix x/(e^(ax)−1) for a ≠ 1, x^(s−1)/(eˣ∓1) for non-integer s, ∫dx/(x(1+ln²x)), Σ1/(n(an+b)), and limits where SymPy cannot evaluate a one-sided limit.
>    - An `AccumBounds` or `oo*sign(...)` result means "does not exist". It is never exact (`limit(x*sin(x),x,Infinity)`).
> 2. **Domain guard:** it still blocks x^(1/3)e^(−x), ln tan x on (0, π/4), 1/√sin x, 1/(1−x³)^(1/3) and 1/(n!(n+2)). It also blocks the nth-term test for Σ(−1)ⁿ n/(n+1), and Π(1+(−1)ⁿ/√n) → 0.
> 3. **Make the families general:**
>    - **Log-trig:** use the Fourier series of ln(2 sin(x/2)), with Clausen values on any [0, a]. Cover [0, π], x·ln sin, ln² sin and ln(1+cos x).
>    - **Beta:** handle the substitutions u = xⁿ and u = sin²x.
>    - **Bose and Fermi:** cover any scale a > 0 and any real s > 0.
>    - **ln-power series:** Σ lnᵏn/nˢ = (−1)ᵏζ⁽ᵏ⁾(s) for any k ≥ 1 and real s > 1, plus point values of ζ⁽ᵏ⁾.
>    - **Fourier powers:** reduce sinᵐ(kn)/nˢ and cosᵐ(kn)/nˢ by power reduction.
>    - **Euler sums:** Σ Hₙzⁿ and Σ Hₙ/nˢ.
>    - **Alternating:** Σ(−1)ⁿ/nˢ through η.
>    - **Elementary:** ∫x^a lnᵏx on [0, 1].
> 4. **ODE point evaluation:** this is v0.5 item 5 again, which was mostly not done.
>    - first-order linear with any p(x), by integrating factor
>    - Bernoulli, including y′ = y³ with its blow-up
>    - homogeneous
>    - quadratures with Ei, Si and erf
>    - variation of parameters (tan, sech)
>    - polynomial solutions of Legendre, Hermite and Laguerre
> 5. **PDE Fourier sums:** state the number of terms and an error bound, or sum to 1e-6. Return exact when the data is a finite trig polynomial (sin³x). Add heat with u(x,0) = x.
> 6. **Simplify before returning:** ∫₀^{π/2} dx/(1+sin²x) must come back as π/(2√2). Try `nsimplify`/`radsimp` against a 30-digit value, and reject results over a length budget.
> 7. **Speed:** ∫₀¹ ln(1+x)/(1+x²) times out at 15 s.
> 8. **Windows:** `v05-regressions.mjs` builds `PYTHONPATH` with `URL.pathname`. Use `fileURLToPath`.
>
> Report every claim against an independent mpmath value at 30 digits.
