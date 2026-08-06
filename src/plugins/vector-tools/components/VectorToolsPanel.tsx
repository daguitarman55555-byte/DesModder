import VectorTools from "..";
import { Component, jsx } from "#DCGView";
import {
  Button,
  For,
  If,
  IfElse,
  InlineMathInputViewGeneral,
  SegmentedControl,
  SwitchUnion,
} from "#components";
import { format } from "#i18n";
import {
  FLOW_PARTICLE_HEAVY,
  FLOW_PARTICLE_MAXIMUM,
  FLOW_PARTICLE_MINIMUM,
  PANEL_MAX_HEIGHT,
  PANEL_MAX_WIDTH,
  PANEL_MIN_HEIGHT,
  PANEL_MIN_WIDTH,
  PANEL_TABS,
  type ColorPalette,
  type ColorRangeMode,
  type FlowColorMode,
  type SamplingMode,
  type VectorColorMode,
  type VectorFieldConfig,
  type VectorLengthMode,
  type ZeroVectorMode,
} from "../model";
import "./VectorToolsPanel.less";

interface Choice<T extends string> {
  value: T;
  label: string;
}

const LENGTH_MODES: readonly Choice<VectorLengthMode>[] = [
  { value: "actual", label: "Actual" },
  { value: "normalized", label: "Normalized" },
  { value: "scaled", label: "Scaled" },
  { value: "clamped", label: "Clamped" },
  { value: "compressed", label: "Compressed" },
  { value: "direction-only", label: "Direction only" },
];

const COLOR_MODES: readonly Choice<VectorColorMode>[] = [
  { value: "fixed", label: "Fixed" },
  { value: "magnitude", label: "Magnitude" },
  { value: "log-magnitude", label: "Log magnitude" },
  { value: "direction", label: "Direction" },
  { value: "x-component", label: "x component" },
  { value: "y-component", label: "y component" },
];

const PALETTES: readonly Choice<ColorPalette>[] = [
  { value: "sequential-a", label: "Indigo" },
  { value: "sequential-b", label: "Blue" },
  { value: "blue-red", label: "Blue to red" },
  { value: "grayscale", label: "Grayscale" },
  { value: "direction-hue", label: "Hue wheel" },
];

const RANGE_MODES: readonly Choice<ColorRangeMode>[] = [
  { value: "automatic", label: "Automatic" },
  { value: "manual", label: "Manual" },
];

const ZERO_MODES: readonly Choice<ZeroVectorMode>[] = [
  { value: "hide", label: "Hide" },
  { value: "point", label: "Show as points" },
];

const SAMPLING_MODES: readonly Choice<SamplingMode>[] = [
  { value: "step", label: "Step" },
  { value: "count", label: "Count" },
];

const FLOW_COLOR_MODES: readonly Choice<FlowColorMode>[] = [
  { value: "speed", label: "Speed" },
  { value: "direction", label: "Direction" },
  { value: "fixed", label: "Fixed color" },
];

type ConfigGetter = () => VectorFieldConfig;

export class VectorToolsPanel extends Component<{
  vectorTools: () => VectorTools;
}> {
  template() {
    const vectorTools = this.props.vectorTools();
    const config: ConfigGetter = () => vectorTools.getConfig();
    const validation = () => vectorTools.validation;

    return (
      <div
        class="dcg-popover-interior dsm-vector-tools-menu"
        didMount={(element: HTMLElement) =>
          vectorTools.attachPanelElement(element)
        }
        willUnmount={() => vectorTools.detachPanelElement()}
      >
        <div class="dcg-popover-title">{format("vector-tools-name")}</div>
        <div class="dsm-vector-tools-tabs">
          <SegmentedControl
            ariaGroupLabel="Vector Tools section"
            names={() => PANEL_TABS.map((tab) => tab.label)}
            selectedIndex={() =>
              PANEL_TABS.findIndex((tab) => tab.id === config().panel.tab)
            }
            setSelectedIndex={(index: number) =>
              vectorTools.setPanelTab(PANEL_TABS[index].id)
            }
          />
        </div>

        <div class="dsm-vector-tools-body">
          {SwitchUnion(() => config().panel.tab, {
            field: () => fieldTab(vectorTools, config, validation),
            arrows: () => arrowsTab(vectorTools, config),
            color: () => colorTab(vectorTools, config),
            flow: () => flowTab(vectorTools, config),
          })}
          <If predicate={() => vectorTools.isTestLabVisible}>
            {() => testLab(vectorTools)}
          </If>
        </div>

        {footer(vectorTools, validation)}
      </div>
    );
  }
}

