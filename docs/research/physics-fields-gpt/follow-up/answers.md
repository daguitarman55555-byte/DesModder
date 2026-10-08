# Vector Tools — answers to B1–B6

Research snapshot: `feature/vector-tools-foundation`, commit `4cd8cdd9e699b4620260d972e233613937466b60`. These are design/data deliverables, not an implemented plugin change. The measured facts in A1–A5 supersede the earlier report. The files beside this document are part of the answer.

## B1. Main vectors and names

**Use native geometry as the default for the small teaching overlay in both dimensions. Keep GPU main vectors plus GPU names as an optional backend, with independent arrow/name toggles in both writing modes.** Nothing about turning prose off should disable a teacher's ability to turn mathematical vector names on. The requested GPU option still requires the small instance renderer and glyph renderer; these files do not implement it. Its exact behavior is specified in `gpu-main-vectors.contract.json`.

| Consideration         | Native 2D shaft + polygon                                           | Native 3D vector + tip label                                                    | GPU instances + stroke names                                                              |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Projector readability | Crisp line and solid head; native math typography                   | Shaded native arrow; math labels need the 3D check below                        | Good if sized in CSS pixels; small stroke alphabet needs careful spacing and antialiasing |
| Depth                 | Correct 2D draw order over flow                                     | Arrow participates in native scene; label occlusion behavior remains unverified | Must explicitly share surface depth and implement label occlusion policy                  |
| Cost for four arrows  | Several expressions, negligible draw count; benchmark recalculation | Few expressions; no new glyph system                                            | Rendering cheap, implementation and maintenance cost larger                               |
| Common scale          | Exact endpoints                                                     | Exact endpoints                                                                 | Exact endpoints if per-instance normalization is disabled                                 |
| Best role             | Default teaching probes                                             | Default teaching probes                                                         | Optional user-selected style, many annotations, or a unified overlay                      |

Start with a 4 CSS-pixel shaft and approximately 20–24 CSS-pixel names at a 1080p presentation. Native `labelSize: "1.5"` is a relative size, not a promise of a particular pixel height. Test at the actual projector resolution and view. Do not use color alone to identify arrows: names E₁, E₂, E, F and distinct warm/blue/navy/purple colors are provided. When names are off, the contribution and force toggles should normally be off too.

Let source centers be C₁=(−d/2,0,0), C₂=(d/2,0,0), and probe P=(pₓ,pᵧ,p_z); set p_z=0 in 2D. The exact exterior vectors are

\[
E_1=kq_1(P-C_1)/|P-C_1|^3,\qquad
E_2=kq_2(P-C_2)/|P-C_2|^3,\quad E=E_1+E_2,\quad F=q_0E.
\]

All four arrows have the same tail P and endpoint Q=P+sV. The state files expand every component and use one gain `s_{EVT1}`. They never normalize individual arrows or shorten long arrows to fit the view. Reduce the common gain or zoom out instead. Hide the overlay when the probe is inside either core, or an arrow length is below 10⁻⁸. At q₀=0, the force arrow and its name disappear.

**Units:** E and F have different physical units. The supplied normalized demonstration uses E/Eref and F/(qref Eref), with q₀ interpreted in qref units; the numerical relation remains F*=q₀*E\*. A shared graphical gain is then meaningful. In an SI version state both reference units; never claim a newton equals a newton/coulomb because two arrows have equal length.

For each 2D vector define D=sV, ℓ=√(Dₓ²+Dᵧ²), u=D/max(ℓ,10⁻⁹), n=(−uᵧ,uₓ), Q=P+D, H=min(0.18,0.25ℓ). Draw:

```latex
P+t(D-Hu)                       (0 <= t <= 1)
\operatorname{polygon}(Q,Q-Hu+0.45Hn,Q-Hu-0.45Hn)
```

This ends the shaft at the head base without changing the represented endpoint. The namespaced, expanded expressions and parametric bounds are in `charges-2d.state.json`. In 3D use `\operatorname{vector}(P,Q)`; its expanded expressions are in `charges-3d.state.json`. Names attach to a separate invisible point at Q+0.12u. Colliding names may need a screen-space displacement/leader; the supplied fixed offsets are a starting point, not a label-layout engine.

The exact math-label JSON is:

```json
{ "showLabel": true, "label": "`\\vec{E}_{1}`", "labelSize": "1.5" }
```

