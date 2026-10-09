# Physics presets — implementation and evidence

This package updates six presets and adds **Shell theorem** and **Uniform electric field** on DesModder `feature/vector-tools-foundation`, base `e25aa05a8544e976f2ff5340f80d605aebeae8d7`. Electric charges remains the reference preset and is unchanged. See `verification.md` for the final check results and measured limits.

Apply `implementation.patch` at that commit, or use the matching files under `source/`. The main implementation is `src/field-rendering/gallery/physics-teaching.ts`; it uses the repository's real `GalleryPreset`, `SceneItem`, `probeArrows2D/3D`, scalar tint, and GPU name/drag support. `preset-configurations.json` contains the exact emitted formulas, slider defaults/ranges, switch labels, and scenes for both dimensions. No generated dependencies or browser binaries are included.

All fields use normalized physical constants. Particle motion shows field direction, **not particle dynamics** or calibrated field-line density. Analytic formulas are exact for the stated idealizations; sampled GPU drawing and floating-point arithmetic are finite-resolution approximations. No soft core is inserted. Values inside excluded bodies are deliberately zero; the exterior formulas are not continued through those bodies.

## Shared classroom behavior

The background is paper-white. Particles are colored through the existing `charge` palette by `tanh(scalar/scale)`: positive red, zero dark slate, negative blue. Magnitude-only tints use the nonnegative half of that palette. Dark slate curves are exact field lines; dashed gray curves are equipotentials. The source-code palette is reused unchanged.

The default field arrow is on, names off, and damping on. “Names” exposes vector notation such as E⃗, B⃗, g⃗ and v⃗; 2D uses native labels and 3D uses `name3d`. The probe is draggable in 2D and carries `drag3d` in 3D. “Damped lengths” applies L tanh(|gain·vector|/L), with reach 5 in 2D and 2.5 in 3D. Turn it off for exact proportional lengths. Separate force/traction gain avoids suggesting that a field and a force share units.

Every 3D solid is a parametric (u,v) surface with explicit domains and opaque fill. Infinite wires, cylinders, and strips are drawn with display cuts; those cuts are not physical ends. Default 2D particle count is 6,000, with 30,000 in 3D (12,000 for the prism), normalized speed, and 1.2-second 3D lifetime. There are no stacked particle-birth planes.

Exact scalar contours are **2D meridional/planar curves**, not falsely presented as 3D level surfaces that are field lines. In 3D the continuous field, particles, and probe provide direction; existing numerical tracing is the honest extension when individual 3D trajectories are needed.

## 1. Parallel wires

Wires are infinite along z, at x=±d/2, with radius 0.22. With ρᵢ²=(x−xᵢ)²+y²,

- B = Σ Iᵢ(−y, x−xᵢ, 0)/ρᵢ², outside both rods; μ₀/(2π)=1.
- Tint: |B|, scale **0.5**. It shows addition, cancellation, and stronger field near a wire.
- Stream function A_z = −½Σ Iᵢ ln ρᵢ²; B=(∂y A_z,−∂x A_z). Native lines use sin(πA_z)=0.
- Gray rods carry dot/cross current direction in 2D and adjacent direction arrows in 3D. A radial birth band around each rod reveals circulation without slicing the volume.
- “Each source's field” exposes B⃗₁ and B⃗₂. “Force per length on right wire” shows (−I₁I₂/d,0,0), labeled f⃗_L when names are enabled. Positive parallel currents attract.
- Defaults: I₁=I₂=1, range −3…3; d=5 in 2D / 3 in 3D, range 1…8. Field gain 5. Contributions and force start off.

## 2. Earth and Moon

Static spherical masses are placed about their barycenter, with c₁=−dM₂/(M₁+M₂), c₂=dM₁/(M₁+M₂). For rᵢ=|r−cᵢ|,

