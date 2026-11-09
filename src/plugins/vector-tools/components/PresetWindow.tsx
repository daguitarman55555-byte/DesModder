import VectorTools from "..";
import { Component, jsx } from "#DCGView";
import { For, If, IfElse } from "#components";
import { paletteStops } from "../../../field-rendering/palettes";
import type { GalleryPreset } from "../gallery";
import type { PresetVariableRow } from "..";
import { ownerAbout } from "../../../field-rendering/gallery/variable-notes";
import { PRESET_THUMBNAILS } from "./presetThumbnails";
import "./PresetWindow.less";

/**
 * The presets, in a small window of their own that floats over the graph.
 *
 * Its own window rather than a row of chips in the panel, for two reasons.
 * There are enough presets now that a wrapped row of names is a wall to read,
 * and grouped by kind they become a list to browse. And the panel covers the
 * graph: choosing a picture is something done while looking at the picture,
 * so the window stays open when the panel closes, folds down to its title
 * bar, and can be dragged out of the way.
 */
export class PresetWindow extends Component<{
  vectorTools: () => VectorTools;
}> {
  template() {
    const vectorTools = this.props.vectorTools();
    const settings = () => vectorTools.presetWindow;
    const collapsed = () => settings().collapsed;
    return (
      <div
        class={() => ({
          "dsm-preset-window": true,
          "dsm-preset-window-collapsed": collapsed(),
          "dsm-preset-window-split": vectorTools.presetVariables.length > 0,
        })}
        role="dialog"
        aria-label="Vector field presets"
        onUpdate={(element: HTMLElement) =>
          vectorTools.placePresetWindow(element)
        }
      >
        <div
          class="dsm-preset-window-head"
          didMount={(element: HTMLElement) =>
            vectorTools.makePresetWindowDraggable(element)
          }
        >
          <span class="dsm-preset-window-grip" aria-hidden="true">
            ⠿
          </span>
          <span class="dsm-preset-window-title">Presets</span>
          <span
            role="button"
            tabIndex={0}
            class="dsm-preset-window-button"
            aria-label={() => (collapsed() ? "Expand" : "Collapse")}
            title={() => (collapsed() ? "Expand" : "Collapse")}
            onTap={() =>
              vectorTools.setPresetWindow({ collapsed: !collapsed() })
            }
          >
            {() => (collapsed() ? "▸" : "▾")}
          </span>
          <span
            role="button"
            tabIndex={0}
            class="dsm-preset-window-button"
            aria-label="Close"
            title="Close"
            onTap={() => vectorTools.setPresetWindow({ open: false })}
          >
            ×
          </span>
        </div>
        <If predicate={() => !collapsed()}>
          {() => (
            <div class="dsm-preset-window-body">
              {/* What is loaded, beside what can be: the controls in a pane of
                  their own, so a variable can be set with the presets in view. */}
              <div class="dsm-preset-window-controls">
                {/* An open preset is drawn from a field of its own, so the
                    save in the Field tab is never written over; Export
                    makes it a save to edit (Rafael, 2026-11-08). */}
                <If predicate={() => vectorTools.presetOpen}>
                  {() => (
                    <div class="dsm-preset-window-export">
                      <span
                        role="button"
                        tabIndex={0}
                        class="dsm-preset-window-export-button"
                        data-vector-tools="export-preset"
                        title="Copy this preset into Vector Tools as a new save, whose equations you can edit. Its sliders stay live."
                        onTap={() => vectorTools.exportPresetForEditing()}
                      >
                        Export to Vector Tools for editing
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        class="dsm-preset-window-variables-reset"
                        title={() =>
                          `Close the preset and draw ${
                            vectorTools.presetReturnName ?? "your field"
                          } again, as it was`
                        }
                        onTap={() => vectorTools.closePreset()}
                      >
                        Back to my field
                      </span>
                    </div>
                  )}
                </If>
                <div
                  class="dsm-preset-window-motion"
                  role="group"
                  aria-label="Moving or still"
                >
                  {(["moving", "still"] as const).map((choice) => (
                    <span
                      role="button"
                      tabIndex={0}
                      data-value={choice}
                      class={() => ({
                        "dsm-preset-window-motion-choice": true,
                        "dsm-preset-window-motion-selected":
                          (choice === "still") === settings().still,
                      })}
                      aria-pressed={() =>
                        (choice === "still") === settings().still
                          ? "true"
                          : "false"
                      }
                      title={
                        choice === "still"
                          ? "The clock stopped: each preset as one moment"
                          : "The clock running: each preset changing over time"
                      }
                      onTap={() =>
                        vectorTools.setPresetsStill(choice === "still")
                      }
                    >
                      {choice === "still" ? "Still" : "Moving"}
                    </span>
                  ))}
                </div>
                <div
                  class="dsm-preset-window-motion"
                  role="group"
                  aria-label="Majestic or explanatory"
                >
                  {(["majestic", "explanatory"] as const).map((choice) => (
                    <span
                      role="button"
                      tabIndex={0}
                      data-value={choice}
                      class={() => ({
                        "dsm-preset-window-motion-choice": true,
                        "dsm-preset-window-motion-selected":
                          choice === vectorTools.demoMode,
                      })}
                      aria-pressed={() =>
                        choice === vectorTools.demoMode ? "true" : "false"
                      }
                      title={
                        choice === "majestic"
                          ? "The field as a moving picture, on the dark, with what makes it"
                          : "The textbook figure: graph paper, a probe, arrows and exact lines"
                      }
                      onTap={() => vectorTools.setDemoMode(choice)}
                    >
                      {choice === "majestic" ? "Majestic" : "Explanatory"}
                    </span>
                  ))}
                </div>
                <If predicate={() => vectorTools.presetTakeaway !== undefined}>
                  {() => (
                    <div
                      class="dsm-preset-window-takeaway"
                      role="note"
                      aria-label="What to take away"
                    >
                      <span class="dsm-preset-window-takeaway-head">
                        Takeaway
                      </span>
                      {() => vectorTools.presetTakeaway ?? ""}
                    </div>
                  )}
                </If>
                <If predicate={() => vectorTools.colorLegend !== undefined}>
                  {() => (
                    <div
                      class="dsm-preset-window-legend"
                      role="group"
                      aria-label="What the colour means"
                    >
                      <div class="dsm-preset-window-legend-quantity">
                        {() => vectorTools.colorLegend?.quantity ?? ""}
                      </div>
                      <div
                        class="dsm-preset-window-legend-bar"
                        onUpdate={(element: HTMLElement) =>
                          setBackground(
                            element,
                            vectorTools.colorLegend?.gradient ?? ""
                          )
                        }
                        didMount={(element: HTMLElement) =>
                          setBackground(
                            element,
                            vectorTools.colorLegend?.gradient ?? ""
                          )
                        }
                      />
                      <div class="dsm-preset-window-legend-ends">
                        <span>{() => vectorTools.colorLegend?.low ?? ""}</span>
                        <span>{() => vectorTools.colorLegend?.zero ?? ""}</span>
                        <span>{() => vectorTools.colorLegend?.high ?? ""}</span>
                      </div>
                    </div>
                  )}
                </If>
                <If predicate={() => vectorTools.presetVariables.length > 0}>
                  {() => (
                    <div
                      class="dsm-preset-window-variables"
                      role="group"
                      aria-label="The field's variables"
                    >
                      <div class="dsm-preset-window-variables-head">
                        <span class="dsm-preset-window-group-label">
                          Variables
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          class="dsm-preset-window-variables-reset"
                          onTap={() => vectorTools.resetPresetVariables()}
                        >
                          Reset
                        </span>
                      </div>
                      <For
                        each={() => vectorTools.presetVariableRows}
                        key={(row: PresetVariableRow) => row.key}
                      >
                        {(row: () => PresetVariableRow) => (
                          <div>
                            {IfElse(
                              () => row().variable?.toggle !== undefined,
                              {
                                true: () => (
                                  <label
                                    class="dsm-preset-window-variable dsm-preset-window-switch"
                                    title={() => row().about}
                                  >
                                    <input
                                      type="checkbox"
                                      // On mount too: onUpdate does not run
                                      // there, and a box left unticked over a
                                      // switch that was on swallowed the first
                                      // click.
                                      didMount={(element: HTMLInputElement) => {
                                        element.checked =
                                          row().variable?.current === 1;
                                      }}
                                      onUpdate={(element: HTMLInputElement) => {
                                        element.checked =
                                          row().variable?.current === 1;
                                      }}
                                      onChange={(event: Event) =>
                                        vectorTools.setPresetVariable(
                                          row().variable?.id ?? "",
                                          (event.target as HTMLInputElement)
                                            .checked
                                            ? 1
                                            : 0
                                        )
                                      }
                                    />
                                    <span>{() => row().variable?.toggle}</span>
                                  </label>
                                ),
                                false: () => (
                                  <div class="dsm-preset-window-variable">
                                    <span class="dsm-preset-window-variable-label">
                                      <span
                                        class="dsm-preset-window-variable-name"
                                        title={() => row().about}
                                      >
                                        {() => nameParts(row().name).base}
                                        <span class="dsm-preset-window-variable-sub">
                                          {() => nameParts(row().name).sub}
                                        </span>
                                      </span>
                                      <If predicate={() => row().hasPosition}>
                                        {() => (
                                          <span
                                            role="button"
                                            tabIndex={0}
                                            class="dsm-preset-window-position-link"
                                            data-owner={() => row().name}
                                            title={() =>
                                              `Move ${ownerAbout(row().name).toLowerCase()}: its coordinates in a small window`
                                            }
                                            didMount={(
                                              element: HTMLElement
                                            ) => {
                                              element.addEventListener(
                                                "click",
                                                () => {
                                                  const rect =
                                                    element.getBoundingClientRect();
                                                  vectorTools.openPositionPopup(
                                                    row().name,
                                                    rect.right + 12,
                                                    rect.top - 10
                                                  );
                                                }
                                              );
                                            }}
                                          >
                                            position
                                          </span>
                                        )}
                                      </If>
                                    </span>
                                    <If
                                      predicate={() =>
                                        row().variable !== undefined
                                      }
                                    >
                                      {() =>
                                        slider(
                                          vectorTools,
                                          () => row().variable!
                                        )
                                      }
                                    </If>
                                  </div>
                                ),
                              }
                            )}
                          </div>
                        )}
                      </For>
                    </div>
                  )}
                </If>
                <If predicate={() => vectorTools.presetParts.length > 0}>
                  {() => (
                    <div
                      class="dsm-preset-window-variables"
                      role="group"
                      aria-label="What is drawn"
                    >
                      <div class="dsm-preset-window-variables-head">
                        <span class="dsm-preset-window-group-label">Show</span>
                      </div>
                      <For
                        each={() => vectorTools.presetParts}
                        key={(part: { id: string }) => part.id}
                      >
                        {(part: () => (typeof vectorTools.presetParts)[0]) => (
                          <label class="dsm-preset-window-variable dsm-preset-window-switch">
                            <input
                              type="checkbox"
                              didMount={(element: HTMLInputElement) => {
                                element.checked = part().shown;
                              }}
                              onUpdate={(element: HTMLInputElement) => {
                                element.checked = part().shown;
                              }}
                              onChange={(event: Event) =>
                                vectorTools.setPresetPartShown(
                                  part().id,
                                  (event.target as HTMLInputElement).checked
                                )
                              }
                            />
                            <span>
                              {() => part().label}{" "}
                              <span class="dsm-preset-window-variable-name">
                                {() => nameParts(part().name ?? "").base}
                                <span class="dsm-preset-window-variable-sub">
                                  {() => nameParts(part().name ?? "").sub}
                                </span>
                              </span>
                            </span>
                          </label>
                        )}
                      </For>
                    </div>
                  )}
                </If>
              </div>
              <div class="dsm-preset-window-list">
                <For
                  each={() => [...vectorTools.galleryByCategory]}
                  key={(group: { id: string }) => group.id}
                >
                  {(group: () => (typeof vectorTools.galleryByCategory)[0]) => (
                    <div class="dsm-preset-window-group">
                      <div class="dsm-preset-window-group-label">
                        {() => group().label}
                      </div>
                      <For
                        each={() => [...group().presets]}
                        key={(preset: GalleryPreset) => preset.id}
                      >
                        {(preset: () => GalleryPreset) => (
                          <div
                            role="button"
                            tabIndex={0}
                            data-preset={() => preset().id}
                            title={() =>
                              vectorTools.is3d
                                ? preset().space.blurb
                                : preset().blurb
                            }
                            class={() => ({
                              "dsm-preset-window-item": true,
                              "dsm-preset-window-active":
                                vectorTools.activePresetId === preset().id,
                            })}
                            onTap={() =>
                              vectorTools.applyGalleryPreset(
                                preset().id,
                                vectorTools.galleryWithLook
                              )
                            }
                          >
                            <span
                              class="dsm-preset-window-swatch"
                              // On mount as well: a window opened and left
                              // alone is never updated, and its swatches were
                              // blank.
                              didMount={(element: HTMLElement) =>
                                setBackground(
                                  element,
                                  swatchFor(preset(), vectorTools.is3d)
                                )
                              }
                              onUpdate={(element: HTMLElement) =>
                                setBackground(
                                  element,
                                  swatchFor(preset(), vectorTools.is3d)
                                )
                              }
                            />
                            <span class="dsm-preset-window-name">
                              {() => preset().name}
                            </span>
                          </div>
                        )}
                      </For>
                    </div>
                  )}
                </For>
                <label class="dsm-preset-window-look">
                  <input
                    type="checkbox"
                    didMount={(element: HTMLInputElement) => {
                      element.checked = vectorTools.galleryWithLook;
                    }}
                    onUpdate={(element: HTMLInputElement) => {
                      element.checked = vectorTools.galleryWithLook;
                    }}
                    onChange={(event: Event) =>
                      vectorTools.setGalleryWithLook(
                        (event.target as HTMLInputElement).checked
                      )
                    }
                  />
                  Whole look: particles, speed and framing too
                </label>
              </div>
            </div>
          )}
        </If>
        {positionPopup(vectorTools)}
      </div>
    );
  }
}

