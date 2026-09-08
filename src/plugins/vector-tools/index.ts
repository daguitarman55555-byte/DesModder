import { PluginController } from "../PluginController";
import { VectorToolsPanelFunc } from "./components/VectorToolsPanel";
import {
  CalculatorExpressionAdapter,
  type GeneratedItemSnapshot,
} from "./desmos/ExpressionAdapter";
import {
  configForPreset,
  DENSITY_PRESETS,
  flowColorModeFor,
  isDevelopmentBuild,
  getAxisSampleCount,
  thinArrowGrid,
  normalizeVectorFieldConfig,
  type ColorPalette,
  type ColorRangeMode,
  type DensityPreset,
  type FieldSource,
  type ArrowMode,
  type FlowConfig,
  type FlowLook,
  FLOW_LOOK_PRESETS,
  type PanelTab,
  type SamplingAxisConfig,
  type SamplingMode,
  type VectorColorMode,
  type VectorFieldConfig,
  type VectorFieldPreset,
  type VectorLengthMode,
  type ZeroVectorMode,
  VECTOR_FIELD_PRESETS,
  cloneDefaultConfig,
  validateVectorFieldConfig,
} from "./model";
import {
  auditVectorFieldPlan,
  componentExpressionID,
  componentFunctionLatex,
  createVectorFieldPlan,
  editableSlots,
  parseComponentFromLatex,
  setSlotBody,
  slotBody,
  type ComponentSlot,
  type ExpressionAudit,
  type VectorFieldPlan,
} from "./generator";
import { differentiate, identifiersIn, toLatex } from "./symbolic";
import { buildConfigFromGlobals, parseLatex } from "../../../text-mode-core";
import { FlowOverlay } from "./flow/FlowOverlay";
import { ArrowOverlay } from "./flow/ArrowOverlay";
import type { ArrowOptions } from "./flow/ArrowRenderer";
import { compileFieldComponentToGLSL } from "./flow/latexToGLSL";
import type { FlowField } from "./flow/FlowRenderer";
import type { ConfigItem } from "..";

export { TEST_FOLDER_ID, TEST_LINE_ID, TEST_NAMESPACE } from "./ids";

interface VectorToolsSettings {
  serializedFieldConfig: string;
}

type GenerationTarget = "production" | "test";
type TestChecklistID = "visual" | "zero" | "colors" | "responsiveness";

/** The compiled shader field, or the reason it could not be put on the GPU. */
type FlowCompilation =
  | { ok: true; field: FlowField }
  | { ok: false; error: string };

const FLOW_REFRESH_DELAY_MS = 300;
const PANEL_SIZE_SAVE_DELAY_MS = 400;
const POPOVER_CLASS = "dsm-vector-tools-popover";

/**
 * Graph bounds carry a pan's worth of noise digits, and the panel's number
 * fields show them all. Three decimals is finer than anyone samples on.
 */
function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function compileFlowField(config: VectorFieldConfig): FlowCompilation {
  if (config.source === "gradient") {
    const f = compileFieldComponentToGLSL(config.scalar.fLatex);
    if (!f.ok) return { ok: false, error: `f(x, y): ${f.error}` };
    return { ok: true, field: { kind: "gradient", f: f.glsl } };
  }
  const p = compileFieldComponentToGLSL(config.components.xLatex);
  if (!p.ok) return { ok: false, error: `P(x, y): ${p.error}` };
  const q = compileFieldComponentToGLSL(config.components.yLatex);
  if (!q.ok) return { ok: false, error: `Q(x, y): ${q.error}` };
  return { ok: true, field: { kind: "components", p: p.glsl, q: q.glsl } };
}

const TEST_CHECKLIST: readonly {
  id: TestChecklistID;
  label: string;
}[] = [
  { id: "visual", label: "Arrow directions match the selected preset." },
  {
    id: "zero",
    label: "Zero vectors follow the selected hide/point behavior.",
  },
  { id: "colors", label: "Arrow colors follow the chosen color mode." },
  {
    id: "responsiveness",
    label: "The graph remains responsive at this density.",
  },
];

export default class VectorTools extends PluginController<VectorToolsSettings> {
  static id = "vector-tools" as const;
  static enabledByDefault = false;
  static config = [
    {
      type: "string",
      variant: "text",
      default: JSON.stringify(cloneDefaultConfig()),
      key: "serializedFieldConfig",
      shouldShow: () => false,
    },
  ] satisfies readonly ConfigItem[];

