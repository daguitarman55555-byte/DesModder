/**
 * What Desmos 3D will not do for a preset's objects, done over its canvas:
 * names on the arrows, and a probe point that can be dragged.
 *
 * Desmos 3D keeps a point's label in the graph but draws none — checked in a
 * real browser on 2026-10-07, plain text and maths alike — and a point built
 * from sliders cannot be dragged there: the drag turns the view instead. So
 * the names are HTML placed where each point projects, through the camera of
 * the frame Desmos just drew, and a press on the probe is taken before
 * Desmos sees it and moves the probe in the plane facing the viewer, under
 * the cursor.
 */
import type { Calc, Grapher3d } from "#globals";
import { hookIntoFunction } from "#utils/listenerHelpers.ts";
import {
  cameraFromRedrawResult,
  mathToClip,
  projectToScreen,
  readCamera3D,
  type Camera3D,
  type Mat4,
} from "./camera3d";
import { webglCanvasOf } from "./Overlay3D";

type Vec3 = readonly [number, number, number];

export interface SceneName3D {
  /** Desmos LaTeX: a letter, an optional arrow and subscript, `\vec{E}_{1}`. */
  label: string;
  color: string;
  /** Where it is now; undefined while it is not shown. */
  at: () => Vec3 | undefined;
}

export interface SceneProbe3D {
  at: () => Vec3 | undefined;
  /** The probe dragged here. */
  move: (to: Vec3) => void;
}

/** How near the cursor must be to the probe's centre to take hold, in px. */
const GRAB_RADIUS_PX = 16;

export class Scene3DLayer {
  private layer?: HTMLDivElement;
  private unhook?: () => void;
  private camera?: Camera3D;
  private names: readonly SceneName3D[] = [];
  private probe?: SceneProbe3D;
  private frame?: number;
  /** The drag in progress: the plane it moves in, through the probe. */
  private drag?: { pointer: number; normal: Vec3; origin: Vec3 };

  constructor(private readonly calc: Calc) {}

  private get grapher(): Grapher3d | undefined {
    return this.calc.controller.grapher3d;
  }

  /** What to draw and drag; mounts or unmounts to match. */
  set(names: readonly SceneName3D[], probe: SceneProbe3D | undefined) {
    this.names = names;
    this.probe = probe;
    if (names.length === 0 && probe === undefined) this.stop();
    else this.start();
    this.requestDraw();
  }