// ---- tabs ----------------------------------------------------------------

function fieldTab(
  vectorTools: VectorTools,
  config: ConfigGetter,
  validation: () => VectorTools["validation"]
) {
  return (
    <div>
      <section class="dsm-vector-tools-section">
        {textControl(
          "dsm-vector-tools-name",
          "Field name",
          () => config().name,
          (value) =>
            vectorTools.updateConfig((field) => {
              field.name = value;
            })
        )}
        <div class="dsm-vector-tools-math-row">
          {componentInput(vectorTools, config, validation, "p")}
          {componentInput(vectorTools, config, validation, "q")}
        </div>
        <div class="dsm-vector-tools-link-row">
          <Button
            color="light-gray"
            class="dsm-vector-tools-link-components"
            onTap={() => vectorTools.addComponentExpressions()}
          >
            {() =>
              vectorTools.hasComponentExpressions
                ? "Show P and Q in the expression list"
                : "Edit P and Q in the expression list"
            }
          </Button>
          <div class="dsm-vector-tools-hint">
            {() => vectorTools.componentLinkStatus}
          </div>
        </div>
      </section>

      <section class="dsm-vector-tools-section">
        <div class="dsm-vector-tools-section-head">
          <h3>Sampling domain</h3>
          <Button
            color="light-gray"
            class="dsm-vector-tools-match-viewport"
            onTap={() => vectorTools.matchDomainToViewport()}
          >
            Match viewport
          </Button>
        </div>
        {axisControls(vectorTools, "x", config)}
        {axisControls(vectorTools, "y", config)}
        <div class="dsm-vector-tools-count">
          Estimated vectors:{" "}
          {() => validation().estimatedVectorCount.toLocaleString()}
        </div>
      </section>
    </div>
  );
}

function arrowsTab(vectorTools: VectorTools, config: ConfigGetter) {
  const length = () => config().length;
  return (
    <div>
      <section class="dsm-vector-tools-section">
        {chipGroup(
          "Length mode",
          () => length().mode,
          LENGTH_MODES,
          (value) => vectorTools.setLength("mode", value)
        )}
        {checkboxControl(
          "Auto target length from sampling spacing",
          () => length().autoLength,
          (checked) => vectorTools.setLength("autoLength", checked)
        )}
        <div class="dsm-vector-tools-number-grid">
          {numberControl(
            "dsm-vector-tools-target-length",
            "Target length",
            () => length().targetLength,
            (value) => vectorTools.setLength("targetLength", value),
            () => length().autoLength
          )}
          {numberControl(
            "dsm-vector-tools-scale",
            "Scale",
            () => length().scale,
            (value) => vectorTools.setLength("scale", value)
          )}
          {numberControl(
            "dsm-vector-tools-clamp-maximum",
            "Clamp maximum",
            () => length().maximumLength,
            (value) => vectorTools.setLength("maximumLength", value)
          )}
          {numberControl(
            "dsm-vector-tools-compression",
            "Compression",
            () => length().compression,
            (value) => vectorTools.setLength("compression", value)
          )}
        </div>
      </section>

      <section class="dsm-vector-tools-section">
        <h3>Arrowhead</h3>
        {sliderControl(
          "dsm-vector-tools-arrowhead-size",
          "Size",
          () => config().arrowhead.size,
          { minimum: 0.02, maximum: 1, step: 0.01, decimals: 2 },
          (value) => vectorTools.setArrowhead("size", value)
        )}
        {sliderControl(
          "dsm-vector-tools-arrowhead-angle",
          "Angle (rad)",
          () => config().arrowhead.angleRadians,
          { minimum: 0.05, maximum: 1.5, step: 0.01, decimals: 2 },
          (value) => vectorTools.setArrowhead("angleRadians", value)
        )}
        {chipGroup(
          "Zero vectors",
          () => config().zeroVectorMode,
          ZERO_MODES,
          (value) => vectorTools.setZeroVectorMode(value)
        )}
      </section>
    </div>
  );
}