  private readonly expressions = new CalculatorExpressionAdapter(this.calc);
  private pendingGeneration: GenerationTarget | undefined;
  private lastActionMessage =
    "Configure a field, then generate it into Desmos.";
  private testPresetID: VectorFieldPreset["id"] = "rotational";
  private testDensityID: DensityPreset["id"] = "small";
  private testLengthMode: VectorLengthMode = "normalized";
  private testColorMode: VectorColorMode = "magnitude";
  private readonly completedChecklist = new Set<TestChecklistID>();
  private readonly flowOverlay = new FlowOverlay(this.calc, {
    onError: (message) => {
      this.flowMessage = message;
      this.util.tick();
    },
    onRecovered: () => {
      this.flowMessage = "";
      this.util.tick();
    },
  });
  private readonly arrowOverlay = new ArrowOverlay(this.calc, {
    onError: (message) => {
      this.arrowMessage = message;
      this.util.tick();
    },
    onRecovered: () => {
      this.arrowMessage = "";
      this.util.tick();
    },
  });
  private arrowMessage = "";
  private flowMessage = "";
  private flowRefreshTimer?: ReturnType<typeof setTimeout>;
  private flowCompilationCache?: { key: string; result: FlowCompilation };
  /**
   * `getConfig` is read many times while the panel renders, and each read has
   * to parse the persisted JSON. Cache it against the raw string so a render
   * pass costs one parse rather than dozens.
   */
  private configCache?: { serialized: string; config: VectorFieldConfig };
  private dispatcherID?: string;
  private panelElement?: HTMLElement;
  private panelResizeObserver?: ResizeObserver;
  private panelSizeTimer?: ReturnType<typeof setTimeout>;
  private componentLinkNote = "";

  afterEnable() {
    this.ensureStoredConfigIsCurrent();
    this.refreshArrows();
    this.dsm.pillboxMenus?.addPillboxButton({
      id: "dsm-vector-tools-menu",
      tooltip: "vector-tools-name",
      iconClass: "dsm-icon-compass2",
      popup: () => VectorToolsPanelFunc(this),
    });
    // Components live in the expression list once the field is generated, so
    // an edit there has to flow back into the panel and the visualizer.
    this.dispatcherID = this.cc.dispatcher.register((event) => {
      if (
        event.type === "set-item-latex" ||
        event.type === "undo" ||
        event.type === "redo" ||
        event.type === "set-state"
      ) {
        this.syncComponentsFromExpressions();
      }
    });
  }

  get arrowMode() {
    return this.getConfig().arrowMode;
  }

  get arrowStatus() {
    if (this.arrowMode === "off") return "Arrows are off.";
    if (this.arrowMode !== "live") return "";
    if (this.arrowMessage !== "") return this.arrowMessage;
    if (!this.arrowOverlay.isRunning) return "";
    const grid = this.arrowGrid;
    if (grid.thinned) {
      return `Drawing ${this.arrowOverlay.arrowCount} of ${grid.requested} arrows live — sampled coarsely to stay readable. Turn off the density limit to draw all of them.`;
    }
    return `Drawing ${this.arrowOverlay.arrowCount} arrows live.`;
  }

  /** Tests only: what the last live-arrow frame actually drew into. */
  get arrowViewport() {
    return this.arrowOverlay.drawnViewport;
  }

  setArrowDensityLimit(limit: boolean) {
    this.updateConfig((config) => {
      config.arrowDensityLimit = limit;
    });
  }

  setArrowMode(mode: ArrowMode) {
    this.updateConfig((config) => {
      config.arrowMode = mode;
    });
  }

  /**
   * Starts, updates or stops the live arrows to match the configuration.
   *
   * Cheap enough to call on every change: the overlay only relinks a shader
   * when the field itself changed, and a settings-only change is a uniform
   * upload and one frame.
   */
  refreshArrows() {
    if (this.arrowMode !== "live") {
      if (this.arrowOverlay.isRunning) {
        this.arrowOverlay.stop();
        this.arrowMessage = "";
      }
      return;
    }
    const compiled = this.flowAvailability;
    if (!compiled.ok) {
      this.arrowOverlay.stop();
      this.arrowMessage = compiled.error;
      return;
    }
    this.arrowMessage = "";
    this.arrowOverlay.start(compiled.field, this.arrowOptions);
  }

