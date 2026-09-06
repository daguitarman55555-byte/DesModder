/**
 * Owns the canvas the live arrows are drawn on, and keeps it over the graph.
 *
 * A sibling of `FlowOverlay` rather than part of it. They want opposite things
 * from a frame: the flow advects particles sixty times a second and needs its
 * previous frame to fade from, while the arrows are a still picture that only
 * has to be redrawn when the view, the field or a setting changes. Sharing one
 * renderer would mean the arrows paying an animation loop's costs to sit still.
 *
 * Its own canvas, and so its own WebGL context, for the same reason: the two
 * are independently switchable, and neither should have to exist for the other
 * to work.
 */
import { FlowRendererError } from "./FlowRenderer";
import type { FlowBounds, FlowField } from "./FlowRenderer";
import { ArrowRenderer, type ArrowOptions } from "./ArrowRenderer";
import type { Calc } from "#globals";

const CANVAS_ID = "dsm-vector-tools-arrow-canvas";
const GRAPH_CANVAS_SELECTOR = "canvas.dcg-graph-inner";
const BOUNDS_OBSERVER_KEY = "graphpaperBounds.dsm-vector-tools-arrows";

export interface ArrowOverlayCallbacks {
  onError: (message: string) => void;
}

export class ArrowOverlay {
  private canvas?: HTMLCanvasElement;
  private renderer?: ArrowRenderer;
  private frame?: number;
  private resizeObserver?: ResizeObserver;
  private visibilityObserver?: IntersectionObserver;
  private unobserveBounds?: () => void;
  private onScreen = true;

  constructor(
    private readonly calc: Calc,
    private readonly callbacks: ArrowOverlayCallbacks
  ) {}

  get isRunning() {
    return this.renderer !== undefined;
  }

  get arrowCount() {
    return this.renderer?.arrowCount ?? 0;
  }

  /** Tests only: the range and box the last frame coloured against. */
  get drawnRange() {
    return this.renderer?.lastRange;
  }

  /** What the last frame drew into, and what the canvas expected. */
  get drawnViewport() {
    if (this.renderer === undefined || this.canvas === undefined)
      return undefined;
    return {
      drawn: this.renderer.lastViewport,
      canvas: { width: this.canvas.width, height: this.canvas.height },
    };
  }

  /** Starts the overlay, or swaps the field and settings if already running. */
  start(field: FlowField, options: ArrowOptions) {
    try {
      if (this.renderer === undefined) this.mount();
      this.renderer!.setOptions(options);
      this.renderer!.setField(field);
      this.requestFrame();
    } catch (error) {
      this.stop();
      this.callbacks.onError(
        error instanceof FlowRendererError
          ? error.message
          : "The arrows could not be drawn."
      );
    }
  }

  setOptions(options: ArrowOptions) {
    if (this.renderer === undefined) return;
    this.renderer.setOptions(options);
    this.requestFrame();
  }

  stop() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
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
    // After the graph paper, and after the flow canvas if one is already there,
    // so arrows read on top of the particles rather than under them.
    parent.append(canvas);
    this.canvas = canvas;
    this.renderer = new ArrowRenderer(canvas);
    this.resizeToBox();

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeToBox();
      this.requestFrame();
    });
    this.resizeObserver.observe(parent);

    this.visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        const wasOffScreen = !this.onScreen;
        this.onScreen = entry?.isIntersecting ?? true;
        // Coming back into view means the canvas may have been resized while
        // nothing was drawing it, so it needs the frame it skipped.
        if (wasOffScreen && this.onScreen) this.requestFrame();
      },
      { threshold: 0 }
    );
    this.visibilityObserver.observe(canvas);

    this.calc.observe(BOUNDS_OBSERVER_KEY, () => this.requestFrame());
    this.unobserveBounds = () => this.calc.unobserve(BOUNDS_OBSERVER_KEY);
  }

  private resizeToBox() {
    if (this.canvas === undefined || this.renderer === undefined) return;
    const rect = this.canvas.getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
  }

  private syncBounds() {
    if (this.renderer === undefined) return;
    const math = this.calc.graphpaperBounds.mathCoordinates;
    const bounds: FlowBounds = {
      xMin: math.left,
      xMax: math.right,
      yMin: math.bottom,
      yMax: math.top,
    };
    this.renderer.setBounds(bounds);
  }

  /**
   * Draws once on the next frame.
   *
   * Arrows do not animate, so this coalesces a burst of changes — a drag across
   * the graph paper reports bounds on every pointermove — into one redraw
   * rather than starting a loop that would keep running once the drag stopped.
   */
  private requestFrame() {
    if (this.frame !== undefined || this.renderer === undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      if (this.renderer === undefined || !this.onScreen) return;
      try {
        this.resizeToBox();
        // Read the bounds now rather than trusting what the observer last
        // reported. Desmos adjusts what it was asked for to keep the pixels
        // square, and the corrected value does not always arrive as another
        // observation — so a cached copy can be a view the graph never had,
        // which draws the field offset from the paper under it.
        this.syncBounds();
        this.renderer.frame();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "The arrows stopped.";
        this.stop();
        this.callbacks.onError(message);
      }
    });
  }
}
