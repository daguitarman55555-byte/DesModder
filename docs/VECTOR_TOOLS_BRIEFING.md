# Vector Tools — a full briefing

This document exists to hand an outside researcher (a model, or a person)
everything needed to propose new features and new approaches for **Vector
Tools** without having to read the source first, and without proposing
something the platform has already been proven not to allow.

It is written to be read cold. It states not only what the plugin does but
_why each decision is the way it is_, because several of them look wrong until
you know what they are working around, and the cost of relearning them is
measured in days.

If you are asked to research or design something for this project, read
sections 1–6 before proposing anything, and hold your proposal against
section 10.

---

## 1. What this is

**Vector Tools** is a plugin inside a personal fork of **DesModder**, a browser
extension that adds features to the Desmos graphing calculator. It is not a
standalone app and never will be: it runs inside a real desmos.com page, on top
of a calculator someone else wrote and ships new builds of without warning.

Its purpose is to make **multivariable calculus and linear algebra easier to
see**. The target user is a student or instructor in a Calc 3 / differential
equations / linear algebra course who wants a vector field, a flow, a gradient,
or a transformation on the screen in front of them, and who should get it
without effort and with the fluidity of Desmos itself.

Two design commitments follow from that and constrain everything:

- **It must render effortlessly.** If a picture takes visible work to obtain,
  it has failed at its job.
- **What it produces should survive without the extension where it reasonably
  can.** A field generated into the expression list is an ordinary Desmos
  graph, shareable with someone who has never heard of this plugin.

### Repository

|              |                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Fork         | `daguitarman55555-byte/DesModder` (push to `origin` only)                                                                 |
| Upstream     | `DesModder/DesModder`, merged in at `53ff70bc` — **never push there**                                                     |
| Branch       | `feature/vector-tools-foundation`                                                                                         |
| Plugin       | `src/plugins/vector-tools/`                                                                                               |
| Docs         | `docs/VECTOR_TOOLS_ARCHITECTURE.md`, `VECTOR_FIELD_GENERATOR.md`, `VECTOR_FLOW_VISUALIZER.md`, `VECTOR_TOOLS_TEST_LAB.md` |
| Host version | DesModder 0.15.17                                                                                                         |

### Everything must pass

```
npm run lint            # prettier --check, tsc --build, eslint
npm run test:unit       # 1562 tests
npm run test:integration  # 49 tests, real Desmos in headless Chrome
```

The integration harness loads the built extension (`npm run build` → `dist/`)
into puppeteer and drives an actual desmos.com calculator.
`driver.page.screenshot(...)` works and screenshots are read as part of
verifying a change — **most bugs in this plugin have been invisible to
assertions and obvious in a picture.**

---

## 2. The shape of the plugin

Vector Tools is one configuration driving **three independent renderers**, plus
two shared libraries.

```
                         VectorFieldConfig  (model.ts, JSON, schemaVersion 3)
                                  |
        +-------------------------+-------------------------+
        |                         |                         |
   generator.ts              ArrowRenderer            FlowRenderer
   (Desmos expressions)      (live WebGL arrows)      (GPU particles)
        |                         |                         |
  ExpressionAdapter          ArrowOverlay              FlowOverlay
  (getState/setState)        (own canvas + ctx)        (own canvas + ctx)
        |                         |                         |
   the graph itself        transparent overlay over the graph paper

  shared: palettes.ts (ramps, emitted twice)
          latexToGLSL.ts (LaTeX subset → GLSL)
          symbolic.ts (exact partial derivatives — currently no caller)
```

### File map