  /**
   * The grid the live arrows are drawn on.
   *
   * Thinned only if the user has left the density limit on. With it off the
   * grid is whatever the sampling domain asks for, however many that is.
   */
  private get arrowGrid() {
    const config = this.getConfig();
    const columns = getAxisSampleCount(config.domain.x);
    const rows = getAxisSampleCount(config.domain.y);
    if (!config.arrowDensityLimit) {
      return { columns, rows, thinned: false, requested: columns * rows };
    }
    return thinArrowGrid(columns, rows);
  }

  private get arrowOptions(): ArrowOptions {
    const config = this.getConfig();
    const grid = this.arrowGrid;
    // The same rule the generator uses, over the spacing actually drawn: a
    // thinned grid is a coarser one, and its arrows have to grow to match or
    // they end up shorter than a pixel and disappear.
    const spacing = Math.min(
      Math.abs(config.domain.x.max - config.domain.x.min) /
        Math.max(1, grid.columns - 1),
      Math.abs(config.domain.y.max - config.domain.y.min) /
        Math.max(1, grid.rows - 1)
    );
    return {
      columns: grid.columns,
      rows: grid.rows,
      domain: {
        xMin: config.domain.x.min,
        xMax: config.domain.x.max,
        yMin: config.domain.y.min,
        yMax: config.domain.y.max,
      },
      lengthMode: config.length.mode,
      targetLength: config.length.autoLength
        ? 0.7 * spacing
        : config.length.targetLength,
      scale: config.length.scale,
      maximumLength: config.length.maximumLength,
      compression: config.length.compression,
      headSize: config.arrowhead.size,
      headAngle: config.arrowhead.angleRadians,
      shaftWidth: 2.4,
      colorMode: config.color.mode,
      palette: config.color.palette,
      fixedColor: config.color.fixedColor,
      opacity: 1,
      rangeMode: config.color.rangeMode,
      rangeMinimum: config.color.minimum,
      rangeMaximum: config.color.maximum,
    };
  }

  afterDisable() {
    if (this.flowRefreshTimer !== undefined)
      clearTimeout(this.flowRefreshTimer);
    if (this.panelSizeTimer !== undefined) clearTimeout(this.panelSizeTimer);
    if (this.dispatcherID !== undefined)
      this.cc.dispatcher.unregister(this.dispatcherID);
    this.dispatcherID = undefined;
    this.detachPanelElement();
    this.arrowOverlay.stop();
    this.flowOverlay.stop();
    this.dsm.pillboxMenus?.removePillboxButton("dsm-vector-tools-menu");
  }

  afterConfigChange() {
    if (this.flowOverlay.isRunning)
      this.flowOverlay.setOptions(this.flowOptions);
    // Written settings only reach `this.settings` by the time this runs, so
    // this is where the arrows can read what they have to follow. Every path
    // that changes the field arrives here, `resetConfig` included.
    this.refreshArrows();
    this.util.tick();
  }

  isFocused(id: ComponentSlot) {
    const focused = this.cc.getFocusLocation();
    return (
      focused?.type === "dsm-focus" &&
      focused.plugin === "vector-tools" &&
      focused.kind === id
    );
  }

  getConfig(): VectorFieldConfig {
    const serialized = this.settings.serializedFieldConfig;
    if (this.configCache?.serialized === serialized) {
      return this.configCache.config;
    }
    let config: VectorFieldConfig;
    try {
      config = normalizeVectorFieldConfig(JSON.parse(serialized));
    } catch {
      config = cloneDefaultConfig();
    }
    this.configCache = { serialized, config };
    return config;
  }

  updateConfig(update: (config: VectorFieldConfig) => void) {
    // Copy first: `getConfig` hands back a cached object shared with the panel.
    const next = normalizeVectorFieldConfig(
      JSON.parse(JSON.stringify(this.getConfig()))
    );
    update(next);
    this.saveConfig(next);
  }

  resetConfig() {
    const next = cloneDefaultConfig();
    // Panel size and the open tab are chrome, not field settings. Resetting the
    // field should not also resize the panel or throw the user to another tab.
    next.panel = { ...this.getConfig().panel };
    this.saveConfig(next);
    this.lastActionMessage = "Restored the default rotational field settings.";
  }

  /** The definitions the user types into for the current source. */
  get editableSlots() {
    return editableSlots(this.getConfig());
  }

  slotLatex(slot: ComponentSlot) {
    return slotBody(this.getConfig(), slot);
  }

