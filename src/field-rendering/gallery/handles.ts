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
  "bar-magnet": [["a", "b"]],
  "ap-conductor": [[`${D}R`, `${D}R`]],
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
