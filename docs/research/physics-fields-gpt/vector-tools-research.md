# Vector Tools: buildable physics and presentation designs

Research date: 7 October 2026. Scope: the supplied brief, amended by your request to research **both no-writing and writing options**, each supporting independently toggleable GPU main vectors and vector names such as `\vec{E}`.

## Decisions

Use one physics model with two presentation modes. The no-writing mode must remain understandable through objects, geometry, motion and teacher controls. The writing mode adds short contextual explanations, equations and optional measurements. In **either** mode, teachers may enable main vectors and their names independently. Turning on vector names is the explicit exception to the original no-writing rule; a completely text-free view is still available.

Make objects solid, lines crisp, particles restrained, and field magnitude measurable with sparse arrows. Particle brightness is not a field-strength measurement. A gravitational or electric field tracer is not the trajectory of a massive object or test charge.

The repository was subsequently supplied and inspected at branch `feature/vector-tools-foundation`, commit `4cd8cdd9e699b4620260d972e233613937466b60`. I reviewed the relevant compiler, renderer, gallery and loading code plus the 2D/3D preset sheets and closeups. The seven core presets’ helper expressions passed a syntax/dependency check through that compiler, with scalar names provisioned by the test. Full Desmos graph loading, GPU shader linking, visual integration and performance remain untested. Numerical physics checks were run independently.

### What the actual branch changes about the brief