  setSlot(slot: ComponentSlot, latex: string) {
    const config = this.getConfig();
    if (slotBody(config, slot) === latex) return;
    this.updateConfig((next) => {
      setSlotBody(next, slot, latex);
    });
    // Keep the expression-list copy in step, so the arrows already on the graph
    // follow the panel without a full regeneration.
    this.writeComponentExpression(slot);
    // In gradient mode P and Q are derived from f, so they have to be rewritten
    // too or the graph keeps the old gradient.
    if (slot === "f") {
      this.writeComponentExpression("p");
      this.writeComponentExpression("q");
    }
    this.refreshFlow();
  }

  setSource(source: FieldSource) {
    if (this.getConfig().source === source) return;
    this.updateConfig((config) => {
      config.source = source;
    });
    // The definitions in the list belong to the old source; rewrite whichever
    // of them still exist so the graph matches the panel.
    for (const slot of ["p", "q"] as const) this.writeComponentExpression(slot);
    this.componentLinkNote = "";
    this.refreshFlow();
  }

  // ---- components in the expression list ---------------------------------

  get hasComponentExpressions() {
    const config = this.getConfig();
    return editableSlots(config).every(
      (slot) =>
        this.cc.getItemModel(componentExpressionID(config, slot))?.type ===
        "expression"
    );
  }

  get componentLinkStatus() {
    if (this.componentLinkNote !== "") return this.componentLinkNote;
    const gradient = this.getConfig().source === "gradient";
    const subject = gradient ? "f is" : "P and Q are";
    const object = gradient ? "f" : "P and Q";
    return this.hasComponentExpressions
      ? `${subject} live in the expression list — edit in either place.`
      : `Put ${object} in the expression list to edit with the full math editor.`;
  }

  /**
   * Write the editable definitions into the expression list (creating the
   * field's folder if needed) and scroll to them.
   */
  addComponentExpressions() {
    const config = this.getConfig();
    const slots = editableSlots(config);
    try {
      if (!this.hasComponentExpressions) {
        const plan = createVectorFieldPlan(config);
        const componentIDs = new Set(
          slots.map((slot) => componentExpressionID(config, slot))
        );
        const existing = new Set(
          this.expressions
            .getGeneratedItems(plan.namespace)
            .map((item) => item.id)
        );
        // Only the folder and the editable definitions: pressing this must not
        // conjure a whole field the user did not ask to generate.
        const wanted = plan.expressions.filter(
          (expression) =>
            componentIDs.has(expression.id) || existing.has(expression.id)
        );
        this.expressions.applyGeneratedSet(plan.namespace, plan.folder, wanted);
      }
      this.componentLinkNote = "";
      this.scrollToComponent(slots[0]);
    } catch (error) {
      this.componentLinkNote = `Could not add the definitions: ${
        error instanceof Error ? error.message : "unknown error"
      }`;
    }
    this.util.tick();
  }

  private scrollToComponent(slot: ComponentSlot) {
    const id = componentExpressionID(this.getConfig(), slot);
    if (this.cc.getItemModel(id)?.type !== "expression") return;
    this.cc.dispatch({ type: "set-selected-id", id });
  }

  private writeComponentExpression(slot: ComponentSlot) {
    const config = this.getConfig();
    const id = componentExpressionID(config, slot);
    if (this.cc.getItemModel(id)?.type !== "expression") return;
    // setExpression merges into an existing expression, so folderId and
    // colorLatex on the rest of the field are untouched.
    this.calc.setExpression({
      id,
      latex: componentFunctionLatex(config, slot),
    });
  }

  /**
   * Adopt component edits made directly in the expression list. Runs on every
   * latex change in the graph, so it exits early unless something differs.
   */
  private syncComponentsFromExpressions() {
    const config = this.getConfig();
    let changed = false;
    let detached = false;
    const adopted = new Map<ComponentSlot, string>();
    // Only the editable slots are read back. In gradient mode P and Q are
    // derived from f, so adopting an edit there would overwrite the derivative
    // the generator owns with whatever it had been changed into.
    for (const slot of editableSlots(config)) {
      const id = componentExpressionID(config, slot);
      const model = this.cc.getItemModel(id);
      if (model?.type !== "expression") continue;
      const body = parseComponentFromLatex(config, slot, model.latex);
      if (body === undefined) {
        detached = true;
        continue;
      }
      if (slotBody(config, slot) !== body) {
        adopted.set(slot, body);
        changed = true;
      }
    }
    const note = detached
      ? "One definition no longer matches this field's function name, so it is not being read."
      : "";
    if (note !== this.componentLinkNote) {
      this.componentLinkNote = note;
      this.util.tick();
    }
    if (!changed) return;
    this.updateConfig((target) => {
      for (const [slot, body] of adopted) setSlotBody(target, slot, body);
    });
    // An adopted f changes the gradient, so the derived definitions on the
    // graph have to follow it.
    if (adopted.has("f")) {
      this.writeComponentExpression("p");
      this.writeComponentExpression("q");
    }
    this.refreshFlow();
  }