| File                              | Lines | What it owns                                                              |
| --------------------------------- | ----: | ------------------------------------------------------------------------- |
| `model.ts`                        |  ~965 | `VectorFieldConfig`, defaults, normalization, validation, presets, limits |
| `generator.ts`                    |   653 | config → deterministic `VectorFieldPlan` of Desmos expressions; audit     |
| `desmos/ExpressionAdapter.ts`     |   270 | the **only** calculator boundary; apply / remove / audit a generated set  |
| `index.ts`                        | ~1070 | the plugin controller: settings, overlays, dispatcher, component sync     |
| `components/VectorToolsPanel.tsx` | ~1180 | the DCGView panel (Field / Arrows / Color / Flow tabs)                    |
| `palettes.ts`                     |   213 | colour ramps as stops, emitted as Desmos LaTeX **and** as shader uniforms |
| `symbolic.ts`                     |   409 | exact symbolic partial differentiation over Desmos's own syntax tree      |
| `flow/latexToGLSL.ts`             |   532 | compiles the usable subset of Desmos LaTeX to GLSL ES 3.00                |
| `flow/field.ts`                   |    59 | the shared `vtField(vec2 p)` prelude both shaders include                 |
| `flow/ArrowRenderer.ts`           |  ~590 | instanced arrows, geometry from `gl_VertexID`/`gl_InstanceID`             |
| `flow/ArrowOverlay.ts`            |  ~245 | the arrows' canvas, bounds, visibility, context loss                      |
| `flow/FlowRenderer.ts`            |  ~985 | ping-ponged particle textures, RK4 advection, trails                      |
| `flow/FlowOverlay.ts`             |  ~255 | the flow's canvas, bounds, visibility, context loss                       |
| `flow/glTestDouble.ts`            |    90 | a fake WebGL2 both renderers are unit-tested against                      |

---

## 3. The three renderers

### 3.1 Generator — ordinary Desmos expressions

`generator.ts` maps one config to a `VectorFieldPlan`: one folder plus hidden
helpers (samples, flattened grid, component functions, magnitudes, directions,
display components, colour list) plus **visible restricted parametric curves**
for arrow shafts and arrowhead wings. Twenty items per field.

Every ID begins `vector_tools_vf_<field-id>_`, so update, audit and removal are
stable without depending on expression-list positions.

Costs three restricted parametrics per arrow. **Warns above 2,500 vectors,
refuses above 10,000.**

Two sources: `components` embeds P(x,y) and Q(x,y) directly; `gradient` embeds
a scalar f and defines the components as Desmos's own partial derivatives of
it, so the arrows are exactly ∇f.

The arrowhead here is **two line segments**, not a filled triangle, because a
filled one would be a polygon per arrow.

### 3.2 Live arrows — this extension's own canvas

`flow/ArrowRenderer.ts`. One instance per grid point. The field is evaluated in
the **vertex shader**. The geometry — nine vertices, two triangles of shaft and
one of head — exists only in that shader, addressed by `gl_VertexID` and
`gl_InstanceID`, **with no vertex buffer at all**. One draw call for the whole
field.

No expressions written. No practical cap. **Solid tapered arrowheads, which
Desmos expressions cannot draw** — this is the thing live rendering buys beyond
speed.

`arrowMode` is **Live / Desmos expressions / Off**, defaulting to Live, because
a tool for looking at a field should show one immediately; Generate is what
commits it.

### 3.3 Flow visualiser — GPU particle advection

`flow/FlowRenderer.ts`, adapted from Andrei Kashcha's **fieldplay** (MIT —
`flow/LICENSE-fieldplay.md`). Ping-ponged particle position textures, RK4
integration in a fragment shader, trails that fade.

Four passes per frame: integrate, fade the trail, draw particles into it, blit
to the canvas. **Three of those cover the whole canvas**, so their cost is the
drawing buffer's area — four times the CSS box on a high-density display, which
is why `renderScale` exists.

A **Look** setting picks Streamlines (long-lived particles, long trails, which
genuinely draw the streamlines) or Texture (short trails, constant respawn,
which cover the viewport evenly and read as a texture with direction in it).
Both looks only preset `trailPersistence` and `dropRate`; every value stays
adjustable afterwards.

Particle count 500 – 400,000; above ~120,000 a mid-range GPU starts dropping
frames on a large viewport. Capacity is separated from count, because the count
slider fires per pointermove and count-owns-allocation meant deleting and
rebuilding two float textures once a frame for the length of a drag.

**Registers only with the 2D graph paper.** `flowAvailability` refuses the 3D
product before the field is even compiled, because on 3D
`graphpaperBounds.mathCoordinates` is a rotatable box with no screen-space
meaning. `/geometry` is the same 2D graph paper and works unchanged.

---

## 4. Shared libraries

### 4.1 `palettes.ts`

Ramps are defined **once, as stops**, and emitted twice: as a Desmos `rgb`/`hsv`
list expression for generated arrows, and as shader uniforms for the GPU. Six
palettes: Spectral (default), Viridis, Blue, Blue-to-red, Grayscale, Hue wheel
(emitted as `hsv` rather than from stops, because a hue wheel has no stops to
interpolate).

