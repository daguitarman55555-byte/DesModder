# Vector Tools × PhET — audited teaching designs and initial patch

**Reference:** `daguitarman55555-byte/DesModder`, `feature/vector-tools-foundation`, exact base `e388d5d417d29adcbd4ff4ac22cc139763b08fb7`. Research and patch prepared October 12, 2026. **No remote changes made.**

**Evidence key:** **H** = PhET HTML5 accessible simulation description exposes the screen/control; **P** = PhET public simulation page or example descriptions; **R** = prior repository design/source; **M** = physics derived/analytic verification; **S** = specification, not implemented. The PhET HTML was retrievable as searchable screen-by-screen accessible content on a subset of simulations, but this execution environment could not drive an interactive graphical browser or render live Desmos. **No screen claim below should be construed as a completed interactive click-through.** See `verification/ledger.md`.

## 1. Corrected source survey and teaching moves

The source survey is a catalogue assessment, **not** a tested record of 112 individual simulations. Its statement about all 112 having been “checked” is overbroad. Its ranking remains useful; the following corrections affect actual functionality:

| Source / original rank                 | What the accessible HTML5 version actually exposes                                                                                                                                                                                                                                                          | Correction and lesson                                                                                                                                                              | Evidence                                                                                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Energy Skate Park, 1 & 12              | **Full**: Intro, Measure, Graphs, Playground; energy bars/pie, adjustable tracks, speed, energy sensor and energy-vs-position/time graph. **Basics**: Intro, Friction, Playground; custom track pieces, adjustable friction/mass, speed, pause, step, normal/slow, thermal-energy channel, energy bar zoom. | “Draw a track” is not confined to the same Intro experience; the full Graphs/Measure tabs add genuinely different tools. A clock-linked chart is more useful than decorative bars. | H: `https://phet.colorado.edu/sims/html/energy-skate-park/latest/energy-skate-park_fr.html`, `https://phet.colorado.edu/sims/html/energy-skate-park-basics/latest/energy-skate-park-basics_all.html` |
| Moving Man (Java), 2                   | A legacy, not current HTML5, model of draggable position/velocity/acceleration alongside synchronized graphs.                                                                                                                                                                                               | Cannot report a contemporary HTML5 screen walkthrough. Reproduce the cause–slope–curvature relationship, not its UI.                                                               | R: source survey; legacy                                                                                                                                                                             |
| Kepler's Laws, 5                       | **First, Second, Third, All Laws** screens; orbit/velocity/force, foci, axes, eccentricity, orbit choice, sweep area/value/time segments; ruler, stopwatch, period measurement; T-versus-a graph; Restart/Play/Step and Fast/Normal/Slow.                                                                   | The second-law screen is purpose-built, not merely a general orbit with one area overlay. Add **two equal-duration sectors**, not one; equal angular sectors would be wrong.       | H: `https://phet.colorado.edu/sims/html/keplers-laws/1.2.5/keplers-laws_es.html`                                                                                                                     |
| Pendulum Lab, 4                        | **Intro, Energy, Lab**; adjustable length, mass, gravity, friction, initial angle; one/two pendulums; energy graph, period trace/timer, ruler, stopwatch; Lab adds velocity and acceleration vectors.                                                                                                       | Survey's two-pendulum/energy description is correct but misses distinct energy and precision-timing screens. Our undamped separatrix is **not** PhET's dissipative comparison.     | P: `https://phet.colorado.edu/en/simulations/pendulum-lab`; detailed screen guide `https://script.spoken-tutorial.org/index.php/PhET-Simulations-for-Physics/C3/Pendulum-Lab/English`                |
| Forces and Motion: Basics / ramp, 8    | Modern Basics has **Net Force, Motion, Friction, Acceleration**, rather than Intro/Lab; force arrows, speed and adjustable applied/friction forces. Older Ramp/The Ramp are legacy Java.                                                                                                                    | Derive the static-friction threshold explicitly. Do not claim the old Java incline as a current HTML5 screen.                                                                      | H/P: PhET Forces and Motion: Basics; source survey legacy classification                                                                                                                             |
| Charges and Fields, Gauss, 6           | Movable charges, electric-field sensors, voltmeter/equipotential measurement. There is **no Gauss-surface flux-integral tool** in that sim.                                                                                                                                                                 | Gauss is an original extension to charges, **not** a feature replicated from PhET. Visual flux needs vector normals and genuine surface integration.                               | P: `https://phet.colorado.edu/en/simulations/charges-and-fields`                                                                                                                                     |
| Wires / Ampère, 7                      | Survey has no matching Ampère-law PhET module. Wire-related models expose compass/current effects rather than arbitrary contour circulation.                                                                                                                                                                | Our circular loop integral is a new Physics C: E&M lesson. Distinguish global law from special symmetric formula.                                                                  | R/S                                                                                                                                                                                                  |
| Measuring tools, 9                     | Kepler's Laws has draggable tape/stopwatch; CCK has voltmeter and ammeter; Energy Skate Park energy/speed sensor; Pendulum Lab ruler and period timer.                                                                                                                                                      | One generic `MeasureTool` interface cannot treat a voltmeter as a distance ruler; typed measurement providers are needed.                                                          | H: above                                                                                                                                                                                             |
| Faraday's Law, 10                      | **One screen** (not Intro/Lab): sideways coil(s), movable bar magnet, light bulb, optional voltmeter and field lines, switch coil arrangement, flip magnet, reset.                                                                                                                                          | It is not a sinusoidal electromagnet with autonomous flux unless we deliberately add that model. Induced **emf follows velocity and flux gradient**.                               | H: `https://phet.colorado.edu/sims/html/faradays-law/1.4.11/faradays-law_mi.html`                                                                                                                    |
| Gas Properties, 11                     | **Ideal, Explore, Energy, Diffusion**; light/heavy particles, pressure/temperature/volume and energetic plots, pause/step, Diffusion slow mode.                                                                                                                                                             | “Gas particles + Maxwell histogram + PV graph” conflates screens and two statistical ensembles; design a distinct measurement mode with an interval estimator.                     | H: `https://phet.colorado.edu/sims/html/gas-properties/latest/gas-properties_de.html`                                                                                                                |
| Circuit Construction Kit: DC, 13       | **Intro and Lab**. Construct wires/components; voltmeter and ammeters; lifelike/schematic views. Lab adds richer components and internal-resistance options.                                                                                                                                                | Make graphical topology a first-class object; numeric voltage sliders on disconnected drawn wires do not constitute a circuit.                                                     | H: `https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_all.html`                                                                                     |
| Bending Light and Geometric Optics, 14 | Bending Light explores refraction, prism/medium, ray vs wave; **Geometric Optics has Lens and Mirror**, not Intro/Lab; principal-ray and object/image controls.                                                                                                                                             | Combine in an optics workbench but retain two teaching lessons: refraction at interfaces and image construction with signed real/virtual intersections.                            | H: `https://phet.colorado.edu/sims/html/geometric-optics/1.1.9/geometric-optics_en.html`                                                                                                             |
| Wave Interference, 15                  | Two sources; water/sound/light contexts, slits, wall and detector screen, wavelength/intensity and geometry controls, interference and diffraction.                                                                                                                                                         | Need amplitude and **intensity** as separate quantities; scalar moving particles cannot reproduce coherent interference.                                                           | P: `https://phet.colorado.edu/en/simulations/wave-interference`                                                                                                                                      |