type SliderVariable = NonNullable<PresetVariableRow["variable"]>;

/** A preset variable's slider and its value. */
function slider(vectorTools: VectorTools, v: () => SliderVariable) {
  const sync = (element: HTMLInputElement, force: boolean) => {
    element.min = String(v().min);
    element.max = String(v().max);
    element.step = String(v().step ?? (v().max - v().min) / 200);
    if (force || document.activeElement !== element)
      element.value = String(v().current);
  };
  return (
    <span class="dsm-preset-window-slider">
      <input
        type="range"
        didMount={(element: HTMLInputElement) => sync(element, true)}
        onUpdate={(element: HTMLInputElement) => sync(element, false)}
        onInput={(event: Event) =>
          vectorTools.setPresetVariable(
            v().id,
            Number((event.target as HTMLInputElement).value)
          )
        }
      />
      <span class="dsm-preset-window-variable-value">
        {() => formatValue(v().current)}
      </span>
    </span>
  );
}

/**
 * A small window of x, y (and z) sliders for one thing placed on the
 * graph, titled by its name: dragged by its title, resized from its
 * corner. Rafael, 2026-11-08: the charges' coordinate sliders made the
 * list a wall; a "position" link under each name opens this instead.
 *
 * Dragged by moving the element directly, not through a re-render, so it
 * keeps up with the pointer; where it is left is stored on release.
 */
