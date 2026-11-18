/*
 * Runs one bench scene: the same code in the worker and, for bench() and
 * browsers without workers, on the page. Needs flip.js and scenes.js first.
 */
"use strict";

class LiquidEngine {
  constructor() {
    this.settings = {
      cfl: 1,
      flip: 0.9,
      pressure: 50,
      separate: true,
      solver: "pcg",
      transfer: "apic",
      advect: "grid",
    };
    this.drag = { active: false, x: 0, y: 0, vx: 0, vy: 0 };
    this.generation = 0;
    this.volume0 = null;
  }

  opts() {
    const s = this.settings;
    return {
      cfl: s.cfl,
      flipRatio: s.flip,
      pressureIters: s.pressure,
      separate: s.separate,
      solver: s.solver,
      transfer: s.transfer,
      advect: s.advect,
      gx: 0,
      gy: -G,
      maxDt: 1 / 60,
    };
  }

  restart(sceneKey, cell) {
    this.sceneKey = sceneKey;
    this.scene = SCENES[sceneKey];
    const h = cell;
    const { W, H } = this.scene;
    const capacity = Math.ceil(((W * H) / (h * h)) * 3.3);
    this.fluid = new FlipFluid({
      width: W + 2 * h,
      height: H + h,
      h,
      maxParticles: capacity,
    });
    this.data = this.scene.setup(this.fluid) || {};
    this.volume0 = null;
    this.generation++;
  }

  /**
   * Catch up with `wall` seconds of real time, giving up after 45 ms so the
   * thread stays responsive. Falling behind shows on the page as speed < 1.
   */
  simulate(wall) {
    return this.advanceBy(Math.min(wall, 1 / 20), 45);
  }

  /**
   * Smooth playback: exactly `duration` of simulated time, however long it
   * takes. The page plays these back at a steady rate, a few frames behind.
   */
  simulateExact(duration) {
    return this.advanceBy(duration, Infinity);
  }

  advanceBy(target, budgetMs) {
    const o = this.opts();
    const { fluid, scene, data } = this;
    const t0 = performance.now();
    let done = 0;
    let steps = 0;
    while (done < target - 1e-9 && performance.now() - t0 < budgetMs) {
      const dt = fluid.nextDt(target - done, o);
      this.applyDrag(dt);
      if (scene.beforeStep) scene.beforeStep(fluid, dt, data);
      fluid.step(dt, o);
      if (scene.afterStep) scene.afterStep(fluid, dt, data);
      done += dt;
      steps++;
    }
    if (scene.measure) scene.measure(fluid, data);
    // cflDt: the step the CFL rule allows now, for the page to plan with.
    return {
      ms: performance.now() - t0,
      done,
      steps,
      cflDt: fluid.nextDt(Infinity, o),
    };
  }

  applyDrag(dt) {
    const o = this.fluid.obstacle;
    const drag = this.drag;
    this.fluid.dragging = drag.active;
    if (drag.active) {
      // Move toward the pointer at the pointer's own speed, so every
      // sub-step of a frame sees the same motion.
      const cap = 3;
      const vx = Math.max(-cap, Math.min(cap, drag.vx));
      const vy = Math.max(-cap, Math.min(cap, drag.vy));
      const x = o.active ? o.x + vx * dt : drag.x;
      const y = o.active ? o.y + vy * dt : drag.y;
      const close = Math.hypot(drag.x - x, drag.y - y) < 0.02;
      Object.assign(o, {
        active: true,
        x: close ? x : drag.x,
        y: close ? y : drag.y,
        r: 0.05,
        vx,
        vy,
      });
    } else if (this.sceneKey !== "paddle") {
      o.active = false;
    }
  }

  /** Volume per particle against the first reading: drift as a fraction. */
  measureVolume() {
    const f = this.fluid;
    const per = f.seedDx * f.seedDy;
    const ratio = f.volume() / Math.max(f.numParticles * per, 1e-12);
    if (this.volume0 == null) this.volume0 = ratio;
    return ratio / this.volume0 - 1;
  }

  /**
   * What the page draws and reads. `copy` makes fresh arrays that can be
   * transferred out of the worker; otherwise they are the solver's own.
   */
  snapshot(copy) {
    const f = this.fluid;
    const n = f.numParticles;
    const pick = (a, len) => (copy ? a.slice(0, len) : a);
    return {
      generation: this.generation,
      width: f.width,
      height: f.height,
      h: f.h,
      r: f.r,
      seedDx: f.seedDx,
      seedDy: f.seedDy,
      fNumX: f.fNumX,
      fNumY: f.fNumY,
      numParticles: n,
      time: f.time,
      obstacle: { ...f.obstacle },
      pos: pick(f.pos, 2 * n),
      vel: pick(f.vel, 2 * n),
      p: pick(f.p, f.fNumCells),
      cellType: pick(f.cellType, f.fNumCells),
    };
  }
}

if (typeof self !== "undefined") self.LiquidEngine = LiquidEngine;