  requestDraw() {
    if (this.frame !== undefined || this.layer === undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.draw();
    });
  }

  stop() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.unhook?.();
    this.unhook = undefined;
    const parent = this.layer?.parentElement;
    parent?.removeEventListener("pointerdown", this.onPointerDown, true);
    this.layer?.remove();
    this.layer = undefined;
    this.drag = undefined;
  }

  private start() {
    if (this.layer !== undefined) return;
    const canvas = webglCanvasOf(this.grapher);
    const parent = canvas?.parentElement;
    if (canvas == null || parent == null) return;
    const layer = document.createElement("div");
    layer.className = "dsm-vector-tools-scene3d";
    layer.setAttribute("aria-hidden", "true");
    Object.assign(layer.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: "0",
      height: "0",
      pointerEvents: "none",
      zIndex: "3",
    });
    parent.appendChild(layer);
    this.layer = layer;
    // Captured, so a press on the probe never reaches Desmos as a rotation.
    parent.addEventListener("pointerdown", this.onPointerDown, true);
    const { grapher } = this;
    if (grapher !== undefined)
      this.unhook =
        hookIntoFunction(
          grapher,
          "onRedraw3dResults",
          "dsm-vector-tools-scene3d",
          0,
          (_stop, result: unknown) => {
            const camera = cameraFromRedrawResult(result);
            if (camera === undefined) return;
            this.camera = camera;
            this.draw();
          }
        ) ?? undefined;
  }

  private currentCamera() {
    return this.camera ?? readCamera3D(this.grapher);
  }

  private draw() {
    const { layer } = this;
    const camera = this.currentCamera();
    if (layer === undefined || camera === undefined) return;
    const canvas = webglCanvasOf(this.grapher);
    if (canvas != null) {
      // On the canvas's corner, measured on screen: the canvas and the layer
      // need not share an offset parent, and offsetLeft put the names
      // hundreds of pixels off.
      const at = canvas.getBoundingClientRect();
      const origin = (
        layer.offsetParent ?? document.body
      ).getBoundingClientRect();
      layer.style.left = `${at.left - origin.left}px`;
      layer.style.top = `${at.top - origin.top}px`;
    }
    const clip = mathToClip(camera);
    while (layer.childElementCount < this.names.length)
      layer.appendChild(nameElement());
    while (layer.childElementCount > this.names.length)
      layer.lastElementChild!.remove();
    this.names.forEach((name, i) => {
      const element = layer.children[i] as HTMLElement;
      const at = name.at();
      const screen =
        at === undefined
          ? undefined
          : projectToScreen(camera, at[0], at[1], at[2], clip);
      if (screen === undefined || !at!.every(Number.isFinite)) {
        element.style.display = "none";
        return;
      }
      element.style.display = "";
      element.style.transform = `translate(${screen.x}px, ${screen.y}px) translate(-50%, -50%)`;
      element.style.color = name.color;
      if (element.dataset.label !== name.label) {
        element.dataset.label = name.label;
        fillName(element, name.label);
      }
    });
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    const probe = this.probe?.at();
    const camera = this.currentCamera();
    const canvas = webglCanvasOf(this.grapher);
    if (probe === undefined || camera === undefined || canvas == null) return;
    const rect = canvas.getBoundingClientRect();
    const screen = projectToScreen(camera, ...probe);
    if (screen === undefined) return;
    const dx = event.clientX - rect.left - screen.x;
    const dy = event.clientY - rect.top - screen.y;
    if (dx * dx + dy * dy > GRAB_RADIUS_PX * GRAB_RADIUS_PX) return;
    event.stopPropagation();
    event.preventDefault();
    const ray = rayThrough(camera, screen.x, screen.y);
    if (ray === undefined) return;
    this.drag = {
      pointer: event.pointerId,
      normal: ray.direction,
      origin: probe,
    };
    window.addEventListener("pointermove", this.onPointerMove, true);
    window.addEventListener("pointerup", this.onPointerUp, true);
    window.addEventListener("pointercancel", this.onPointerUp, true);
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const { drag } = this;
    const camera = this.currentCamera();
    const canvas = webglCanvasOf(this.grapher);
    if (drag === undefined || event.pointerId !== drag.pointer) return;
    event.stopPropagation();
    event.preventDefault();
    if (camera === undefined || canvas == null) return;
    const rect = canvas.getBoundingClientRect();
    const ray = rayThrough(
      camera,
      event.clientX - rect.left,
      event.clientY - rect.top
    );
    if (ray === undefined) return;
    // Where the ray meets the plane through the probe facing the viewer.
    const { origin, normal } = drag;
    const denom = dot(ray.direction, normal);
    if (Math.abs(denom) < 1e-9) return;
    const s =
      dot(
        [
          origin[0] - ray.from[0],
          origin[1] - ray.from[1],
          origin[2] - ray.from[2],
        ],
        normal
      ) / denom;
    this.probe?.move([
      ray.from[0] + s * ray.direction[0],
      ray.from[1] + s * ray.direction[1],
      ray.from[2] + s * ray.direction[2],
    ]);
  };

  private readonly onPointerUp = (event: PointerEvent) => {
    if (this.drag === undefined || event.pointerId !== this.drag.pointer)
      return;
    event.stopPropagation();
    this.drag = undefined;
    window.removeEventListener("pointermove", this.onPointerMove, true);
    window.removeEventListener("pointerup", this.onPointerUp, true);
    window.removeEventListener("pointercancel", this.onPointerUp, true);
  };
}

function nameElement() {
  const element = document.createElement("span");
  Object.assign(element.style, {
    position: "absolute",
    left: "0",
    top: "0",
    font: "italic 22px 'Times New Roman', serif",
    whiteSpace: "nowrap",
    textShadow: "0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff",
  });
  return element;
}

/**
 * A name as maths, from the little LaTeX the presets use: `\vec{E}_{1}` is
 * E with an arrow over it and a subscript 1. Anything else, as text.
 */
function fillName(element: HTMLElement, latex: string) {
  element.textContent = "";
  const match = /^(\\vec\{)?([A-Za-z])\}?(?:_\{?([A-Za-z0-9]+)\}?)?$/.exec(
    latex
  );
  if (match === null) {
    element.textContent = latex;
    return;
  }
  const [, vec, letter, sub] = match;
  const base = document.createElement("span");
  base.textContent = letter;
  if (vec !== undefined) {
    base.style.position = "relative";
    base.style.display = "inline-block";
    const arrow = document.createElement("span");
    arrow.textContent = "→";
    Object.assign(arrow.style, {
      position: "absolute",
      left: "50%",
      top: "-0.55em",
      transform: "translateX(-50%)",
      fontStyle: "normal",
      fontSize: "0.7em",
    });
    base.appendChild(arrow);
  }
  element.appendChild(base);
  if (sub !== undefined) {
    const s = document.createElement("sub");
    s.textContent = sub;
    s.style.fontStyle = "normal";
    s.style.fontSize = "0.65em";
    element.appendChild(s);
  }
}

/**
 * The line of math points under a pixel of the canvas: from the near plane
 * toward the far, through the inverse of the camera's whole transform.
 */
function rayThrough(camera: Camera3D, px: number, py: number) {
  const inverse = invert(mathToClip(camera));
  if (inverse === undefined) return undefined;
  const ndcX = (px / camera.width) * 2 - 1;
  const ndcY = 1 - (py / camera.height) * 2;
  const near = unproject(inverse, ndcX, ndcY, -1);
  const far = unproject(inverse, ndcX, ndcY, 1);
  if (near === undefined || far === undefined) return undefined;
  const d: Vec3 = [far[0] - near[0], far[1] - near[1], far[2] - near[2]];
  const length = Math.hypot(...d);
  if (!(length > 0)) return undefined;
  return {
    from: near,
    direction: [d[0] / length, d[1] / length, d[2] / length] as Vec3,
  };
}