function positionPopup(vectorTools: VectorTools) {
  const popup = () => vectorTools.positionPopup;
  return (
    <If predicate={() => popup() !== undefined}>
      {() => (
        <div
          class="dsm-position-popup"
          role="dialog"
          aria-label={() => `${popup()?.owner ?? ""} position`}
          didMount={(element: HTMLElement) => placePopup(element, popup())}
          onUpdate={(element: HTMLElement) => placePopup(element, popup())}
        >
          <div
            class="dsm-position-popup-head"
            didMount={(element: HTMLElement) => dragPopup(element, vectorTools)}
          >
            <span
              class="dsm-preset-window-variable-name"
              title={() => ownerAbout(popup()?.owner ?? "")}
            >
              {() => nameParts(popup()?.owner ?? "").base}
              <span class="dsm-preset-window-variable-sub">
                {() => nameParts(popup()?.owner ?? "").sub}
              </span>
            </span>
            <span
              role="button"
              tabIndex={0}
              class="dsm-preset-window-button"
              aria-label="Close"
              title="Close"
              onTap={() => vectorTools.closePositionPopup()}
            >
              ×
            </span>
          </div>
          <For
            each={() => vectorTools.positionSliders(popup()?.owner ?? "")}
            key={(v: { id: string }) => v.id}
          >
            {(v: () => SliderVariable & { axis: string }) => (
              <div class="dsm-position-popup-row">
                <span class="dsm-position-popup-axis">
                  {() => `${v().axis} =`}
                </span>
                {slider(vectorTools, v)}
              </div>
            )}
          </For>
        </div>
      )}
    </If>
  );
}

