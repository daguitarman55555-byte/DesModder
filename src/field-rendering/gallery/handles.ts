/**
 * Handles on the graph for what a preset's sliders place or size: drag the
 * charge, the plate, the radius, instead of finding its slider.
 *
 * Desmos drags any point whose coordinates it can solve for a slider, and
 * when a coordinate has several, it moves the last one written (measured:
 * `(a, b+0.5d)` moves d, `(a, 0.5d+b)` moves b). So each handle is written
 * with the slider it should move last: the Moon's is `M₁/(M₁+M₂)·d`, which
 * moves the distance, where `dM₁/(M₁+M₂)` moved the Moon's mass. A handle
 * whose other coordinate would drag something unintended is left out; the
 * slider is still there.
 *
 * On the calculator only: Desmos 3D drags no points (the probe there is
 * this plugin's own, see `SceneItem.drag3d`).
 */
import type { SceneItem } from "./types";

const R = String.raw;
/** The diagonal, for a handle on a circle that should sit off both axes. */
const D = "0.7071";

const HANDLES: Readonly<
  Record<string, readonly (readonly [string, string])[]>
> = {
  charges: [
    [R`-\frac{d}{2}`, "0"],
    [R`\frac{d}{2}`, "0"],
  ],
  wires: [
    [R`-\frac{d}{2}`, "0"],
    [R`\frac{d}{2}`, "0"],
  ],
  "earth-moon": [[R`\frac{M_{1}}{M_{1}+M_{2}}d`, "0"]],
  cylinder: [["0", "R"]],
  capacitor: [["L", R`\frac{d}{2}`]],
  "bar-magnet": [["a", "b"]],
  "shell-theorem": [[`${D}R`, `${D}R`]],
  "ap-projectile": [
    ["-6", "-3+h"],
    [R`-6+0.5v_{0x}`, R`-3+h+0.5v_{0y}`],
  ],
  "ap-shm": [["A", "0"]],
  "ap-circular": [["0", "R"]],
  "ap-nozzle": [["0", "H"]],
  "ap-conductor": [[`${D}R`, `${D}R`]],
  "ap-induction": [[`${D}R`, `${D}R`]],
  "ap-motion-graphs": [[R`0.8x_{ini}`, "4.4"]],
  "ap-pendulum-phase": [["5.6", "2.4-L"]],
  "ap-kepler-areas": [[R`a_{orb}\left(1-e_{orb}\right)`, "0"]],
  "ap-ampere-loop": [
    ["X_{a1}", "0"],
    ["X_{a2}", "0"],
    ["C_{ax}", "C_{ay}"],
  ],
};

/** A preset's handles, as scene items, for the calculator. */
export function handlesFor(id: string): SceneItem[] {
  return (HANDLES[id] ?? []).map(([x, y], i) => ({
    key: `handle${i + 1}`,
    latex: R`\left(${x},${y}\right)`,
    points: true,
    pointSize: 11,
    pointOpacity: 0.7,
    color: "#2d70b3",
    explains: true,
  }));
}
