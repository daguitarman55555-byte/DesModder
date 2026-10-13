# Vector Tools next AP demos — implementation and verification ledger

Base code inspected: `daguitarman55555-byte/DesModder`, `feature/vector-tools-foundation`, initially `1c660cf374a1fab3b24c00e9a74d064bd699d75a`; the branch then advanced to **`622bd13472d5f03132ded0801c501d88c3ed4f9e`**, a descendant of requested commit **`934cf6583e0c0c55cad295182b01113b9019445c`**. The existing workflow already had the gpt/\* branch filter and per-branch concurrency by then. This is a **local review patch prepared against 622bd134**, not a remote commit; **no GitHub branch was pushed**.

## Completed in proposed patch

- `ap-gauss-flux` — AP2 unit 10 shelf (AP C E&M unit 8). Full 3D Coulomb vector field of two movable point charges, a movable spherical Gaussian surface, native Desmos Fibonacci equal-area quadrature `Phi_g`, exact discontinuous enclosed-source sum `Q_g`, numeric residual `D_g`, and a normal-component sample `E_gn`. Includes 2D Coulomb-field section, which is NOT a 2D Gaussian flux measurement. In 3D, the sphere is neutral and transparent and the selected normal-probe has sign-dependent color. Continuous color-mapping of the entire Gaussian surface is _not implemented or measured_.
- `ap-ampere-loop` — AP2 unit 12 shelf (AP C E&M unit 12). Exact magnetic field of two ideal infinitely long z-directed currents, a 3D circular loop tilted about the x axis, native midpoint circulation `C_a`, exact enclosed current `I_enc`, and residual `D_a`. The 2D loop is its elliptical projection. The path must not intersect a wire.
- `ap-incline-forces` — AP1 unit 2. Native ramp, block, gravity, normal, friction and net-force arrows. Exact static/kinetic branch with `theta_break = atan(mu_s)`. `mu_k <= mu_s` is the conventional physical region; users can edit the sliders independently to illustrate nonstandard parameter choices. The GPU stream represents **gravity**, not the block's velocity.
- `measurements.ts` — a shared opt-in GalleryPreset decorator with two draggable tape endpoints, native Pythagorean length and an expression-list stopwatch linked to `T_scene`. In 3D, endpoints include `drag3d` slider triplets and `name3d` labels. Apparatus is Explanatory-only.
- `ap-next.unit.test.ts` and `ap-next-physics.ts` — pointwise E and B tests, Gaussian flux, tilted-loop circulation, and friction-threshold tests.

## Physics and native Desmos readouts

### Gauss's law

Normalized constants: `epsilon_0=1`, hence `k_e=1/(4*pi)`. For point charges at r_j,

`E(r) = sum_j q_j (r-r_j)/(4*pi*|r-r_j|^3)` (exact away from the charges).

The sphere center C and radius R are sliders. The surface samples use the golden-angle sequence, `z_n=1-2(n+1/2)/N`, `phi_n=mod(2.399963229728653*n,2*pi)`, and `r_n=C+R*(sqrt(1-z_n^2)*cos(phi_n),sqrt(1-z_n^2)*sin(phi_n),z_n)`. Native `J_g(n)=E(r_n)·(r_n-C)/R`, then `Phi_g=(4*pi*R^2/N)*sum_{n=0}^{N-1}J_g(n)` (approximate). `Q_g=sum_j q_j*1_{|r_j-C|<R}` (exact except the charge-on-surface boundary). The scalar `E_gn` shows E·n at a movable angular sample. Color of this sample is positive/outward versus negative/inward. The sphere itself is a transparent **mathematical surface** and hides in Majestic; it is not a physical solid.

Defaults: q1=2 at (-.7,0,0), q2=-1 at (2.5,0,0), C=(0,0,0), R=1.7, N=80, alpha=1.0, beta=1.2. q in [-3,3] step .25, charge coordinates and center in [-4,4] or [-3,3] step .1, R in [.5,4] step .1, N in [40,200] step 20, angles alpha in [0,6.28] and beta in [.05,3.09] step .05. Explanatory: transparent sphere, two charges, movable center, selected sample and readouts. Majestic: only two visible charge spheres and the glowing electric field. Color quantity: signed radial field component relative to Gaussian center (extended off the surface), scale 1.5, charge-glow palette, 24000 _ 0.7 particles 2D and 30000 _ 0.8 particles 3D, speed .28 and .168. Must not claim numerical quadrature is exact or that the 2D circle is a true Gaussian integration surface.

### Ampère's law

Normalized `mu_0=1`. Long wires through (X1,0,z) and (X2,0,z) have `B(x,y)=sum_j I_j*(-y,x-X_j,0)/(2*pi*((x-X_j)^2+y^2))`, valid away from wire cores. Loop center C, radius R and tilt alpha:

`r(t)=(Cx+R*cos t, Cy+R*cos(alpha)*sin t, Cz+R*sin(alpha)*sin t)`;
`dr/dt=(-R*sin t,R*cos(alpha)*cos t,R*sin(alpha)*cos t)`.

`C_a=(2*pi/N)*sum_{n=0}^{N-1}[B(r(t_n))·r'(t_n)]`, `t_n=2*pi*(n+.5)/N` (approximate). `I_enc=sum_j I_j*1_{(X_j-Cx)^2/R^2+Cy^2/(R^2 cos^2 alpha)<1}` (exact winding count with tilt < pi/2). Magnetic stream particles follow B, not the integration loop; GPU tint is |B|, scale .6, charge-glow, .32 speed and density .85 2D/.8 3D. Explanatory: two rods, integration loop and Desmos readouts; Majestic: rods and glowing B, hides mathematical loop. Defaults: I1=1,I2=-.6,X1=-1.7,X2=1.7,C=(-1.7,0,0),R=1,tilt=.3,N=80. Tilt [0,1.15], N [40,160] step 20. `C_a = I_enc` is the exact continuous law; finite-N results have discretization error, especially if the path gets near a wire.

### Incline

Let theta be incline angle, m and g positive, `N=m*g*cos(theta)`. For a block released from rest, `f_s=m*g*sin(theta)` if `tan(theta)<=mu_s`, otherwise `f_k=mu_k*N`, applied upslope, and `F_net=m*g*sin(theta)-f`. Acceleration downslope is `F_net/m`, with breakaway angle `atan(mu_s)`. No unmodeled thrust, rolling, air drag or velocity-dependent friction. The static branch is exact for the specified ideal dry-friction model; the sliding branch assumes the block is moving downslope, and is not a general dynamical integrator.

Defaults theta=.43 rad (range .05 to 1.12 step .01), mu_s=.55 and mu_k=.3 (0..1.2 step .05), m=2 (0.5..4 step .1), g=2 (.5..4 step .1). Explain arrows in Explanatory. Majestic retains visible ramp and block; glowing vertical stream is the true uniform gravitational field g, colored by gravitational potential/mass `g(y+3)` in 2D and `g(z+3)` in 3D. Palette charge-glow, tint scale 5, speed .24, densities .58 (2D) and .50 (3D).

## Incomplete designs requiring the next CI iteration

### Magnet through a coil — NOT BUILT

Existing `physics-teaching.ts` models the exact exterior field of a uniformly magnetized rectangular prism via face-integrated arctangent/logarithm terms (not a point dipole). A physically consistent moving-coil preset should factor that formula into one shared exported function taking a time-dependent displacement `x_m(t)`, reuse it for shader vectors and native integration, and define a loop in the yz plane at x=0. For a coil radius R and loop-normal +x, use polar disk sampling `y=R*rho*cos(phi), z=R*rho*sin(phi)`, weight `R^2*rho*d(rho)d(phi)` and compute Phi(t). EMF is `-dPhi/dt`, either via Desmos native differentiation with confirmed acceptance or a **disclosed finite-difference** derivative. Use a batched/native cached table of at most 64 time samples for traces. Do **not** naïvely nest the full prism field into a continuously replotted graph: that multiplies 8 face-corner transcendental calls by radial/angular quadrature times every sampled time and can freeze the calculator. A reference numeric integration and cancellation/near-field tests are required before registering the preset. Explanatory should show magnet, coil, flux and emf traces with units; Majestic shows only moving magnet, coil and physical B field colored by |B|. Must not claim quasistatic B determines radiation or exact emf in a fast-moving regime.

### Measuring tools — interface integration still needed

Proposed `GalleryPreset.measurements?: {tape?:boolean;stopwatch?:boolean}`. The patch adds this type and decorates selected spatial AP presets. Preset window should show `Tape` toggle (native `s_tape`), numeric `d_tape`, `Start/Stop/Reset` controls bound to the existing scene clock, and `tau_watch` readout. Present patch supplies the native tape objects and expression-list stopwatch, but **does not add the numeric readout to the floating presets window**; this is a remaining UI task. 3D Desmos cannot label points itself, so use `SceneItem.name3d` as implemented; verify actual text placement live.

### 3D Gaussian surface coloring — NOT MEASURED

`SceneItem.colorLatex` can select the color of a probe using a scalar signed `E_gn`; a full per-vertex surface color mapping is not established. Do not say that the sphere is continuously heatmapped. If not possible, use a 10x8 patch tessellation colored with one scalar each, test renderer frame rate and scene recompute, and keep the neutral surface if tessellation is too slow. Avoid any unsupported claims from unsighted CI screenshots.

## Appearance proposals (not evaluated by screenshots)