### 4.2 `flow/latexToGLSL.ts`

Compiles the subset of Desmos LaTeX a field component can realistically use
into a GLSL ES 3.00 expression over `vec2 p`. Anything outside the subset is
**reported by name**, so the panel can say exactly which piece it could not
translate rather than silently drawing a different field.

Supported: `+ - * / ^`, `\frac`, `\sqrt` (including `\sqrt[n]`), `|…|`,
parentheses/braces/brackets, implicit multiplication, `\cdot`/`\times`, and the
functions `sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh exp ln
log sqrt abs sign floor ceil round mod min max`. Variables `x`, `y`, `e`, and
nothing else.

**Explicitly refused**: subscripted identifiers (they refer to other
expressions the GPU cannot reach), lists, sums, integrals, piecewise, actions,
user-defined functions.

Guards live in a GLSL prelude: `vtDiv` (epsilon-protected division), `vtPow`
(real powers of negative bases only for integral exponents), `vtCot`/`vtSec`/
`vtCsc`, `vtLog10`, `vtMod`. NaN and Inf from the field are collapsed to zero
in `vtField`.

A **gradient** field arrives at the GPU as its scalar function and is
central-differenced, because the GPU cannot differentiate symbolically. The
step follows the viewport so the gradient stays smooth at any zoom, and it is
exact for the quadratics most potentials are built from. (The generated Desmos
expressions differentiate exactly instead. The two therefore agree numerically
but not identically.)

### 4.3 `symbolic.ts` — **has no caller yet**

Exact symbolic partial differentiation over Desmos's own syntax tree, via
`text-mode-core`'s Aug layer. No CAS: Desmos's parser already produces the
tree, differentiation of a tree is mechanical, and the same layer emits LaTeX
back out.

It is exact for everything it accepts and **refuses everything else rather than
guessing** — an almost-right derivative is worse than none.

- `differentiate(node, variable)` — partial derivative, simplified. Every other
  identifier is held constant, which is what makes it partial.
- `implicitDerivative(...)` — the implicit function theorem, `dy/dx = -F_x/F_y`.
- `identifiersIn`, `dependsOn`, `simplify`, `toLatex`.
- Known function derivatives: `sin cos tan cot sec csc exp ln log sqrt arcsin
arccos arctan sinh cosh tanh abs`.
- `u^v` splits into power rule / exponential rule / general form.
- Refuses: multi-argument function calls, unknown functions, anything that is
  not a constant, identifier, negation, binary operator, or single-argument
  call.

`index.ts` already exposes `partialDerivative(latex, variable)` and
`gradient(latex, variables?)` on top of it. **Nothing in the UI calls either.**
Giving this module a job is one of the more valuable things available.

---

## 5. Constraints — what the platform actually allows

Every one of these was established the hard way. Treat them as facts, not as
starting assumptions to re-test.

### 5.1 Desmos

- **`Desmos.Private.Parser` exposes only `parse`, `parseIdentifier`,
  `setInput`.** No symbol table, no operator registry. **You cannot teach Desmos
  an operator.** Any proposal that requires new notation inside a Desmos
  expression is dead on arrival.
- `\partial` and `\nabla` **render as nothing**. The literal `∂` and `∇`
  characters render but do not parse.
- **`\frac{d}{dx}` applied to a two-argument function is the partial derivative
  with respect to x, holding y.** `\frac{\partial}{\partial x}` and
  `\partial_{x}` both error. Verified against a real Desmos for first partials,
  divergence, curl, and nested second partials.
- **`setExpression` silently drops `folderId` and `colorLatex`,** and the
  `set-item-colorLatex` action is ignored by current builds. A field written
  through them lands outside its folder and renders in one flat colour.
  Everything therefore goes through `Calc.getState()` / `Calc.setState()`,
  which also makes generation atomic, undoable in one step, and keeps a
  regenerated field at its existing list position.
- **Dispatching from inside a dispatcher callback throws** "Cannot dispatch in
  the middle of a dispatch".
- Desmos reports `graphpaperBounds` on **every pointermove** during a drag.

### 5.2 DCGView (the UI framework)

- **Only props passed as _functions_ are re-read.** A bare value is wrapped in
  `DCGView.const` and frozen at first render. Every control takes getters.