- g=−Σ Mᵢ(r−cᵢ)/rᵢ³, exterior only; G=1.
- Tint: Φ=−ΣMᵢ/rᵢ, scale **15**. The deeper potential near Earth is visible independently of arrow direction.
- Meridional flux S=−ΣMᵢ(x−cᵢ)/rᵢ; sin(0.15πS)=0. A narrow axis restriction avoids degenerate whole-axis contour artifacts; it does not alter the field.
- Radii 0.75 and 0.20475 preserve the 1:0.273 ratio. Separation is explicitly compressed, not an astronomical common scale. Earth uses procedural coordinate-based land, ocean, and polar ice; Moon uses gray crater shading. These are illustrative maps, not geographic data.
- “Each source's field” compares g⃗₁, g⃗₂ and the net. This is not an orbit or a rotating-frame L1 model.
- Defaults: M₁=81 (1…100), M₂=1 (0.1…20); d=6 (2…12) in 2D and 3 (2…7) in 3D. Field gain 0.4.

## 3. Spinning cylinder

For ρ²=x²+y², exterior of radius R,

- v_x=U[1−R²(x²−y²)/ρ⁴]−R²ωy/ρ²;
  v_y=−2UR²xy/ρ⁴+R²ωx/ρ²; v_z=0.
- Stream function S=Uy(1−R²/ρ²)−(R²ω/2)ln(ρ²/R²); sin(πS)=0.
- Tint: gauge pressure Δp=(U²−|v|²)/2, density normalized to 1, scale **2**. Bernoulli makes the asymmetric pressure visible.
- A white rim marker/stripe follows ωT_scene. Positive ω is CCW and gives downward lift for positive U. This is an ideal circulation model with no penetration, not a viscous no-slip solution for a mechanically driven cylinder.
- “Pressure traction at rim” shows −Δp n at the upper rim. It is a local gauge-pressure traction, **not the integrated lift**. Its label is f⃗_p.
- Defaults: U=1 (0.2…3), R=2 in 2D (0.4…3) / 1.2 in 3D (0.4…2), ω=0.4 (−2…2). Velocity gain 1. The plugin's Moving/Still/Reset clock drives the marker, without a graph ticker.

## 4. Capacitor

The exact model is two uniformly charged strips, x∈[−L,L], infinite in z, at y=±d/2. Their prescribed charge densities are ±s. These are not finite equipotential conducting plates. Display thickness 0.08 masks the ideal sheet singularities.

Define b₊=y−d/2, b₋=y+d/2,
A(b)=½ln[((x+L)²+b²)/((x−L)²+b²)],
C(b)=atan((x+L)/b)−atan((x−L)/b).
Then E=s(A(b₊)−A(b₋), C(b₊)−C(b₋),0). Sheet-plane limits outside the strip are handled explicitly.

For H(u,b)=u ln(u²+b²)−2u+2|b|atan(u/|b|), let V(b)=−½[H(x+L,b)−H(x−L,b)]. Tint is Φ=s[V(b₊)−V(b₋)], scale **3**, with zero at the midplane. The b=0 primitive uses its finite exterior limit.

For K(u,b)=u atan(u/b)−(b/2)ln(u²+b²), let S(b)=−K(x+L,b)+K(x−L,b). Lines use sin(0.25π[S(b₊)−S(b₋)])=0. Omitting the common charge multiplier preserves the same geometric field-line family; opacity hides it when s=0. Restrictions keep the branch cuts at the sheets out of the contour drawing. Reduced line density improves readability and recompute cost without changing the field. Optional equipotentials use sin(πΦ/6)=0.

Red/blue plates and white plus/minus signs reverse with s. Defaults: s=1 (−2…2), L=4 in 2D / 2.5 in 3D (1…5), d=3 / 1.5 (0.5…4). The default probe is in the gap. E gain 0.5.

## 5. Bar magnet

A uniformly magnetized prism occupies |x|≤a, |y|≤b, |z|≤c, with magnetization along x. The two x-faces have opposite bound pole densities. The implementation analytically integrates their exterior Coulomb-like field: four corner atan terms for the normal component and paired log terms for tangential components. In normalized units,

B(r)=p∫∫[(r−(a,y′,z′))/|r−(a,y′,z′)|³ − (r−(−a,y′,z′))/|r−(−a,y′,z′)|³]dy′dz′.

The complete closed form is emitted in the configuration JSON and checked against independent face quadrature. Explicit limiting log pairs avoid log(0)−log(0) on exterior extensions of face edges. The physical solid and its boundary are masked.