function unproject(m: Mat4, x: number, y: number, z: number) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (w === 0) return undefined;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ] as Vec3;
}

function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** A column-major 4×4 matrix's inverse, or undefined if it has none. */
export function invert(m: Mat4): number[] | undefined {
  const inv = new Array<number>(16);
  inv[0] =
    m[5] * m[10] * m[15] -
    m[5] * m[11] * m[14] -
    m[9] * m[6] * m[15] +
    m[9] * m[7] * m[14] +
    m[13] * m[6] * m[11] -
    m[13] * m[7] * m[10];
  inv[4] =
    -m[4] * m[10] * m[15] +
    m[4] * m[11] * m[14] +
    m[8] * m[6] * m[15] -
    m[8] * m[7] * m[14] -
    m[12] * m[6] * m[11] +
    m[12] * m[7] * m[10];
  inv[8] =
    m[4] * m[9] * m[15] -
    m[4] * m[11] * m[13] -
    m[8] * m[5] * m[15] +
    m[8] * m[7] * m[13] +
    m[12] * m[5] * m[11] -
    m[12] * m[7] * m[9];
  inv[12] =
    -m[4] * m[9] * m[14] +
    m[4] * m[10] * m[13] +
    m[8] * m[5] * m[14] -
    m[8] * m[6] * m[13] -
    m[12] * m[5] * m[10] +
    m[12] * m[6] * m[9];
  inv[1] =
    -m[1] * m[10] * m[15] +
    m[1] * m[11] * m[14] +
    m[9] * m[2] * m[15] -
    m[9] * m[3] * m[14] -
    m[13] * m[2] * m[11] +
    m[13] * m[3] * m[10];
  inv[5] =
    m[0] * m[10] * m[15] -
    m[0] * m[11] * m[14] -
    m[8] * m[2] * m[15] +
    m[8] * m[3] * m[14] +
    m[12] * m[2] * m[11] -
    m[12] * m[3] * m[10];
  inv[9] =
    -m[0] * m[9] * m[15] +
    m[0] * m[11] * m[13] +
    m[8] * m[1] * m[15] -
    m[8] * m[3] * m[13] -
    m[12] * m[1] * m[11] +
    m[12] * m[3] * m[9];
  inv[13] =
    m[0] * m[9] * m[14] -
    m[0] * m[10] * m[13] -
    m[8] * m[1] * m[14] +
    m[8] * m[2] * m[13] +
    m[12] * m[1] * m[10] -
    m[12] * m[2] * m[9];
  inv[2] =
    m[1] * m[6] * m[15] -
    m[1] * m[7] * m[14] -
    m[5] * m[2] * m[15] +
    m[5] * m[3] * m[14] +
    m[13] * m[2] * m[7] -
    m[13] * m[3] * m[6];
  inv[6] =
    -m[0] * m[6] * m[15] +
    m[0] * m[7] * m[14] +
    m[4] * m[2] * m[15] -
    m[4] * m[3] * m[14] -
    m[12] * m[2] * m[7] +
    m[12] * m[3] * m[6];
  inv[10] =
    m[0] * m[5] * m[15] -
    m[0] * m[7] * m[13] -
    m[4] * m[1] * m[15] +
    m[4] * m[3] * m[13] +
    m[12] * m[1] * m[7] -
    m[12] * m[3] * m[5];
  inv[14] =
    -m[0] * m[5] * m[14] +
    m[0] * m[6] * m[13] +
    m[4] * m[1] * m[14] -
    m[4] * m[2] * m[13] -
    m[12] * m[1] * m[6] +
    m[12] * m[2] * m[5];
  inv[3] =
    -m[1] * m[6] * m[11] +
    m[1] * m[7] * m[10] +
    m[5] * m[2] * m[11] -
    m[5] * m[3] * m[10] -
    m[9] * m[2] * m[7] +
    m[9] * m[3] * m[6];
  inv[7] =
    m[0] * m[6] * m[11] -
    m[0] * m[7] * m[10] -
    m[4] * m[2] * m[11] +
    m[4] * m[3] * m[10] +
    m[8] * m[2] * m[7] -
    m[8] * m[3] * m[6];
  inv[11] =
    -m[0] * m[5] * m[11] +
    m[0] * m[7] * m[9] +
    m[4] * m[1] * m[11] -
    m[4] * m[3] * m[9] -
    m[8] * m[1] * m[7] +
    m[8] * m[3] * m[5];
  inv[15] =
    m[0] * m[5] * m[10] -
    m[0] * m[6] * m[9] -
    m[4] * m[1] * m[10] +
    m[4] * m[2] * m[9] +
    m[8] * m[1] * m[6] -
    m[8] * m[2] * m[5];
  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  if (det === 0 || !Number.isFinite(det)) return undefined;
  return inv.map((v) => v / det);
}
