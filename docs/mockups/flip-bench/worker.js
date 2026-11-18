/*
 * The solver's own thread, so the page (and Desmos beside it) keeps the main
 * thread. The page sends restart, settings, drag and step messages; each step
 * and restart answers with a snapshot whose arrays are transferred, not
 * copied twice.
 */
"use strict";
importScripts("flip.js", "scenes.js", "engine.js");

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
  }
};

function send(timing, drift, restarted = false) {
  const snap = engine.snapshot(true);
  self.postMessage(
    { type: "frame", snap, data: engine.data, timing, drift, restarted },
    [snap.pos.buffer, snap.vel.buffer, snap.p.buffer, snap.cellType.buffer]
  );
}