- **Props are written as _attributes_**, and `disabled="false"` is still a
  disabled input in HTML. `disabled` is never passed as a prop; the property is
  assigned in `onUpdate`. Passing it as a prop once disabled every number field
  in the panel.
- Inputs are only re-synced while they do **not** hold focus, so a render
  triggered mid-edit cannot fight the user's typing.
- The panel has **no `<select>` elements**: a native dropdown inside a scrolling
  popover is awkward to hit and DCGView cannot drive its selection through props
  anyway. Option lists are wrapping rows of one-click chips.
- Element IDs are namespaced per axis, because duplicate IDs point `<label for>`
  at the wrong input.

### 5.3 WebGL

- WebGL2 required. The flow additionally requires `EXT_color_buffer_float`.
- The plugin holds **two contexts** on top of Desmos's own. Browsers cap
  contexts per page. Both overlays now handle `webglcontextlost` /
  `webglcontextrestored`.
- The arrows' canvas and the flow's canvas are deliberately separate: the flow
  advects sixty times a second and fades its previous frame; the arrows are a
  still picture. Sharing a renderer would mean the arrows paying an animation
  loop's costs to sit still.
- Both canvases are `pointer-events: none`, inserted next to
  `canvas.dcg-graph-inner`, write no expressions and touch no calculator state.

### 5.4 Known unrelated breakage

DesModder's find-and-replace patches against Desmos's **minified** source break
when Desmos ships a new build. `override-keystroke` was fixed with a `____$`
wildcard; `quake-pro` and `syntax-highlighting` may still be broken. This shows
as a panic popover on load and is **not** caused by Vector Tools, which has no
replacements of its own. Verified by reproducing it on a commit predating the
plugin.

---

## 6. Decisions that look like bugs and are not

**Do not "fix" any of these.** Each cost real time to establish.

1. **Colour uses a saturating ramp, `1 - exp(-m/scale)`, not a measured
   min/max.** Fields with poles — anything with a denominator passing through
   zero, which is most of a multivariable course — reach magnitudes near the
   pole larger than the rest of the field combined.
   `sin(x²+y²)/(1-|x³y³|+cos(x²+y²))` reaches two hundred thousand within a few
   units of the origin while the rest of it sits below ten. A ramp stretched to
   one of those leaves everything else inside its first hundredth: one flat
   colour. A saturating ramp gives ordinary magnitudes most of its length and
   lets the poles run into its end. `scale` follows the viewport.
   There used to be a whole `FieldRange` module measuring the range on the GPU;
   it was **deleted at `1383a4ff` for exactly this reason**. Do not bring it
   back without solving the pole problem first.
   `color.rangeMode` can still be set to `manual`, which spreads the ramp
   linearly between two given values.
2. **The generated Desmos expressions _do_ use Desmos's `min`/`max`,** because
   a static graph has no viewport for a scale to follow. A field drawn live and
   the same field generated will not colour identically. Understood, not a bug.
3. **Arrow thickness is in pixels but capped against the arrow's own length,**
   and the displayed length is capped against the viewport (0.12 of its width).
   Without both, zooming out makes each arrow wider than it is long and the
   field smears into a wash.
4. **The direction is taken before the length is capped.** Normalising by the
   capped length scales it back up by exactly what the cap removed — a fix that
   silently does nothing.
5. **A grid too dense to read is thinned by default** (`arrowDensityLimit`),
   down to 10,000. Matching the sampling domain to a zoomed-out viewport asks
   for hundreds of thousands of arrows by accident, and what you get is the
   moiré between the arrow grid and the pixel grid rather than the field. **It
   is a checkbox, not a rule** — turning it off draws every one of them, and
   that is deliberate. Both axes scale by one factor so arrows stay square to
   the grid.
6. **Trails are reprojected on pan, not cleared.** Desmos reports bounds on
   every pointermove; clearing made the flow blink out for the whole gesture.
   `setBounds` redraws the old trail into its new place, one screen pass, with
   whatever pans in from off-screen left transparent. Only an explicit
   `resetBounds`, on starting, clears.
7. **`renderScale`** exists because three of four passes per frame cover the
   whole canvas.
8. **Only the slots the user types into are mirrored back** from the expression
   list (`editableSlots`). In gradient mode that is f alone: P and Q are
   derived, and adopting a hand-edit to one of them would overwrite the
   derivative the generator owns.