function placePopup(element: HTMLElement, at: VectorTools["positionPopup"]) {
  if (at === undefined || element.dataset.dragging === "true") return;
  const width = Math.max(160, at.width);
  const left = Math.min(Math.max(4, at.left), window.innerWidth - width - 4);
  const top = Math.min(Math.max(4, at.top), window.innerHeight - 60);
  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
  element.style.width = `${width}px`;
  if (at.height > 0) element.style.height = `${at.height}px`;
}

function dragPopup(head: HTMLElement, vectorTools: VectorTools) {
  head.addEventListener("pointerdown", (down: PointerEvent) => {
    if ((down.target as HTMLElement).closest('[role="button"]') !== null)
      return;
    const popup = head.parentElement;
    if (popup === null) return;
    down.preventDefault();
    head.setPointerCapture(down.pointerId);
    popup.dataset.dragging = "true";
    const startX = down.clientX - popup.offsetLeft;
    const startY = down.clientY - popup.offsetTop;
    const move = (event: PointerEvent) => {
      popup.style.left = `${event.clientX - startX}px`;
      popup.style.top = `${event.clientY - startY}px`;
    };
    const up = () => {
      head.removeEventListener("pointermove", move);
      head.removeEventListener("pointerup", up);
      head.removeEventListener("pointercancel", up);
      popup.dataset.dragging = "false";
      const at = vectorTools.positionPopup;
      if (at !== undefined) {
        at.left = popup.offsetLeft;
        at.top = popup.offsetTop;
      }
    };
    head.addEventListener("pointermove", move);
    head.addEventListener("pointerup", up);
    head.addEventListener("pointercancel", up);
  });
  // The size the corner was dragged to, kept for the next one opened.
  const popup = head.parentElement;
  if (popup !== null && typeof ResizeObserver !== "undefined")
    new ResizeObserver(() => {
      const at = vectorTools.positionPopup;
      if (at === undefined || popup.offsetWidth === 0) return;
      at.width = popup.offsetWidth;
      at.height = popup.offsetHeight;
    }).observe(popup);
}

