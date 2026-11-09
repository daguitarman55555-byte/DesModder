# Brief for GPT Work: make CalcForge's differential-equation solver pass its own gates

Use this brief only if Rafael picks the WASM or hybrid engine. It is the follow-up to your report `DesModder_CAS_Differential_Equations_Research.md` and its 70-case `DesModder_CAS_DE_Fixtures.json`. Attach both, plus `CalcForge (5).zip` and your `DesModder_CAS_DE_Probes.zip`.

Work in CalcForge's Python only (`de.py` and the helpers it calls). Nothing in DesModder changes in this pass. Deliver a patched CalcForge zip, a diff, and the rerun evidence.

## The cases your report found wrong, failed or partial

Fix each case, or make it return the correct refusal status. Never return a plausible but wrong answer.

| Case(s)      | Your finding                                                                                 | Required outcome                                                                                                                                 |
| ------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 48           | Logistic IVP at the equilibrium: the valid y = 0 solution is rejected                        | Check the equilibria that dividing by the leading coefficient removed before declaring an IVP inconsistent. Return y = 0.                        |
| 44           | y′ = √y, y(0) = 0: only the immediate branch and zero branch are returned                    | Return the complete family: zero, plus each delayed start (y = 0 for x ≤ a, y = (x−a)²/4 for x ≥ a, a ≥ 0), marked nonunique.                    |
| 15           | Legendre: reports blowup near 1, but y(1) = 1 is finite                                      | A singular coefficient ends the regular interval. Don't claim unbounded values without proof.                                                    |
| 37–38        | Laplace rectangle, Neumann and mixed: an unfitted separated family is returned as the answer | Fit every boundary condition. If you can't, return "partial: conditions not fitted" and nothing insertable.                                      |
| 39, 40, 58   | Poisson rectangle problems fail; 40 refuses without diagnosing incompatible Neumann flux     | Solve the fitted Dirichlet, Neumann and mixed cases. For pure Neumann, check the compatibility condition and the gauge, and say which one fails. |
| 56–57, 61–64 | Heat and wave on rectangles fail, although exact eigenmodes exist                            | Solve them as finite eigenfunction sums, with the tail bound and labels from your section 4 policy.                                              |
| 47           | Timeout in the native budget                                                                 | Find the slow path. Either solve it inside the budget or refuse quickly with a reason.                                                           |
| 43, 59       | Formal time series with no certified domain; no post-shock continuation                      | Report the validity interval, or the shock time where the series ends. Don't extend past the shock.                                              |
| 18, 19       | Mathieu and Heun: one local branch, no error or domain                                       | Return two independent local branches where they exist, the radius used, and the error status.                                                   |
| 70           | DAE syntax refused without diagnosing the inconsistency                                      | Parse algebraic constraints and report the inconsistency.                                                                                        |

## Engine hygiene needed before it can run inside the extension

- **Remove cross-query state.** Remove the mutable per-process scratch state (`DE.LAST` and any others you find), or reset it per job. Two queries in a row must never see each other's state; prove it with a test that interleaves fixtures.
- **Give each result the typed fields your report specifies:** method, exactness, branch scope, validity, equation residual, IC/BC residual, verification type and renderability. Return plot data as a typed payload, separate from LaTeX.
- **Add a cooperative time budget** so a long solve can be cancelled without killing the worker. If that is impossible in Pyodide, say so with evidence.

## Gates

- **Rerun all 70 fixtures** with your verifier, on native CPython and on Node WASM (source assets). Report a before/after table per case: pass, series pass, partial (with reason), correct refusal, wrong or timeout.
- **"Wrong" must be zero.** No case that previously passed may regress.
- **Report boot time and peak RSS** for the patched source build, using your section 2 method, so they compare directly with the 8.0 s boot and 343 MiB peak you measured.

Keep the evidence classes. Don't touch DesModder production files.
