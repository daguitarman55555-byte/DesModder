# Liquid bench

Step 2 of the liquid plan agreed on 2026-11-17: GPT and Rafael judged the LBM
liquid in `../liquid-mockup.html` not to look like real water, and GPT
proposed FLIP/APIC on the CPU first. This folder is the test page for that:
one FLIP solver, the same scenes for every engine, and numbers checked against
experiments.

| File               | What it is                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| `index.html`       | The bench page: seven scenes, three views, speed and accuracy readings    |
| `flip.js`          | The solver, after Müller's Ten Minute Physics (MIT, `LICENSE-MULLER.txt`) |
| `gpu-flip.js`      | The same solver in WebGL2 shaders, for cells below 1 cm (see The GPU)     |
| `scenes.js`        | The scenes, shared by the page and the worker                             |
| `engine.js`        | Runs a scene; the same code in the worker and on the page                 |
| `worker.js`        | The solver's own thread, so the page and Desmos keep the main thread      |
| `dam.cjs`          | Dam break against Martin & Moyce (1952), same data as the LBM check       |
| `rest.cjs`         | Still water: how fast anything moves when nothing should                  |
| `slosh.cjs`        | Sloshing period and damping against Bäuerlein & Avila (2021)              |
| `slosh-amp.cjs`    | Sloshing amplitude one period at a time, for finding what damps it        |
| `slosh-energy.cjs` | Sloshing energy by peak kinetic energy each period                        |
| `runup.cjs`        | Surge run-up on a wall against Liu et al. (2022)                          |
| `energy.cjs`       | The dam break's energy budget and how high it climbs the far wall         |
| `tune.cjs`         | Speed against quality for solver settings                                 |
| `longrun.cjs`      | A simulated minute of each scene: cost, drift, energy, strays, data size  |
| `trace.cjs`        | One scene second by second, for spikes a long run averages away           |
| `who.cjs`          | The fastest particles and the cells around them                           |
| `profile.cjs`      | Time per phase of a step                                                  |
| `drop.jpg`         | The water view, 0.55 s after a blob lands in a pool                       |

The page is published at https://claude.ai/artifact/RXsnU21QAvA95ycEyyB9Gq.
Locally, start the `mockups` server in `.claude/launch.json` and open
`/flip-bench/index.html`. With the page hidden, `bench({ scene, cell, cfl,
seconds })` in the console runs frames back to back on the page's thread and
returns the readings; `benchWorker({ scene, cell, seconds })` does the same
through the worker. `#local` on the address runs without the worker.

## Step 1: the demos as published

Timed in the Claude browser pane on Rafael's machine, solver only:

- **Müller**: 25,900–28,900 particles on 3 cm cells, 21 ms a step, so 0.8× real
  time at 1/60 s steps. Particle separation was about 10 ms of that, and 50
  Gauss-Seidel passes 4.6 ms.
- **Jean Timex hybrid FLIP**: about 6 ms a frame with foam, but its default is
  2,000 particles on 4.3 cm cells, so it can't be compared at that size.

Both are MIT licensed. Rafael's verdict on the motion: "the fluidity looks
real".

## What had to change in Müller's solver

Each change was found by a check here, at the 5 mm–1 cm cells we need.
Müller's demo runs at 3 cm, where these defects hide.

1. **Step size.** Water at rest has no speed, so the CFL rule allowed a full
   1/60 s first step. The pressure solve then turned that step's gravity into
   a jet: at 5 mm cells the front moved 6.5 cm in 46 ms. The fix is
   Bridson's bound, which adds √(5gh) to the top speed.
2. **Drift compensation fed back into the velocity.** Müller removes excess
   density inside the main pressure solve. FLIP then keeps that outflow as
   velocity, so still water at 1 cm bounced at 10–90 cm/s. The fix is a
   second, rough solve that moves positions only (after Kugelstadt et al.
   2019), working both ways two cells deep in the water and outward only
   nearer the surface. Pushing outward everywhere ratcheted the level up 18 mm
   in 6 s.
3. **Walls against the FLIP update.** Zeroing a particle's velocity at a wall,
   while the grid also cancels that step's gravity, threw floor particles up at
   g·dt = 14 cm/s. The fix: walls move particles only, and solid faces are
   left out of the grid-to-particle weights.
4. **Pressure solver.** At 5 mm, 50 Gauss-Seidel passes left still water
   moving at 8.7 cm/s, and 200 passes cost 52 ms a step. Conjugate gradient
   with MIC(0) (Bridson, ch. 5) converges in 17–33 iterations. Gauss-Seidel
   stays as a choice on the page.