function colorTab(vectorTools: VectorTools, config: ConfigGetter) {
  const color = () => config().color;
  const usesPalette = () =>
    color().mode === "magnitude" || color().mode === "log-magnitude";
  return (
    <div>
      <section class="dsm-vector-tools-section">
        {chipGroup(
          "Color mode",
          () => color().mode,
          COLOR_MODES,
          (value) => vectorTools.setColor("mode", value)
        )}
        <label
          class="dsm-vector-tools-label"
          for="dsm-vector-tools-fixed-color"
        >
          Fixed color
        </label>
        <input
          id="dsm-vector-tools-fixed-color"
          type="color"
          onUpdate={(element: HTMLInputElement) => {
            if (document.activeElement !== element)
              element.value = color().fixedColor;
          }}
          onInput={(event: Event) =>
            vectorTools.setColor(
              "fixedColor",
              (event.target as HTMLInputElement).value
            )
          }
        />
      </section>

      <If predicate={usesPalette}>
        {() => (
          <section class="dsm-vector-tools-section">
            {chipGroup(
              "Palette",
              () => color().palette,
              PALETTES,
              (value) => vectorTools.setColor("palette", value)
            )}
            {chipGroup(
              "Color range",
              () => color().rangeMode,
              RANGE_MODES,
              (value) => vectorTools.setColor("rangeMode", value)
            )}
            <If predicate={() => color().rangeMode === "manual"}>
              {() => (
                <div class="dsm-vector-tools-number-grid">
                  {numberControl(
                    "dsm-vector-tools-range-minimum",
                    "Range minimum",
                    () => color().minimum,
                    (value) => vectorTools.setColor("minimum", value)
                  )}
                  {numberControl(
                    "dsm-vector-tools-range-maximum",
                    "Range maximum",
                    () => color().maximum,
                    (value) => vectorTools.setColor("maximum", value)
                  )}
                </div>
              )}
            </If>
          </section>
        )}
      </If>
    </div>
  );
}

function flowTab(vectorTools: VectorTools, config: ConfigGetter) {
  const flow = () => config().flow;
  const compilation = () => vectorTools.flowAvailability;
  return (
    <div>
      <section class="dsm-vector-tools-section dsm-vector-tools-flow">
        <p class="dsm-vector-tools-hint">
          Animates particles carried by the field, drawn over the graph paper.
          It reads the same P and Q, and adds no expressions.
        </p>
        <div class="dsm-vector-tools-actions">
          <Button
            color={() => (vectorTools.isFlowRunning ? "light-gray" : "blue")}
            class="dsm-vector-tools-visualize"
            disabled={() => !compilation().ok}
            onTap={() => vectorTools.toggleFlow()}
          >
            {() =>
              vectorTools.isFlowRunning ? "Stop visualization" : "Visualize"
            }
          </Button>
        </div>
        <If predicate={() => !compilation().ok}>
          {() => (
            <div class="dsm-vector-tools-warning">
              {() => {
                const result = compilation();
                return result.ok ? "" : result.error;
              }}
            </div>
          )}
        </If>
        <div class="dsm-vector-tools-status dsm-vector-tools-flow-status">
          {() => vectorTools.flowStatus}
        </div>
      </section>

      <section class="dsm-vector-tools-section">
        {particleCountControl(vectorTools, flow)}
        {chipGroup(
          "Particle color",
          () => flow().colorMode,
          FLOW_COLOR_MODES,
          (value) => vectorTools.setFlow("colorMode", value)
        )}
        {checkboxControl(
          "Constant speed (follow streamlines evenly)",
          () => flow().normalizeSpeed,
          (checked) => vectorTools.setFlow("normalizeSpeed", checked)
        )}
        {sliderControl(
          "dsm-vector-tools-flow-speed",
          "Speed",
          () => flow().speed,
          { minimum: 0.05, maximum: 8, step: 0.05, decimals: 2 },
          (value) => vectorTools.setFlow("speed", value)
        )}
        {sliderControl(
          "dsm-vector-tools-flow-trail",
          "Trail length",
          () => flow().trailPersistence,
          { minimum: 0, maximum: 0.995, step: 0.005, decimals: 3 },
          (value) => vectorTools.setFlow("trailPersistence", value)
        )}
        {sliderControl(
          "dsm-vector-tools-flow-opacity",
          "Opacity",
          () => flow().opacity,
          { minimum: 0.05, maximum: 1, step: 0.01, decimals: 2 },
          (value) => vectorTools.setFlow("opacity", value)
        )}
        {sliderControl(
          "dsm-vector-tools-flow-point-size",
          "Particle size",
          () => flow().pointSize,
          { minimum: 0.5, maximum: 6, step: 0.1, decimals: 1 },
          (value) => vectorTools.setFlow("pointSize", value)
        )}
        {sliderControl(
          "dsm-vector-tools-flow-drop-rate",
          "Respawn rate",
          () => flow().dropRate,
          { minimum: 0, maximum: 0.2, step: 0.001, decimals: 3 },
          (value) => vectorTools.setFlow("dropRate", value)
        )}
      </section>
    </div>
  );
}

