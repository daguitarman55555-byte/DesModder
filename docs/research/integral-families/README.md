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

## What the first run showed (2026-11-23)

64 pass, 9 numeric only, 4 series only, 5 misses, 1 timeout and 1 wrong value,
out of 84. Families F01, F02, F04–F15, F20 and F21 pass every indefinite case,
including #347, #386, #405, #420 and √tan.

Bugs:

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

Gaps, ordered by how many book exercises they block:

1. **√(g²) = |g|.** Not recognised (#31, #52, #380 and the four-factor
   square), so a series answer is given where a piecewise elementary one
   exists. The guide says this is the trap the key itself falls into.
2. **Infinite bounds with no antiderivative.** This affects F22 and F24
   (#423, #424, #425, ∫₀^∞ ln(1+e^{−x})). These need Frullani,
   differentiation under the integral, or Li₂ special values. The engine
   currently refuses them and does not guess.
3. **Symmetry proofs.** F17 and F18 (#258, #329, #409, sin³/(sin³+cos³)) get
   the right value only numerically. The recogniser then names the constant,
   but nothing proves it.
4. **Conjugate rationalisation and the reciprocal-quartic substitution** (F16,
   #242).
5. **Desmos rule, not a gap:** Desmos refuses `\sin^{3}(x)`. Only the powers 2
   and −1 may sit on a trig name, so the cases are written `(\sin x)^{3}`. The
   Calculus tab has to accept what Desmos accepts, and nothing more.

The guide's protocol (record the domain, check the exceptional parameters,
verify by differentiating back) matches how the engine already labels its
answers. Its family list is a ready-made test plan for whichever CAS engine is
chosen.