**Important correction to the original “nothing is 3D / no formula editing” generalization:** those are defensible comparisons of the _specific PhET demonstrations_, not universal properties of all 112 simulations or every PhET tool. Avoid universal claims unsupported by an interactive inventory.

### Current CED alignment and boundaries

The current College Board framework (2024 redesign with 2026–27 clarifications) arranges AP Physics 1 in Units 1–8 and Physics 2 in Units 9–15; **C: Mechanics in Units 1–7 and C: E&M in Units 8–13**. Links: [AP1](https://apcentral.collegeboard.org/courses/ap-physics-1), [AP2](https://apcentral.collegeboard.org/courses/ap-physics-2), [C Mechanics](https://apcentral.collegeboard.org/courses/ap-physics-c-mechanics), [C E&M](https://apcentral.collegeboard.org/courses/ap-physics-c-electricity-and-magnetism). Objective IDs below follow the source repo's College Board-derived `curriculum-alignment.json` for AP1/2, and the C: E&M CED for C.

| Feature                                  | AP unit, topic and LO                                                                          | Boundary                                                                                                                                                         |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Motion traces/projectile                 | AP1 U1 1.2 (1.2.B), 1.3 (1.3.A), 1.4 (1.4.B), 1.5 (1.5.B)                                      | Drag-free projectile, constant acceleration                                                                                                                      |
| Slow/step/ruler                          | AP1 U1 Topics 1.2–1.5, 1.2.B / 1.4.B; cross-cutting science practice 1.B and 2.B               | Tools, not an additional learning objective                                                                                                                      |
| Energy bars / skate                      | AP1 U3 3.2 (3.2.A), 3.4 (3.4.B), 3.5 (3.5.A); AP1 U7 7.3 (7.3.A)                               | Mechanical vs thermal energy distinguished                                                                                                                       |
| Circular motion                          | AP1 U2 2.9 (2.9.A), U5 5.2 (5.2.A)                                                             | Unspecified inward constraint does no work                                                                                                                       |
| Pendulum                                 | AP1 U7 7.1–7.4 (7.1.A, 7.2.A, 7.3.A, 7.4.A); calculus extension C Mechanics U7                 | **Separatrix and exact nonlinear phase portrait are enrichment**, not a required SHM result                                                                      |
| Kepler equal areas                       | AP1 U2 Gravitation/Orbits (2.10 where addressed); C Mechanics U2 2.10.B for Kepler _third_ law | **Do not present Kepler first/second laws as C Mechanics exam objectives.** CED expressly excludes expecting those laws. Equal-area visualization is enrichment. |
| Incline/friction                         | AP1 U2 2.2.B / 2.4.A / 2.5.A / 2.7.B                                                           | Static friction reacts up to threshold; does not always equal μsN                                                                                                |
| Gauss                                    | C E&M U8 **8.5.A electric flux**, **8.6.A Gauss's law**                                        | Integral law for closed surface; symmetry needed to reduce to EA                                                                                                 |
| Ampère                                   | C E&M U12 **12.4.A Ampère's law**                                                              | Magnetostatic steady current; no displacement-current term                                                                                                       |
| Moving magnet                            | AP2 U12 12.4.A (induction), C E&M U13 induction topics                                         | Quasistatic approximation; no full electrodynamic radiation                                                                                                      |
| Kinetic gas                              | AP2 U9 thermodynamics and kinetic theory (9.2 / 9.4 / 9.6)                                     | Maxwell histogram requires 3D thermal ensemble assumption                                                                                                        |
| Typed track                              | AP1 U3 work–energy (3.2.A / 3.4.B)                                                             | Leaving track, curvature and friction must be explicit                                                                                                           |
| Circuits                                 | AP2 U11 11.5.A / 11.6.A / 11.7.A; C E&M U11 circuit analysis                                   | Ideal DC network first; AC/RLC are separate                                                                                                                      |
| Optics                                   | AP2 U13 **13.1.A/B, 13.2.A, 13.3.A, 13.4.A**                                                   | Geometric optics ignores diffraction except at separate wave view                                                                                                |
| Interference                             | AP2 U14 **14.7.A, 14.8.A**                                                                     | Ideal coherent sources, finite aperture envelope as separate model                                                                                               |
| **New: hydrostatic pressure + buoyancy** | AP1 U8 8.2.B hydrostatics, 8.3.B buoyancy                                                      | Stationary fluid has no physical velocity flow                                                                                                                   |

Where a CED objective is shared across multiple examples, the table identifies the relevant parent LO rather than claiming that the advanced interactive construction appears in the CED. Confirm the 2026–27 correction notices before final publication.

### Revised priority list

The original first eight and their relative order remain. **New rank 9: hydrostatic pressure and buoyancy**, inserted ahead of generic measuring tools because it closes an AP1 U8 conceptual gap at native-scene cost. Original ranks 9–15 shift to 10–16. In particular: **1** energy, **2** motion graphs, **3** clock, **4** pendulum, **5** Kepler, **6** Gauss, **7** Ampère, **8** incline, **9** pressure/buoyancy _new_, **10** measuring tools, **11** magnet/coil, **12** kinetic gas, **13** typed track, **14** circuits, **15** optics bench, **16** interference. Original rankings are retained in the detailed section headers.

## 2. Shared implementation contract

### Presentation and code placement

**Explanatory** = Desmos-native geometric solids, colored arrows, readouts, graphs, distinct reference axes, measuring controls, editable variables. **Majestic** = visible _solids only_, 24,000 2D / 30,000 3D GPU-flow particles with trails and glowing palette; _no text, bars, graph labels, probes, arrows or annotated curves_. `SceneItem.explains=true` is the hiding contract. Every physical flow has a **named physical tint**; do not equate particle movement speed to the model's real physical particle density by default.

New presets use the existing `GalleryPreset` interface and `src/field-rendering/gallery/ap-teaching.ts` pattern. Implemented extensions are in `ap-extensions.ts`, included in `gallery/index.ts`. `category="ap1"/"ap2"` and `apUnit` determine shelves. C E&M topics presently reside under `ap2` with a `C: E&M` name; introduce a third `apc` shelf, with course and unit number, _only if_ the user needs course-isolated browsing. For now no category migration is proposed.

**Shared features — proposed API (not implemented beyond first energy bars):**

```ts
interface PresetLiveReadout {
  kind:
    | "energy-bars"
    | "motion-traces"
    | "stopwatch"
    | "ruler"
    | "field-sensor";
  visibleSwitch: string; // GalleryVariable of 0/1
  quantities: { key: string; latex: string; unit: string; color: string }[];
  anchor2D: { x: number; y: number; height: number };
  anchor3D?: { x: number; y: number; z: number };
  normalization?: "per-mass" | "per-object" | "absolute" | "none";
}
interface ExtendedGalleryPreset extends GalleryPreset {
  measurements?: readonly PresetLiveReadout[];
  layout?: {
    contentBounds2D: [number, number, number, number];
    reservedLeftFraction?: number;
    reservedRightFraction?: number;
  };
}
```

The **presets window** shows opt-in chips _Energy_, _Graphs_, _Measure_ and _Lab controls_ on the currently selected preset, with a concise units/quantity legend. A new `modeHints` subpanel can show the `K/U/D/E` color order in 3D, where Desmos does not label surfaces. This extended API and subpanel are **specified, not implemented**; current patch integrates native energy via `energy-bars.ts` in the 3 AP presets without altering `GalleryPreset`, and puts `s_{energy}` in their variables.

**Screen-space geometry and scaling:** Reserve the rightmost 24% of 2D view for a fixed three/four-bar chart when scene layout permits; for existing projectile use Desmos x coordinates 3.6, 4.35, 5.10, 5.85 at base y=3.0; for SHM/circular y=−5.5. Chart max height 2.25: `H_i=2.25 max(0,E_i)/max(0.5,E_total)`; this preserves comparative height but not true numeric scale across presets. For viewport changes/layout collision, a future `layout` plugin should re-anchor in screen pixels rather than hard-coded x/y. In 3D, native planar surfaces at y=−3.7 with x=2.0+0.66i and z base −2.7; read them left-to-right in legend; they disappear in Majestic. **The present coordinate-only patch does not guarantee no overlap under pan/zoom or every slider value.** A viewport-aware reserve is the acceptance gate before claiming this requirement satisfied.

**Existing opt-ins, proposed after first patch:** AP projectile, SHM, circular implemented; continuity/Bernoulli add Bernoulli pressure/kinetic/total per mass; conductor add electric field/potential with correct terminology (not automatically “energy conservation bars”); induction show field energy/source work only with explicit energy accounting. Existing orbit presets `src/field-rendering/gallery/orbits.ts` can adopt `energy-bars` with `clockParameters` and a signed gravitational-potential channel; static electric charges adopt measurement/field-potential probes, not mechanical K/U bars. The user requested a shared interface for all six AP and orbit/charge presets: `measurements` supports all; **do not opt a preset into meaningless KE bars**.

**Live graph interface:** `motion-traces` takes `{x(t),v(t),a(t), tStart, tEnd = min(T_scene,6), lanes, coordinateFrame}`; native Desmos parametric curves use `domain: ["0", "\\min(T_{scene},6)"]`. In 3D, curves live on z=0 as pedagogic display geometry; they are never a literal physical trajectory if x-axis means time. For other presets, reference-frame transformation x′=x−v_f t, v′=v−v_f, a′=a. Reset clears time extent but retains slider values.

**Clock** (implemented): existing `setTimeSpeed()` plus 0.25× quick action; `stepClock()` first pauses, then calls the same `showClockTime(clockSeconds+1/30)` as animation and resets renderer uniforms. Reset sets 0. Time speed is scaled simulation seconds per wall second; physical solvers in C1/C4 must substep separately, not couple their numerical dt to browser FPS. Clock already rounds native scene expression `T_{scene}` to 1/30 s (source limitation). Buttons are in `VectorToolsPanel.timeControls`, not custom PhET-shaped UI.

**Drag:** existing probe remains movable, controlled variables update via Desmos; future 3D measurements use `SceneItem.drag3d`. Clock never drives draggable points. Lab controls must write native named variables rather than secretly modifying formulas. On Reset, `T_scene=0`, transient trails/stats cleared, slider values retained unless Reset Variables invoked.

### Desmos LaTeX shape used in every native-scene design

For all 2D native rectangles:

```latex
\operatorname{polygon}\left(\left(x_0,y_0\right),\left(x_0+w,y_0\right),\left(x_0+w,y_0+h\right),\left(x_0,y_0+h\right)\right)\left\{s_{energy}=1\right\}
```

For native traces:

```latex
\left(t,x_0+v_0 t+\frac{a t^2}{2}\right)\left\{s_{traces}=1\right\},\quad 0\le t\le\min\left(T_{scene},6\right)
\left(t,v_0+at\right),\quad 0\le t\le\min\left(T_{scene},6\right)
\left(t,a\right),\quad 0\le t\le\min\left(T_{scene},6\right)
```

Desmos-native parametric domains should be `SceneItem.domain`, **not** arbitrary implicit inequalities on the coordinate plane. 3D solids use `domainU`/`domainV`, and only **surface parameters** may be `u`/`v`; sliders may not. Every scene piece is specified as exact LaTeX in the patch for implemented models; the following design sheets supply literal LaTeX for planned scenes.

## 3. Small and medium design sheets: original ranks 1–11

### Original #1 — energy bars (implemented for 3 AP presets)

**Explanatory:** projectile: orange K, blue U, violet D (post-impact dissipated energy), green total E; SHM: K/U/E exchange; circular motion: K constant, U=0, E=K. 2D labels under bars; 3D four/three surface rectangles, no native text. **Majestic:** all bars/labels hidden, solid ball/ground/oscillator state retained, dense glow uses the preset’s existing named tint (projectile vertical velocity; SHM energy; circular specific kinetic energy). **Controls:** `s_{energy}=1 [0,1] step1` added 2D and 3D, `T_{scene}=0 [0,1000] step0.01` existing clock; inherited g, v0x, v0y, h / m,k,A / w,R sliders retain source defaults/ranges. Expressions exactly in `energy-bars.ts` (6–8 scene items per 2D model, 3–4 surfaces in 3D). Physics: projectile K=(v0x²+(v0y−gt)²)/2, U=g(h+v0y t−gt²/2), E=(v0x²+v0y²)/2+gh, D=0 in flight and E while resting; impact is explicitly **inelastic** and D stands for energy transferred to ground/internal modes, **not heat added by a temperature difference**. Oscillator K=kA²sin²(√(k/m)t)/2, U=kA²cos²(...)/2; circular K=w²R²/2. Bars normalize to the same E within preset, height max2.25. **Limit:** `D` is idealized instantaneous collision and E remains globally constant by bookkeeping; it does not predict sound, restitution or temperature. **Tests:** analytic K+U+D=E across impact phase, SHM energy throughout a period, circular U=0, reject NaN at w=0, test both dimension's scene items hide in Majestic. Live: zero refused, visible bars at every slider endpoint, no photo overlap, 60 FPS/150 ms.

### Original #2 — live x, v, a graphs (implemented as separate motion preset)

**Explanatory:** three stacked strips, moving dot, and slope/curvature change simultaneously. The first y-coordinate is `3.5+0.27(x_ini+v_ini t+a_const t²/2)`, second `0+0.5(v_ini+a_const t)`, third `−3+0.6a_const`; all plot x-coordinate `−3+t`, t∈[0,min(T_scene,6)]. Color orange/blue/green. **Majestic:** no strips, moving object remains; GPU mathematical flow `(1,v_ini+a_const x,0)` with **signed velocity** tint `v_ini+a_const x`, charge/charge-glow palette, scale3, speed0.16, 24k 2D/30k 3D, `e^{-10z²}` planar 3D seeding. **Sliders:** `x_{ini}=0 [-3,3]:0.1`, `v_{ini}=2 [-3,3]:0.1`, `a_{const}=-0.5 [-2,2]:0.1`, `T_{scene}=0 [0,1000]:0.01`, `s_{traces}=1 [0,1]:1`. Scene file `ap-extensions.ts`; draggable marker not yet supported; clock drives all points and curve-domain, Reset time0. **Physics:** analytic constant acceleration, not a general moving-man controller; “particle flow” displays trajectories in a _time-vs-position_ chart, not physical motion through the spatial x/y scene. Tests d/dt x=v, d/dt v=a, three heads at T, curve restriction visibility, both modes/dims.

### Original #3 — clock slow motion and step (implemented)

Existing native `T_{scene}` clock; no new physics field or tint. **Explanatory:** Time panel Play/Pause, 0.25× slow button, Step 1/30 s button, Reset 0 and speed slider. **Majestic:** no in-scene labels; time panel remains the controlling UI outside graph, scene solids/GPU use same seconds. `setTimeSpeed(0.25)` and `stepClock()` in `src/plugins/vector-tools/index.ts`; panel in `VectorToolsPanel.tsx`. The existing speed slider retains `TIME_SPEED_MINIMUM..TIME_SPEED_MAXIMUM`, step0.05. Step pauses before advancing and publishes uniforms. **Limits:** native Desmos scene expression quantized to 1/30; exact physics time smaller than one step is not exposed. **Tests:** three steps =0.1s, step while playing pauses, reset0, FPS remains independent of clock scale, old field unaffected if no time parameter.

### Original #4 — nonlinear pendulum with separatrix (implemented)

**Explanatory:** x=θ, y=θ̇ phase plane; red upper/lower separatrices with domain −π..π, moving state marker, and physical pendulum on the right. **Majestic:** hide red curves and probes, retain physical rod/pivot/bob and small state sphere, color flowing _specific mechanical energy_ H=L²y²/2+gL(1−cos x), charge-glow, scale10, speed0.23. **Sliders:** `g=2 [0.5,4]:0.1`, `L=1.3 [0.6,2]:0.05`, `T_{scene}=0 [0,1000]:0.01`. **Exact GPU:** `(\dot x,\dot y)=(y,-(g/L)sin x)` in Desmos `P=y`, `Q=-\frac{g}{L}\sin\left(x\right)`. Energy H above. **Scene:** `\left(t,\pm 2\sqrt{g/L}\cos(t/2)\right)` on `[-π,π]` (z0 3D); `\theta_{sep}(T)=4\arctan(e^{\sqrt{g/L}(T-4)})-\pi`, `\omega_{sep}(T)=2\sqrt{g/L}/\cosh(\sqrt{g/L}(T-4))`; marker `\left(\theta_{sep},\omega_{sep}\right)`; physical rod `(5.6+sLsin θsep,2.4−sLcos θsep), s∈[0,1]` and bob at s1; 3D physical pendulum uses z vertical, as exact code in `ap-extensions.ts`. **Physics:** conservative nonlinear single pendulum in uniform g with massless rod, no drag/forced motion; separatrix energy 2gL. **Limit:** exact separatrix approaches upright state asymptotically; it is _not_ an ordinary periodic swing or a generic initial condition, and θ is displayed in radians. **Tests:** H constant along field, separatrix H=2gL, period increases with amplitude (proposed elliptic-integral comparison), state and real bob angular velocity synchronized. Live visibility/full density/3D.

### Original #5 — Kepler equal areas (implemented)

**Explanatory:** native ellipse with focus and orbiting sphere/point. Two transparent polygon sectors over **equal one-sixth periods**, one starting at periapsis, one at apoapsis, in different colors. In 3D wedges are parametric filled planar sectors with custom u/v domains. **Majestic:** focus/planet spheres remain; orbit line and wedges disappear; dense confocal particle flow colored by **local areal velocity** `h(r)/2`, charge-glow palette, scale3, speed0.16. **Sliders:** `a_{orb}=3 [1.7,4.2]:0.1`, `e_{orb}=0.4 [0,0.6]:0.02`, `M_g=3 [1,6]:0.1`, `T_{scene}=0 [0,1000]:0.01`. **Exact equations:** `n=\sqrt{M_g/a_{orb}^3}`, `P=2π/n`; Kepler anomaly `M=nt=E−e sin E` solved via 6 hidden Desmos Newton functions `K_0(q)=q+e sin q`, `K_i(q)=K_{i−1}(q)−(K_{i−1}(q)−e sin K_{i−1}(q)−q)/(1−e cos K_{i−1}(q))`; body `(a(cos E−e),a\sqrt{1−e²}sin E)`; GPU `(P,Q)=κ(−y/r,e+x/r)`, `κ=√(M_g/[a(1−e²)])`, tinted `κ(r+e x)/2`, with `r²>0.04`. Periapsis and apoapsis equal-area polygons sample E at 18 segments per arc in native Desmos. **Physics:** central Newtonian two-body orbit with fixed central focus; along the selected orbit `r×v=√(M_g a(1−e²))`. GPU confocal family uses a fixed κ for different trajectories; **those other particle streamlines do not all solve the same fixed-μ Kepler problem**. Thus particles are a qualitative family of closed curves, the selected orbit is the quantitative two-body lesson. **Limit:** 6-iteration Newton method approximate; no relativistic precession, noncentral forces, and 18-chord polygon area differs slightly from continuum. **Tests:** solve residual below 1e−10 over defaults/ranges; analytic exact sectors equal `πa²√(1−e²)/6`; numerical polygon equal to set tolerance; verify no 3D refused function definitions. **CED warning:** equal-area law is enrichment, not C Mechanics examinable content.

### Original #6 — Gauss's law (designed, not built)

**Explanatory:** existing point charge(s), draggable transparent Gaussian sphere of radius `R_g` at `(c_x,c_y,c_z)`, outward normal arrows and surface flux readout `Φ_E`; interior charge count changes discontinuously only when a charge crosses the surface. 2D shows a cross-section with _explicit 3D-sphere computation_. **Majestic:** charge spheres remain, surface normal/readouts hidden, dense glowing electric field, tint _electric potential V_ in volt per normalized charge, charge-glow scale3; do not color by flux (flux belongs to surface). **Scene LaTeX (3D):** sphere `(c_x+R_g sin v cos u,c_y+R_g sin v sin u,c_z+R_g cos v)`, `u:[0,2π],v:[0,π]`; 2D circle `(c_x+R_g cos t,c_y+R_g sin t)` `t:[0,2π]`; each charge marker `\left(x_i,y_i,z_i\right)`; probe `\operatorname{vector}((p_x,p_y,p_z),(p_x+G E_x,p_y+G E_y,p_z+G E_z))` Explanatory only. **Sliders:** `q_1=1 [-3,3]:0.1`, `q_2=-1 [-3,3]:0.1`, `R_g=2 [0.5,4]:0.05`, `c_x=0 [-3,3]:0.1`, `c_y=0 [-3,3]:0.1`, `c_z=0 [-3,3]:0.1`, `G=0.4 [0,2]:0.05`, switches `s_surface=1,s_normals=1,s_flux=1` each [0,1]:1. **GPU:** `E=∑k q_i (r−r_i)/(‖r−r_i‖³)`, tint `V=∑kq_i/‖r−r_i‖`; `k=1` model units or choose physical `k_e`; no singular evaluation within source radius0.1. **Exact:** `Φ_E=Q_enc/ε0` for point charges not on boundary. Numerical mesh quadrature verifies ∮E·n dA, not just an analytic string. **Teacher limit:** the closed-surface flux equality is always true, but `E A` applies only with symmetry; this is a 3D surface even when showing a 2D section. **Tests:** sphere centered on q gives Q/ε0 within0.5% at 128×64 grid; move charge outside →0 flux; reverse charge sign; boundary-crossing tolerance; 2D does not masquerade as a Gaussian circle law. **File:** `gallery/gauss-ampere.ts` + quadrature `sim/measure.ts`; category ap2 with C E&M tag, CED8.5.A/8.6.A.

### Original #7 — Ampère's law (designed, not built)

**Explanatory:** wire cylinder through screen, arbitrary draggable circular Amperian loop with current count, tangent arrows and line-integral number. **Majestic:** wire solids plus high-density glowing circular magnetic field, tint _signed circumferential B_ (or its z-axis current sign), charge-glow scale2; no annotations. **Scene LaTeX:** 2D loop `(c_x+R_A cos t,c_y+R_A sin t)` `t:[0,2π]`; 3D `(c_x+R_A cos t,c_y+R_A sin t,z_0)`; wire cylinder `(x_i+a_w cos u,y_i+a_w sin u,v)` domain u0..2π, v−4..4. **Sliders:** `I_1=1 [-3,3]:0.1`, `I_2=-1 [-3,3]:0.1`, `R_A=2 [0.3,4]:0.05`, `c_x=0 [-3,3]:0.1`, `c_y=0 [-3,3]:0.1`, `z_0=0 [-2,2]:0.1`, `a_w=0.16 [0.08,0.3]:0.02`; switches `s_loop,s_tangent,s_circulation=1`. **GPU:** for each long wire `B=(μ0/2π) I_i (−(y−y_i),(x−x_i),0)/((x−x_i)²+(y−y_i)²)`; normalized physical coefficient `μ0/(2π)` or unit1 explicitly, tint `∑I_i`-weighted azimuthal component relative to a designated wire. **Law:** `∮B·dℓ=μ0∑enclosed I_i`, sign set by right-hand orientation. **Limit:** static infinite wires only; field can vary around offset loop, and circulation still equals μ0 I_enc; cannot use `B(2πr)` on arbitrary loop. **Tests:** circles both/or neither/single wire, reverse traversal negates signed circulation, numerical trapezoid integral with N256 within0.5% away from wires. `gauss-ampere.ts` and a reusable integration probe. C E&M12.4.A.

### Original #8 — incline with friction threshold (designed, not built)

**Explanatory:** incline triangle, cart rectangle, four force arrows; static threshold and slope of acceleration readout, stick/slip toggle. **Majestic:** slope and block solids, no arrows/labels; dense glowing downslope vector field, tint _net tangential acceleration a_parallel_ with signed blue/orange and scale4; don't seed particles inside solids. **Scene LaTeX:** incline segment `(t\cos\alpha,t\sin\alpha)` `t∈[-4,4]`; normal segment `(-t\sin\alpha,t\cos\alpha)` at block contact; block center `(s\cos\alpha-b\sin\alpha,s\sin\alpha+b\cos\alpha)`; block via rotated polygon of half-width0.4, half-height0.25 about center; force arrows `\operatorname{vector}(P,P+G F)` for `mg` downward, `N=mgcos α` upward normal, friction up/down slope, applied F tangential. **Sliders:** `\alpha=0.35 [0,1.1]:0.01`, `m=1 [0.5,4]:0.1`, `g=2 [0.5,4]:0.1`, `\mu_s=0.5 [0,1.2]:0.05`, `\mu_k=0.3 [0,1.2]:0.05`, `F_p=0 [-6,6]:0.1`, `s=0 [-3,3]:0.05`, `G=0.25 [0,1]:0.05`, `s_{forces}=1,s_{net}=1` toggles. **Physics:** tangential drive `D=F_p−mg sin α`; if |D|≤μ_s mg cos α, a=0 and friction =−D; else `a=(D−sgn(D) μ_k mgcos α)/m` for sliding in the direction of incipient motion (for moving block, use velocity direction). **Teacher limits:** this stick/slip rule omits impacts, rolling, contact loss and reverse-direction transitions; constrain μk≤μs in UI. **Tests:** α=atan μs breakaway equality, N=mgcos α, kinetic friction magnitude, equal-and-opposite constraint forces, 60 FPS under sliding, reset block position. `gallery/ap-incline.ts`.

### New revised #9 — hydrostatic pressure/buoyancy (designed, not built)

**Explanatory:** still colored water column, pressure gauge at draggable `y_p`, floating/sinking rectangular block, differential pressure normal arrows and upthrust. **Majestic:** tank walls + immersed block solids only; glowing colored **pressure scalar** `p(y)=p_0+ρg(h−y)` with negligible GPU particle displacement; a static scalar heatmap is more physically truthful than flowing streams. **Scene LaTeX:** water `y≤h {−4<x<4}`; block rectangle from `(x_b−w/2,y_b−H/2)` to `(x_b+w/2,y_b+H/2)`; gauge point `(x_p,y_p)` with label; vertical pressure arrows at immersed left/right/bottom/top. **Sliders:** `\rho=1 [0.5,3]:0.1`, `g=2 [0.5,4]:0.1`, `h=1 [-1,3]:0.1`, `p_0=0 [0,3]:0.1`, `w=1 [0.5,2]:0.1`, `H=1 [0.5,2]:0.1`, `x_b=0 [-2,2]:0.05`, `y_b=0 [-2,3]:0.05`, switch `s_p=1,s_F=1`. **Physics:** 2D per unit thickness `F_b=ρg V_sub`, `V_sub=w·clamp(h−(y_b−H/2),0,H)`; 3D volume multiplies width in third axis. Static liquid no stream velocity. Tests exact fully/half/unsubmerged buoyancy, pressure depth gradient −ρg, zero lateral net force. Existing Fluid tab remains separate.

### Original #9 / revised #10 — measuring tools (designed, not built)

**Explanatory:** two draggable Desmos points `A=(a_x,a_y)` and `B=(b_x,b_y)` with dashed segment `(a_x+t(b_x−a_x),a_y+t(b_y−a_y)), 0≤t≤1`; distance `d=√((b_x−a_x)²+(b_y−a_y)²)` and stopwatch `T_scene−T_start`, optional field sensor `|F(p_x,p_y,p_z)|`. **Majestic:** none of these tools visible; underlying GPU retains its preset's named field tint. **Sliders:** `a_x=-2 [-6,6]:0.05`, `a_y=0 [-6,6]:0.05`, `b_x=2 [-6,6]:0.05`, `b_y=0 [-6,6]:0.05`, `T_start=0 [0,1000]:0.01`, `s_ruler=0,s_watch=0,s_sensor=0` each [0,1]:1. 3D adds a_z/b_z of0 in [-6,6]:0.05 and `drag3d`. **Interface:** `MeasurementProvider.sample({position,time,scene,units}): {value,valid,unit}` and `MeasureTool` typed `distance|elapsed|scalar|vector|voltage` to prevent pretending a scalar E probe is a voltmeter. **Tests:** Pythagorean3-4-5, 3D6-8-10, zero length, watch pause and reset, point-drag writer does not mutate user's expressions. Source modules `gallery/tools.ts`/`components/MeasurementTools.tsx`.

### Original #10 / revised #11 — moving magnet through coil (designed, not built)

**Explanatory:** bar magnet moves through centered coil, flux Φ and emf traces with polarity arrows and lamp indicator; controls for trajectory and loop turns. **Majestic:** actual magnet and coil solids only with dense glowing induced **azimuthal electric field** tinted signed Eφ (−/+) and scale2, no number labels. **Approximate field:** axial dipole approximation `B_z(z)=B_0 (1+(z/\ell)^2)^{-3/2}`, flux `Φ(z)=NπR_c² B_z(z)` **only** in small-loop approximation `R_c≪ℓ`; magnet center `z_m(t)=z_0+v_m t`; `ℰ=−dΦ/dt=−NπR_c²(3B_0 z/ℓ²)(1+(z/ℓ)²)^{-5/2} v_m`, where z is center-relative axial separation and derivative sign must follow chosen z coordinate. **Scene LaTeX:** 3D coil `(R_c cos u,R_c sin u,0)` u0..2π; bar magnet body at `(0,0,z_0+v_m T_scene)` as a short cylinder with colored north/south faces; 2D side projection uses rectangle and coil ellipses. Flux/EMF traces are native curves to `T_scene`; nonzero loop flux graph has domain 0..min(T_scene,10). **Sliders:** `B_0=2 [0.5,5]:0.1`, `R_c=1 [0.3,2]:0.05`, `N=4 [1,12]:1`, `\ell=2 [1,4]:0.1`, `z_0=-4 [-5,5]:0.1`, `v_m=0.7 [-2,2]:0.05`, `T_scene=0 [0,1000]:0.01`, `s_flux,s_emf,s_lines=1` [0,1]. **Tests:** emf zero at magnet centered, sign reverses on reversing velocity/pole, ∫emf dt=−ΔΦ, numerical finite-difference derivative within0.1%, stop magnet zero emf. **Teacher limit:** dipole/coil small-area approximation fails near a large coil and magnet ends; no induced circuit impedance prediction without C2. `gallery/ap-induction-motion.ts`.

### Original #11 / revised #12 — kinetic gas (designed, requires new particle-state mode)

**Explanatory:** gas in piston box, heavy/light elastic disk particles, wall-collision events, running pressure and temperature estimates, histogram speed bins, P–V trace. Controls `N=256 [32,8192]:32`, `m=1 [0.5,4]:0.1`, `T=1 [0.2,4]:0.05`, `V=16 [8,64]:0.5`, `L_y=4 [2,8]:0.1`, `T_scene=0 [0,1000]:0.01`, `s_hist=1,s_piston=1,s_PV=1` [0,1]:1, `s_pause=0` [0,1]. Native tank rectangle `\operatorname{polygon}((-L_x/2,-L_y/2),(L_x/2,-L_y/2),(L_x/2,L_y/2),(-L_x/2,L_y/2))`, `L_x=V/L_y`; histogram bins native bars; GPU tint **particle speed squared v²/2** (per-mass energy), charge-glow scale3 and heat palette in histogram. **Equation:** 2D Maxwell speed PDF `f(v)=(m/(k_BT))v exp(−mv²/(2k_BT))`; 3D Maxwell speed PDF `4π(m/(2π k_BT))^{3/2}v² exp(...)`; ideal gas pressure 3D `P=Nk_BT/V`; 2D pressure-per-length analog differs, so label dimensions. **Physics:** hard-disk finite-N microcanonical dynamics with wall impulses does not automatically generate a 3D Maxwell distribution; if sampling 3D velocities independently use a 3D ensemble with clear assumptions. **Tests:** energy/momentum of two-body elastic collision within machine epsilon, wall impulse positive, histogram normalization, equipartition ⟨mv²/2⟩=DkBT/2 at controlled tolerance and confidence interval, pressure converges as observation window grows, live 60FPS at default. **Shared machinery:** typed `ParticleState` and collision event kernel (C5-lite); conventional position-only flow shader cannot supply this faithfully. **Do not report as buildable solely with existing stateless field flow.**

## 4. Larger designs and capabilities C1–C5 (original ranks 12–15)

Every capability returns units, analytic residual, numerical method, and explicit validity domain; its public interface is independent of Desmos rendering.

### C1 — constrained trajectory and typed track: original #12 (revised #13)

Minimal `TrajectorySolver`:

```ts
interface DynamicState {
  t: number;
  q: Float64Array;
  qdot: Float64Array;
}
interface TrajectoryProblem {
  mass: number;
  forces: (t: number, s: DynamicState) => Float64Array;
  constraints?: {
    g: (q: Float64Array) => number;
    grad: (q: Float64Array) => Float64Array;
  }[];
  events?: {
    name: string;
    value: (s: DynamicState) => number;
    onCross: (s: DynamicState) => DynamicState;
  }[];
}
interface TrajectorySolver {
  step(
    input: TrajectoryProblem,
    state: DynamicState,
    dt: number
  ): {
    next: DynamicState;
    constraintResidual: number;
    energyBalance: number;
    eventIds: string[];
  };
}
```

Typed track `y=f(x)` Desmos function compiled with derivative; position `(x,f(x))` and arc length `ds=√(1+f′²)dx`. Tangential equation `(1+f′²)x¨+f′f″ ẋ²=−g f′` (frictionless, fixed track). Equivalent energy `E=m(1+f′²)ẋ²/2+mg f(x)`. Friction needs contact normal `N=m [g/√(1+f′²)+v² κ_signed]` under chosen normal convention, detachment when N<0; Coulomb tangent force `−μN sgn(v)` and accumulated D. Reparameterize by arc length for near-vertical sections; reject nonfunction loops until path-spline capability exists. **Tests:** f=0 uniform motion, constant slope a=−g sinθ along s, circle energy conservation and detachment sign, identical initial/final E when μ0, consistent D for μ>0, event root bracketing. Scene: typed track native curve, skater sphere, live kinetic/potential/thermal bars, energy graph; Majestic physical track and sphere, tint kinetic energy along path in a non-particle scalar ribbon. This capability also unlocks collision dynamics, electrostatic hockey, and externally driven pendulums. **Build first among the four large ideas:** smallest reusable engine, matches AP1 U3, and provides a critical validation scaffold for C5-lite gas; do not start with a fully general 2D rigid-body engine.

### C2 — circuit topology/solver: original #13 (revised #14)

```ts
type CircuitElement = {
  id: string;
  from: string;
  to: string;
  kind: "R" | "idealV" | "idealI" | "C" | "L" | "switch";
  valueSI: number;
};
interface CircuitResult {
  nodeVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  kclResidual: number;
  kvlResidual: number;
  powerResidual: number;
  singular?: string;
}
interface CircuitSolver {
  dc(elements: CircuitElement[], referenceNode: string): CircuitResult;
  transient?(
    elements: CircuitElement[],
    state: Float64Array,
    dt: number
  ): CircuitResult;
}
```

Modified nodal analysis `Gv + B i_V = j`, `Bᵀv=e`; ideal current sources in j; reject floating subgraphs/ideal-voltage loops inconsistent; dynamic C/L via trapezoidal integration later. **Test** 12V driving 2Ω+4Ω series =2A, node8V, KCL/KVL<1e−10, power source24W and resistor powers8W+16W; two equal parallel branches independent; invalid shorted ideal batteries detect. **Scene:** draggable/typed nodes, wires and components, voltmeter/high impedance sensor, ammeter/zero resistance intervention, colored conductor potential and current flow per solved branch, Explanatory readouts, Majestic wires/components only with current particles tinted **electrical potential V**. Shared with RC/RL/LC and induction load circuits. Prevent misleading “electrons consumed in a resistor”.

### C3 — ray / optical bench: original #14 (revised #15)

```ts
interface OpticalSurface {
  id: string;
  shape: "line" | "circle" | "conic";
  geometry: number[];
  nInside: number;
  nOutside: number;
  reflectance?: number;
}
interface Ray {
  origin: [number, number];
  direction: [number, number];
  wavelength: number;
  power: number;
}
interface OpticalHit {
  point: [number, number];
  normal: [number, number];
  refracted?: Ray;
  reflected?: Ray;
  tir: boolean;
}
interface RayTracer {
  trace(ray: Ray, surfaces: OpticalSurface[], maxBounces: number): OpticalHit[];
}
```

Snell `n1 sinθ1=n2 sinθ2`, `d_r=ηd+(η cosθi−√(1−η²(1−cos²θi)))n`, TIR if discriminant negative. Thin lens `1/f=1/d_o+1/d_i`, magnification `m=−d_i/d_o`; trace is geometric and must separate physical ray from virtual backwards extension. **Tests:** normal incidence unchanged, n1=1→n2=1.5 at θ30 refracted θ19.47°, TIR from glass to air above critical, plane mirror angle equality, f10/do20 → di20 and m−1, energy accounting at Fresnel interface. **Scene:** draggable object, lens/mirror, two/three principal rays and image, optional refraction interface; Majestic lens solid + actual light trajectories, color **wavelength** with continuous-spectrum palette, not arbitrary potential. Geometric ray tracing doesn't model diffraction/interference. Shared with prisms, lenses, mirrors, refraction, telescope.

### C4 — scalar wave field: original #15 (revised #16)

```ts
interface WaveSpec {
  sources: { x: number; y: number; phase: number; amplitude: number }[];
  frequencyHz: number;
  speed: number;
  obstacles?: BoundaryMask;
  attenuation: number;
}
interface WaveSample {
  displacement: number;
  instantaneousEnergyDensity: number;
  timeMeanIntensity: number;
}
interface WaveSolver {
  at(spec: WaveSpec, x: number, y: number, t: number): WaveSample;
  integrateScreen(
    spec: WaveSpec,
    screen: LineSegment,
    resolution: number
  ): Float32Array;
}
```

Free-space coherent sources `ψ=∑A_i cos(k r_i−ωt+φ_i)/√max(r_i,rmin)` in 2D far field; time-averaged intensity proportional to `|∑(A_i/√r_i)e^{i(kr_i+φ_i)}|²`, _not_ ψ² at an arbitrary instant. Two ideal slits maxima `d sinθ=mλ`; finite slit width envelope `sinc²(π a sinθ/λ)` multiplied by cos²(πd sinθ/λ). Distinguish geometric diffraction amplitude approximation from 2D FDTD near field. **Test:** equal in-phase sources r1=r2 give fourfold single-source coherent intensity, π-out-of-phase cancels, single slit first minimum a sinθ=λ, far-field fringe spacing λL/d at small angles, energy consistency for a discretized wave solver. **Scene:** two point emitters/slits and detector-screen intensity chart, wave displacement heatmap, Majestic aperture solids and luminous time-dependent _intensity I_ without text. 2D/3D requires a true scalar tile/volume shader, not repurposed advected flow particles. C4 shares with sound-wave experiments and radiation lessons.

### C5 — event population model (additional shared capability)

```ts
interface EventPopulation {
  states: Uint16Array;
  rates: Float64Array;
  seed: number;
  events: { from: number; to: number; rate: number }[];
}
interface EventStep {
  newStates: Uint16Array;
  counts: Uint32Array;
  expected: number[];
}
interface EventEngine {
  advance(pop: EventPopulation, dt: number): EventStep;
}
```

A seeded Gillespie or exact independent exponential-lifetime sampler for stochastic nuclear decay: survival `N(t)/N(0)≈e^{−λt}`, T_half=ln2/λ. **Tests:** reproducible seeded path, exactly monotone survivors, ensemble mean within statistical tolerance, no negative populations. C5 also supports gas wall-collision event display and photoelectric discrete events but **not** a surrogate for deterministic molecular collision dynamics. This is a separate stage, not a large-idea shortcut.

## 5. Exact construction inventory for the applied patch

The **full unshortened Desmos LaTeX for every built object** lives in the source file(s) in this archive, not merely in the abbreviated design formulas above:

- `code/src/field-rendering/gallery/ap-extensions.ts`: all `SceneItem` objects, hidden Newton iteration functions, 2D/3D spheres, separatrices, ellipse and equal-time wedges, trace restrictions, GPU components/tints/palettes, sliders/defaults/ranges/steps for three new presets.
- `code/src/field-rendering/gallery/energy-bars.ts`: exact K/U/D/E formulas, Desmos native polygon/bar rectangles, 3D native planar surfaces, switches, normalization and positions for projectile/oscillator/circular.
- `vector_tools_foundation.patch`: original source additions and integration into gallery, clock, panel.
- `code/src/field-rendering/gallery/ap-extensions.unit.test.ts`: analytic physics-point unit tests, scene and slider shape tests. **Not yet run against the actual repository test runner.**

The dense particle budgets use 24,000/30,000, with per-preset speed (0.16–0.23) and palette `charge`/`charge-glow`. The extension source deliberately contains no variables named `u`/`v` except the 3D parametric surface _parameters_.

## 6. Acceptance gates, ownership and which to build next

**Full live matrix required before merge:** IDs `ap-projectile,ap-shm,ap-circular,ap-motion-graphs,ap-pendulum-phase,ap-kepler-areas`; dimensions `2d,3d`; modes `explanatory,majestic` = **24 views**. In each: zero refused Desmos expressions, no error log, field particles visible at default particle counts, all body solids visible in Majestic, educational drawings only Explanatory, screenshot inspected by a human or vision evaluator (no blank curves), FPS target 60 on the _reported hardware_, slider-to-visible-change latency <150ms measured at p50/p95, safe behavior at all slider endpoints, no regression to R/w/shared slider load defaults. Check that single step advances native objects and GPU together and reset resets both. Specifically inspect: impact energy bookkeeping in projectile; oscillator energy conservation; circular K const; motion graph a-line; pendulum top/bottom separatrix and physical bob; ellipse equal wedge visibility and 3D surface depth. Run `npm run test:unit`, `npx tsc --build`, and `IDS=... DIMS=2d,3d MODES=explanatory,majestic OUT=... node docs/mockups/vector-3d-arrows/ap-look.cjs` after rebuilding the extension via `npm run build` per source harness instructions.

**Recommended next build:** First finish these live gates and fix any Desmos native-expression refusal or frame drop. Then implement generic viewport-safe measurement/graph infrastructure and **Gauss's law** as the next conceptual AP C feature because it uses existing exact 3D fields and immediately tests a reusable surface-integral capability. Among capabilities that require a substantial new solver, build **C1 track-constrained trajectory** before C2, C3 or C4, as it gives the broadest AP1 value and makes energy consistency a strong regression test. Rank does not override capability dependency.

### Unresolved technical risks requiring real Desmos validation

1. The current Kepler reference uses six nested Desmos Newton functions and 18 segment evaluations per sector. This is mathematically well behaved but could produce expensive native graph re-evaluation; benchmark and if necessary replace with a precomputed clock state and incremental polygon mesh rather than dropping scientific correctness.
2. Bar layouts are graph-coordinate anchors, **not yet viewport reserved bounds**. They may overlap bodies or clip on pan/zoom, so the “never cover picture” acceptance criterion has **not** been demonstrated.
3. 3D Desmos does not draw surface labels. The patch includes bars, but the proposed panel legend is not implemented. Without that legend the colored bars' semantics depend on reading this spec; this is a release blocker.
4. The selected Kepler orbit is Newtonian; the background field is an illustrative confocal family with a scale-dependent implicit μ. It must never be described as one N-body simulation or one common gravitational potential for every streamline.
5. The selected pendulum animation travels the mathematical separatrix, **not** an ordinary finite-period pendulum oscillation. This is intentional for the separatrix lesson but needs clear default preset blurb and teacher use.
6. 2D motion traces are scaled/offset strips in the same coordinate view, not three full plots with independent axes and units. A dedicated inset would improve measurement precision.
7. No complete live browser or repository build/tests were accessible here. The actual patch integration, appearance, Desmos acceptance and performance remain unverified. **Do not merge on the basis of isolated checks.**

See `verification/ledger.md` for the explicitly separated evidence record.
