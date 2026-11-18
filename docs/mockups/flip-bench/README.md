# Liquid bench

Step 2 of the liquid plan agreed on 2026-11-17: GPT and Rafael judged the LBM
liquid in `../liquid-mockup.html` not to look like real water, and GPT
proposed FLIP/APIC on the CPU first. This folder is the test page for that:
one FLIP solver, the same scenes for every engine, and numbers checked against
experiments.

| File            | What it is                                                                      |
| --------------- | ------------------------------------------------------------------------------- |
| `index.html`    | The bench page: six scenes, three views, speed and accuracy readings, `bench()` |
| `flip.js`       | The FLIP solver, after Müller's Ten Minute Physics (MIT, `LICENSE-MULLER.txt`)  |
| `dam.cjs`       | Dam break against Martin & Moyce (1952), same data as the LBM check             |
| `rest.cjs`      | Still water: how fast anything moves when nothing should                        |
| `slosh.cjs`     | Sloshing period and damping against Bäuerlein & Avila (2021)                    |
| `slosh-amp.cjs` | Sloshing amplitude one period at a time, for finding what damps it              |
| `profile.cjs`   | Time per phase of a step                                                        |
| `drop.jpg`      | The water view, 0.55 s after a blob lands in a pool                             |

The page is published at https://claude.ai/artifact/RXsnU21QAvA95ycEyyB9Gq.
Locally, start the `mockups` server in `.claude/launch.json` and open
`/flip-bench/index.html`. With the page hidden, `bench({ scene, cell, cfl,
seconds })` in the console runs frames back to back and returns the readings.

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

## Results at 1 cm cells, CFL 1

| Check                 | Result                                        | Reference                |
| --------------------- | --------------------------------------------- | ------------------------ |
| Dam break, mean error | 9.8% (front a little ahead)                   | Martin & Moyce           |
| Dam break, late speed | 1.42 √(gH)                                    | 1.32 measured            |
| Still water after 3 s | median 0.05, 99th 0.64, max 2.1 cm/s          | 0                        |
| Volume drift          | under 0.3% in every scene                     | GPT's target: under 0.1% |
| Paddle, tunnelling    | 0 particles inside the disc                   | 0                        |
| **Sloshing damping**  | **δ ≈ 0.6 /s: 20 mm to under 1 in 3 periods** | **0.065 /s measured**    |

Speed in the browser pane, with drawing (`bench()`, 1 cm cells, CFL 1):

| Scene    | Particles | Solver ms a frame, median / 95th | Real time |
| -------- | --------- | -------------------------------- | --------- |
| Dam      | 3,936     | 22 / 32                          | 0.74×     |
| Sloshing | 6,347     | 10 / 11                          | 1.48×     |
| Still    | 9,462     | 14 / 19                          | 1.02×     |
| Drop     | 5,284     | 19 / 24                          | 0.86×     |
| Pour     | 4,956     | 21 / 29                          | 0.82×     |
| Paddle   | 9,462     | 23 / 32                          | 0.62×     |

Fast water needs several steps a frame at CFL 1 (seven in the dam break).
CFL 2 or 4 is cheaper, but at 5 mm cells it breaks the dam break (19% and
30% error), so speed has to come from the code, not the step size.

## Open

- **Sloshing over-damps about 10×.** Neither the PIC share (FLIP 1 still
  decays), separation nor the step size is the cause. It goes with drift
  compensation, which no working setting can do without: without it, the water
  collapses 25 cm in 6 s. APIC (step 3) and a particle-level density
  correction are the next things to try.
- **Speed.** Use a Web Worker so Desmos keeps the main thread. Profile: pressure
  solve 31%, drift solve 24%, separation 26%, transfers 16%.
- **Comparison engines.** Jean Timex's hybrid FLIP and the LBM have to go
  behind the same scenes to make this a comparison.
- **Volume settles 1.8%** in the first second (7 mm in 40 cm), then holds.
