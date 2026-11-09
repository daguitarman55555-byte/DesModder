# Unified CAS v0.3: tested on Rafael's PC

2026-11-09. Tested `Unified_CAS_v0.3_Exact_Closure.zip`, the Axiom and CalcForge merge GPT built.

Environment: Windows 11, i7-1185G7, Chrome for Testing 131 (headless, Puppeteer 24), native Python 3.12 with SymPy 1.14.0.

## Its own suites

| Suite                                        | Result                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| `npm test` (JavaScript)                      | 33/33 pass                                                   |
| `tests/integration.mjs` (native SymPy)       | 100/100 pass                                                 |
| `tests/exact-regressions.mjs` (native SymPy) | 36/36 pass                                                   |
| `tests/browser.cjs` (the real app in Chrome) | **Fails** on the first symbolic query; see the blocker below |

GPT reported that its browser test could not run (the sandbox blocked it). Two more notes:

- The browser test launches Chrome with Linux-only flags (`--single-process --no-zygote`), which detach the frame on Windows. A copy with the default flags was used.
- `tests/browser-exact.py` needs Playwright and `/usr/bin/chromium`, so its cases were run through Puppeteer instead.

## Blocker: the shipped app cannot load its new module

`calcforge/worker.js` copies a fixed list of Python files into Pyodide: `unified.py` and `differential.py`, but not the new `exact_core.py`. In the browser, every query that reaches the symbolic worker therefore fails:

```
File "/home/pyodide/unified.py", line 7, in <module>
    from exact_core import finish, convergence, rational_infinite_product
ModuleNotFoundError: No module named 'exact_core'
```

The native suites import from disk, so they never see this. Fast-tier queries (`pi/4`, `gamma(1/2)`) still work.

**Fix:** add `'exact_core.py'` to that list. With that one change, the whole browser smoke test passes. Everything below was measured with it.

## Independent battery: 72 queries, checked against mpmath at 30 digits

Each query went through the real app in Chrome. Its exact answer was evaluated to 30 digits and compared with a reference computed separately in mpmath.

| Outcome                                                                  | Count |
| ------------------------------------------------------------------------ | ----- |
| Correct exact/symbolic value, or correctly refused (divergent/undefined) | 57    |
| Not answered (`unevaluated`/`error`), no false claim                     | 14    |
| **Wrong**                                                                | 1     |

Three complex constants (`e^(ln(pi))*sqrt(-1)` = iπ, `log(-1)` = iπ, `i^i`) failed only because my checker compared at double precision; their values are right. `i^i` is returned unsimplified rather than as `exp(-pi/2)`.

**Wrong: `sum(sin(n)/n,n,1,Infinity)` is reported divergent.** It converges (conditionally) to (π−1)/2 = 1.0707963…, confirmed with mpmath `nsum`. The convergence certificate rejects valid conditionally convergent series.

**Not answered:**

| Query                                                 | Expected                  | What it said                                                         |
| ----------------------------------------------------- | ------------------------- | -------------------------------------------------------------------- |
| `int(1/sqrt(1-x^4),x,0,1)`                            | Γ(1/4)²/(4√(2π))          | unevaluated                                                          |
| `int(x/(exp(x)-1),x,0,Infinity)`                      | π²/6                      | unevaluated                                                          |
| `int(x^3/(exp(x)-1),x,0,Infinity)`                    | π⁴/15                     | unevaluated                                                          |
| `int(log(sin(x)),x,0,pi/2)`                           | −π ln 2 / 2               | "could not establish the real domain"                                |
| `int(sqrt(tan(x)),x,0,pi/2)`                          | π/√2                      | same domain guard                                                    |
| `int(tan(x),x,0,pi)`                                  | divergent                 | same domain guard                                                    |
| `sum(1/n!,n,0,Infinity)`                              | e                         | "could not verify every index is in the domain"                      |
| `product(1+(-1)^n/n,n,2,Infinity)`                    | 1                         | convergence not established                                          |
| `limit((tan(x)-sin(x))/x^3,x,0)`                      | 1/2                       | domain guard                                                         |
| `limit(x*gamma(x),x,0)`                               | 1                         | domain guard                                                         |
| `limit(n!/n^n*exp(n)/sqrt(n),n,Infinity)`             | √(2π)                     | domain guard                                                         |
| `at(diff(zeta(s),s),s,0)`                             | −ln(2π)/2                 | left as `Subs(Derivative(...))`                                      |
| `solve y'=-y/x where y(1)=1 at x=-1`                  | undefined (crosses x = 0) | "verified explicit solution required"                                |
| `solve x^2*y''+x*y'-y=0 where y(1)=1; y'(1)=1 at x=2` | 2                         | **parse error**: "Each equation and condition needs one equals sign" |