function footer(
  vectorTools: VectorTools,
  validation: () => VectorTools["validation"]
) {
  return (
    <div class="dsm-vector-tools-footer dsm-vector-tools-validation">
      {IfElse(() => validation().issues.length === 0, {
        true: () => (
          <div class="dsm-vector-tools-valid">Ready to generate.</div>
        ),
        false: () => (
          <div class="dsm-vector-tools-issues">
            <For
              each={() =>
                validation().issues.map((issue, index) => ({ ...issue, index }))
              }
              key={(issue: { index: number }) => issue.index}
            >
              {(getIssue: () => { level: string; message: string }) => (
                <div class={() => `dsm-vector-tools-${getIssue().level}`}>
                  {() => getIssue().message}
                </div>
              )}
            </For>
          </div>
        ),
      })}
      <div class="dsm-vector-tools-actions">
        <Button
          color="blue"
          class="dsm-vector-tools-generate"
          disabled={() => !validation().canGenerate}
          onTap={() => vectorTools.generateProduction()}
        >
          Generate field
        </Button>
        <Button
          color="light-gray"
          class="dsm-vector-tools-remove"
          onTap={() => vectorTools.removeProductionField()}
        >
          Remove
        </Button>
        <Button
          color="light-gray"
          class="dsm-vector-tools-reset"
          onTap={() => vectorTools.resetConfig()}
        >
          Reset
        </Button>
      </div>
      {confirmationControls(vectorTools)}
      <div class="dsm-vector-tools-status">{() => vectorTools.message}</div>
    </div>
  );
}

// ---- pieces --------------------------------------------------------------

function componentInput(
  vectorTools: VectorTools,
  config: ConfigGetter,
  validation: () => VectorTools["validation"],
  which: "p" | "q"
) {
  const key = which === "p" ? "xLatex" : "yLatex";
  const label = which === "p" ? "P(x, y)" : "Q(x, y)";
  return (
    <div>
      <label class="dsm-vector-tools-label">{label}</label>
      <InlineMathInputViewGeneral
        containerClass={() => ({ "dsm-vector-tools-math-input": true })}
        placeholder={which === "p" ? "-y" : "x"}
        ariaLabel={`${which === "p" ? "P" : "Q"} of x and y`}
        latex={() => config().components[key]}
        handleLatexChanged={(latex) => vectorTools.setComponent(key, latex)}
        hasError={() =>
          hasIssue(validation().issues, which === "p" ? "P(x,y)" : "Q(x,y)")
        }
        handleFocusChanged={(focused) =>
          vectorTools.updateFocus(which, focused)
        }
        isFocused={() => vectorTools.isFocused(which)}
        controller={vectorTools.cc}
        readonly={false}
      />
    </div>
  );
}

function axisControls(
  vectorTools: VectorTools,
  axisName: "x" | "y",
  config: ConfigGetter
) {
  const axis = () => config().domain[axisName];
  return (
    <div class="dsm-vector-tools-axis" data-axis={axisName}>
      <div class="dsm-vector-tools-axis-heading">{axisName} axis</div>
      <div class="dsm-vector-tools-number-grid">
        {numberControl(
          `dsm-vector-tools-${axisName}-minimum`,
          "Minimum",
          () => axis().min,
          (value) => vectorTools.setAxis(axisName, "min", value)
        )}
        {numberControl(
          `dsm-vector-tools-${axisName}-maximum`,
          "Maximum",
          () => axis().max,
          (value) => vectorTools.setAxis(axisName, "max", value)
        )}
      </div>
      {chipGroup(
        "Sampling by",
        () => axis().mode,
        SAMPLING_MODES,
        (value) => vectorTools.setAxis(axisName, "mode", value),
        `dsm-vector-tools-${axisName}-sampling`
      )}
      {IfElse(() => axis().mode === "step", {
        true: () =>
          numberControl(
            `dsm-vector-tools-${axisName}-step`,
            "Step",
            () => axis().step,
            (value) => vectorTools.setAxis(axisName, "step", value)
          ),
        false: () =>
          numberControl(
            `dsm-vector-tools-${axisName}-count`,
            "Count",
            () => axis().count,
            (value) => vectorTools.setAxis(axisName, "count", Math.round(value))
          ),
      })}
    </div>
  );
}