- **3D normalized speed and fixed color already work.** Use normalized speed for field-direction demos; leave it off for velocity demos. True-speed playback caps pace at four times its scale, so its speed is not physical above that cap. Non-cubic box normalization also changes the speed factor with direction. Use a cubic box and stay below the cap for quantitative fluid motion. [Flow3DRenderer](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/Flow3DRenderer.ts#L272).
- **Absorb is a magnitude threshold, not a geometric core.** It removes a particle when |F| exceeds 30 times scale. For charges/planets, explicitly mask physical interiors in the visualization field; do not expect absorb to know body radii. For magnets use absorb=false, so strong B is not mistaken for a sink. [Absorption implementation](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/Flow3DRenderer.ts#L325).
- **3D traces and particles share an either/or flow-renderer slot.** Choose traced lines with their built-in moving light window for a clean teaching look, or particle flow with geometry/arrows. Do not budget simultaneous independent trace and particle overlays as an existing capability. [Renderer selection](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/plugins/vector-tools/index.ts#L503).
- **The trace renderer starts uniformly in the box and alternates integration direction.** It does not sample the particle seed. It helps source/sink symmetry but does not guarantee equal flux per line, lines starting exactly on sources, or complete closed loops in a finite trace length. Its moving light window supplies motion without a particle overlay. [Trace initialization](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/Volume3DRenderer.ts#L184).
- **Thin seeds are a real implementation limitation.** 2D attempts up to 48 rejection samples; 3D uses a 4,096-entry birth pool with up to 64 attempts per refreshed entry, refreshed over 16 frames. Empty entries hide particles until retry; moving seeds lag the rolling pool. Prefer a broad single Gaussian slab `exp(-z²/0.16)` over an extremely thin hard slab when occupancy is poor. A source shell of radius 0.12 in a ±5 3D box is too tiny for reliable births; keep it an experiment, not a default. [2D births](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/FlowRenderer.ts#L1112), [3D pool](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/Flow3DRenderer.ts#L350).
- **Compiler singularities are not automatic holes.** Division clamps tiny denominators, log/sqrt clamp arguments, and some inverse functions clamp domains. Explicit piecewise domain guards are essential for the exact exterior models. Graph helpers become GLSL functions rather than textual expansion; driver optimization remains unmeasured. [Compiler helpers](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/latexToGLSL.ts#L125).
- **The cylinder implementation uses the opposite circulation sign to the brief’s requested stagnation formula.** Its positive w is counterclockwise and yields sin θ=+wR/(2U); this report explicitly uses clockwise-positive w and the brief’s negative sign. Migrate the control convention and marker together, or reverse w in these formulas to preserve existing behavior. [Current cylinder](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/gallery/physics.ts#L133).
- **Gallery loading raises saturation to 1.45 and contrast to 1.2.** Muted palettes alone cannot fully undo that. A physics-preset style should use saturation=1, contrast=1 initially, with a narrow preset look override instead of the current unconditional vivid styling. [Gallery loading](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/plugins/vector-tools/gallery.ts#L100).
- **The expected expression-folder addition has an existing ownership path.** Extend the generated-set mechanism used by `loadPresetVariables`; the current gallery type has no general expression collection. Sparse arbitrary-anchor vectors and GPU names were not found in the inspected arrow-renderer interfaces. [Preset loading](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/plugins/vector-tools/index.ts#L1912), [gallery types](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/gallery/types.ts).

## 1. Ranked implementation plan

Estimates are engineering judgment in person-days for someone familiar with this fork, including focused verification; they are not measured estimates from a repository review.

| Order | Work                                                                     |           Estimate | Why now                                                                        |
| ----- | ------------------------------------------------------------------------ | -----------------: | ------------------------------------------------------------------------------ |
| 1     | Preset-owned Desmos folder; geometry and visibility groups               |                1–2 | Fixes missing plates, bodies, charges and magnets across the gallery           |
| 2     | Electric charges: exact exterior field, flux contours, probe             |                1–2 | Largest current teaching failure; strong AP relevance                          |
| 3     | Sparse GPU main-vector instances and optional symbol labels              |                2–4 | Shared by both presentation modes and almost every demo                        |
| 3a    | Randomized three-body mode with screened lifetimes and collision restart |                3–5 | Your added priority; a separate small dynamics/trajectory provider is required |
| 4     | Capacitor plus uniform-field charge motion                               |                1–2 | Clear field, force, potential and motion comparisons                           |
| 5     | Wires, then static dipole                                                |                1–2 | Cheap, exact, visually coherent magnetism                                      |
| 6     | Earth–Moon bodies, scale controls, field probe                           |                1–2 | Replaces haze with recognizable objects                                        |
| 7     | Pressure/buoyancy and narrowing-pipe demos                               |                1–2 | High-value AP Physics 1 fluids coverage                                        |
| 8     | Cylinder with pressure and lift                                          |                1–2 | Strong fluid demonstration, but circulation model needs care                   |
| 9     | Finite bar magnet                                                        |                2–3 | Exact end geometry costs more shader work; benchmark early                     |
| 10    | Faraday induction and conductor in uniform field                         |           1–2 each | High-value extensions once overlays exist                                      |
| 11    | Space-shelf appearance pass                                              |                2–4 | Lower curricular priority; improve solids before adding particles              |
| Defer | Full loop/solenoid volume field, general orbit solver, realistic plasma  | Separate estimates | Cannot honestly promise these cheaply under current constraints                |

Do not expand every preset before proving electric charges and the capacitor on an Iris Xe projector setup.

## 2. Presentation: both modes, shared toggles

| Control          | No writing, default | Writing, default | Meaning                                                         |
| ---------------- | ------------------- | ---------------- | --------------------------------------------------------------- |
| Objects          | On                  | On               | Charges, plates, planets, magnet, cylinder                      |
| Field lines      | On where useful     | On where useful  | Geometry of the field, independent of tracer brightness         |
| Moving tracers   | On, subdued         | On, subdued      | Direction or actual fluid velocity, according to the preset     |
| Field-arrow grid | Off                 | Off              | Optional sampled magnitude/direction throughout space           |
| Main vectors     | Off                 | On               | A few arrows at a probe or physically meaningful anchor         |
| Vector names     | Off, available      | On, available    | `\vec{E}`, `\vec{B}`, `\vec{g}`, `\vec{v}`, `\vec{F}`           |
| Components       | Off                 | Off              | Optional component/contribution arrows; never automatic clutter |
| Explanation      | Off                 | On               | One short, context-dependent statement                          |
| Equation         | Off                 | Off              | Relevant relation, shown on request                             |
| Values and units | Off                 | Off              | Quantitative mode only, with declared physical scaling          |

Keep preferences when changing a preset. Hide labels when their corresponding vectors are hidden, but remember the labels preference. A zero vector becomes a small neutral probe marker; do not normalize numerical noise into an arrow. Non-finite vectors are omitted. At nulls, writing mode can say “Net field: zero”; no-writing mode needs no annotation.

### Main-vector rendering contract

The documented arrow grid does not establish support for arbitrary probe anchors, multiple quantities or labels. Treat these as a **specific proposed addition**, not an existing capability:

1. Feed a small instance buffer, typically 1–8 entries, with anchor, vector, color, visibility and scale group. Reuse the GPU arrow geometry/projection/depth path. Evaluate probe expressions only at probes, not for every particle.
2. Use a fixed vector-symbol alphabet drawn with instanced line strokes: E, B, g, v, F, a, L, I, a vector accent, plus simple subscripts. This needs no image textures or general font engine. Names are display metadata, never input to `latexToGLSL`.
3. Project a label anchor near the arrow tip, then draw screen-facing strokes at a constant readable screen size. A low-cost backing/outline maintains contrast. Limit to a few names and resolve collisions among those few labels on the CPU. Apply the same visibility/depth decision to arrow and label, including an optional explicitly chosen “always visible” teaching overlay.
4. Arrows that represent the same quantity share one fixed linear scale. Different quantities, such as E and F, need separate scale groups. Log or normalized arrow length is an explicitly selected qualitative mode, not a quantitative default. Never rescale each contribution independently in a vector sum.

The whole GPU-label requirement is optional at display time, but supporting it is required by your amendment. If only arrows must be GPU drawn, Desmos point labels are a smaller alternative for names; its API documents point-label visibility and LaTeX labels. That is an alternative, not fulfillment of an all-GPU label requirement. [Desmos API](https://www.desmos.com/api/v1.12/docs/index.html?lang=en).

### Writing options worth researching/building

**A. Symbol-only:** main vectors and `\vec{E}`-style names, no prose. This is the bridge between the two modes.

**B. Compact explanation:** one sentence plus an optional equation in an ordinary plugin panel, away from the graph. Example for a negative test charge: “The force points opposite the electric field.” Equation: `\vec{F}=q_{0}\vec{E}`. No need to build GPU prose rendering.

**C. Predict-and-reveal:** teacher enables a short prompt, changes a slider, then reveals an explanation. Example: “What changes when the test charge changes sign?” Keep prompts teacher-controlled; do not interrupt a live lesson with automatic popups.

PhET’s design research supports limited, strategically placed labels and interactive exploration; it does not establish that either universal text removal or verbose explanations are optimal. The two modes here are a design recommendation, not a experimentally validated outcome for this product. [PhET simulation interview research](https://phet.colorado.edu/publications/archive/Phet%20Interview%20Paper.htm).

## 3. Formula, clock and scale conventions

All code blocks contain one expression per line. Function definitions belong in the Desmos folder; component slots receive only the right-hand component expression, such as `f(x,y,z)`. Helpers are single-expression functions using Latin names. Reused helper names are local to a preset: the implementation must namespace or resolve collisions consistently rather than overwrite an existing user expression.

Constants default to dimensionless teaching units. Set `k=1` for Coulomb normalization, `G=1` for gravity, and the magnetic constants as described below. Do not print SI units on normalized values. Numeric sliders use step 0.1 unless otherwise specified; binary controls use step 1. Physical constants normally stay hidden.

**Two-dimensional Coulomb/gravity scenes are sections of a three-dimensional field**, not the fields of charges or masses in a genuinely two-dimensional universe. Do not replace inverse square with inverse radius merely to obtain a convenient planar stream function.

`t` in field components is the plugin clock. In Desmos parametric curves, `t` can instead be a curve parameter. Use `T` for the graph’s animated scene-time slider. A single graph ticker may drive T, which the shader reads as a uniform. Do not assume the plugin’s clock automatically animates graph geometry. A later shared-clock binding is optional infrastructure, listed below.

At poles, use a physical core or explicit domain exclusion, not arbitrary softening. Softening changes the source model. Avoid evaluating an unguarded singular denominator in an inactive expression branch until the compiler’s piecewise behavior is verified.

### Starting rendering recipes

These are tuning candidates, not benchmark results. View/box half-width starts at 5 except Earth–Moon, which starts at 12. Dark navy backdrop `#070c14`; low glow; no additive white cores around ordinary objects. Opacity fractions assume the implementation exposes a normalized opacity control.

| Recipe                | 2D settings                                                                                                                                                            | 3D settings                                                                                                                  |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Field teaching        | 16k particles; normalized direction; speed 0.3; persistence 0.94; dropRate 0.03/frame; opacity 0.12; fixed pale blue-white; colorScale 1 if speed coloring is selected | 20k particles; speed 0.15; lifetime 1.5 s; 24-position trails; opacity 0.08; fixed scale 1 except noted; starfield; low glow |
| Fluid                 | 20k; true velocity; speed 0.2; persistence 0.96; dropRate 0.01; opacity 0.15; starfield or restrained ocean; colorScale U                                              | 20k; true velocity; speed 0.2; lifetime 2 s; 32 positions; opacity 0.08; fixed scale U                                       |
| Closed magnetic loops | 16k; normalized; speed 0.2; persistence 0.96; dropRate 0.02; opacity 0.10; starfield                                                                                   | 20k; speed 0.15; lifetime 2 s; 32 positions; opacity 0.06; fixed scale 1; starfield                                          |

In 2D the mean geometric lifetime implied by dropRate 0.03 is about 33 frames, not a separately available seconds setting. Source inspection confirms both normalized speed and fixed color in 3D: turn normalization on for field teaching and magnetic direction cues, off for fluid velocity. Set absorb=false for closed magnetic fields. Use a fixed scale for comparable magnitude colors, even when speed is normalized. The particle settings apply in particle mode; traced mode is an alternative with its own controls. A useful trace starting point is 150–300 lines, 96 steps, lineLength=0.6, opacity=0.12, flowWindow=0.5; tune coverage without claiming complete source-to-sink traces.

## 4. Electric charges

### Physics and controls

Two point charges at x = ±d/2. Outside a small display/core exclusion this is exact Coulomb superposition. Defaults: q1=1, q2=−1 (range −3…3), d=2 (0.8…6), a=0.12 (0.05…0.25), k=1. Keep d>2a. a is the rendered marker/exclusion radius, not a softening parameter.

```latex
r_{1}(x,y,z)=\sqrt{\left(x+\frac{d}{2}\right)^{2}+y^{2}+z^{2}}
r_{2}(x,y,z)=\sqrt{\left(x-\frac{d}{2}\right)^{2}+y^{2}+z^{2}}
f(x,y,z)=\frac{kq_{1}\left(x+\frac{d}{2}\right)}{r_{1}(x,y,z)^{3}}+\frac{kq_{2}\left(x-\frac{d}{2}\right)}{r_{2}(x,y,z)^{3}}
g(x,y,z)=\frac{kq_{1}y}{r_{1}(x,y,z)^{3}}+\frac{kq_{2}y}{r_{2}(x,y,z)^{3}}
h(x,y,z)=\frac{kq_{1}z}{r_{1}(x,y,z)^{3}}+\frac{kq_{2}z}{r_{2}(x,y,z)^{3}}
V(x,y,z)=\frac{kq_{1}}{r_{1}(x,y,z)}+\frac{kq_{2}}{r_{2}(x,y,z)}
```

Component slots: f(x,y,0), g(x,y,0) in 2D; f(x,y,z), g(x,y,z), h(x,y,z) in 3D, each wrapped in a guard `\left\{\min(r_{1}(x,y,z),r_{2}(x,y,z))>a: ... \right\}`. Replace z by 0 in 2D guards. If using automatic gradient mode, supply **−V**, since that tool computes the positive gradient.

### Teaching and drawings

Show source/sink direction, superposition and cancellation, field/force distinction, and equipotential orthogonality. AP Physics 2 Unit 10 objectives 10.3.A and 10.5.A are direct matches. [Current course framework](https://apcentral.collegeboard.org/media/pdf/ap-physics-2-course-and-exam-description.pdf).

Desmos objects:

```latex
\left(x+\frac{d}{2}\right)^{2}+y^{2}\le a^{2}
\left(x-\frac{d}{2}\right)^{2}+y^{2}\le a^{2}
V(x,y,0)=[-2,-1,-0.5,0,0.5,1,2]
P=(p_{x},p_{y})
```

Use muted warm/cool charge colors plus geometric plus/minus marks (two perpendicular segments versus one). Signs carry meaning without prose. Point sizes can depend on `8+3\sqrt{\left|q_{1}\right|}` and its q2 equivalent, with the fixed exclusion core drawn separately. At zero charge, use a hollow neutral marker. Geometry styling is state/API configuration, not part of field GLSL.

An exact **axisymmetric flux function**, not a planar stream function, supplies crisp field-line contours in a meridional view:

```latex
S(x,y)=q_{1}\frac{x+d/2}{\sqrt{\left(x+d/2\right)^{2}+y^{2}}}+q_{2}\frac{x-d/2}{\sqrt{\left(x-d/2\right)^{2}+y^{2}}}
S(x,y)=[-1.75,-1.5,-1.25,-1,-0.75,-0.5,-0.25,0,0.25,0.5,0.75,1,1.25,1.5,1.75]
```

Restrict contours outside charge cores. Equal increments of S represent equal axisymmetric flux increments. Some listed levels do not exist for a given charge configuration; that is fine. The symmetry axis is a degenerate contour: draw its valid segments separately, avoid plotting the entire axis automatically, and omit a small neighborhood of nulls. These contours have the exact tangent direction but their spacing on a flat screen is not generally proportional to |E|.

Main vectors at P: E; optional E1 and E2 on the same linear scale; optional F=q0E with q0=1 (−2…2). The probe is a measurement/test charge and does not alter the source field. Draw arrows on the GPU and attach optional names. With writing enabled: “Changing the test charge changes force, not the source field.”

### Flow and seed

Use the field-teaching recipe with uniform births outside the cores by default. Static lines make source illumination reliable. Optional source-shell seed:

```latex
\min\left(1,\max\left(q_{1},0\right)\left\{\left|r_{1}(x,y,0)-1.3a\right|<0.2a:1,0\right\}/3+\max\left(q_{2},0\right)\left\{\left|r_{2}(x,y,0)-1.3a\right|<0.2a:1,0\right\}/3\right)
```

Use z in place of 0 in 3D. This seed is illustrative, not a rigorous global line-flux sampler. If both charges are negative, use uniform exterior births: incoming field lines originate at infinity. If a source shell occupies very little screen/box volume, rejection sampling may fail or become expensive; verify the seed implementation before choosing this as default. Prevent crossing cores with absorption in 3D; test 2D domain/stall behavior.

### Sliders and 3D

Flip q2 from −1 to +1: the midpoint becomes a null for equal charges; between unlike equal charges the fields add. Increase |q2|: the cancellation point for like charges moves toward the weaker source. Change q0’s sign: E stays unchanged and F reverses.

3D uses two solid spheres and existing traced streamlines around the pair, not a box-filling fog. Use a sparse arrow grid or one inspectable plane. The 2D implicit contours are not 3D lines; rely on the existing tracer in 3D. In particle mode, seed-off fills the box faintly while objects and arrows remain. In traced mode the particle-seed control does not affect the lines; disable or explain that control. Complete flux-controlled source-to-sink tracing would require the optional tracer-start extension below.

## 5. Parallel wires

### Physics

Infinite straight wires along z at x=±d/2 with circular radius a and uniform current density inside. k now denotes μ0/(2π), normalized to 1. Defaults I1=1, I2=1 (−3…3), d=2 (0.8…6), a=0.12 (0.05…0.3).

```latex
D_{1}(x,y)=\max\left(\left(x+d/2\right)^{2}+y^{2},a^{2}\right)
D_{2}(x,y)=\max\left(\left(x-d/2\right)^{2}+y^{2},a^{2}\right)
f(x,y)=\frac{-kI_{1}y}{D_{1}(x,y)}-\frac{kI_{2}y}{D_{2}(x,y)}
g(x,y)=\frac{kI_{1}\left(x+d/2\right)}{D_{1}(x,y)}+\frac{kI_{2}\left(x-d/2\right)}{D_{2}(x,y)}
```

2D components f,g; 3D f,g,0. Finite drawn rods represent visible portions of an infinite-wire idealization, not finite-wire end fields.

Show right-hand rule, inverse-radius exterior field, addition/cancellation, and wire-force direction. AP Physics 2 Unit 12, 12.3.A and 12.3.B. [Framework](https://apcentral.collegeboard.org/media/pdf/ap-physics-2-course-and-exam-description.pdf).

### Geometry, flow and controls

Two filled discs in 2D; dot/cross geometry for current toward/away from the viewer. In 3D:

```latex
\left(x+d/2\right)^{2}+y^{2}=a^{2}\left\{\left|z\right|<4\right\}
\left(x-d/2\right)^{2}+y^{2}=a^{2}\left\{\left|z\right|<4\right\}
```

For exterior contours use:

```latex
S(x,y)=-\frac{kI_{1}}{2}\ln\left(\left(x+d/2\right)^{2}+y^{2}\right)-\frac{kI_{2}}{2}\ln\left(\left(x-d/2\right)^{2}+y^{2}\right)
S(x,y)=[-3,-2.5,-2,-1.5,-1,-0.5,0,0.5,1]
```

Restrict outside both wire cores. Here B=(Sy,−Sx), so these are actual planar streamlines. Use the magnetic recipe and seed=1 outside cores in 2D. In 3D use **one connected slab**, `\left\{\left|z\right|<0.12:1,0\right\}`, plus continuous rods. The plane extends across both wires. It deliberately shows one section of a translation-invariant object. There is no honest field-based way to bend B out of this section: Bz=0. Add sparse arrows elsewhere only on request.

Main vectors: B at a probe, contributions B1/B2, and optional force per length on wire 2, `(-k I1 I2/d,0,0)`. Reverse I2: midpoint cancellation becomes reinforcement and attraction becomes repulsion. Halve d: exterior interaction doubles. Optional writing: “The field is the same at every height along these ideal wires.”

## 6. Earth–Moon gravitational field

### Physics

Static instantaneous field of two spherical, non-overlapping bodies. Defaults M1=81 (1…100), M2=1 (0.1…20), d=10 (4…20), G=1, R1=1 (0.4…1.5), R2=0.273 (0.1…0.5). These default radii and separation are a teaching composition, not a common physical scale; the mass ratio is rounded. An “actual scale” option must use one consistent conversion for distances and radii.

```latex
c_{1}=-\frac{dM_{2}}{M_{1}+M_{2}}
c_{2}=\frac{dM_{1}}{M_{1}+M_{2}}
r_{1}(x,y,z)=\sqrt{\left(x-c_{1}\right)^{2}+y^{2}+z^{2}}
r_{2}(x,y,z)=\sqrt{\left(x-c_{2}\right)^{2}+y^{2}+z^{2}}
D_{1}(x,y,z)=\max\left(r_{1}(x,y,z),R_{1}\right)^{3}
D_{2}(x,y,z)=\max\left(r_{2}(x,y,z),R_{2}\right)^{3}
f(x,y,z)=-\frac{GM_{1}\left(x-c_{1}\right)}{D_{1}(x,y,z)}-\frac{GM_{2}\left(x-c_{2}\right)}{D_{2}(x,y,z)}
g(x,y,z)=-\frac{GM_{1}y}{D_{1}(x,y,z)}-\frac{GM_{2}y}{D_{2}(x,y,z)}
h(x,y,z)=-\frac{GM_{1}z}{D_{1}(x,y,z)}-\frac{GM_{2}z}{D_{2}(x,y,z)}
```

This is exact outside spheres and adopts uniform density for each interior. Real Earth is not uniform density. Use z=0 for 2D. For exterior equipotentials: `V(x,y,z)=-GM1/r1-GM2/r2`, with subscripts and calls expanded as above. Do not use that exterior potential inside the bodies.

### Teaching and drawing

AP Physics 1 Unit 2 force/gravity and Unit 3 energy; the barycentre adds center-of-mass reasoning. The detailed objective codes were not reliably retrieved and are intentionally not guessed. [AP Physics 1 current units](https://apcentral.collegeboard.org/courses/ap-physics-1).

Show inverse-square attraction, superposition, the balance point, and distinction between field and orbital velocity. Draw `r1(x,y,z)=R1`, `r2(x,y,z)=R2` as colored spheres; discs in 2D. Use the planet surface recipes below. Draw a small neutral barycentre point `(0,0,0)` and an optional hollow gravitational-null marker at:

```latex
N=\left(c_{1}+\frac{d\sqrt{M_{1}}}{\sqrt{M_{1}}+\sqrt{M_{2}}},0\right)
```

This is not the rotating-frame L1 point. At the default mass ratio it is 90% of the distance from the larger mass toward the smaller mass.

Use 16k/20k faint tracers, short trails, normalized in both dimensions; 3D color scale G M1/d² fixed at the preset default rather than continuously auto-normalized. Births uniform outside bodies. For the exterior-only flow, guard each component with `min(r1/R1,r2/R2)>1` using the full helper calls; this makes the field zero/undefined inside solids so stalled particles respawn. For an interior-gravity lesson remove that visualization guard and use a cutaway. The absorb threshold alone does not implement the body boundaries. An optional exterior atmosphere seed is visual-only and should not be advected through gravity if it is meant to remain an atmosphere. Use a Desmos shell instead.

Main vectors: g1, g2, net g at a probe; F=m0g optional. Hold position and double M1 to compare contributions. Increase d to separate the fields. The writing option states “These arrows show acceleration, not orbital velocity.”

The seed-on look cannot make inward-falling tracers look like an orbiting planet. The solid planet provides the recognizable object; particles are a separate field overlay. Use actual orbital kinematics only in the separate orbit preset.

## 7. Spinning cylinder

### Physics and sign convention

Choose clockwise circulation for positive w, matching the brief’s required `sin θ=−wR/(2U)`. The implied circulation is Γ=−2πR²w. U=1 (0.2…3), R=1 (0.4…1.5), w=1 (−2…2), density D=1 (0.2…3).

```latex
f(x,y)=\left\{x^{2}+y^{2}\ge R^{2}:U\left(1-\frac{R^{2}\left(x^{2}-y^{2}\right)}{\left(x^{2}+y^{2}\right)^{2}}\right)+\frac{R^{2}wy}{x^{2}+y^{2}},0\right\}
g(x,y)=\left\{x^{2}+y^{2}\ge R^{2}:-\frac{2UR^{2}xy}{\left(x^{2}+y^{2}\right)^{2}}-\frac{R^{2}wx}{x^{2}+y^{2}},0\right\}
S(x,y)=Uy\left(1-\frac{R^{2}}{x^{2}+y^{2}}\right)+\frac{R^{2}w}{2}\ln\left(\frac{x^{2}+y^{2}}{R^{2}}\right)
P(x,y)=P_{0}+\frac{D}{2}\left(U^{2}-f(x,y)^{2}-g(x,y)^{2}\right)
```

3D is f,g,0 outside a cylinder along z. The lift per unit span is +2πDUR²w in y. Positive w gives upward lift. Classical inviscid circulation theory supports this construction. It does **not** determine circulation from a real cylinder’s rotation rate; viscosity and separation do that. The rim-marker rotation can be linked to w as a demonstration parameter, but is not a calibrated no-slip boundary condition. [University of Texas ideal cylinder flow](https://farside.ph.utexas.edu/teaching/336L/Fluidhtml/node74.html).

AP Physics 1 Unit 8: pressure/flow and force reasoning; detailed circulation and Kutta–Joukowski theory are enrichment, not required AP derivations.

### Drawings and behavior

```latex
x^{2}+y^{2}\le R^{2}
\left(0.9R\cos\left(wT\right),-0.9R\sin\left(wT\right)\right)
S(x,y)=[-3,-2.5,-2,-1.5,-1,-0.5,0,0.5,1,1.5,2,2.5,3]\left\{x^{2}+y^{2}\ge R^{2}\right\}
```

Disc: opaque graphite, narrow light rim; marker: contrasting small point. A rotating diameter can use the parametric segment `(tR cos(wT),−tR sin(wT))`, domain −0.85…0.85. Add two stagnation markers when |wR/(2U)|≤1:

```latex
\left(R\sqrt{1-\left(\frac{wR}{2U}\right)^{2}},-\frac{wR^{2}}{2U}\right)
\left(-R\sqrt{1-\left(\frac{wR}{2U}\right)^{2}},-\frac{wR^{2}}{2U}\right)
```

When this bound is exceeded, omit the surface markers and use the exterior null at x=0 and `y=(-R²w−sign(w) sqrt(R⁴w²−4U²R²))/(2U)`. The other root is inside the solid.

Use the fluid recipe. Seed a visible upstream band, `\left\{x<-3.5:1,0\right\}`, bounded by the view and exterior domain; choose the same left bound relative to the selected view. Add the one 3D slab factor |z|<0.15. Static streamlines remain when seed-off fills the volume. Draw the cylinder surface `x²+y²=R² {|z|<3}` and end caps with Desmos surfaces. Do not create three flow slices.

Main vectors: v at one probe; upward/downward lift per span at the center, optional pressure-force arrows on several rim locations. Avoid mixing pressure, speed and lift on one scale. Reverse w: pressure asymmetry, spin marker and lift reverse. w=0: symmetric flow and zero lift; ideal flow also gives zero drag. Do not add a wake to this exact ideal field. Writing: “Higher speed corresponds to lower pressure along this ideal steady flow.”

## 8. Capacitor

### Exact finite-width strip model

Plates at y=±d/2, extending −L…L in x and infinitely in z, with **prescribed uniform surface charge** ±s. They are not exact equipotential finite conductors; conductor edges redistribute charge. Keep that distinction in teacher-facing model information in both modes. U=voltage is not interchangeable with s without solving the appropriate boundary problem.

Defaults L=3 (1…5), d=1 (0.3…3), s=1 (−2…2), k=1, with k=1/(2π ε0) in physical units. Here k’s normalization differs from the point-charge preset.

```latex
A(x,b)=\frac{1}{2}\ln\left(\frac{\left(x+L\right)^{2}+b^{2}}{\left(x-L\right)^{2}+b^{2}}\right)
C(x,b)=\left\{b=0:0,\arctan\left(\frac{x+L}{b}\right)-\arctan\left(\frac{x-L}{b}\right)\right\}
f(x,y)=ks\left(A(x,y-d/2)-A(x,y+d/2)\right)
g(x,y)=ks\left(C(x,y-d/2)-C(x,y+d/2)\right)
```

Use one-argument arctan here. Blindly replacing each with atan2 changes branch behavior. At b=0, the explicit C=0 branch supplies the exterior continuation outside the strip. On a charged sheet the normal field is discontinuous: mask a thin drawn plate thickness rather than treating that branch as a physical surface value. For example wrap each component in `\left\{\left|x\right|>L+0.02:f(x,y),\min\left(\left|y-d/2\right|,\left|y+d/2\right|\right)>0.02:f(x,y)\right\}`, replacing f with g for the other component. The field is exact in open regions away from these sheets. 3D components f,g,0, so it models infinite-depth strips, not fully finite rectangular plates.

For field contours away from the sheet/branch boundaries:

```latex
H(u,b)=u\arctan\left(\frac{u}{b}\right)-\frac{b}{2}\ln\left(u^{2}+b^{2}\right)
J(x,b)=-H(x+L,b)+H(x-L,b)
S(x,y)=ks\left(J(x,y-d/2)-J(x,y+d/2)\right)
```

Plot a modest list of S levels **separately in each region y<−d/2, −d/2<y<d/2, and y>d/2**. Branch constants can differ across regions; do not imply the level identifiers connect across sheets. The actual tangent check is f Sx+g Sy=0.

### Drawings, flow, controls

Plate segments `(t,d/2)` and `(t,−d/2)`, t∈[−L,L], thick and opaque with muted sign colors; optional repeated geometric +/− marks. In 3D use `(u,d/2,v)` and `(u,−d/2,v)`, u∈[−L,L], v∈[−4,4]. Their z edges are display cuts; orient the camera so it is clear the field is a section along long plates.

Use field-teaching settings. Default 2D seed=1 outside the masked plates. Optional birth band on the positive plate’s gap-facing side, thickness 0.1d. For positive s, `\left\{\left|x\right|<0.9L:\left\{\left|y-0.4d\right|<0.04d:1,0\right\},0\right\}`; mirror y for negative s. In 3D particle mode use a **single** broad slab `exp(-z²/0.16)` and long continuous plates with a few arrows. Do not multiply two tiny birth regions without measuring rejection occupancy. Traced mode is a separate option with uniform box starts, not a seed-controlled single slab. Seed-off adds faint surrounding tracers, not multiple plates.

Main vector E in the central gap and E at an edge probe; optional q0E. Double |s|: field doubles everywhere. Increase L/d: central region becomes more uniform. Reverse s: direction reverses. Changing d at fixed s does not imply E∝1/d; that law applies to fixed voltage in the ideal parallel-plate model.

AP Physics 2 Unit 10, conductor/insulator field and potential; Unit 11 capacitor connections. Writing option: “Uniform charge is prescribed; a real conductor redistributes charge near its edges.” Offer a separate ideal infinite-plate fixed-voltage mode with `E=(0,−U/d,0)` inside and zero outside, so voltage experiments use the right parameterization.

## 9. Bar magnet: replace the pole splice

### Exact uniformly magnetized rectangular prism

A positive/negative point-pole pair can approximate a distant external field, but splicing it to an arbitrary uniform interior does not generally conserve magnetic flux. Use a uniformly magnetized rectangular solid, half-length a along x and half-widths b,c in y,z. Defaults a=1 (0.5…2), b=0.3 (0.15…0.7), c=0.3 (0.15…0.7), p=1 (−2…2). p denotes μ0 M/(4π), not physical magnetic charge.

The following helpers are analytically integrated rectangular-face fields. They are our explicit derivation from the Coulomb-type surface integral for H; numerical verification is below. No sum or integral appears in the shader.

```latex
r(u,v,w)=\sqrt{u^{2}+v^{2}+w^{2}}
A(u,v,w)=\arctan\left(\frac{vw}{u r(u,v,w)}\right)
C(u,v,w)=\ln\left(w+r(u,v,w)\right)
D(u,v,w)=\ln\left(v+r(u,v,w)\right)
f_{0}(u,v,w)=A(u,v+b,w+c)-A(u,v-b,w+c)-A(u,v+b,w-c)+A(u,v-b,w-c)
g_{0}(u,v,w)=-C(u,v+b,w+c)+C(u,v-b,w+c)+C(u,v+b,w-c)-C(u,v-b,w-c)
h_{0}(u,v,w)=-D(u,v+b,w+c)+D(u,v-b,w+c)+D(u,v+b,w-c)-D(u,v-b,w-c)
J(x,y,z)=\left\{\left|x\right|<a:\left\{\left|y\right|<b:\left\{\left|z\right|<c:1,0\right\},0\right\},0\right\}
f(x,y,z)=p\left(f_{0}(x-a,y,z)-f_{0}(x+a,y,z)+12.566370614359172J(x,y,z)\right)
g(x,y,z)=p\left(g_{0}(x-a,y,z)-g_{0}(x+a,y,z)\right)
h(x,y,z)=p\left(h_{0}(x-a,y,z)-h_{0}(x+a,y,z)\right)
```

The interior +4πp term is essential: B=μ0(H+M). On x=±a, use one-sided analytic limits or exclude the mathematical face from evaluation; raw formulas divide by zero there. Sharp edges have singular behavior. Use opaque geometry and exclude a small edge neighborhood from tracer integration. Do not soften these denominators and continue to call the result exact. Single-precision cancellation far away is a separate numerical issue; bound the gallery box reasonably and test it.

2D uses f(x,y,0), g(x,y,0), so it is the central section of the **finite** 3D magnet. Geometry: rectangle `|x|≤a {|y|≤b}`; 3D six parametric faces, e.g. `(a,u,v)` and `(-a,u,v)` with u∈[−b,b], v∈[−c,c], and their four y/z counterparts. Divide coloring at x=0 into muted red and blue; no-writing mode may omit N/S letters, writing mode may show them.

### Teaching and performance

Show closed magnetic field topology, direction outside versus inside, and dipole far field. AP Physics 2 Unit 12, magnetic fields. Use optional B and a small compass at a probe, not “force along B”: magnetic force on a moving charge is q v×B.

Use the magnetic recipe but begin at 20k in 3D, 16-position trails and low speed. Each evaluation has multiple atan/log calls. This is the highest-cost physics preset here; **benchmark before committing to 60 fps**. Existing traced streamlines plus sparse arrows and flow off is the honest initial fallback. No new general field texture/cache is assumed.

2D lacks generic persistent traced lines in the documented toolkit; use low-opacity flow plus arrows here rather than invent an exact planar stream function for this 3D slice. In 3D trace complete lines through the magnet using the interior expression, then let the solid hide the interior by default; an optional cutaway reveals their continuation. Do not absorb particles at magnet poles.

Reverse p: directions reverse. Change a: shape and near field change. At fixed p, changing the volume also changes dipole moment; a “fixed moment” comparison must compensate p by the inverse volume ratio. Writing: “Magnetic field lines continue through the magnet.”

## 10. Magnetic dipole

Preserve the user's preferred **point-dipole look by default**, oriented along y with m=1 (−3…3). Do not replace it with a visible finite core. Define r=sqrt(x²+y²+z²), then use the exterior expressions below with an explicit r>0 domain guard and no sphere. A separate, named “magnetized sphere” teaching option has radius a=0.35 (0.15…0.8), with **matched** uniform interior B=2m/a³ along y:

```latex
r(x,y,z)=\sqrt{x^{2}+y^{2}+z^{2}}
f(x,y,z)=\left\{r(x,y,z)>a:\frac{3mxy}{r(x,y,z)^{5}},0\right\}
g(x,y,z)=\left\{r(x,y,z)>a:\frac{m\left(3y^{2}-r(x,y,z)^{2}\right)}{r(x,y,z)^{5}},\frac{2m}{a^{3}}\right\}
h(x,y,z)=\left\{r(x,y,z)>a:\frac{3myz}{r(x,y,z)^{5}},0\right\}
```

This is a particular exact finite-body model, not permission to put an arbitrary core in a point-dipole field. Normal B matches at the sphere, while tangential B can jump due to the surface current. [Uniformly magnetized sphere derivation](https://farside.ph.utexas.edu/teaching/jk1/lectures/node61.html).

2D exact exterior field lines for a y-axis dipole are parametric:

```latex
\left(L\sin(t)^{3},L\sin(t)^{2}\cos(t)\right)
\left(-L\sin(t)^{3},L\sin(t)^{2}\cos(t)\right)
```

Use t∈[0,π], L=[0.7,1,1.5,2.2,3.2,4.5] and exclude r≤a. The list belongs to Desmos, not the field compiler. In 3D use existing traces, or rotate each meridional curve by a few azimuth angles; curves `(L sin(t)^3 cos(A), L sin(t)^2 cos(t), L sin(t)^3 sin(A))` give exact exterior geometry. Sparse azimuth samples are preferable to a luminous cage.

Use the magnetic recipe, absorb=false, and the broad existing radial seed or uniform births. In point-dipole mode retain arbitrarily small exterior loops, subject to numerical resolution, and draw no finite solid. In magnetized-sphere mode render the physical sphere and continue lines through the matched interior. Main vector B and optional magnetic moment m; reverse m to reverse the field. AP Physics 2 Unit 12: field direction and magnetic structure.

Default to **static m**, not cos(0.4t). Optional quasi-static playback sets `m=m0 cos(wT)`, w=0.4 (0…1), and clears old trails around reversal if available; otherwise stop/restart to avoid showing obsolete paths as current field lines. It is not an electromagnetic-wave or induction simulation. Writing: “A slowly varied sequence of magnetostatic fields; induced electric fields are omitted.”

## 11. Field-line density: what is and is not possible

Let n be particle number density, u the **rendered advection velocity**, b the birth rate density and λ the death rate. Particle transport obeys:

`∂n/∂t + ∇·(n u) = b − λ n`.

For a steady target density n\*=C|F|, the necessary local birth rate is:

`b = C ∇·(|F|u) + λ C|F|`.

If u=v0 F/|F|, then `b=C v0 ∇·F + λ C|F|`. In a source-free **three-dimensional** electric/magnetic field, ∇·F=0 and a distributed birth density proportional to |F| balances exponential death. This result needs the appropriate inflow boundary, an actual proportional birth rate, and normalized velocity. In this renderer use a cubic box: non-cubic box normalization is not a constant Euclidean-speed v0. A seed expression is only a birth **sampling distribution**; fixed total respawn rate, rejection behavior, boundaries and clamping still matter.

For true-speed u=αF, the additional term is `α C[F·∇|F|+|F| ∇·F]`. It may require negative births, which are impossible without adding spatially varying removal. A universal “seed = |F|” prescription is therefore wrong.

Even the normalized source-free simplification does **not** apply automatically to a 2D section of a 3D field. For a point charge in the z=0 plane, E=(kx,ky)/r³ and `∂Ex/∂x+∂Ey/∂y=−k/r³`, although the full three-dimensional divergence is zero away from the charge. A planar density designed as if this divergence vanished will be wrong.

### Flux seeding

Inject an equal-weight line population through a surface at a rate proportional to positive F·n. With normalized speed, a conserved tube has n∝|F|; with true field-proportional speed it has constant n in a divergence-free region. Around a point charge, equal solid-angle seeds on a sphere give equal flux; the total number of representative lines should be proportional to |q|. Around a cylinder, use the actual normal flux through the chosen entry surface.

Equal angular seeds around a 2D circle are **not** equal solid-angle seeds on a sphere. For an axisymmetric meridional diagram, space cos θ evenly. The source-shell expression above does not supply every needed boundary distribution. Negative-only scenes need inflow from the viewport/box boundary. Equal numbers of particles per shell only reproduce charge ratios if shell measures and rejection normalization are also handled.

Field-line density means flux per area perpendicular to the field, not projected brightness. Projection, line thickness, fading, overlap and saturation prevent a quantitative screen-brightness claim even with perfect sampling. [Field-line flux interpretation](https://farside.ph.utexas.edu/teaching/355/Surveyhtml/node74.html).

### Distance-based lifetime

An exponential path-length budget Ld gives survival `exp(−s/Ld)` and per-step death probability `1−exp(−|Δr|/Ld)`. It equalizes typical trail travel distance, not field-line density. Use world distance for physical consistency; screen distance changes on zoom. A per-particle accumulated distance or an equivalent per-step probability is a small optional renderer change, but it does not replace field lines.

### Recommendation by preset

| Preset     | Carrier of the clear field picture                                                | Role of particles                                        |
| ---------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Charges    | Exact meridional flux contours in 2D, traced lines in 3D, sparse magnitude arrows | Moving direction cues; never density measurements        |
| Wires      | Planar stream-function contours; one 3D section                                   | Circulation direction                                    |
| Capacitor  | Strip stream contours with branch care, arrows in gap                             | Direction and fringing cues                              |
| Cylinder   | Exact stream function, pressure/velocity probes                                   | Actual ideal-fluid motion, true speed                    |
| Gravity    | Solids, arrows, optional exterior equipotentials                                  | Direction of g; not falling/orbiting-body dynamics       |
| Bar magnet | Existing 3D traces, arrows and subdued 2D flow                                    | Direction without pole absorption                        |
| Dipole     | Exact meridional curves / 3D traces                                               | Direction; no fictional inward shrinking of closed lines |

Keep static line opacity independent of tracer lifetime. To prevent whitening, reduce opacity, persistence, glow and duplicate coverage before reducing line clarity. A birth seed does not confine living particles; every proposed matter seed must be checked against its subsequent motion.

## 12. Recognizable objects and the space shelf

### A sphere that reads as a planet

For a sphere centered at (a,b,c), radius R, define surface-local coordinates X=(x−a)/R, Y=(y−b)/R, Z=(z−c)/R. In actual expressions use Latin helper functions, for example:

```latex
X(x,y,z)=\frac{x-a}{R}
Y(x,y,z)=\frac{y-b}{R}
Z(x,y,z)=\frac{z-c}{R}
H(x,y,z)=\max\left(0,0.6X(x,y,z)+0.3Y(x,y,z)+0.7416198487Z(x,y,z)\right)
C(x,y,z)=\sin\left(4X(x,y,z)+2Y(x,y,z)\right)+0.5\sin\left(7Y(x,y,z)-3Z(x,y,z)\right)+0.3\sin\left(9Z(x,y,z)+X(x,y,z)\right)
\left(x-a\right)^{2}+\left(y-b\right)^{2}+\left(z-c\right)^{2}=R^{2}
```

Apply a Desmos coordinate color map: ocean (25,65,100), land (75,95,58) where C>0.6, polar ice (205,215,220) where |Y|>0.88. Multiply RGB channels by `0.08+0.92H`. Define separate channel expressions with nested piecewise; send `rgb(red,green,blue)` to the **Desmos color setting**, never to the GLSL field compiler. Coordinate-dependent surface colors are supported by Desmos. [Official color-map guide](https://help.desmos.com/hc/en-us/articles/40475048737421-Coordinate-Based-3D-Color-Maps).

This gives an Earth-like invented world, not Earth’s geography. Disable or moderate double-shading if native lighting multiplies the color map too strongly; inspect the actual result. A faint shell at radius 1.025R can suggest atmosphere if transparency works; do not use a glowing particle ball as the surface.

For a Moon-like sphere, use neutral gray and three broad albedo patches, not blue atmosphere. For Pluto-like terrain use muted tan/cream patches; Charon-like terrain is gray with a darker polar cap. A sinusoidal map cannot honestly reproduce named real terrain. Compare against [New Horizons’ true-color Charon](https://science.nasa.gov/resource/true-colors-of-charon/) and [Pluto/Charon reference images](https://science.nasa.gov/photojournal/two-faces-of-pluto/).

### 2D shaded disc without an image renderer

On the visible disc define `Z(x,y)=sqrt(1−((x−a)/R)²−((y−b)/R)²)`. Use the same illumination expression with X,Y,Z. Since coordinate-based **2D** region coloring was not established, draw a small fixed set of brightness bands instead of assuming it exists: for example the disc restricted to `j/8≤H(x,y)<(j+1)/8`, j=0…7, with eight static color styles. A host builder expands the eight expressions. Repeat two or three surface-material regions only if it stays readable; no need for dozens of expensive layers.

Cloud stripes, if used, are stylized surface geometry. A planetary ring can be the Desmos annulus `1.5R≤sqrt((x−a)²+(y−b)²)≤2.1R` in a chosen plane; in 3D `(a+u cos(v), b+u sin(v), c)` with u∈[1.5R,2.1R], v∈[0,2π]. For a matter ring with particles, use a separate velocity-field preset: gravity acceleration itself cannot sustain the circular particle ring.

### Space designs and honest limits

| Preset           | Reference and target                                                                                                   | Specific buildable changes                                                                                                                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double planet    | New Horizons Pluto/Charon above, or an explicitly generic binary                                                       | Two opaque lit spheres moving on a consistently evaluated orbit; short/no body trails; appropriate neutral colors; surface radii separate from mass; no ring for Earth/Moon or Pluto/Charon unless deliberately fictional |
| Three-body eight | Mathematical figure-eight solution; no photograph equivalent                                                           | Small emissive-looking Desmos spheres at the current fitted trajectory positions, short orbit curves, restrained halos; identify the current Fourier fit as an approximation                                              |
| Black hole       | [NASA/Goddard accretion-disk visualization](https://svs.gsfc.nasa.gov/13326)                                           | Thin warm disk, existing lens and beaming, low particle saturation, clear central shadow; the supplied thin-lens feature is not proof of full relativistic ray tracing                                                    |
| Spiral galaxy    | [Hubble M51](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-51/) | Flattened disk, restrained bright bulge, sparse spiral-arm births; old warm center and cooler arms require geometric color layers or separate supported color controls, not an assumed new per-particle color function    |
| Pulsar           | [NASA lighthouse diagram](https://imagine.gsfc.nasa.gov/observatories/satellite/xmm/pulsar.html)                       | Solid small star; tilt magnetic/emission axis relative to spin; rotate two faint Desmos cones using T; these illustrate beam direction, not visible material streams                                                      |
| Aurora           | [NASA auroral curtain reference](https://science.nasa.gov/resource/northern-aurora-in-motion/)                         | Thin rippled luminous sheet over a sphere, restricted altitude and polar oval; existing auroral palette only if restrained; emitting atmosphere is not the same as a bunch of particles flowing along B                   |
| Solar wind       | [NASA solar wind/Parker spiral](https://science.nasa.gov/sun/what-is-the-solar-wind/)                                  | Solid Sun and predominantly outward plasma velocity; display Parker-spiral magnetic geometry separately; do not label the plasma velocity as B                                                                            |

Source inspection adds an important distinction for the two orbit pictures. `figureEightBody` uses a four-term Fourier fit, and `keplerPair` uses a fourth-order-in-e approximation for the true anomaly. The repository's comments describe approximation errors, but those accuracy claims were not independently reproduced here. The Kepler position uses that approximate time law while its velocity uses the exact conic-velocity formula evaluated at the approximate anomaly; these are not guaranteed to be exact time derivatives of one another. Use the same position expression and its derivative for moving bodies and their carrying velocity, or use a converged Kepler solve. The `carriedWorlds` field also blends orbital transport, swirl, inward relaxation and an exterior term: it is a designed advection field, **not Newtonian gravitational acceleration**. In its far limit, the coded radial-vector-over-r^2.2 term has magnitude proportional to r^-1.2. Relabel that mode as illustrative transport or replace it for a gravity lesson. [Orbit and transport builders](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/gallery/latex.ts).

A low-cost generic spiral-arm **birth** mask, not a galaxy dynamics solution:

```latex
r(x,y)=\sqrt{x^{2}+y^{2}}
A(x,y,t)=2\arctan(y,x)-3\ln\left(\max(r(x,y),0.4)\right)-0.15t
\left\{r(x,y)>0.4:\left\{r(x,y)<4:\exp\left(-20\sin\left(A(x,y,t)/2\right)^{2}\right),0\right\},0\right\}
```

In 3D multiply by `exp(−z²/0.04)`. Its two arms arise from the factor 2 on azimuth. Short lifetimes preserve the birth pattern; they do not prove a self-consistent spiral-density wave. Avoid ln(0) with the guarded radius as shown.

For a simple aurora geometry with polar axis y, use a Desmos parametric surface:

```latex
\left((R+v)\sin\left(A+0.03\sin(8u+T)\right)\cos(u),(R+v)\cos\left(A+0.03\sin(8u+T)\right),(R+v)\sin\left(A+0.03\sin(8u+T)\right)\sin(u)\right)
```

u∈[0,2π], v∈[0.02R,0.12R], A=0.3 radians. Use low-opacity green-white material. This is an illustrative emission curtain, not a solution of atmospheric excitation or magnetospheric transport.

For stars use a solid pale sphere plus at most one faint larger shell. A pulsar’s size, beam width and luminosity are exaggerated teaching parameters. Do not claim a camera would see the illustrative cones.

Lower-priority fluids: keep Taylor–Green cells unobstructed; a tornado seed can define a visible funnel but is not condensation physics; smoke rings require finite lifetime/low glow; a potential cylinder cannot generate a von Kármán street without an additional time-dependent vortex model. Lorenz and Thomas are state-space dynamical systems, not literal smoke or astronomical objects.

## 13. New AP demos ranked by value per effort

### 1. Uniform electric field and test-charge motion — 0.5–1 day

E=(E0,0,0), E0=1 (−3…3), q=1 (−2…2), M=1 (0.2…3). Use sparse GPU E and F=qE; optional v at a Desmos moving point:

```latex
\left(x_{0}+v_{0}T+\frac{qE_{0}T^{2}}{2M},y_{0}+v_{1}T\right)
```

This is actual Newtonian motion in the ideal uniform field, expressible without changing the particle solver. Draw the bounded apparatus/region and stop/reset T when the particle exits if the field is meant to exist only there. Check x''=qE0/M and constant transverse velocity. AP Physics 2 Unit 10; links to Physics 1 kinematics. Writing: “The force is constant; the velocity changes.”

### 2. Potential landscape — 0.5–1 day

Reuse charge V. In 2D draw equipotentials and E. In 3D draw z=V(x,y,0) outside cores, with height explicitly a potential coordinate, not physical altitude. Arrows showing the planar physical E must lie in the base x-y plane; do not identify the geometric surface normal or slope vector in (x,y,V) space with the physical 3D field. E=−∇V. Check finite differences against the components. AP Physics 2 10.5.A. Writing mode supplies units and “height represents potential”; no-writing mode remains a qualitative linked-view demonstration.

### 3. Hydrostatic pressure and buoyancy — 0.5–1 day

p(y)=p0+Dg(H−y), below water height H. Defaults D=1 (0.5…2), g=1 (0.2…2), H=2 (1…3). Water velocity is zero: do not animate a fictitious downward flow. Draw the water region and a rectangular body. At a horizontal face area A, pressure force is pA normal inward. With body bottom yb and top yt, submerged height `max(0,min(H,yt)−yb)` when the bottom is below H, capped at body height; displaced volume A times that height. Net buoyancy is Dg times displaced volume; weight is Mg. Show GPU F_b and F_g, optional face forces. Validate top/bottom force difference and zero side-force resultant. AP Physics 1 Unit 8. Writing: “The bottom experiences greater pressure.”

### 4. Shell theorem / inside a planet — 0.5 day

For a uniform-density solid planet, `g=−GM(x,y,z)/max(r,R)^3` componentwise, as in the Earth–Moon helpers with one body. M=1 (0.2…3), R=1 (0.5…2), G=1. Cross-section/cutaway plus magnitude-vs-radius curve. Check g(0)=0, continuous g at R, |g|∝r inside and 1/r² outside. The exact interior formula is enrichment alongside AP Physics 1 gravity. A hollow spherical shell is a separate model: g=0 inside, −GM r/r³ outside.

### 5. Narrowing pipe — 1 day

An exactly divergence-free **kinematic** 2D channel velocity, with half-width h(x):

```latex
h(x)=H\left(1-a\exp\left(-x^{2}/L^{2}\right)\right)
j(x)=\frac{2Hax}{L^{2}}\exp\left(-x^{2}/L^{2}\right)
f(x,y)=\frac{Q}{2h(x)}
g(x,y)=\frac{Qyj(x)}{2h(x)^{2}}
```

H=1 (0.5…2), a=0.5 (0…0.7), L=2 (1…4), Q=2 (0.5…4). Domain |y|<h(x). Walls y=±h(x), streamlines y=c h(x) for c=[−0.8,−0.4,0,0.4,0.8]. True-speed fluid recipe, upstream seed. u·n=0 at walls and the section flux is Q. This is not an exact inviscid momentum/pressure solution: do not compute a global Bernoulli pressure field from it. A gentle nozzle may use a separately declared quasi-1D approximation p+ρu²/2=constant. For 3D, extrude the channel and set wz=0; this is a rectangular slot, not a round pipe. AP Physics 1 Unit 8 continuity; writing: “The same volume crosses each section per second.”

### 6. Faraday induction — 1–2 days

Uniform Bz=B0 cos(wt) inside an ideal infinite solenoid radius R, zero outside. R=1 (0.5…2), B0=1 (0…3), w=0.5 (0.1…2). Define D(t)=−B0 w sin(wt), the time derivative of Bz. Induced E:

```latex
a(x,y)=\left\{x^{2}+y^{2}\le R^{2}:1,\frac{R^{2}}{x^{2}+y^{2}}\right\}
f(x,y,t)=\frac{D(t)y}{2}a(x,y)
g(x,y,t)=-\frac{D(t)x}{2}a(x,y)
```

Ez=0. Draw a circular loop and solenoid outline; E is the flow field, B is a separate sparse main vector. Match the graph clock T to the field time when animating both. Check `2πr Eθ=−π min(r²,R²) D(t)`. This is the magnetoquasistatic ideal-solenoid model, not an exact finite-frequency full-Maxwell solution in empty space. AP Physics 2 12.4.A. Writing: “Changing magnetic flux produces a circulating electric field.”

### 7. Conducting sphere in uniform E — 1 day

R=1 (0.5…2), E0=1 (−3…3), r=sqrt(x²+y²+z²). Outside use V=−E0 x+E0 R³x/r³; inside V=0. Components outside:

```latex
f(x,y,z)=E_{0}+E_{0}R^{3}\left(\frac{3x^{2}}{r(x,y,z)^{5}}-\frac{1}{r(x,y,z)^{3}}\right)
g(x,y,z)=\frac{3E_{0}R^{3}xy}{r(x,y,z)^{5}}
h(x,y,z)=\frac{3E_{0}R^{3}xz}{r(x,y,z)^{5}}
```

Wrap each in piecewise r>R: exterior, 0 otherwise. Draw solid sphere, surface-sign patches and exterior arrows; V is constant on r=R and tangential E vanishes. This earns its place before arbitrary image-charge scenes because the conductor boundary is explicit and the formula is cheap. [University of Rhode Island conducting-sphere problem](https://penrose.uri.edu/Gerhard/PHY331N/wlex17.pdf). AP Physics 2 10.3.B.

### 8. Two-source interference — 1 day

This belongs primarily in Desmos scalar geometry, not fake vector flow. Source distances r1,r2, source spacing d=2 (0.5…4), k=4 (1…8), w=2 (0.2…4), A=0.15 (0…0.4). A simple driven pattern is `H(x,y,t)=A cos(k r1−wt)+A cos(k r2−wt)`; it is a constant-amplitude illustrative interference model, not the exact 2D outgoing-wave Green function. In 3D show z=H(x,y,T); in 2D show phase-difference contours `r1−r2=n (2π/k)` for maxima, and `(n+1/2)(2π/k)` for minima, using a short Desmos list n. Do not call ∇H fluid velocity. Check constructive/destructive phase relations. AP Physics 2 Unit 14. A physical spreading model needs an explicitly stated approximation and a finite source core.

### 9. Circular orbit / escape comparison — 1–2 days for a limited preset

Circular orbit about a fixed mass: n=sqrt(GM/a³), position `(a cos(nT),a sin(nT))`, v=`(-an sin(nT),an cos(nT))`, g=`(-GM cos(nT)/a²,-GM sin(nT)/a²)`. G=M=1, a=2 (1.2…4). Draw independent v and g arrows; verify v²/a=GM/a². Escape speed at r is sqrt(2GM/r), which can be shown as a scalar threshold or comparison arrow. Do not advertise arbitrary elliptical/hyperbolic motion until an analytic conic solver or actual second-order integrator is supplied. The existing spatial RK4 advection cannot integrate (r,v) dynamics in general. AP Physics 1 Units 2 and 3.

### 10. Current loop / solenoid — defer full volume version

Exact loop-axis field is `Bz(z)=k I R²/[2(R²+z²)^(3/2)]`, k=μ0, I=1 (−3…3), R=1 (0.5…2). A loop `(R cos(t),R sin(t),0)` and **axis-only** B probe is cheap and AP-relevant. The full off-axis field generally uses elliptic integrals absent from this compiler. A fixed quadrature expanded by a host builder is legal GLSL arithmetic but expensive at particle counts and must be convergence-tested near the wire. A point-dipole substitute is a far-field approximation, not an exact loop preset. Do not extend the axis formula across the box.

## 14. Validation performed, acceptance checks and limits

The independently executed physics checks used double-precision Python, centered finite differences h=10⁻⁵ away from singularities, a 200×200 midpoint face quadrature, and a 10,000-point cylinder pressure integral. These test the mathematics, not GLSL precision. Results are saved in `validation-results.json` alongside this report. Separately, **45 helper definitions from sections 4–10 passed the actual branch compiler's expression/dependency compilation**. That check registered scalar identifiers automatically; it did not test whether every scalar is supplied by a real graph, did not compile Desmos geometry/list expressions, and did not link a WebGL shader. Its scope and per-helper results are in `compiler-check-results.json`.

| Check actually run                                      |                                                     Result |
| ------------------------------------------------------- | ---------------------------------------------------------: |
| Coulomb pair (+1 at −1, −1 at +1), E at origin          |                                                    (2,0,0) |
| Coulomb curl norm at (0.4,0.7,0.3)                      |                                                 2.61×10⁻¹⁰ |
| E·∇S for charge flux contour at (0.4,0.7)               |                                                −4.42×10⁻¹¹ |
| Cylinder stagnation speed, U=R=w=1                      |                                                 1.57×10⁻¹⁶ |
| Maximum sampled normal cylinder velocity                |                                                 3.33×10⁻¹⁶ |
| Cylinder integrated pressure force, D=1                 |              (approximately 0, 6.28318530718), matching 2π |
| Capacitor center, L=3,d=1,k=s=1                         |                                       (0,−5.62259059752,0) |
| Capacitor curl norm at (0.7,0.1,0)                      |                                                 5.27×10⁻¹¹ |
| Dipole divergence at (0.4,1.3,0.7)                      |                                                 9.58×10⁻¹¹ |
| Dipole curl norm there                                  |                                                 1.17×10⁻¹⁰ |
| Rectangular-face analytic vs numerical surface integral |                                     Vector error 4.44×10⁻⁶ |
| Bar divergence exterior / interior samples              |                                   8.47×10⁻¹¹ / −3.77×10⁻¹⁰ |
| Bar normal-field difference across face at ±10⁻⁶        | −2.62×10⁻⁵, finite-distance estimate; should converge to 0 |
| Kinematic nozzle divergence at (0.7,0.2)                |                                                 4.30×10⁻¹¹ |
| Gravity balance x for 81:1, d=10, barycentric origin    |                                              8.87804878049 |

Additional analytic checks established by substitution/differentiation in this design:

- Wire exterior: Bφ=kI/r; interior Bφ=kI r/a²; continuous at a; divergence zero; external circulation 2πkI. Equal same-direction currents cancel at midpoint.
- Capacitor center: Ey=−4ks arctan(2L/d). As L/d→∞, Ey→−2πks=−s/ε0. Finite-width/infinite-depth far field is a line-dipole field, decaying as 1/r²; it is not a finite 3D dipole’s 1/r³.
- Dipole: polar/equatorial magnitudes 2|m|/r³ and |m|/r³; finite-sphere normal B matches; meridional curve r=L sin²θ has the field tangent.
- Gravity: exterior flux −4πGM for one sphere, g∝r inside the uniform sphere; cancellation formula follows from M1/r1²=M2/r2².
- Uniform-E motion, shell theorem, nozzle, Faraday, conductor, interference phase, circular orbit and loop axis have their specific checks next to their formulas. These were algebraic checks; they were not all separately executed as numeric tests.
- Surface illumination uses a unit light vector to rounding; the procedural surface recipes are appearance constructions, not physical geography or radiative-transfer models.

### Required implementation acceptance tests

1. Extend the completed helper compilation check to every component wrapper and seed using the real graph environment. Compare CPU reference values with float GLSL at representative points and near domain boundaries; link and run the resulting shader.
2. Confirm render geometry covers singular cores; no charges or plates become black voids; full magnet traces do not terminate at fake poles.
3. Test equal/opposite/zero sources, slider endpoints, nulls, camera rotation, seed-off, still mode, preference persistence and user-variable collisions.
4. For 3D invariance, translate a probe along z and verify an unchanged vector. Inspect the single slab with rods/plates/cylinder; reject any stacked-copy look.
5. Check vector labels at zero, overlap, viewport edges and behind surfaces; names should follow their arrows and never survive hidden vectors.
6. Measure sustained frame time at 20k, then increase count. Report the actual Iris Xe configuration and frame-time percentiles; do not infer 60 fps from arithmetic counts.
7. Project the demo in a classroom-size view: read a main vector/name from the back of the room, compare writing off/on, and ensure controls do not obscure the picture. Educational effectiveness remains a user-test question.

## 15. Infrastructure additions, precisely bounded

**Required baseline:** preset-owned Desmos expression folders, with style metadata, visibility groups and stable ownership. Extend the existing `loadPresetVariables` / generated-set path. Include graph helpers, geometry, contours, optional label points, slider defaults and a single safe scene-time ticker where needed. Removing/switching a preset must not delete user-owned expressions. Verify the opaque flow backdrop does not cover new Desmos objects: use existing under/over layer controls and appropriate backdrop placement; report a compositing change separately if those cannot preserve both objects and particles.

**Required for your amendment:** a small arbitrary-anchor GPU vector instance list and a finite stroke-glyph vector-name overlay, with separate toggles and shared scale groups. This is a renderer addition, not functionality documented in the original brief.

**Ordinary UI/schema work:** writing-mode explanations/equations/values in the plugin panel and persistent toggles; allow physics presets to override the gallery's unconditional saturation/contrast boost. No GPU text engine or mathematical parser is required for prose; use the UI’s existing text/math facility if available, otherwise budget a standard math display integration separately.

**Required by the later three-body request:** a three-body trajectory provider with ahead-of-time screening, collision events and synchronized body-position uniforms/Desmos geometry. This goes beyond the original field-only brief, but is narrowly scoped to three massive bodies. The explosion uses existing Desmos geometry. See section 17 for the contract and tested examples.

**Optional, not assumed for the other presets:** shared plugin-to-Desmos clock binding; path-length-based death; explicit flux-weighted streamline start points (the inspected 3D tracer currently starts uniformly). Basic designs must still work using a graph T ticker, current lifetimes, existing traces and static geometry. Concurrent traces plus independent particle flow would be another overlay/compositing addition; the baseline instead offers the two as alternative looks, and uses the trace renderer's own moving window for motion.

No custom object meshes, bitmap textures, interactions among the thousands of field tracers, arbitrary font atlas, general field cache, full electrodynamics solver, or generic many-body simulation framework is assumed. The requested three-body mode does require mutual gravity among its three bodies.

## 16. Unverified or deliberately limited

- Repository and saved screenshots were reviewed at the pinned commit; no live Desmos/extension render verification and no source patch was made.
- GLSL driver optimization cost, shader branch execution, coordinate color assignment through this fork, new probe/label behavior and final depth/layer integration need runtime confirmation.
- Desmos tickers/parametric parameter domains require implementation wiring; the report does not assume the plugin t and graph T are already synchronized.
- Initial particle settings and engineering estimates are unbenchmarked. Bar-magnet transcendental cost may force an arrows/traces-first release.
- Float cancellation, exact face limits, high-aspect-ratio rectangles and singular-edge integration need robust numerical tests beyond the reported samples.
- The prescribed-charge strip capacitor is not an exact finite conducting capacitor. An infinite-depth model is not a fully finite 3D plate model.
- Circulation is imposed in the cylinder model; no viscosity, separation, drag crisis or empirically calibrated spin-to-lift relation is modeled.
- Point-dipole time modulation omits induction; the Faraday demo is a separate magnetoquasistatic model.
- Generic procedural planets, aurora curtains, galaxy seeds and pulsar cones are explicitly illustrative; they do not establish photorealism or a self-consistent astrophysical solution.
- The existing three-body/Kepler formula builders were inspected and their approximations identified, but their stated error bounds were not independently reproduced. The separate 3D renderer failure was not reproduced or repaired.
- A no-writing scene can communicate geometry and change but cannot by itself spell out model assumptions or units. Keep those available in teacher controls even when the graph itself is text-free.

The immediate build target is electric charges with solid markers, exact exterior lines, a movable probe, and the two independent **Main vectors** / **Vector names** toggles. It exercises the shared infrastructure while correcting the largest teaching problem.

## 17. Added request: randomized three-body systems, collisions and restart

### Behavior to build

Keep “Figure eight” as a separate choreography option. Add **Random three-body**: three solid bodies follow mutually interacting Newtonian trajectories; the surrounding GPU field follows their current positions. Each new system must survive **more than 30 seconds of active playback**, with a 35-second screening margin. A detected collision triggers a small local expanding flash, then a fresh, independently screened system. Do not force a collision when a timer expires.

No-writing mode shows bodies, motion, trails, optional arrows/names and the brief collision graphic. Writing mode optionally adds “Three bodies interacting through gravity,” an elapsed time, and “Collision — new system.” Both modes retain independent **Main vectors** and **Vector names** toggles. At a selected body show v and net gravitational force; optional two component forces make vector addition concrete. At a free-space probe show g.

The lifetime requirement refers to **active viewing seconds**, not time while paused, and the explosion itself does not count. Screen against the allowed playback speed. At fixed 1×, require first collision later than 35 simulation-time units when one unit is one playback second. If the UI permits up to 2× during that run, screen at least 70 units instead. Arbitrary fast-forward or editing masses/velocities/radii invalidates that guarantee: keep the automatic demo’s parameters fixed during a run, or rescreen before starting the edited system. Never silently disable collisions for the first 30 seconds.

### Physics and “reasonable” initial conditions

For each body i, integrate position and velocity together:

`dr_i/dτ = v_i`

`dv_i/dτ = G Σ_(j≠i) m_j (r_j−r_i)/|r_j−r_i|³`.

The sum is evaluated over just the other two bodies in a small CPU/worker routine; it does not go through the field compiler. Use finite collision radii and stop the pre-collision integration at surface contact. No softening is needed before contact if close encounters are resolved properly. This is point-mass exterior gravity between spherical bodies, not a simulation of deformation or hydrodynamic merger.

Generate candidates from a mixture of families:

1. **Comparable masses, non-collinear starts:** masses 0.7–1.3 in normalized units, separations of order 1–4, low or moderate initial speeds. This produces visible exchanges and occasional delayed collisions.
2. **Binary plus a third companion:** an initially bound inner pair and a more distant third body, with modest perturbations. Some remain stable; some develop close encounters. A negative total energy alone does not prevent escape.
3. **Near a known choreography:** perturbed initial states of an accurately integrated periodic orbit. Do not use the repository’s Fourier-fit positions alone as proof of a dynamically consistent initial state.

Subtract center-of-mass position and velocity from every candidate. Reject overlaps and nearly touching starts. For family 1, scale initial velocities to a chosen virial ratio Q=2K/|U|, roughly 0.5–1.1, then screen: that range gives initially negative total energy but is not a stability theorem. Use radii proportional to m^(1/3) for equal assumed density, and use those **same radii for drawing and collision detection**. The demonstrated examples below use Ri=0.12 mi^(1/3), G=1.

Test genuine planar systems separately from 3D ones: projecting a 3D orbit onto a screen can make bodies appear to cross without colliding. A planar preset must set initial z and vz to zero and integrate/rescreen those planar initial conditions; do not simply remove z from a previously screened 3D trajectory.

### Screening, replay and the 30-second guarantee

Before display, integrate a candidate to collision, escape/framing rejection, or a screening horizon. Reject any candidate that collides, becomes numerically unreliable or leaves the intended view before the minimum viewing interval. Keep a small bank of accepted trajectories so restarting does not block the UI; prepare the next candidate while the current system plays. If generation runs out of time, draw another validated bank entry rather than lower the minimum lifetime.

For a collision-rich automatic demo, preferentially select candidates whose **natural** collision time lies between 35 and 120 playback seconds. Stable systems may remain as an additional variety option; they should not explode just because 120 seconds elapsed. Randomize orientation, body naming and mirror orientation of screened examples for cheap extra variation; rotations preserve the dynamics and collision time, though camera framing still needs a check.

For the strongest timing contract, replay the accepted precomputed trajectory and its collision event rather than integrating it a second time with a different real-time step schedule. Store position and velocity samples and use bounded interpolation, refined near close encounters. Detect collisions on the integrated trajectory; validate that interpolated displayed bodies neither visibly overlap early nor tunnel through contact. Pause and single-step freeze/advance the same simulation clock for bodies, vectors, field and effects.

If a live integrator is preferred, use an error-controlled close-encounter method and keep the screening and playback algorithms/tolerances identical. A simple adaptive Verlet screen is enough for the exploratory results here, not a blanket long-term accuracy claim. IAS15 is a relevant reference for high-accuracy adaptive gravitational integration; REBOUND also documents explicit body radii and collision callbacks. No REBOUND dependency is assumed for this extension. [IAS15 paper](https://arxiv.org/abs/1409.4779), [REBOUND collision example](https://rebound.hanno-rein.de/ipython_examples/User_Defined_Collision_Resolve/).

### The GPU field and solids

Expose body positions as scalar uniforms a1,b1,c1, a2,b2,c2, a3,b3,c3, with braced subscripts in Desmos. The 3D gravity component formulas are straightforward and contain no sums:

```latex
r_{1}(x,y,z)=\sqrt{\left(x-a_{1}\right)^{2}+\left(y-b_{1}\right)^{2}+\left(z-c_{1}\right)^{2}}
r_{2}(x,y,z)=\sqrt{\left(x-a_{2}\right)^{2}+\left(y-b_{2}\right)^{2}+\left(z-c_{2}\right)^{2}}
r_{3}(x,y,z)=\sqrt{\left(x-a_{3}\right)^{2}+\left(y-b_{3}\right)^{2}+\left(z-c_{3}\right)^{2}}
f(x,y,z)=-\frac{GM_{1}\left(x-a_{1}\right)}{r_{1}(x,y,z)^{3}}-\frac{GM_{2}\left(x-a_{2}\right)}{r_{2}(x,y,z)^{3}}-\frac{GM_{3}\left(x-a_{3}\right)}{r_{3}(x,y,z)^{3}}
g(x,y,z)=-\frac{GM_{1}\left(y-b_{1}\right)}{r_{1}(x,y,z)^{3}}-\frac{GM_{2}\left(y-b_{2}\right)}{r_{2}(x,y,z)^{3}}-\frac{GM_{3}\left(y-b_{3}\right)}{r_{3}(x,y,z)^{3}}
h(x,y,z)=-\frac{GM_{1}\left(z-c_{1}\right)}{r_{1}(x,y,z)^{3}}-\frac{GM_{2}\left(z-c_{2}\right)}{r_{2}(x,y,z)^{3}}-\frac{GM_{3}\left(z-c_{3}\right)}{r_{3}(x,y,z)^{3}}
```

Guard the visualization components with `min(r1/R1,r2/R2,r3/R3)>1`, expanded with full helper calls. Draw each sphere `r_i(x,y,z)=R_i` through the Desmos geometry folder. For a selected body's acceleration, compute only the other two bodies' gravity in the dynamics provider: evaluating the masked total-field function at that body's own center is not its acceleration.

Use restrained white/cream/blue-white solid bodies, short actual orbit trails, and very faint normalized field tracers. At most 6 main vectors are visible by default; each has its own optional name. Field particles indicate instantaneous g directions and **do not represent stars falling through space under Newton's second law**. Keep the gravitational field and any decorative carried-gas velocity field as distinct selectable quantities. Do not mix them into one unlabeled vector.

### Collision and the little explosion

Collision criterion: `|r_i−r_j| ≤ R_i+R_j`. Use event refinement or swept/substep testing so a fast body cannot cross another between sampled frames. A screen-space overlap of two 3D spheres is not a collision.

At contact, save the mass-weighted collision position C=(mi ri+mj rj)/(mi+mj), hide the colliding solids, dim the third body and fade the old trails. Draw a local, pale expanding ring in 2D or translucent sphere in 3D for about **0.7 seconds**, then load the next accepted initial state and reset its playback age. Use an animation scalar T_e from 0 to 0.7:

```latex
A(T_{e})=R_{i}+R_{j}+0.8T_{e}
\left(x-c_{x}\right)^{2}+\left(y-c_{y}\right)^{2}=A(T_{e})^{2}
\left(x-c_{x}\right)^{2}+\left(y-c_{y}\right)^{2}+\left(z-c_{z}\right)^{2}=A(T_{e})^{2}
```

Use opacity `0.45(1−T_e/0.7)²` and a short-lived smaller bright center. Optional 6–10 Desmos points fly radially outward and fade, using fixed direction lists only in Desmos. This is a stylized collision indicator, not a quantitative stellar explosion or a physical continuation of all three bodies. It requires no new particle emitter, custom mesh or texture. An “Explosion effect” toggle can suppress the flash while retaining collision/restart behavior. An “Auto restart” toggle lets a teacher pause at contact.

### Demonstrated screened examples

I generated and screened 46 candidates across both dimensions, and retained three per dimension. The screen used Newtonian pair forces without softening, finite radii, adaptive short steps, a swept relative-segment collision test and a maximum radius-of-view rejection at 15 units. I repeated accepted candidates with maximum time step reduced from 0.005 to 0.0025. All remained above the 35-second acceptance threshold at 1×.

| Dimensions | Initial-condition seed | Collision time, finer run | Difference from coarse run |
| ---------- | ---------------------: | ------------------------: | -------------------------: |
| 3D         |               20261009 |                  51.853 s |                   0.0049 s |
| 3D         |               20261026 |                  46.296 s |                   0.0002 s |
| 3D         |               20261030 |                  68.664 s |                   0.0215 s |
| 2D         |               20261009 |                  59.680 s |                   0.0058 s |
| 2D         |               20261026 |                  46.002 s |                   0.0009 s |
| 2D         |               20261028 |                  41.375 s |                   0.0029 s |

The saved **three-body-screened-examples.json** contains full masses, radii, initial positions and velocities, both collision-time estimates, colliding pairs and sampled energy errors. The largest sampled relative energy error in the finer runs was approximately 0.00126 (0.126%); a production solver should tighten and continuously monitor its error target. Use the explicit initial-state numbers; the seed alone is not portable across different random-number generators. These are research examples, not an integrated or production-validated feature. The test did not run the browser, verify interpolation, or simulate the explosion. A smaller numerical time step changed the reported collision times slightly, as expected; these times are approximate, not astronomical predictions. The six added three-body field helpers also passed the branch compiler check, bringing the helper total to **51**.

### Additional acceptance tests

- Every auto-selected system meets the >30-second active-playback requirement at every offered speed; pauses do not use up that interval.
- No new initial state starts with contact/overlap; all three bodies remain visible and large enough to follow during the guaranteed interval.
- Momentum, angular momentum and energy drift remain within declared numerical tolerances before collision; compare smaller steps and investigate chaotic divergence instead of promising identical distant futures.
- A collision fires once, at physical contact, and produces one effect and one replacement. The old field/trails do not persist around new bodies.
- The next system is already screened; fallback to the bank preserves responsiveness and lifetime when candidate rejection is frequent.
- Camera rotation and 3D projection do not trigger collisions; 2D and 3D banks remain separate.
- Main-vector and vector-name preferences survive every automatic restart in both writing modes.
