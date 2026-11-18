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
| **Sloshing damping δ**  | **0.45 /s**                     | **0.066 /s** | **0.065 ± 0.015 /s**    |
| Still water after 3 s   | median 0.07, 99th 0.64 cm/s     |              | 0                       |
| Still surface roughness | 2.3 mm (a fifth of a cell)      |              | 0                       |
| Volume                  | level holds within 0.5 mm, 10 s |              |                         |
| Paddle, tunnelling      | 0 particles inside the disc     |              | 0                       |

Sloshing damping went from 0.6 /s (Müller's FLIP with particles moving by
their own velocity) to 0.066 /s at 5 mm, inside the measurement. At 1 cm a
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
speed, which means the GPU (the LBM already runs there) or several workers.

## Open

- **5 mm in real time**: GPU or multi-worker; see Speed.
- **Comparison engines.** Jean Timex's hybrid FLIP and the LBM have to go
  behind the same scenes to make this a comparison.
- **Still surface roughness** against volume, above.