function particleCountControl(
  vectorTools: VectorTools,
  flow: () => VectorFieldConfig["flow"]
) {
  const set = (value: number) =>
    vectorTools.setFlow(
      "particleCount",
      Math.round(
        Math.min(FLOW_PARTICLE_MAXIMUM, Math.max(FLOW_PARTICLE_MINIMUM, value))
      )
    );
  return (
    <div class="dsm-vector-tools-particles">
      <div class="dsm-vector-tools-slider-head">
        <label class="dsm-vector-tools-label" for="dsm-vector-tools-particles">
          Particles
        </label>
        <input
          id="dsm-vector-tools-particle-count"
          class="dsm-vector-tools-particle-count"
          type="number"
          min={FLOW_PARTICLE_MINIMUM}
          max={FLOW_PARTICLE_MAXIMUM}
          step="500"
          onUpdate={(element: HTMLInputElement) => {
            if (document.activeElement !== element)
              element.value = String(flow().particleCount);
          }}
          onChange={(event: Event) => commitNumber(event, set)}
        />
      </div>
      {/*
        The slider is exponential: the interesting range is 500-40,000, and a
        linear slider would bury all of it in the first tenth of the track.
      */}
      <input
        id="dsm-vector-tools-particles"
        class="dsm-vector-tools-slider"
        type="range"
        min="0"
        max="1000"
        step="1"
        onUpdate={(element: HTMLInputElement) => {
          if (document.activeElement !== element)
            element.value = String(countToSlider(flow().particleCount));
        }}
        onInput={(event: Event) =>
          set(sliderToCount(Number((event.target as HTMLInputElement).value)))
        }
      />
      <If predicate={() => flow().particleCount > FLOW_PARTICLE_HEAVY}>
        {() => (
          <div class="dsm-vector-tools-warning">
            Above {FLOW_PARTICLE_HEAVY.toLocaleString()} particles the animation
            may drop frames on an integrated GPU.
          </div>
        )}
      </If>
    </div>
  );
}

function countToSlider(count: number) {
  const t =
    (Math.log(count) - Math.log(FLOW_PARTICLE_MINIMUM)) /
    (Math.log(FLOW_PARTICLE_MAXIMUM) - Math.log(FLOW_PARTICLE_MINIMUM));
  return Math.round(1000 * Math.min(1, Math.max(0, t)));
}

function sliderToCount(position: number) {
  const t = Math.min(1, Math.max(0, position / 1000));
  const value = Math.exp(
    Math.log(FLOW_PARTICLE_MINIMUM) +
      t * (Math.log(FLOW_PARTICLE_MAXIMUM) - Math.log(FLOW_PARTICLE_MINIMUM))
  );
  // Round to something a person would type.
  const magnitude = Math.pow(
    10,
    Math.max(2, Math.floor(Math.log10(value)) - 1)
  );
  return Math.round(value / magnitude) * magnitude;
}

interface SliderRange {
  minimum: number;
  maximum: number;
  step: number;
  decimals: number;
}

/**
 * A slider paired with its exact value. The slider is for feel and the number
 * is for precision; both write the same setting.
 */
function sliderControl(
  id: string,
  label: string,
  value: () => number,
  range: SliderRange,
  onChange: (value: number) => void
) {
  const clamp = (raw: number) =>
    Math.min(range.maximum, Math.max(range.minimum, raw));
  return (
    <div class="dsm-vector-tools-slider-row">
      <div class="dsm-vector-tools-slider-head">
        <label class="dsm-vector-tools-label" for={id}>
          {label}
        </label>
        <span class="dsm-vector-tools-slider-value">
          {() => value().toFixed(range.decimals)}
        </span>
      </div>
      <input
        id={id}
        class="dsm-vector-tools-slider"
        type="range"
        min={range.minimum}
        max={range.maximum}
        step={range.step}
        onUpdate={(element: HTMLInputElement) => {
          if (document.activeElement !== element)
            element.value = String(value());
        }}
        onInput={(event: Event) =>
          onChange(clamp(Number((event.target as HTMLInputElement).value)))
        }
      />
    </div>
  );
}

