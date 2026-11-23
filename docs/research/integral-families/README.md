# Integral families

`GUIDE.md` was written by GPT on 2026-11-23 from Rafael's 107 photographs of a
book of integrals (exercises 1–438, not committed: they are the book's pages).
It sorts every exercise into 25 general families (F01–F25). For each family it
gives the method, the parameter values where the method breaks, and the
places where the book's answer key is wrong (#31, #297, #329, #380, #386,
#420, #437, …).

`bench.cjs` runs 84 representative integrals, about three per family plus the
corrected exercises, through Physics Lab's integrator using the Calculus tab
mock-up's engine. `RESULTS.md` holds the full table. It needs the network for
Desmos's API:

```sh
node docs/mockups/calculus-tab/build.mjs
node docs/research/integral-families/bench.cjs
```

## First run (2026-11-23)

64 pass, 9 numeric only, 4 series only, 5 misses, 1 timeout and 1 wrong value,
out of 84. Families F01, F02, F04–F15, F20 and F21 pass every indefinite case,
including #347, #386, #405, #420 and √tan.

Bugs it found:

- **∫₀^{π/2} ln(sin x) dx comes back as NaN.** It is shown as an answer
  ("checked numerically"). The 0/0 nudge in the mock-up's Simpson fallback
  cannot handle a logarithmic endpoint, because sampling just below 0 gives
  ln of a negative number.
- **∫₀³ |x²−3x+2| dx never returns.** It hangs past 20 s.
- **Exact values are not folded.** The value for ∫₋₁¹ x³cos x dx is right
  (0), but it is printed as `3cos(−1) + −(3cos 1) + …`. The answer
  `cos(−2x)/4` in F15 also keeps the minus sign inside the cosine.
- **One substitution is not undone.** For (x+1)/√(x²+4) the answer is correct
  but still contains `tan(arctan(x/2)…)`.

## After the fixes (same day)

65 pass, 14 numeric only, 4 series only, 1 miss, out of 84. Nothing is wrong
and nothing hangs. The fixes:

- **ln(sin x) and every numeric fallback.** The mock-up now uses the panel's
  own route: refuse an interior singularity, then the 40-digit
  double-exponential rules (`quadrature.ts`), whose nodes never land on an
  endpoint. These also handle infinite bounds, so #423, #425 and
  ∫₀^∞ ln(1+e^{−x}) (named as π²/12) now get values instead of being
  refused.
- **|g| with g a polynomial** (`absolute.ts`). The interval is cut at g's
  exact roots, found by factoring over Q, and each piece is integrated
  exactly, then checked numerically: ∫₀³ |x²−3x+2| dx = 11/6 in 9 ms. This is
  in the shipping panel too. It also found that the panel never turned typed
  bars (a `Norm` node) into `abs` on its integral path, so |x| could not be
  integrated at all.
- **Parity.** cos(−a) = cos a and sin(−a) = −sin a, in the exact values
  (`definite.ts`) and in `fold`. ∫₋₁¹ x³cos x dx prints 0.
- **A sum over one denominator, split term by term,** before trying a trig
  substitution: (x+1)/√(x²+4) gives √(x²+4) + arcsinh(x/2).
- **An integral equal to 0 settles.** The 40-digit rule measured agreement
  against the value itself, which never happens at 0. It now also measures
  it against ∫|f|, which gives 0 for #409 and #424.

## The gaps, closed (same day)

79 pass, 3 exact by symmetry with the identity checked numerically, 2 special
constants, out of 84. Every case now has the right value, and nothing hangs.

- **√(g²) = |g|** (`signChanges.ts`). A radicand that is the square of a
  polynomial, in x or in e^{cx}, is read as |g|. Any |g| whose sign changes
  are known exactly then integrates to one formula that is continuous across
  all of them: sign(g)·G − Σ s⁺ᵣ G(r) sign(x − r). This covers #31, #52, #380
  and the four-factor square.
- **Three one-move shapes** (`specialForms.ts`): multiplying by the conjugate
  (F16), the reciprocal-quartic substitution u = √(x⁴ + bx² + c²)/x (#242),
  and the product rule run backwards, e^{ax}(aH + H′) = (e^{ax}H)′ (#393, now
  exactly e^{π/2}).
- **Theorems about the interval** (`definiteTheorems.ts`), each checked
  numerically before it is shown:
  - Proved named results: ∫₀¹ (x^α − x^β)/ln x (#417), Frullani (#423),
    ∫₀^∞ ln(kx)/(x² + a²) (#424), the damped sine (#425), ∫₀^π ln(A + B cos x)
    (#426), ∫₀^∞ ln(1 ± e^{−kx}), and ln sin or ln cos on [0, π/2].
  - Symmetry: an odd integrand on a symmetric interval is 0, proved
    symbolically now that `fold` turns (−x)² into x² (#409). King's rule
    (#258), and reflection to a simpler sum (#329, sin³/(sin³ + cos³)), give
    exact values. Their identities are checked at 24 sample points, not
    proved, and the panel says so.
- **Two values with no elementary closed form:** ∫₀¹ (eˣ − 1)/x and
  ∫₀¹ arctan x / x = G. The right answer is the number to 30+ digits, named
  where it is a known constant.

Still to do: a symbolic proof of King's rule and reflection identities, which
needs trigonometric and exponential identity simplification beyond `fold`.

**A Desmos rule, not a gap:** Desmos refuses `\sin^{3}(x)`. Only the powers 2
and −1 may sit on a trig name, so the cases are written `(\sin x)^{3}`. The
Calculus tab has to accept what Desmos accepts, and nothing more.

The guide's protocol (record the domain, check the exceptional parameters,
verify by differentiating back) matches how the engine already labels its
answers. Its family list is a ready-made test plan for whichever CAS engine is
chosen.