5. **Wall friction** (2026-11-18). Rafael found the dam break's wave at the
   far wall too strong. Liu, Nistor, Mohammadian & Azimi (2022, Fluids 7(8)
   258; tank, depths and run-up in Liu's uOttawa thesis) measured a surge
   from a 25 cm reservoir climbing a wall 85 cm away to 2.03, 2.09 and 2.35
   times depths of 20, 25 and 30 cm. Frictionless walls let the jet climb
   2.66 H at 5 mm. The log-law wall the LBM used (κ 0.41, B 5.2) brings it
   to 2.53 H for H = 30 cm. At 1 cm the thin jet is under-resolved and peaks
   low (2.10 H). The dam scene's tank was also too short: its open top acted
   as a lid, so it is 1.4 m tall now (`dam-runup.jpg`, 0.87 s).
6. **Pour** was a 4 cm sheet at 1.5 m/s, three times a tap's flow; it is
   2 cm at 1 m/s from 60 cm now, and stops at 30 cm deep.
7. **Particles move through the grid** (Bridson, ch. 7), by RK2 through the
   projected velocity, carried two faces out into the air; spray keeps its
   own velocity. Müller moves each particle by its own noisy velocity, so the
   water compressed and needed a strong drift correction, which damped waves.
8. **APIC** (Jiang et al. 2015) instead of FLIP: each particle carries an
   affine velocity, so the grid hands back its gradient too.
9. **Drift correction is weak and occasional**: k 0.1, applied every fourth
   step at four times the strength. Its warm start was rescaled the wrong way
   (the drift unknown shrinks with the step, pressure grows), which made 5 mm
   sloshing blow up.

## Results

Defaults: APIC, particles through the grid, conjugate gradient, CFL 1.

| Check                   | 1 cm cells                      | 5 mm cells   | Reference               |
| ----------------------- | ------------------------------- | ------------ | ----------------------- |
| Dam break, mean error   | 7.3%                            | 9.3%         | Martin & Moyce          |
| Dam break, late speed   | 1.42 √(gH)                      | 1.44 √(gH)   | 1.32 measured           |
| Wall run-up, H 30 cm    | 2.10 H                          | 2.53 H       | 2.35 H, Liu et al. 2022 |
| **Sloshing damping δ**  | **0.45 /s**                     | **0.052 /s** | **0.065 ± 0.015 /s**    |
| Still water after 3 s   | median 0.07, 99th 0.64 cm/s     |              | 0                       |
| Still surface roughness | 2.3 mm (a fifth of a cell)      |              | 0                       |
| Volume                  | level holds within 0.5 mm, 10 s |              |                         |
| Paddle, tunnelling      | 0 particles inside the disc     |              | 0                       |

Sloshing damping went from 0.6 /s (Müller's FLIP with particles moving by
their own velocity) to 0.052 /s at 5 mm (0.066 before the lid and spray fixes), inside the measurement. At 1 cm a
wavelength is 100 cells and the wave still dies about seven times too fast,
so realistic waves need 5 mm.

What drift correction trades (`volume.cjs`, `slosh-energy.cjs`): without it
still water is perfectly still (0.23 mm roughness) but a splashed dam break
settles 30 mm too high, spread out. A dead band of 20% (`driftBand`) keeps
still water still but the splashed water 6 mm high and still water sinks
0.6 mm in 8 s. The default has no band.

## Speed

Through the worker in the browser pane (`benchWorker`), solver only; the page
draws on its own thread meanwhile. Real time means simulated seconds per
second.

| Scene, 1 cm cells | Particles | ms a frame | Steps a frame | Real time |
| ----------------- | --------- | ---------- | ------------- | --------- |
| Sloshing          | 6,347     | 10         | 2             | 1.25×     |
| Pour              | 2,646     | 11         | 7             | 1.23×     |
| Wall run-up       | 2,337     | 12         | 5             | 1.09×     |
| Still             | 9,462     | 13         | 2             | 1.06×     |
| Drop              | 5,284     | 17         | 5             | 0.85×     |
| Paddle            | 9,462     | 21         | 3             | 0.67×     |
| Dam break         | 3,936     | 25         | 7             | 0.58×     |
| Sloshing, 5 mm    | 25,542    | 56         | 3             | 0.29×     |
| Dam break, 5 mm   | 15,840    | 59         | 4             | 0.27×     |

What sped it up: the worker (the page thread is free); warm-starting the
pressure solve (33 to 22 iterations); one separation pass instead of two; a
1e-4 solver tolerance; drift correction every fourth step. Grid advection and
APIC cost some of that back.

**CFL 2** halves the steps in fast scenes. With APIC through the grid it
leaves the dam break as close (6.0%) and lowers the 1 cm run-up from 2.10 to
2.03 H. That is Rafael's call; the page offers it.

At 5 mm, a step costs about 31 ms: pressure 29%, drift 22%, separation 18%,
transfers 14%, advection 14%. Real time at 5 mm needs about four times that
speed; the GPU solver below gets most of the way.

## Smooth playback

Rafael asked (2026-11-18) for a mode where the calculations and drawing have
time to happen, so everything moves smoothly. The Speed card now offers:

- **Real time**: as before. It keeps pace with the clock, and when the
  solver falls behind it drops frames.
- **Smooth**: every frame shown is the same slice of simulated time,
  speed/60 s. The worker computes them with no time limit and keeps four
  ready; the page shows one every 1/60 s. When the next frame isn't ready,
  the page holds the current one, and the card reads "stuttering".
- **Speeds**: 1× down to 1/64×, or **Auto**.
- **Keyframes**: one solver step can cost more than a display frame (28 ms
  for the 5 mm paddle), and then no speed is slow enough, since every frame
  pays at least one step. So the worker computes every k-th frame (k 1–6)
  and the page draws the frames between by blending particle positions; a
  stall holds the picture rather than blending backwards.
- **Auto plans; it doesn't extrapolate**. Once a second it takes the solver's
  cost per step (90th percentile) and the step the CFL rule allows. A
  keyframe of k slots at speed s needs ceil(k s / 60 / dt) steps, at least
  one, and must fit in k slots at 70% busy. The gap k is the smallest that
  fits one step, and Auto takes the fastest preset that then fits. The first
  version judged from the measured cost per simulated second instead, which
  trapped it slow: at slow speeds each frame still pays a whole step, so the
  cost looked higher and it went slower (the 1 cm paddle sank to 1/64×).
  Any stall in the last second puts it one preset below the plan.
- **Dragging** in slow motion divides the pointer's speed by the playback
  speed, since the hand moves faster than the slowed water.

`benchSmooth({ scene, cell, speed, seconds })` plays by timer with the page
hidden, and reports the speed held, the keyframe gap and the stalls. On an
otherwise idle machine, with Auto:

| Scene           | Auto chose | Keyframe every | Stalls after the first ½ s |
| --------------- | ---------- | -------------- | -------------------------- |
| Paddle, 1 cm    | ¼×         | 1 frame        | 0                          |
| Dam break, 1 cm | ¼×         | 1              | 0                          |
| Sloshing, 5 mm  | ⅛×         | 3              | 0                          |
| Dam break, 5 mm | 1/32×      | 2              | 0                          |
| Paddle, 5 mm    | 1/32×      | 5              | 0                          |

A fixed speed the machine can't sustain stutters, and the card says so. For
example, the 5 mm dam break at ¼× stalls on most frames.

## Long runs

`longrun.cjs` runs each scene for a simulated minute through the page's
own engine and scenes, as smooth playback does. At 1 cm:

- **Cost per step holds**, with no slowdown as particles mix (paddle 6.19 ms
  at 10 s, 6.09 at 60 s).
- **Volume drift stays put**, under 1% in every scene, without creeping.
- **Energy only falls** where nothing drives the water (dam 0.622 to
  0.592 J/kg), and holds in still water (1.5352 to 1.5351).
- **Nothing escapes**: no particle leaves the tank or turns non-finite.
- **One leak, fixed**: the sloshing scene kept its whole history and the
  worker sent it every frame, 155 KB by a minute. It keeps the 10 s the
  chart shows now.

At 5 mm the paddle **ran away**: by 6 s a few particles moved at 27 m/s
against a disc at 0.75, and a frame took 77 steps (`trace.cjs`, `who.cjs`).
They were splash held against the open top of the tank, and two things
combined:

- **The top row was never solved.** It was never part of the pressure solve,
  and its neighbour above wrapped into the next column's floor. It is a lid
  now; the scenes already reserved that row.
- **Grid advection held spray in place.** A particle no water face reaches
  keeps its own velocity, and gravity added to it every step. But it was
  moved with the extrapolated grid velocity, close to zero up there, so it
  stayed put while its velocity ran away. Such spray now flies on its own
  velocity.

After both fixes the 5 mm paddle peaks at 2–3 m/s over 8 s, and the 1 cm
run-up rose to 2.27 H (2.35 measured).

## The GPU

Rafael chose the GPU next (2026-11-18), so 5 mm runs faster than 1/32×.
`gpu-flip.js` is `flip.js` step for step in WebGL2 fragment shaders, with
particles and grid in float textures. It runs in the worker through an
OffscreenCanvas. **Runs on** in the Solver card picks it: Auto takes the GPU
below 1 cm, where it is faster, and the CPU at 1 cm and above. Scenes and the
page read particles and grid as before; each is read back once a frame.

What a shader cannot do the CPU's way, and what it does instead:

- **Pressure.** MIC(0) works cell after cell. Red-black relaxation moves
  pressure a cell a sweep, and with 50 sweeps the 5 mm paddle's water lost 16%
  of its volume in half a second. Multigrid V-cycles alone cut the residual
  only 25% a cycle, since the coarse grids see the free surface coarsely. So
  it is conjugate gradient with one V-cycle as the preconditioner (McAdams,
  Sifakis & Teran 2010), 4 iterations from the last step's pressure, and
  every scalar stays on the GPU. From cold, 16 iterations reach 2.5e-4.
- **Keep apart.** Each particle is written into a table of bins 0.4 h across,
  about one each, and pushed from every neighbour within 2r at once. Without
  this the water loses volume on either solver: in 1 s of the 5 mm paddle,
  the CPU without it lost 2.95% and the GPU 3.15%; with it the GPU loses
  0.43–0.71%, the CPU 0.45–0.77%.
- **Particle to grid** adds by float blending, one 3×3 point a particle.
  Drawn in seeding order, neighbours queued on the same pixels: 2.4 ms. Drawn
  interleaved, 64 apart: 0.57 ms.
- **The fastest particle**, which sizes the next step, was read at once, and
  the CPU then waited for the GPU every step: 6.8 ms a 5 mm paddle step. It
  is read into a buffer and collected a step or two later, plus what gravity
  can have added since: 4.6 ms.

Same scenes, GPU against CPU:

| Check, 5 mm cells      | GPU      | CPU      | Measured             |
| ---------------------- | -------- | -------- | -------------------- |
| Dam break, mean error  | 9.8%     | 9.7%     | Martin & Moyce       |
| Run-up peak            | 2.65 H   | 2.58 H   | 2.35 H (Liu 2022)    |
| Run-up above H         | 0.65 s   | 0.63 s   | 0.80 s               |
| Sloshing damping δ     | 0.066 /s | 0.052 /s | 0.065 ± 0.015 /s     |
| Still water, 1 cm, 5 s | 3.0 cm/s | 3.4 cm/s | 0 (fastest particle) |
| Dam break, 1 cm        | 7.6%     | 7.5%     | Martin & Moyce       |

A minute of the 1 cm paddle matches the CPU's long run: drift −0.57 to
−0.90% (CPU −0.58 to −0.95%), energy 1.67–1.69 J/kg (1.68–1.71), nothing
outside the tank, and the cost per step flat (3.7–4.2 ms). Thirty seconds of
the 5 mm paddle, where the CPU once ran away, hold too: fastest particle
1.7–2.1 m/s, energy 1.67–1.73 J/kg, nothing outside, drift −0.6 to −1.2%.

Speed, the pane hidden, solver only:

| Scene           | GPU ms a step | CPU ms a step | GPU real time | CPU real time |
| --------------- | ------------- | ------------- | ------------- | ------------- |
| Paddle, 5 mm    | 6.4–8.3       | 30            | 0.36×         | 0.09×         |
| Dam break, 5 mm | 3.9           | 13.9          | 0.29×         | –             |
| Dam break, 1 cm | 3.1           | 4.1           | 0.70×         | 0.61×         |

CPU step costs at 5 mm are from Node (`scene.cjs`-style runs of the page's
engine); the browser was slower still. A GPU step is mostly the fixed cost
of some 250 shader passes, about 10 µs each before any work, so it gains
least on small scenes: at 1 cm it only just beats the CPU, which is why Auto
keeps the CPU there.

In smooth playback, Auto now holds the **5 mm paddle at ⅛×** with a keyframe
every 4 frames and no stalls (CPU: 1/32×). The planner had to learn that a
keyframe on the GPU costs about 7 ms besides its steps, for reading particles
and grid back; counted as part of one step, that held it at 1/16×. The **5 mm
dam break stays at 1/32×**: when its jet hits the wall the CFL step falls to
0.74 ms, and a frame of those does not fit at 1/16×. CFL 2 would double it.

## Open

- **5 mm in real time**: the GPU reaches 0.3×. What is left is the fixed
  cost of shader passes (the pressure solve is about two thirds of a step),
  and CFL 2, which is Rafael's call.
- **Comparison engines.** Jean Timex's hybrid FLIP and the LBM have to go
  behind the same scenes to make this a comparison.
- **Still surface roughness** against volume, above.