Tint: **|B|, scale 2**. Red north/blue south switch with p; zero magnetization is gray. There is no globally valid two-variable stream function for the finite prism's general 3D field, nor an incompressible 2D stream function for its z=0 slice. Use particles/probe, or the existing numerical tracer; do not fake a dipole continuation. Defaults: a=1.5 (0.5…3), b=c=0.4 (0.2…0.8), p=1 (−2…2). B gain 1.

## 6. Magnetic dipole

The ideal point dipole is along y in both dimensions. With r²=x²+y²+z²,
B=m(3xy,3y²−r²,3yz)/r⁵. Only the origin is excluded; there is no invented finite core.

Tint: magnetic scalar potential Ψ=my/r³, scale **0.3**, with B=−∇Ψ outside the source. Meridional flux S=mx²/(x²+y²)^(3/2) gives sin(3πS)=0. A narrow axis restriction removes the degenerate zero contour. Seed exp(−0.1r²) concentrates sampling smoothly. Defaults: m=1 (−3…3), B gain 3, home extent ±6. No spinning moment is implied.

## New demos ranked by classroom value / incremental build cost

This is a design judgment, not a measured learning-effect ranking.

| Rank | Demo                            | Value and cost                                                                                                                   |
| ---- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Shell theorem                   | Direct inside/outside comparison, symmetry, inverse-square gravity; low cost, exact formulas and an existing probe. Implemented. |
| 2    | Uniform E and test-charge force | Separates E from qE, sign, potential gradient; very low cost. Static field/force version implemented.                            |
| 3    | Conducting sphere in uniform E  | Strong superposition and shielding demonstration; moderate cost, induced surface charge and boundary conditions must be exact.   |
| 4    | Potential landscape             | Connects slope to force and energy; moderate cost for a coordinated potential surface and a separate physical-space view.        |
| 5    | Faraday induction               | High conceptual value but highest cost: a time-varying B, consistent induced E, and flux/EMF timing must agree.                  |

### Shell theorem — full design

A uniform thin spherical shell has total mass M and radius R. Gravity is zero for r≤R and −Mr/r³ for r>R; potential is −M/max(r,R). Tint scale **3** exposes the constant interior potential. The surface value is assigned zero by the guard; the ideal infinitely thin shell has a discontinuous limiting field. Do not interpret that convention as a finite-thickness shell solution.

The 2D shell is a thick circle; the 3D parametric sphere has “Cutaway view (field unchanged)” on by default. It changes only the depiction of the complete shell. Exact radial field lines outside use sin(πy/r)=0; optional dashed equipotentials use sin(πΦ/3)=0. The g probe uses the same arrow/name/damping controls. Defaults M=8 (1…20), R=2.5 / 1.5 (0.5…3), gain 2. Uniform volume seeding avoids invented source slices. Zero interior velocity may leave stationary colored particles, correctly encoding potential rather than motion.

### Uniform electric field — full design

Two ideal infinite plates are at x=±3. E=(E₀,0,0) between them and zero outside. In the displayed field domain Φ=−E₀x, tint scale **2**. The exterior potential is not visualized; the zero guard there is a rendering mask, not a claim that the globally continuous physical potential jumps to zero. Native lines sin(πy)=0 are restricted to the gap; dashed equipotentials are optional.

The 2D regions / 3D parametric plates change red/blue polarity with E₀. Displayed y/z ends are cuts of infinite plates. The probe optionally shows F=q₀E with its own gain, alongside E. The force is hidden outside the modeled gap. Defaults E₀=1 (−3…3), q₀=−1 (−3…3), field and force gains 1. This delivers the static force comparison. A moving test-charge trajectory is a later extension requiring an explicit mass, initial velocity, collision convention, and consistent clock; it is not claimed here.

## Small API additions

`SceneItem.lineOpacity` accepts a numeric value or a native scalar expression, passed through by the existing native expression adapter. This lets the capacitor hide contours at zero charge. `GalleryPreset.sceneTime` optionally names an owned native scalar advanced by the plugin clock at 30 Hz; the cylinder uses `T_{scene}`. The bridge only updates the preset's existing numeric definition, under history replacement, and does not create a conflicting student definition. The scalar remains visible in the native expressions list. Editing its numeric value while Moving is on is temporary because the clock owns it.

See the verification ledger for what was exercised live versus what was checked in source/tests. The screenshot files show the built extension on real Desmos 2D/3D pages.