  // ---- panel chrome ------------------------------------------------------

  setPanelTab(tab: PanelTab) {
    this.updateConfig((config) => {
      config.panel.tab = tab;
    });
  }

  attachPanelElement(element: HTMLElement) {
    this.detachPanelElement();
    this.panelElement = element;
    // Pillbox popovers are a fixed 290px wide. Tag ours so it can size to the
    // panel instead of clipping it.
    element.closest(".dsm-pillbox-popover")?.classList.add(POPOVER_CLASS);
    const { width, height } = this.getConfig().panel;
    element.style.width = `${width}px`;
    element.style.height = `${height}px`;
    // The panel is resized by dragging its corner, so the size has to be read
    // back off the element rather than set through a control.
    this.panelResizeObserver = new ResizeObserver(() =>
      this.persistPanelSize()
    );
    this.panelResizeObserver.observe(element);
  }

  detachPanelElement() {
    this.panelResizeObserver?.disconnect();
    this.panelResizeObserver = undefined;
    this.panelElement
      ?.closest(`.${POPOVER_CLASS}`)
      ?.classList.remove(POPOVER_CLASS);
    this.panelElement = undefined;
  }

  private persistPanelSize() {
    if (this.panelSizeTimer !== undefined) clearTimeout(this.panelSizeTimer);
    this.panelSizeTimer = setTimeout(() => {
      this.panelSizeTimer = undefined;
      const element = this.panelElement;
      if (element === undefined) return;
      // Read the inline style, not the rendered box. A corner drag writes the
      // inline width/height, whereas a small window merely clamps the rendered
      // size through max-height — and remembering the clamp would shrink the
      // panel permanently.
      const width = Math.round(Number.parseFloat(element.style.width));
      const height = Math.round(Number.parseFloat(element.style.height));
      if (!Number.isFinite(width) || !Number.isFinite(height)) return;
      const { panel } = this.getConfig();
      if (width === panel.width && height === panel.height) return;
      if (width === 0 || height === 0) return;
      this.updateConfig((config) => {
        config.panel.width = width;
        config.panel.height = height;
      });
    }, PANEL_SIZE_SAVE_DELAY_MS);
  }

  setAxis(
    axisName: "x" | "y",
    key: keyof SamplingAxisConfig,
    value: number | SamplingMode
  ) {
    this.updateConfig((config) => {
      const axis = config.domain[axisName];
      if (key === "mode") axis.mode = value as SamplingMode;
      else axis[key] = value as never;
    });
  }

  /**
   * Fills the sampling domain from the visible graph paper, so "sample what I
   * am looking at" is one press instead of four numbers read off the axes.
   *
   * The sampling mode is left alone: in `step` mode the vector count follows
   * the new span, and the footer's estimate and warnings already cover that.
   */
  matchDomainToViewport() {
    const math = this.calc.graphpaperBounds.mathCoordinates;
    const x = { min: round(math.left), max: round(math.right) };
    const y = { min: round(math.bottom), max: round(math.top) };
    if (
      !Number.isFinite(x.min) ||
      !Number.isFinite(x.max) ||
      !Number.isFinite(y.min) ||
      !Number.isFinite(y.max) ||
      x.max <= x.min ||
      y.max <= y.min
    ) {
      this.lastActionMessage = "Could not read the current graph bounds.";
      this.util.tick();
      return;
    }
    this.lastActionMessage = `Sampling domain matched to the visible graph: x in [${x.min}, ${x.max}], y in [${y.min}, ${y.max}].`;
    // Saving the config re-renders the panel, so the message is set first.
    this.updateConfig((config) => {
      config.domain.x = { ...config.domain.x, ...x };
      config.domain.y = { ...config.domain.y, ...y };
    });
  }

