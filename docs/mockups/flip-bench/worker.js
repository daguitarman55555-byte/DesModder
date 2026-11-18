/*
 * The solver's own thread, so the page (and Desmos beside it) keeps the main
 * thread. The page sends restart, settings, drag, step (real time: catch up
 * with the clock) and exact (smooth playback: a fixed slice of simulated
 * time) messages; each step, exact and restart answers with a snapshot whose
 * arrays are transferred, not copied twice.
 */
"use strict";
importScripts("flip.js", "gpu-flip.js", "scenes.js", "engine.js");

const engine = new LiquidEngine();

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === "restart") {
    engine.settings = m.settings;
    engine.restart(m.scene, m.cell);
    send({ ms: 0, done: 0, steps: 0 }, engine.measureVolume(), true);
  } else if (m.type === "settings") {
    engine.settings = m.settings;
  } else if (m.type === "drag") {
    engine.drag = m.drag;
  } else if (m.type === "step") {
    const timing = engine.simulate(m.wall);
    send(timing, m.measureVolume ? engine.measureVolume() : undefined);
  } else if (m.type === "exact") {
    const timing = engine.simulateExact(m.duration);
    send(
      timing,
      m.measureVolume ? engine.measureVolume() : undefined,
      false,
      "exact"
    );
  }
};

function send(timing, drift, restarted = false, kind = "step") {
  const t0 = performance.now();
  const snap = engine.snapshot(true);
  timing.snapMs = performance.now() - t0;
  self.postMessage(
    { type: "frame", kind, snap, data: engine.data, timing, drift, restarted },
    [snap.pos.buffer, snap.vel.buffer, snap.p.buffer, snap.cellType.buffer]
  );
}
