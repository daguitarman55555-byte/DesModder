/**
 * Owns the canvas that the flow visualizer draws into, and keeps it registered
 * with the Desmos graph paper underneath it.
 *
 * The canvas is inserted immediately after Desmos's own graph canvas, so
 * Desmos's label and interaction layers still sit on top, and it never accepts
 * pointer events — panning, zooming, and clicking expressions behave exactly as
 * they do without the overlay.
 */
import {
  DEFAULT_FLOW_OPTIONS,
  FlowRenderer,
  FlowRendererError,
  type FlowBounds,
  type FlowField,
  type FlowOptions,
} from "./FlowRenderer";
import type { Calc } from "#globals";

const CANVAS_ID = "dsm-vector-tools-flow-canvas";
const GRAPH_CANVAS_SELECTOR = "canvas.dcg-graph-inner";
const BOUNDS_OBSERVER_KEY = "graphpaperBounds.dsm-vector-tools";

export interface FlowOverlayCallbacks {
  onError: (message: string) => void;
}

export class FlowOverlay {
  private canvas?: HTMLCanvasElement;
  private renderer?: FlowRenderer;
  private animationFrame?: number;
  private resizeObserver?: ResizeObserver;
  private visibilityObserver?: IntersectionObserver;
  private unobserveBounds?: () => void;
  private options: FlowOptions = { ...DEFAULT_FLOW_OPTIONS };
  private lastBounds?: FlowBounds;
  /** Whether any of the canvas is on screen. Off screen, frames are skipped. */
  private onScreen = true;

  constructor(
    private readonly calc: Calc,
    private readonly callbacks: FlowOverlayCallbacks
  ) {}

  get isRunning() {
    return this.renderer !== undefined;
  }

  /**
   * Starts the overlay, or swaps the field if it is already running. Reports
   * failures through `onError` instead of throwing, because every caller is a
   * UI event handler.
   */
  start(field: FlowField, options: FlowOptions) {
    this.options = { ...options };
    try {
      if (this.renderer === undefined) this.mount();
      this.renderer!.setOptions(this.options);
      this.renderer!.setField(field);
      this.syncBounds(true);
      this.scheduleFrame();
    } catch (error) {
      this.stop();
      this.callbacks.onError(
        error instanceof FlowRendererError
          ? error.message
          : "The flow visualizer could not start."
      );
    }
  }

  setOptions(options: FlowOptions) {
    const scaleChanged = options.renderScale !== this.options.renderScale;
    this.options = { ...options };
    this.renderer?.setOptions(this.options);
    // Render scale is the one option that changes the size of the drawing
    // buffer, and nothing else will notice on its own — no element resized.
    if (scaleChanged) this.resizeToBox();
  }

  stop() {
    if (this.animationFrame !== undefined) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = undefined;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;
    this.visibilityObserver?.disconnect();
    this.visibilityObserver = undefined;
    this.onScreen = true;
    this.unobserveBounds?.();
    this.unobserveBounds = undefined;
    this.renderer?.destroy();
    this.renderer = undefined;
    this.canvas?.remove();
    this.canvas = undefined;
    this.lastBounds = undefined;
  }

  private mount() {
    const graphCanvas = document.querySelector(GRAPH_CANVAS_SELECTOR);
    const parent = graphCanvas?.parentElement;
    if (graphCanvas == null || parent == null) {
      throw new FlowRendererError(
        "Could not find the Desmos graph paper to draw on."
      );
    }
    document.getElementById(CANVAS_ID)?.remove();

    const canvas = document.createElement("canvas");
    canvas.id = CANVAS_ID;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    parent.insertBefore(canvas, graphCanvas.nextSibling);
    this.canvas = canvas;

    this.renderer = new FlowRenderer(canvas);
    this.resizeToBox();

    this.resizeObserver = new ResizeObserver(() => this.resizeToBox());
    this.resizeObserver.observe(parent);

    // requestAnimationFrame already stops for a hidden tab, but not for a graph
    // that has been scrolled out of view in an article or a notebook, which is
    // a whole GPU's worth of work nobody can see.
    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        this.onScreen = entry?.isIntersecting ?? true;
      },
      { threshold: 0 }
    );
    this.visibilityObserver.observe(canvas);

    // Desmos reports pan/zoom through this observable; the trail texture is in
    // screen space, so it has to be dropped whenever the mapping changes. The
    // key is namespaced so unobserving cannot detach another plugin's handler.
    this.calc.observe(BOUNDS_OBSERVER_KEY, () => this.syncBounds(false));
    this.unobserveBounds = () => this.calc.unobserve(BOUNDS_OBSERVER_KEY);
  }

  private resizeToBox() {
    if (this.canvas === undefined || this.renderer === undefined) return;
    const rect = this.canvas.getBoundingClientRect();
    const changed = this.renderer.resize(
      rect.width,
      rect.height,
      (window.devicePixelRatio || 1) * this.options.renderScale
    );
    if (changed) this.renderer.clearTrails();
  }

  private syncBounds(force: boolean) {
    if (this.renderer === undefined) return;
    const math = this.calc.graphpaperBounds.mathCoordinates;
    const bounds: FlowBounds = {
      xMin: math.left,
      xMax: math.right,
      yMin: math.bottom,
      yMax: math.top,
    };
    if (
      !force &&
      this.lastBounds !== undefined &&
      boundsAreEqual(this.lastBounds, bounds)
    ) {
      return;
    }
    this.lastBounds = bounds;
    // A forced sync is a fresh start, where there is nothing worth carrying
    // over. Every other one is a pan or zoom, and the trails move with it.
    if (force) this.renderer.resetBounds(bounds);
    else this.renderer.setBounds(bounds);
  }

  private scheduleFrame() {
    if (this.animationFrame !== undefined) return;
    const step = () => {
      this.animationFrame = undefined;
      if (this.renderer === undefined) return;
      try {
        if (this.onScreen) this.renderer.frame();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The flow visualizer stopped.";
        this.stop();
        this.callbacks.onError(message);
        return;
      }
      this.animationFrame = requestAnimationFrame(step);
    };
    this.animationFrame = requestAnimationFrame(step);
  }
}

function boundsAreEqual(a: FlowBounds, b: FlowBounds) {
  return (
    a.xMin === b.xMin &&
    a.xMax === b.xMax &&
    a.yMin === b.yMin &&
    a.yMax === b.yMax
  );
}