9. **Panel size is persisted from the _inline_ width and height,** because a
   corner drag writes those while a short window merely clamps the rendered box
   through `max-height` — persisting the clamp would shrink the panel
   permanently.

---

## 7. What changed most recently

Three commits, all measured in a real Desmos through the integration harness,
against a 201×201 sampling domain (40,401 arrows) viewed from twelve units
across, over a hundred simulated slider frames:

|                                             |    before |      after |
| ------------------------------------------- | --------: | ---------: |
| shader links during a 100-frame slider drag |       100 |      **0** |
| instances submitted over those frames       | 4,040,100 | **16,500** |

(The wall-clock time was identical, ~1.65 s, because the loop is
`requestAnimationFrame`-paced and neither build dropped below 60 fps in that
configuration. The submitted-work counts are the real signal; the elapsed time
measures nothing here. Stated plainly so nobody quotes a speedup that was not
observed.)

1. **`c0dd0cce` — Stop asking the GPU for work the frame does not need.**
   `ArrowRenderer.setField` now compares the field against the one its linked
   program was built from, the way `FlowRenderer` always has; every settings
   change arrives as `start(field, options)` with the same field, so a drag was
   relinking a shader per pointermove. And `visibleGridSpan` instances only the
   columns and rows of the grid that intersect the view, plus a margin wider
   than the longest arrow the shader will draw. Non-finite bounds fall back to
   the whole grid: drawing too much is a performance answer, drawing too little
   is a wrong picture.
2. **`c5898a92` — Come back when the browser takes the graphics context away.**
   Both overlays handle `webglcontextlost` (with `preventDefault`, without
   which the browser never restores it) and rebuild on `webglcontextrestored`
   from the field and options they keep for that purpose. `isRunning` is now
   the canvas rather than the renderer, so a mounted overlay with a lost
   context reads as running-and-briefly-blank instead of stopped.
3. **`09ece825` — Show only the controls the current settings actually read.**
   `lengthInputsFor` in `model.ts` is now the single answer to which of the four
   length numbers a mode reads (`actual` none, `normalized` one, `clamped` two),
   and the panel shows only those. The fixed-colour swatch appears only when the
   arrows or the flow is set to use it — one swatch, two users. The flow's
   secondary controls (trail length, respawn rate, opacity, particle size,
   render detail) fold into a **Fine tuning** disclosure, leaving on screen the
   controls that decide what the flow _is_.

---

## 8. The agreed roadmap

Items 1–3 are done (palettes, live arrow rendering, the Streamlines/Texture
flow preset). The rest, in the order agreed:

### 4. Nullclines and equilibria

Draw `P(x,y)=0` and `Q(x,y)=0` as implicit curves; their intersections are the
critical points. Two generated expressions, large payoff for a differential
equations course. Desmos draws implicit curves natively, so the generated half
is nearly free. A live GPU version would be a fragment pass colouring pixels
where the field's sign changes, distance-normalised so the line has even width.

### 5. Divergence and curl

Two halves:

- **As a coloured overlay from the GPU** — a full-screen fragment pass with
  central differences, the same pattern `field.ts` already uses for gradients.
  Note that divergence and curl are **signed**, so the saturating ramp needs a
  signed variant (`sign(d) · (1 - exp(-|d|/scale))`) mapped onto a diverging
  palette centred at zero. "Blue to red" exists but is not currently
  zero-centred.
- **As exact generated expressions** via `symbolic.ts` — its first caller.
  `∂P/∂x + ∂Q/∂y` and `∂Q/∂x - ∂P/∂y`, spelled with `\frac{d}{dx}` on
  two-argument functions per §5.1.

### 6. Time-dependent fields

Add `t` to the GLSL prelude driven by a uniform, wired to a Desmos ticker.
`P(x,y,t)`. `latexToGLSL`'s `variableToGLSL` currently knows only `x`, `y`, `e`;
adding `t` → a `u_time` uniform is small. Nothing else in the Desmos ecosystem
does this.

### 7. Click-to-seed streamlines, and LIC

Click the graph to release particles from a point. **Line Integral Convolution**
as a dense static alternative to particles — a field texture with the field's
structure everywhere at once, no animation, no trails.

### Open design question: custom graph transformations

Drawing the field through a user-supplied map `X(x,y)`, `Y(x,y)`. Achievable on
our own canvas since arbitrary LaTeX already compiles to GLSL — but **incoherent
while Desmos's own grid underneath stays Cartesian**. Two candidate resolutions:

- Apply the transform at **generation** time with the Jacobian, which stays
  ordinary Desmos and would give `symbolic.ts` a job.
- Draw the **image of the Cartesian grid under the map as an overlay**, on top
  of the undeformed grid rather than replacing it. That is the picture that
  makes a transformation legible, and it uses the same instanced-line machinery
  the arrows already use. This is a proposal, not a decision.

### Further ideas already on the table (not yet agreed)

- **Equilibria classification.** Once nullclines give the critical points, the
  Jacobian at each is four calls to `symbolic.ts`; its eigenvalues classify the
  point (saddle / node / spiral / centre) and give eigenvector directions to
  draw. The single biggest linear-algebra payoff available, and it falls out of
  items 4 + 5 almost for free.
- **Conservative-field check.** `∂P/∂y - ∂Q/∂x` simplified to zero says a
  potential exists. One line of panel text; `symbolic.ts` does the work.
- **Cursor probe.** P, Q, |V|, angle, divergence and curl at the pointer,
  evaluated through a hidden `HelperExpression` so it is Desmos's own evaluator
  and not a second one.
- **Matrix field / linear transformation mode.** V = Ax for a 2×2 matrix, with
  eigenvalues, eigenvectors, and the image of the unit circle.

---

## 9. Where we would most like outside research

These are genuinely open. Answers that come with a demonstrated mechanism, not
just a name, are worth far more.

1. **A magnitude→colour mapping that survives poles and is still readable for
   fields without them.** The saturating ramp is a good answer, not obviously
   the best one. Percentile-based ramps, robust statistics (median/MAD), and
   log-modulus transforms are all candidates — but any of them that requires
   _measuring_ the field must explain what happens when 0.1% of samples carry
   99% of the range, and must work identically in a Desmos expression with no
   viewport (see §6.1 and §6.2).
2. **LIC on a WebGL2 fragment shader at interactive rates**, over a field
   evaluated per-sample rather than sampled from a texture, and how it should
   composite over Desmos's graph paper without hiding it.
3. **Drawing implicit curves (`P=0`) live on the GPU** with even apparent line
   width at any zoom, without marching squares on the CPU.
4. **Finding all equilibria of a 2D field robustly** in a viewport, on a budget
   that survives a pan. Grid + Newton is the obvious answer; degenerate and
   non-isolated cases are the interesting part.
5. **A menu structure for a tool that is about to grow** an Analysis surface
   (nullclines, div/curl, conservative check, probe) on top of four existing
   tabs, in a ~360 px popover, with no `<select>` available.
6. **Whether anything in the Desmos public API has changed** that would relax
   §5.1 — particularly around colours, folders, and tickers.
7. **Prior art worth stealing from**: fieldplay (already the flow's basis),
   VisIt/ParaView vector-field conventions, Mathematica's `StreamPlot` /
   `VectorPlot` heuristics for arrow density and scaling, and how any of them
   choose a length scale automatically.

---

## 10. Rules a proposal has to satisfy

A proposal is useful here only if it clears all of these:

1. **It runs in a browser extension, in a real desmos.com page**, alongside
   Desmos's own renderer, with no server and no external service.
2. **It does not require teaching Desmos new notation** (§5.1).
3. **It states which half it belongs to** — generated Desmos expressions
   (shareable, capped, static) or our own canvas (live, uncapped, needs the
   extension) — or explains why it needs both.
4. **If it colours anything by magnitude, it says what happens near a pole.**
   Test it against `sin(x²+y²)/(1-|x³y³|+cos(x²+y²))`.
5. **If it has a trade-off, it goes behind a labelled control with a sensible
   default** — not a limit imposed on the user. Two limits have already been
   imposed where an option belonged (an arrow cap, a colour range) and both had
   to be undone. **Do not make product decisions on the maintainer's behalf.**
6. **It can be verified in a picture.** If the only evidence it works is an
   assertion, it has not been shown to work.
7. **It does not undo anything in §6** without first solving the problem that
   decision exists to solve.

### House style, if you are writing code

Commit messages explain **why**, in prose — not a bulleted changelog. Comments
do the same: dense, deliberate, explaining the reason a thing is the way it is,
especially where the obvious approach was tried and failed. Match it.
