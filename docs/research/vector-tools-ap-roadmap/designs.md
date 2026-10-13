# Six complete preset designs

The executable contract is `preset-configurations.json`: each entry contains every emitted 2D/3D formula, slider default/range/step, scene item, probe switch, seed, tint and particle setting. `source/src/field-rendering/gallery/ap-teaching.ts` is the maintainable implementation. Coordinates and constants use internally consistent normalized units; teachers must specify a length/time/mass conversion before assigning SI numbers.

## Shared controls and rendering

Explanatory uses graph paper and the existing `charge` palette. Majestic uses `charge-glow`, a dark #04050c background and glow. Both retain the SAME physical tint, mapped by the existing signed saturating tint mapping and the scales below. Positive energy occupies the upper palette half; it does not acquire a fictitious negative branch. Potential and induced azimuthal field are signed. Colour is qualitative unless the saturation mapping is accounted for; equal colour differences are not equal physical differences.

Controls: probe p_x,p_y in [-5,5], p_z in [-4,4] where applicable; arrow gain 1 in [0,5]; Field arrow on; Vector names off; Damped arrow lengths on. Projectile and circular motion have a separate velocity/acceleration switch. 2D implicit lines have their own switch. Names use arrow notation (g, s, v, a, E) through existing probe helpers; 3D names/dragging use the plugin. Damping intentionally distorts lengths to keep probes readable: turn it off for relative-length measurements. Velocity and acceleration arrows have different units and must not be compared as one common magnitude scale.

The current brief's no-writing Majestic mode hides explanatory probes, names, contours and axes; panel controls remain visible. Explanatory restores saved axis settings and offers optional names. A user can switch back to restore the same physical parameters. Axis suppression is scoped to these six AP presets.

2D Explanatory: 6,000 particles; speed .15; trail persistence .82; drop .04; opacity .45; point size 1.5; glow 0; normalize speed false. Majestic inherits these with glow .35 and opacity .5. 3D Explanatory: 12,000 particles; speed .1; trail 12; lifetime 1.2; opacity .5; glow 0; normalize false; absorb false. Majestic uses glow .15 and backdrop opacity .95. Exact effective look is defined by the existing `presetForMode` implementation.

GPU advection is a picture of the specified vector field, with display speed gains and particle respawning. It is not calibrated physical-time integration. The exact native projectile, oscillator and circular markers use T_scene and do carry the analytic time dependence. The existing native clock bridge updates at roughly 30 Hz. Moving/Still and Reset use existing controls. GPU time t and native T_scene share that clock, with native quantization.

## 1. Projectile: velocity and gravity

g=2 [.5,4], horizontal u=3 [1,5], initial vertical v=3 [1,5], height h=0 [0,2], and 3D lateral w=.5 [-1,1]. Default slider step .1. Field g_vector=(0,-g,0), valid y>0. Tint gy (potential per mass), scale 3. Flight time t_f=(v+sqrt(v²+2gh))/g; tau=min(T_scene,t_f). Native body r=(-4+u tau, h+v tau-g tau²/2, w tau). Velocity arrow (u,v-g tau,w) stops at impact; Reset starts another flight. There is no bounce or impact-force model.

Explanatory: ground, exact dashed trajectory for 0<=t<=t_f, moving body, draggable gravity probe and separately toggleable body velocity. Majestic keeps ground and body; gravity particles remain distinct from the projectile. The path is a planar parabola even when shown in 3D.

## 2. Oscillator phase portrait

k=1 [.25,3], m=1 [.5,3], A=2 [.5,3], step .1. The plot coordinates are (x,v), with y representing v. Field (y,-kx/m,0), H=(my²+kx²)/2, tint H, scale 8. Native marker (A cos(omega T_scene),-A omega sin(omega T_scene),0), omega=sqrt(k/m). Its physical period is 2 pi sqrt(m/k). Exact 2D contours sin(.08 pi H)=0 are constant-energy curves.

Explanatory: phase-plane guides, energy contours, marker and state-derivative probe s_vector. Majestic keeps the exact marker and flow. 3D is a camera view of the same two-coordinate phase plane, seeded with exp(-30z²); z is a display thickness, not a third physical state. x and v have different units. A changes the exact marker's orbit, not the entire phase field.

## 3. Circular motion