/**
 * Sets a background only when it changed. The window re-renders many times
 * a second while a preset moves, and writing each swatch's thumbnail (a
 * data URL) again on every one made the list flicker.
 */
const lastBackground = new WeakMap<HTMLElement, string>();
function setBackground(element: HTMLElement, background: string) {
  if (lastBackground.get(element) === background) return;
  lastBackground.set(element, background);
  element.style.background = background;
}

/** Greek letters a preset's variable may be named with, as shown. */
const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  theta: "θ",
  lambda: "λ",
  mu: "μ",
  rho: "ρ",
  sigma: "σ",
  tau: "τ",
  phi: "φ",
  omega: "ω",
};

/**
 * A variable's name split for display: `q_{1}` is q with a subscript 1, and
 * `\theta_{0}` is θ with a subscript 0.
 */
function nameParts(name: string) {
  const match = /^(?:([A-Za-z])|\\([a-z]+))(?:_\{?([A-Za-z0-9]+)\}?)?$/.exec(
    name
  );
  if (match === null) return { base: name, sub: "" };
  const base = match[1] ?? GREEK[match[2]] ?? name;
  return { base, sub: match[3] ?? "" };
}

/** A slider's value, to three significant figures. */
function formatValue(value: number) {
  return Number(value.toPrecision(3)).toString();
}

/**
 * A preset's swatch: its thumbnail, photographed as the flow draws it on this
 * product (see `presetThumbnails.ts`), so the list reads as the pictures
 * rather than as names. Under it, and in its place for a preset without one
 * yet, a glow in its palette on its own dark, hottest at the centre.
 */
function swatchFor(preset: GalleryPreset, is3d: boolean) {
  const thumb = PRESET_THUMBNAILS[preset.id];
  const glow = glowFor(preset);
  if (thumb === undefined) return glow;
  return `url("${is3d ? thumb.space : thumb.plane}") center / cover no-repeat, ${glow}`;
}

function glowFor(preset: GalleryPreset) {
  const stops = paletteStops(preset.palette);
  const dark = preset.backdrop ?? "#0d1020";
  if (stops.length === 0) return dark;
  const css = (rgb: readonly number[]) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  const at = (t: number) =>
    stops.reduce((best, stop) =>
      Math.abs(stop.at - t) < Math.abs(best.at - t) ? stop : best
    ).rgb;
  return `radial-gradient(circle at 50% 50%, ${css(at(1))} 0%, ${css(
    at(0.7)
  )} 28%, ${css(at(0.4))} 52%, transparent 78%), ${dark}`;
}