  setLength(
    key: keyof VectorFieldConfig["length"],
    value: number | boolean | VectorLengthMode
  ) {
    this.updateConfig((config) => {
      config.length[key] = value as never;
    });
  }

  setArrowhead(key: "size" | "angleRadians", value: number) {
    this.updateConfig((config) => {
      config.arrowhead[key] = value;
    });
  }

  setColor(
    key: keyof VectorFieldConfig["color"],
    value: number | string | VectorColorMode | ColorPalette | ColorRangeMode
  ) {
    this.updateConfig((config) => {
      config.color[key] = value as never;
    });
  }

  setZeroVectorMode(mode: ZeroVectorMode) {
    this.updateConfig((config) => {
      config.zeroVectorMode = mode;
    });
  }

  get flowLook() {
    return this.getConfig().flow.look;
  }

  /**
   * Applies a look, which is only ever a starting point: it writes the trail
   * and respawn settings that produce it, and both stay adjustable afterwards.
   */
  setFlowLook(look: FlowLook) {
    this.updateConfig((config) => {
      config.flow = { ...config.flow, ...FLOW_LOOK_PRESETS[look], look };
    });
  }

  setFlow<K extends keyof FlowConfig>(key: K, value: FlowConfig[K]) {
    this.updateConfig((config) => {
      config.flow[key] = value;
    });
  }

  /**
   * Points the flow at the same colors as the arrows, in one press.
   *
   * The two stay separately settable on purpose — colouring arrows by magnitude
   * while the flow runs a quiet single hue is a legitimate picture, and taking
   * that away would be imposing a limit where an option belongs. But wanting one
   * scheme for both is the common case, and matching them by hand meant setting
   * a mode and a palette twice and knowing which particle mode corresponds to
   * which arrow mode.
   *
   * The fixed swatch is not copied because there is only one of it: both halves
   * already read `color.fixedColor`.
   */
  matchFlowColorToArrows() {
    this.updateConfig((config) => {
      config.flow.colorMode = flowColorModeFor(config.color.mode);
      config.flow.palette = config.color.palette;
    });
  }

  /** Whether the flow would look any different after matching. */
  get flowColorMatchesArrows() {
    const config = this.getConfig();
    return (
      config.flow.colorMode === flowColorModeFor(config.color.mode) &&
      config.flow.palette === config.color.palette
    );
  }

  // ---- symbolic differentiation ------------------------------------------