The backticks are literal characters inside the label string. **I verified this visually in live Desmos 2D**, including the accent and subscript (`labels-2d-live.png`). Desmos documents backtick-delimited math labels. Your basic 3D-label measurement is accepted, but I did not verify the math version in 3D; test it before shipping. Fallback labels are `E`, `E1`, `E2`, `F`; optionally use a separate tiny geometric arrow accent, or the optional GPU stroke labels. [Desmos labels](https://help.desmos.com/hc/en-us/articles/4405487300877-Labels).

## B2. Coordinate colors

**3D works through state. The crucial difference is that `colorLatex` refers to a named color definition.** The official live example stores a separate `C_{1}=hsv(250z,1,1)` expression and `colorLatex: "C_{1}"` on the surface. The inline constructor you tested is not the demonstrated state representation. This does not require a permanent manual UI step. [Official coordinate-color documentation](https://help.desmos.com/hc/en-us/articles/40475048737421-Coordinate-Based-3D-Color-Maps), [official example](https://www.desmos.com/3d/ihdnbhsrrx).

`sphere-colormap-3d.state.json` is the complete standalone sphere state. Its two expressions use:

```json
{ "id": "planet_surface", "latex": "x^2+y^2+z^2=1", "colorLatex": "C_{PVT1}" }
```

and a named RGB definition, fully expanded in the file. The map combines blue ocean, green/brown procedural land, polar ice, and a directional brightness multiplier. It is an Earth-like visual, not an Earth coastline map. It assumes a unit sphere centered at the origin and y as its polar axis. For a translated/scaled planet, replace every coordinate in the color expression with its normalized body coordinate. Native lighting also shades the sphere, so the supplied artistic brightness multiplier can make the night side very dark.

I changed the official example to a sphere and applied that exact RGB channel formula in the live UI; the screenshot `planet-color-live.png` confirms it draws. The symbol in the live example was C₁; the supplied file renames it. **The complete saved JSON was not round-trip imported**, so this is a verified expression/color mechanism, not a claim of end-to-end loader validation. Live public state uses version 11; the repository's version-9 TypeScript annotation is stale relative to that evidence.

I found no documented equivalent for coordinate-dependent colors on **2D regions**. The official feature covers 3D surfaces, not points/curves or 2D regions. Do not interpret ordinary scalar custom colors as a spatial region shader. Use `planet-eight-band-2d.state.json`: eight constant-color regions partition a shaded disc. A matching 3D fallback is supplied. These fallback states are structurally checked but not live-rendered. They approximate lighting, not continental geography. They are fallback options; the live 3D result does not require falling back.

## B3. Compositing

**Default: transparent overlay, backdrop disabled, Desmos objects retained, surface-depth occlusion enabled.** In `Flow3DRenderer.ts`, backdrop alpha zero already selects ordinary premultiplied-alpha blending; a nonzero backdrop selects screen blending. Thus faint navy particles can paint over white paper. They are not forced to be invisible white additive light. Set the boolean backdrop control off, not merely an arbitrarily small opacity. The changes are at the preset/configuration level; test the final controller wiring. [Renderer source at the inspected commit](https://github.com/daguitarman55555-byte/DesModder/blob/4cd8cdd9e699b4620260d972e233613937466b60/src/field-rendering/Flow3DRenderer.ts).

| Preset type                                                | Recommended composition                                                  | Expected appearance                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Charges, wires, capacitor                                  | Transparent overlay + native solids/arrows; hide particles behind solids | Clean white-background teaching diagram, dark low-opacity flow, colored native objects                          |
| Earth–Moon, three-body                                     | Same, low-density flow; native colored spheres                           | Desmos lighting keeps recognizable bodies; particles remain subordinate to bodies/orbit trails                  |
| Cylinder, bar magnet                                       | Same, opaque native body and muted flow                                  | Solid object with clear exterior flow; existing depth support must include the chosen cylinder/face expressions |
| Point dipole without any solid or native probe             | Dark backdrop remains an optional aesthetic mode                         | Bright isolated field-line look                                                                                 |
| Point dipole with native probes, or magnetized-sphere mode | Transparent overlay                                                      | Native arrows/sphere remain visible                                                                             |

Do not use opacity≈0.5 as the default: it mixes the backdrop over every native pixel, dims text/arrows, and does not solve object integration. It can be an explicit “dim graph” effect. Avoid a new underlay as the principal 3D solution. Even if the Desmos canvas clears transparently, opaque native surfaces painted afterward cover **foreground** particles too: every particle appears behind the body. A GPU depth mask cannot recover a particle already covered by later native painting.

For an underlay experiment, inspect actual framebuffer alpha, exported/composited background pixels, and the graph container's CSS background separately. Put a colored rectangle behind the native canvas, verify it shows through empty space, then place one particle in front of and one behind an opaque sphere and rotate the camera. Transparency alone is insufficient. Repeat with labels, multiple surfaces, resize, device-pixel ratio, and theme changes.

Required transparent-overlay check: backdrop-off has alpha zero in empty pixels; a sphere and vector retain their original colors; a trail behind the sphere disappears while one in front remains; resize/camera motion keeps depth aligned; transparent surfaces follow an explicit hide/fade rule. Shader names/colors must match the actual theme rather than assuming a dark theme changes native framebuffer colors. These combined-extension checks remain **unverified**.

Renderer-drawn impostors are a separate optional future style if a unified dark scene becomes essential. They need their own lighting, depth, picking and sign/label behavior and violate the current “Desmos draws the objects” division. They are unnecessary for the first charges build.

## B4. Collision-safe names

**No fixed legal identifier can be guaranteed absent from an arbitrary student graph.** A folder provides organization, not scope. The guarantee must come from allocating and checking a namespace, then owning it; a long unlikely prefix alone is not a guarantee.

Use a readable physics tag plus allocated instance suffix, retaining the original leading letter and index:

| Section       | Tag | Examples                                  |
| ------------- | --- | ----------------------------------------- |
| 4 Charges     | E   | V→V*{EVT1}, r₁→r*{E1VT1}, q₁→q\_{E1VT1}   |
| 5 Wires       | W   | D₁→D*{W1VT1}, I₂→I*{W2VT1}                |
| 6 Earth–Moon  | G   | f→f*{GVT1}, M₁→M*{G1VT1}                  |
| 7 Cylinder    | C   | P→P*{CVT1}, T→T*{CVT1}                    |
| 8 Capacitor   | P   | A→A*{PVT1}, H→H*{PVT1}                    |
| 9 Bar magnet  | M   | f₀→f*{M0VT1}, J→J*{MVT1}                  |
| 10 Dipole     | D   | m→m*{DVT1}, r→r*{DVT1}                    |
| 17 Three-body | N   | a₁→a*{N1VT1}, R₁→R*{N1VT1}, Tₑ→T\_{NeVT1} |

`renamed-expressions.json` contains the original-to-new maps and renamed mathematical blocks for all eight sections, including helpers, drawings and contour lists. Some entries are alternatives or templates, **not an expression list to load wholesale** (e.g. a static m versus animated m). Formal function arguments remain local: the b in H(u,b) is not the magnet's global half-width. Coordinate/curve parameters x,y,z,t remain unchanged. The namespaced potential added for gravity applies outside its bodies only. Three-body positions remain scalar uniforms supplied by the dynamics/replay provider; renaming does not implement that provider. Future X/Y/Z trajectory helpers should use X*{NVT1}, Y*{NVT1}, Z\_{NVT1} and the same allocation rules.

Allocation/insertion rules:

1. Parse identifiers in all existing expressions and table columns, including free references, list definitions, action rules and slider-bound expressions. Include already allocated plugin namespaces. Ignore text inside prose labels. Do not use a raw substring replacement or scan definitions only: defining a student's previously free name changes their graph too.
2. Build the **entire** candidate set, including controls, colors, points, probe intermediates, labels, clocks and future provider outputs. Try VT1, VT2… until every candidate is unused. Allocate expression IDs separately and check those too.
3. Bind field components, guards, seed expressions, ticker actions and geometry to that same map; insert atomically through the state adapter. Save an ownership manifest containing preset instance, symbol map, IDs and authored expressions.
4. Never skip an owned helper and silently bind to a student's existing definition. If a user later edits/deletes an owned definition or introduces a duplicate, stop that preset and offer repair/reallocation; do not overwrite their work. An explicit “use this existing parameter” feature can create a deliberate binding.
5. On removal, remove only owned, unmodified expressions and actions. Recheck references before removing a shared clock. Existing unrelated expressions, view state and ticker behavior must survive.

VT1 in the supplied standalone examples assumes an empty scratch graph. It is not a reserved Desmos namespace. The renamed numeric helpers pass 53 compiler checks; the test provisions scalar dependencies automatically, so that result does not prove all scalar controls are populated in every future preset.

## B5. Time

**One ticker-driven scene-time scalar must drive both moving geometry and the shader field.** Do not also advance that scene from the plugin clock. In the supplied cylinder example:

```latex
T_{CVT1}=0
s_{CVT1}=1
T_{CVT1}\to T_{CVT1}+s_{CVT1}\frac{dt}{1000}
```

Ticker state: `handlerLatex` is the action above, `minStepLatex: "1000/30"`, `playing: false` initially. The full fragment is `ticker-state-fragment.json`. `dt` is milliseconds since the previous tick; T is simulated seconds, speed s=1 means one simulated second per real second while playing. The minimum step is a scheduling interval, **not** the elapsed duration. Do not use T→T+1/30 when frames can be delayed. [Desmos actions/ticker documentation](https://help.desmos.com/hc/en-us/articles/4407725009165-Actions).

Still sets the owned ticker's `playing` false, retaining T, and stops plugin advection for a fully frozen view. Moving resumes without resetting T. If the product also offers “freeze sources, keep field tracers moving,” make that a separate explicit control. Reset sets T to zero and clears obsolete trails. Scalar `t` inside a native parametric curve is a curve parameter, not this scene clock.

There is one graph-level ticker. Capture its prior state and ownership. If it belongs to the student, do not replace or stop it. A coexistence implementation must append an owned gated action, e.g. T→T+u s dt/1000, where u=0 for Still and u=1 for Moving, preserving existing actions. If it cannot safely combine/restore actions, leave scene playback unavailable until the user explicitly chooses a ticker integration; the static preset still works. Do not restore a stale whole ticker over subsequent student edits. Multiple moving presets should share a coordinated owner or have separate gated T variables.

Background tabs and long stalls require an explicit policy. For active-playback timing, pause on document hiding and resume with a fresh tick interval; do not apply a minutes-long gap on return. Validate the first resumed `dt`. A capped dt is acceptable only if the UI calls it slowed simulation time, since it ceases to match elapsed wall seconds. Physics must use substeps/event refinement or a screened replay provider, never one variable-size ticker Euler step.

For the requested three-body systems, screen/replay against the actual speed setting: collision simulation time divided by speed must exceed 30 active-playback seconds, preferably 35 seconds of margin. Increasing speed requires rescreening or restricting that speed. The original six samples do not establish this at arbitrary playback speeds. Collision detection is in world space. A separate gated explosion age can use the same ticker's dt; then advance it for 0.7 active-playback seconds before installing the next accepted system. Still must also pause that age. The supplied static charges files intentionally contain no ticker and should not take ownership of an existing one.

## B6. Complete charges data and integration

The two `.state.json` files contain complete expression lists, not ellipses or pseudocode. Each expression has its ID, LaTeX, folder, color, hidden state, applicable style defaults and label settings; controls have slider bounds. Folder rows use folder fields rather than invalid expression-only fields. The two `.vector-tools.json` files contain explicitly labeled **deep partial configuration patches**, to apply to a fresh clone of the branch's defaults. They are not native Desmos state and not complete plugin persistence records.

| File                           | Purpose                                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| charges-2d.state.json          | Source discs, scalar controls, exact exterior field/potential, probe, four native arrows/names, flux contours and optional equipotentials |
| charges-3d.state.json          | Source spheres, same controls/physics, 3D probe, four native vectors/names                                                                |
| charges-2d.vector-tools.json   | Exact component strings, exterior seeding, faint normalized flow below native graph                                                       |
| charges-3d.vector-tools.json   | Exact component strings, exterior seeding, faint 20k particles above graph with transparent backdrop and surface occlusion                |
| gpu-main-vectors.contract.json | Optional GPU arrow/name backend and shared toggle/scale contract                                                                          |

Defaults: q₁=+1, q₂=−1, d=2, a=0.12, k=1, q₀=−1, shared gain 0.8. Probe starts at (0,1) or (0,1,0.5). Charges have dynamically selected positive/negative/neutral geometry via restrictions, so changing sign also changes color. k is a fixed normalized constant, not a useful teaching slider. The exclusion radius is unsoftened; the domain guard is the physical exterior model. Magnitude-threshold absorption alone is not a sphere-boundary detector: verify that core crossing/stalling respawns rather than displaying a trail through a solid. Surface occlusion hides interiors but is not collision detection.

Probe controls pₓ,pᵧ,p_z are sliders; dragging the plotted P is not implemented by these files. The 2D file omits p_z; the 3D file omits the 2D contour toggles. The 2D source discs also carry geometric plus/minus marks, so their charge signs remain identifiable without prose.

| Control   | Meaning                                                 | Default |
| --------- | ------------------------------------------------------- | ------- |
| v\_{EVT1} | Net E arrow                                             | 1       |
| c\_{EVT1} | E₁ and E₂ contribution arrows                           | 0       |
| j\_{EVT1} | Force arrow                                             | 0       |
| n\_{EVT1} | Names on whichever arrows are enabled                   | 0       |
| L\_{EVT1} | 2D exact flux contours and valid symmetry-axis segments | 1       |
| w\_{EVT1} | 2D potential contours                                   | 0       |

The parent arrow's visibility also gates its name. These are role toggles; v is not a master switch for c/j. A UI master “main vectors” should gate all three roles, remembering their previous states. The GPU backend uses the same roles. The default is no prose, E visible, names off. Writing mode may default names on and add the sentence “Changing the test charge changes force, not the source field” in the plugin's explanatory panel. The user can independently turn names on in no-writing mode or off in writing mode. Writing is a panel/presentation choice; it does not alter source charges or field formulas.

The 2D S contours are axisymmetric flux contours in a meridional slice; their flat-screen spacing is not field magnitude. A small axis exclusion avoids the degenerate S contour, with valid non-null axis segments drawn separately. They are not directional arrows. Normalized particles add direction, not physical charge trajectories or field-strength density. Both charges zero is excluded from the contour layer by its field-magnitude guard.

The 3D state starts with restrained particles rather than a dense traced cage. A “traced lines” alternative should route the renderer's actual traced-line controls and clearly disable particle seed controls while selected. Do not assume the particle seed restricts the independent tracer. Exact particle counts and visual parameters here are starting settings, not measured projector performance targets.

Integration details that must precede shipping:

- Extend `GeneratedExpressionSpec` and its serialization in `ExpressionAdapter.ts` for labels, fill, opacity, line style and parametric domains. The current adapter exposes fewer fields than these states require. Preserve `folderId` and `colorLatex` through the full state path; source comments explicitly warn against relying on `setExpression` for them.
- Treat the state files as **standalone scratch-graph states**. For insertion into a student graph, allocate the namespace, append/merge only owned items, and preserve their camera/settings/ticker. Never wholesale replace their graph with these fixtures.
- Merge the configuration patch recursively into a cloned default so unspecified palette, edge, time and rendering fields remain valid. Allocate the existing plugin `symbolToken` through its own allocator; VT1 is a separate namespace for these physics expressions. Activate the flow through the normal controller; the patch alone does not toggle controller UI state.
- Apply the chosen saturation/contrast values after any gallery recipe that otherwise resets them to 1.45/1.2. Both flow and arrow colors should stay at 1 here.

### Verification ledger

| Check                                                                                            | Result                                                               |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Named coordinate color on a 3D sphere, Earth-like formula                                        | Visually verified live; screenshot included                          |
| Backtick math point label in 2D                                                                  | Visually verified live; screenshot included                          |
| Native 3D vector and ordinary point labels                                                       | User's live measurements, not repeated end-to-end here               |
| 53 renamed numeric helper checks                                                                 | Pass against copied branch compiler; scalar dependencies provisioned |
| Six charges component slots                                                                      | Pass against actual scalar definitions from supplied states          |
| JSON parsing, expression ID uniqueness, folder links                                             | Pass                                                                 |
| Complete state import, 2D polygon/point arithmetic styling, label visibility with pointOpacity=0 | Not live-verified; check in scratch graph                            |
| 3D math labels, native vector style controls and label occlusion                                 | Not live-verified                                                    |
| Eight-band fallback states                                                                       | Not live-rendered                                                    |
| Both plugin modes together with native geometry, core respawning, frame rate                     | Not live-verified                                                    |
| Ticker playback/Still/resume and student-ticker coexistence                                      | Specified, not implemented or live-tested                            |

The source snapshot and official state evidence support the proposed format; they do not replace the remaining integration tests. No repository implementation, commit or PR was made for this follow-up.