For each item below, `glow` is the particle layer control proposal, not a validated increase in quality. All numeric changes require CI screenshot inspection and Rafael's GPU performance check. Preserve explanatory markers and physical solids; keep all explanatory lines and labels hidden in Majestic.

| Preset            | Proposed Majestic palette, tint scale, density, flow speed, glow | Solids / reason                                                                      |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| ap-projectile     | charge-glow, 2.8, 1.0, .13, .12                                  | Amber body and slate ground; increase color separation at the apex                   |
| ap-shm            | charge-glow, 3.5, .85, .22, .10                                  | State marker only; reduce saturated outer contours                                   |
| ap-circular       | charge-glow, 2.5, .75, .24, .12                                  | Moving solid marker; clearer radial energy gradient                                  |
| ap-nozzle         | charge-glow, 1.8, .40, .35, .08                                  | Both walls; avoid washed-out throat                                                  |
| ap-conductor      | charge-glow, 2.5, 1.0, .55, .12                                  | Sphere and charged hemispheres; stronger equipotential polarity                      |
| ap-induction      | charge-glow, 1.7, .75, .55, .15                                  | Coil; less dim near alternating zero-crossings                                       |
| ap-motion-graphs  | charge-glow, 2.4, .65, .22, .08                                  | Track and moving body; keep graphs out of Majestic                                   |
| ap-pendulum-phase | charge-glow, 2.5, .85, .25, .14                                  | Rod, pivot, bob; highlight nonlinear libration region                                |
| ap-kepler-areas   | charge-glow, 2.0, .75, .26, .12                                  | Focus and orbiting body; accentuate perihelion speeds without falsifying orbit times |
| ap-gauss-flux     | charge-glow, 1.5, .7, .28, .12                                   | Charge spheres only; Gaussian surface is conceptual and hidden                       |
| ap-ampere-loop    | charge-glow, .6, .85, .32, .11                                   | Wire rods, not the mathematical loop                                                 |
| ap-incline-forces | charge-glow, 5, .58, .24, .07                                    | Ramp and solid block; avoid mistaking gravity tracer for a block trajectory          |

## Verification ledger

**Live in CI:** NONE. No gpt branch was pushed. No Pages run, results.json or screenshot corresponding to this patch exists. Refused expressions, p95 recompute, all modes, and 3D colorLatex are **not tested**.

**Analytic (executed locally):** JavaScript reference equations evaluated for two point charges and two wires. Gauss at R=1.7 with N=80 gives 1.9980433 (exact Q_enc=2), with N=2000 gives 2.0000006; at R=3 N=80 gives 1.0280619 (Q_enc=1) and N=2000 gives 0.99999995. Ampère at tilt 0, 0.3, 0.9, each centered on wire 1, no wire, or wire 2, equals 1, 0 or -0.6 within floating error for N=160. The Jest source includes additional incline and point-field checks; Jest itself has not run.

**Structural (executed locally):** strict TypeScript isolated compilation of `ap-next.ts`, `ap-next-physics.ts`, and `measurements.ts` against a matching lightweight interface succeeds using TypeScript 5.8.3. This is **not** `npx tsc --build` of the complete repository. Inspected `types.ts`, `gallery/index.ts`, scene conventions, existing unit test style, workflow paths and 3D scene naming contracts. `gauss` 2D field no longer references the undefined 2D coordinate z.

**Not checked:** Repository lint/format, full project TS, Jest, extension build, native Desmos acceptance, CI slider p95, CI screenshot review, screenshot quality, full 3D E·n surface coloring, coil demo, floating-window measurement readout, GPU FPS. Do not merge before those pass.

## Recommended release sequence

1. Use the verified `622bd134` base or a newer descendant; resolve any concurrent helper refactors/3D-label work.
2. Apply `vector_tools_next.patch` on a detached working branch; run `npm run test:unit`, `npx tsc --build`, `npm run build` and format tests.
3. Push ONLY to `gpt/gauss-ampere-incline`, and verify the CI run's SHA. Read `results.json`, every live screenshot and the `vector-tools-verification` artifact. Iterate until zero refusals and all slider p95 values <150ms; treat runner FPS as diagnostic only.
4. Once stable, refactor and add exact prism magnet/coil with cached quadrature, after modeling the true computational cost.
5. Add floating-window stopwatch readout and verify 3D labels. Only consider per-patch Gaussian surface color after a direct live Desmos experiment.

College Board references: current AP C E&M Units 8, 12, 13; AP Physics 1 Topic 2.7, and AP2 Units 10,12. See https://apcentral.collegeboard.org/courses/ap-physics-c-electricity-and-magnetism and https://apcentral.collegeboard.org/media/pdf/ap-physics-1-course-and-exam-description.pdf .