  /**
   * The simplified symbolic partial derivative of an expression, as LaTeX.
   *
   * Desmos evaluates `\frac{d}{dx}f(x,y)` exactly but never shows a simplified
   * form, so this is what turns `2xy` into a readable `2y` rather than a number
   * at a point. Parsing uses Desmos's own parser, so anything Desmos accepts is
   * understood; anything the differentiator cannot do exactly is refused with a
   * reason instead of guessed at.
   */
  partialDerivative(
    latex: string,
    variable: string
  ): { ok: true; latex: string } | { ok: false; error: string } {
    try {
      const cfg = buildConfigFromGlobals(Desmos, this.calc);
      const derivative = differentiate(parseLatex(cfg, latex), variable);
      return { ok: true, latex: toLatex(cfg, derivative) };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "This expression could not be differentiated.",
      };
    }
  }

  /**
   * The gradient of an expression, as the list of partials in the order the
   * variables appear. The caller decides how to present it; two variables make
   * an ordinary Desmos point.
   */
  gradient(
    latex: string,
    variables?: readonly string[]
  ):
    | { ok: true; variables: string[]; latex: string[] }
    | { ok: false; error: string } {
    try {
      const cfg = buildConfigFromGlobals(Desmos, this.calc);
      const tree = parseLatex(cfg, latex);
      // With no argument list given, the gradient adapts to whatever variables
      // the expression actually uses.
      const names = [...(variables ?? identifiersIn(tree))];
      if (names.length === 0) {
        return { ok: false, error: "This expression has no variables." };
      }
      return {
        ok: true,
        variables: names,
        latex: names.map((name) => toLatex(cfg, differentiate(tree, name))),
      };
    } catch (error) {
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "This expression could not be differentiated.",
      };
    }
  }

  // ---- flow visualizer ---------------------------------------------------

  get isFlowRunning() {
    return this.flowOverlay.isRunning;
  }

  get flowStatus() {
    if (this.flowMessage !== "") return this.flowMessage;
    return this.flowOverlay.isRunning
      ? "Streaming the field over the graph paper."
      : "Animate the field as flowing particles, drawn over the graph.";
  }

  /**
   * The compiled shader field, or the reason the current components cannot be
   * put on the GPU. The panel uses this to disable the button with a specific
   * explanation instead of failing on click.
   */
  /**
   * Whether the visualizer can run here at all, checked before the field is.
   *
   * The overlay maps math coordinates linearly onto the graph paper's rect,
   * which is only true of the 2D graph paper. On the 3D product
   * `graphpaperBounds.mathCoordinates` is a rotatable x/y/z box with no
   * screen-space meaning, so a flat overlay cannot stay registered with what is
   * underneath it — and it is painted over by the 3D canvas anyway. Geometry is
   * the same 2D graph paper and works unchanged.
   */
  get flowAvailability(): FlowCompilation {
    if (this.cc.is3dProduct()) {
      return {
        ok: false,
        error:
          "The flow visualizer draws on the 2D graph paper, so it is unavailable in the 3D calculator. Generating the field still works.",
      };
    }
    return this.flowCompilation;
  }

  get flowCompilation(): FlowCompilation {
    const config = this.getConfig();
    const key = JSON.stringify([
      config.source,
      config.components.xLatex,
      config.components.yLatex,
      config.scalar.fLatex,
    ]);
    // The panel reads this several times per render pass, so compile once per
    // distinct field rather than once per read.
    if (this.flowCompilationCache?.key === key) {
      return this.flowCompilationCache.result;
    }
    const result = compileFlowField(config);
    this.flowCompilationCache = { key, result };
    return result;
  }

  toggleFlow() {
    if (this.flowOverlay.isRunning) {
      this.flowOverlay.stop();
      this.flowMessage = "";
      this.util.tick();
      return;
    }
    this.startFlow();
  }

  /**
   * Recompiles the running visualizer against the current components. Typing in
   * the math field fires this per keystroke, and each restart links a new
   * shader program and reseeds every particle, so it settles first.
   */
  refreshFlow() {
    if (!this.flowOverlay.isRunning) return;
    if (this.flowRefreshTimer !== undefined)
      clearTimeout(this.flowRefreshTimer);
    this.flowRefreshTimer = setTimeout(() => {
      this.flowRefreshTimer = undefined;
      if (this.flowOverlay.isRunning) this.startFlow();
    }, FLOW_REFRESH_DELAY_MS);
  }

  private startFlow() {
    const compiled = this.flowAvailability;
    if (!compiled.ok) {
      this.flowMessage = compiled.error;
      this.util.tick();
      return;
    }
    this.flowMessage = "";
    this.flowOverlay.start(compiled.field, this.flowOptions);
    this.util.tick();
  }

  private get flowOptions() {
    const config = this.getConfig();
    return { ...config.flow, fixedColor: config.color.fixedColor };
  }

  get validation() {
    return validateVectorFieldConfig(this.getConfig());
  }

  get message() {
    return this.lastActionMessage;
  }

  get isTestLabVisible() {
    return isDevelopmentBuild();
  }

  get testPresets() {
    return VECTOR_FIELD_PRESETS;
  }

  get densityPresets() {
    return DENSITY_PRESETS;
  }

  get testConfig() {
    return configForPreset(
      this.selectedTestPreset,
      this.selectedDensityPreset,
      this.testLengthMode,
      this.testColorMode
    );
  }

  get selectedTestPreset() {
    return VECTOR_FIELD_PRESETS.find(
      (preset) => preset.id === this.testPresetID
    )!;
  }

  get selectedDensityPreset() {
    return DENSITY_PRESETS.find(
      (density) => density.id === this.testDensityID
    )!;
  }

  get currentTestLengthMode() {
    return this.testLengthMode;
  }

  get currentTestColorMode() {
    return this.testColorMode;
  }

  setTestPreset(id: VectorFieldPreset["id"]) {
    this.testPresetID = id;
    this.completedChecklist.clear();
    this.util.tick();
  }

  setTestDensity(id: DensityPreset["id"]) {
    this.testDensityID = id;
    this.completedChecklist.clear();
    this.util.tick();
  }

  setTestLengthMode(mode: VectorLengthMode) {
    this.testLengthMode = mode;
    this.completedChecklist.clear();
    this.util.tick();
  }

  setTestColorMode(mode: VectorColorMode) {
    this.testColorMode = mode;
    this.completedChecklist.clear();
    this.util.tick();
  }

  get checklist() {
    return TEST_CHECKLIST.map((item) => ({
      ...item,
      complete: this.completedChecklist.has(item.id),
    }));
  }

  toggleChecklist(id: TestChecklistID, complete: boolean) {
    if (complete) this.completedChecklist.add(id);
    else this.completedChecklist.delete(id);
    this.util.tick();
  }

  generateProduction(confirmed = false) {
    this.generate(this.getConfig(), "production", confirmed);
  }

  generateTestField(confirmed = false) {
    if (!this.isTestLabVisible) return;
    this.generate(this.testConfig, "test", confirmed);
  }

  confirmPendingGeneration() {
    if (this.pendingGeneration === "production") this.generateProduction(true);
    else if (this.pendingGeneration === "test") this.generateTestField(true);
  }

  cancelPendingGeneration() {
    this.pendingGeneration = undefined;
    this.lastActionMessage = "Generation cancelled.";
    this.util.tick();
  }

  get needsGenerationConfirmation() {
    return this.pendingGeneration !== undefined;
  }

  removeProductionField() {
    this.expressions.removeGeneratedSet(
      createVectorFieldPlan(this.getConfig()).namespace
    );
    this.pendingGeneration = undefined;
    this.lastActionMessage = "Removed only this Vector Tools field.";
    this.util.tick();
  }

  removeTestField() {
    if (!this.isTestLabVisible) return;
    this.expressions.removeGeneratedSet(
      createVectorFieldPlan(this.testConfig).namespace
    );
    this.pendingGeneration = undefined;
    this.lastActionMessage = "Removed the development test field.";
    this.util.tick();
  }

  get productionAudit(): ExpressionAudit {
    return this.audit(createVectorFieldPlan(this.getConfig()));
  }

  get testAudit(): ExpressionAudit {
    return this.audit(createVectorFieldPlan(this.testConfig));
  }

  async copyDiagnostics() {
    if (!this.isTestLabVisible) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      extensionVersion: VERSION,
      plugin: "vector-tools",
      testConfiguration: this.testConfig,
      testValidation: validateVectorFieldConfig(this.testConfig),
      audit: this.testAudit,
      manualChecklist: this.checklist,
      browser: navigator.userAgent,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      this.lastActionMessage = "Sanitized diagnostics copied to the clipboard.";
    } catch {
      this.lastActionMessage =
        "Could not copy diagnostics in this browser context.";
    }
    this.util.tick();
  }

  private generate(
    config: VectorFieldConfig,
    target: GenerationTarget,
    confirmed: boolean
  ) {
    const validation = validateVectorFieldConfig(config);
    if (!validation.canGenerate) {
      this.pendingGeneration = undefined;
      this.lastActionMessage = "Fix the validation errors before generating.";
      this.util.tick();
      return;
    }
    if (validation.requiresConfirmation && !confirmed) {
      this.pendingGeneration = target;
      this.lastActionMessage = `This will create ${validation.estimatedVectorCount.toLocaleString()} vectors. Confirm to continue.`;
      this.util.tick();
      return;
    }

    const plan = createVectorFieldPlan(config);
    try {
      this.applyPlan(plan);
      this.pendingGeneration = undefined;
      this.lastActionMessage = `Generated ${validation.estimatedVectorCount.toLocaleString()} vectors as ordinary Desmos expressions.`;
    } catch (error) {
      this.pendingGeneration = undefined;
      this.lastActionMessage = `Generation stopped safely: ${error instanceof Error ? error.message : "unknown error"}`;
    }
    this.util.tick();
  }

  private applyPlan(plan: VectorFieldPlan) {
    this.expressions.applyGeneratedSet(
      plan.namespace,
      plan.folder,
      plan.expressions
    );
  }

  private audit(plan: VectorFieldPlan) {
    const items: GeneratedItemSnapshot[] = this.expressions.getGeneratedItems(
      plan.namespace
    );
    return auditVectorFieldPlan(plan, items);
  }

  private saveConfig(config: VectorFieldConfig) {
    this.dsm.setPluginSetting(
      "vector-tools",
      "serializedFieldConfig",
      JSON.stringify(config)
    );
  }

  private ensureStoredConfigIsCurrent() {
    const normalized = this.getConfig();
    const serialized = JSON.stringify(normalized);
    if (serialized !== this.settings.serializedFieldConfig) {
      this.dsm.setPluginSetting(
        "vector-tools",
        "serializedFieldConfig",
        serialized
      );
    }
  }
}