The domain guard is the main limiter. It refuses textbook limits like (tan x − sin x)/x³ and sums like Σ1/n!.

**Notable passes:**

- Γ(1/4)/4 for ∫e^(−x⁴)
- −γ for ∫e^(−x) ln x
- π²/12 for ∫ln(1+x)/x
- (π coth π − 1)/2 for Σ1/(n²+1)
- cosh(√3π/2)/(3π) for Π(1−1/n³)
- −γ for Γ′(1)
- resonance y″+4y = sin 2x giving −π/4 at π
- the y′ = y² pole correctly refused at x = 1
- the logistic zero solution
- the complete delayed y′ = √y family
- point values for the heat, wave, transport and Laplace equations

**Timing in Chrome:**

- The first symbolic query costs 4.2–5.3 s (worker boot).
- After that, the median is about 100 ms and the slowest was 1.9 s.
- The fast tier answers in 1–25 ms.

**Notation:** `eln(pi)sqrt(-1)` is read as e·i·ln π, the literal product. Rafael's example probably meant e^(ln π)·√−1 = iπ, which `e^(ln(pi))*sqrt(-1)` does return.

## Prompt for GPT Work (v0.4)

> Continue Unified CAS from v0.3 (attach the v0.3 ZIP and this file). Fix in this order, adding each case to the regression suites, and run the browser suite in an unrestricted Chrome before reporting:
>
> 1. **Blocker.** `calcforge/worker.js` omits `exact_core.py`, so every symbolic query fails in the browser. Add a test that boots the real worker and imports every module `unified.py` imports, so a missing file can't ship again. Make `tests/browser.cjs` launch without the Linux-only flags.
> 2. **Wrong answer.** `sum(sin(n)/n,n,1,Infinity)` is called divergent; it converges to (π−1)/2. Add Dirichlet/Abel tests to the convergence certificate. "Divergent" must only be reported with a divergence proof; otherwise say "convergence not established".
> 3. **The domain guard refuses valid textbook cases.** Examples: `limit((tan(x)-sin(x))/x^3,x,0)`, `limit(x*gamma(x),x,0)`, Stirling's limit, `sum(1/n!,n,0,Infinity)`, and `int(log(sin(x)),x,0,pi/2)`. The guard must establish the domain on a punctured neighbourhood, an integer index range or the open interval, rather than give up. `int(tan(x),x,0,pi)` must become "divergent", not "unevaluated".
> 4. **Missing exact families.** Add Bose/Fermi integrals (∫xˢ⁻¹/(eˣ∓1) = Γ(s)ζ(s), with the η version), Beta-function substitutions (∫(1−xⁿ)^(−1/2), giving Γ(1/4)-type constants), and ζ′(0). Simplify `i^i` to `exp(-pi/2)`.
> 5. **Parser and ODE gaps.** `solve x^2*y''+x*y'-y=0 where y(1)=1; y'(1)=1 at x=2` gives a parse error; it should give 2. `solve y'=-y/x where y(1)=1 at x=-1` must be "undefined: crosses the singular point x=0".
>
> No answer may be labelled exact without an independent numeric check at 30 digits.