/**
 * A wrapping row of one-click options. This replaces the `<select>` elements
 * the panel used to use: a native dropdown inside a scrolling popover is
 * awkward to hit, and DCGView cannot drive its selection through props anyway.
 */
function chipGroup<T extends string>(
  label: string,
  value: () => T,
  choices: readonly Choice<T>[],
  onChange: (value: T) => void,
  id?: string
) {
  return (
    <div class="dsm-vector-tools-chips" id={id} role="group" aria-label={label}>
      <div class="dsm-vector-tools-label">{label}</div>
      <div class="dsm-vector-tools-chip-row">
        {choices.map((choice) => (
          <span
            role="button"
            tabIndex={0}
            data-value={choice.value}
            class={() => ({
              "dsm-vector-tools-chip": true,
              "dsm-vector-tools-chip-selected": value() === choice.value,
            })}
            aria-pressed={() => (value() === choice.value ? "true" : "false")}
            onTap={() => onChange(choice.value)}
          >
            {choice.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * `disabled` is deliberately never passed as a prop: DCGView writes props as
 * attributes, and `disabled="false"` is still a disabled input in HTML. Setting
 * the property in `onUpdate` is the only spelling that actually toggles.
 */
function numberControl(
  id: string,
  label: string,
  value: () => number,
  onChange: (value: number) => void,
  disabled: () => boolean = () => false
) {
  return (
    <label class="dsm-vector-tools-number" for={id}>
      <span>{label}</span>
      <input
        id={id}
        type="number"
        step="any"
        onUpdate={(element: HTMLInputElement) => {
          element.disabled = disabled();
          // Never fight the user mid-edit; only re-sync a field they left.
          if (document.activeElement !== element)
            element.value = String(value());
        }}
        onChange={(event: Event) => commitNumber(event, onChange)}
        onInput={(event: Event) => commitNumber(event, onChange)}
      />
    </label>
  );
}

function commitNumber(event: Event, onChange: (value: number) => void) {
  const raw = (event.target as HTMLInputElement).value;
  // An empty or half-typed value ("-", "1e") is not a number yet; leaving the
  // stored value alone lets the user finish typing.
  if (raw.trim() === "") return;
  const next = Number(raw);
  if (Number.isFinite(next)) onChange(next);
}

function textControl(
  id: string,
  label: string,
  value: () => string,
  onChange: (value: string) => void
) {
  return (
    <div class="dsm-vector-tools-control">
      <label class="dsm-vector-tools-label" for={id}>
        {label}
      </label>
      <input
        id={id}
        class="dsm-vector-tools-text-input"
        onUpdate={(element: HTMLInputElement) => {
          if (document.activeElement !== element) element.value = value();
        }}
        onInput={(event: Event) =>
          onChange((event.target as HTMLInputElement).value)
        }
      />
    </div>
  );
}

function checkboxControl(
  label: string,
  checked: () => boolean,
  onChange: (checked: boolean) => void
) {
  return (
    <label class="dsm-vector-tools-checkbox">
      <input
        type="checkbox"
        onUpdate={(element: HTMLInputElement) => {
          element.checked = checked();
        }}
        onChange={(event: Event) =>
          onChange((event.target as HTMLInputElement).checked)
        }
      />
      {label}
    </label>
  );
}

function confirmationControls(vectorTools: VectorTools) {
  return (
    <If predicate={() => vectorTools.needsGenerationConfirmation}>
      {() => (
        <div class="dsm-vector-tools-confirmation">
          <span>High-density field:</span>
          <Button
            color="red"
            onTap={() => vectorTools.confirmPendingGeneration()}
          >
            Generate anyway
          </Button>
          <Button
            color="light-gray"
            onTap={() => vectorTools.cancelPendingGeneration()}
          >
            Cancel
          </Button>
        </div>
      )}
    </If>
  );
}

function testLab(vectorTools: VectorTools) {
  return (
    <details class="dsm-vector-tools-test-lab">
      <summary>Developer Test Lab</summary>
      <p class="dsm-vector-tools-hint">
        Development-build only. Test expressions use their own namespace and are
        not stored as production settings.
      </p>
      {chipGroup(
        "Preset field",
        () => vectorTools.selectedTestPreset.id,
        vectorTools.testPresets.map((preset) => ({
          value: preset.id,
          label: preset.name,
        })),
        (value) => vectorTools.setTestPreset(value),
        "dsm-vector-tools-test-preset"
      )}
      {chipGroup(
        "Density",
        () => vectorTools.selectedDensityPreset.id,
        vectorTools.densityPresets.map((density) => ({
          value: density.id,
          label: `${density.name} (${density.xCount}×${density.yCount})`,
        })),
        (value) => vectorTools.setTestDensity(value),
        "dsm-vector-tools-test-density"
      )}
      {chipGroup(
        "Length mode",
        () => vectorTools.currentTestLengthMode,
        LENGTH_MODES,
        (value) => vectorTools.setTestLengthMode(value),
        "dsm-vector-tools-test-length"
      )}
      {chipGroup(
        "Color mode",
        () => vectorTools.currentTestColorMode,
        COLOR_MODES,
        (value) => vectorTools.setTestColorMode(value),
        "dsm-vector-tools-test-color"
      )}
      <div class="dsm-vector-tools-actions">
        <Button color="blue" onTap={() => vectorTools.generateTestField()}>
          Run Test
        </Button>
        <Button color="light-gray" onTap={() => vectorTools.removeTestField()}>
          Remove Test
        </Button>
        <Button
          color="light-gray"
          onTap={() => {
            vectorTools.copyDiagnostics().then(
              () => undefined,
              () => undefined
            );
          }}
        >
          Copy diagnostics
        </Button>
      </div>
      {confirmationControls(vectorTools)}
      <div class="dsm-vector-tools-probes">
        <strong>Manual probes</strong>
        <For
          each={() =>
            vectorTools.selectedTestPreset.probes.map((probe, index) => ({
              probe,
              index,
            }))
          }
          key={(entry: { index: number }) => entry.index}
        >
          {(
            getEntry: () => {
              probe: { point: readonly number[]; expected: readonly number[] };
            }
          ) => (
            <div>
              {() => {
                const { point, expected } = getEntry().probe;
                return `(${point[0]}, ${point[1]}) → (${expected[0]}, ${expected[1]})`;
              }}
            </div>
          )}
        </For>
      </div>
      <div class="dsm-vector-tools-checklist">
        <strong>Manual QA checklist</strong>
        <For
          each={() => vectorTools.checklist}
          key={(item: { id: string }) => item.id}
        >
          {(getItem: () => { id: string; label: string; complete: boolean }) =>
            checkboxControl(
              getItem().label,
              () => getItem().complete,
              (checked) =>
                vectorTools.toggleChecklist(getItem().id as never, checked)
            )
          }
        </For>
      </div>
      {auditTable(vectorTools)}
    </details>
  );
}

function auditTable(vectorTools: VectorTools) {
  const audit = () => vectorTools.testAudit;
  return (
    <div class="dsm-vector-tools-audit">
      <strong>Expression audit</strong>
      <div class="dsm-vector-tools-audit-summary">
        {() => {
          const report = audit();
          if (
            report.folderMissing ||
            report.renderMissing ||
            report.namespaceCollision
          )
            return "Attention required";
          if (report.colorLatexMissing.length > 0)
            return "Mapped colors were dropped by the calculator";
          return "Structure looks correct";
        }}
      </div>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <For each={() => audit().rows} key={(row: { id: string }) => row.id}>
            {(
              getRow: () => {
                purpose: string;
                present: boolean;
                visibility: string;
              }
            ) => (
              <tr>
                <td>{() => getRow().purpose}</td>
                <td>
                  {() => (getRow().present ? getRow().visibility : "missing")}
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

function hasIssue(issues: readonly { message: string }[], startsWith: string) {
  return issues.some((issue) => issue.message.startsWith(startsWith));
}

export const PANEL_SIZE_LIMITS = {
  minWidth: PANEL_MIN_WIDTH,
  maxWidth: PANEL_MAX_WIDTH,
  minHeight: PANEL_MIN_HEIGHT,
  maxHeight: PANEL_MAX_HEIGHT,
};

export function VectorToolsPanelFunc(vectorTools: VectorTools) {
  return <VectorToolsPanel vectorTools={() => vectorTools} />;
}