w=.7 [-1.5,1.5], R=2.5 [1,4], step .1. Velocity field (-wy,wx,0), acceleration (-w²x,-w²y,0). Kinetic energy per mass w²(x²+y²)/2 is tint, scale 4. Exact native body R(cos(wT_scene),sin(wT_scene),0). Seed exp[-2(sqrt(x²+y²)-R)²], multiplied by exp(-8z²) in 3D. Exact 2D circular guides sin(.5 pi (x²+y²))=0.

Explanatory: radius-R orbit, body, velocity and independently switched centripetal acceleration at the probe. Majestic keeps body and annular flow. Negative w reverses velocity but not inward acceleration; w=0 is a valid static state. The extension does not infer a material force or mass from this kinematic field.

## 4. Continuity and Bernoulli streamtube

U=1 [.3,2], a=.12 [.03,.2] step .01, H=1.7 in 2D / 1.4 in 3D [1,2], density d=1 [.5,2]. Let f=1+ax, |x|<4. 2D velocity (Uf,-Uay), walls y=±H/f; 3D velocity (Uf,-Uay/2,-Uaz/2), cylindrical wall radius H/sqrt(f). Restrict the field to the streamtube. This field is incompressible and irrotational. Pressure tint p=1+d(U²-|u|²)/2, scale 2; Bernoulli p+d|u|²/2=1+dU²/2. The 2D streamfunction is S=Uf y; contours sin(.5 pi S)=0.

Explanatory: walls/cutaway, flow, exact 2D streamlines, velocity probe. Majestic retains walls and flow. The 3D lower-half wall (azimuth pi to 2pi) opens upward. Entrance/exit are display bounds, not caps. It is an exact inviscid analytic streamtube, not the Fluid tab, a viscous nozzle, or a claim of section-uniform pressure. 2D width times axial speed and 3D area times axial speed are constant.

## 5. Conducting sphere in uniform E

E=1 [-2,2], R=1.3 [.6,2], step .1. Let r²=x²+y²+z². For r>R:

V=-Ex(1-R³/r³)

E_vector=E(1-R³/r³+3R³x²/r⁵, 3R³xy/r⁵, 3R³xz/r⁵).

Inside, V=0 and E_vector=0; the surface field limit is radial. Tint V, scale 3. The 2D meridional flux function S=y²(1+2R³/(x²+y²)^(3/2))/2 has E dot grad S=0. Draw sin(.12 pi S)=0 outside the sphere, with |y|>.025 to omit a degenerate axis stripe. This restriction only affects contour drawing. Hide contours at E=0. The common multiplicative E is omitted from S to keep curve density stable when reversing the field.

Explanatory: opaque conducting sphere/disk, exterior field, exact 2D field lines and electric probe. Majestic retains sphere and flow. The 2D picture is a sphere section, not the different solution for an infinite cylinder. Neutral means zero net surface charge, not zero surface charge everywhere. No moving-test-charge solver is implied.

## 6. Faraday induction

B=1 [.2,2], w=.6 [.2,1.5], R=2 [1,3], step .1. Prescribe Bz=B sin(wt) inside cylindrical radius R and zero outside. Let rho=x²+y², Bdot=Bw cos(wt), f=1 for rho<R², otherwise R²/rho. For rho>0, E_vector=(Bdot f y/2,-Bdot f x/2,0); the origin uses zero. Tint signed counterclockwise E_phi=-Bdot f sqrt(rho)/2, scale .6. Thus 2pi r E_phi=-pi min(r²,R²) Bdot, directly matching integral Faraday's law. 2D guides sin(.5 pi rho)=0; 3D seed exp(-.3z²).

Explanatory: cylinder rim, circulating E, E probe, B dot/cross in 2D or B arrow in 3D. Majestic keeps rim and field. B and E need not peak together, and induced E is not an electrostatic potential gradient. This is a quasistatic prescribed long-solenoid model; there is no radiation, end-field or backreaction calculation. Near Bdot=0 the field should visibly slow and its colour approach zero; a sparse still screenshot is not evidence of a stopped renderer.

Palette stops (normalized coordinate → RGB): `charge` 0→(24,84,170), .5→(78,86,104), 1→(186,52,34); `charge-glow` 0→(70,150,255), .25→(60,95,190), .5→(70,62,105), .75→(205,70,50), 1→(255,170,90). The tint scale is recorded per demo above and in the JSON; these are existing palettes, not changes to the shared colour system.
