import VectorTools from "..";
import { Component, jsx } from "#DCGView";
import { For, If } from "#components";
import { paletteStops } from "../../../field-rendering/palettes";
import type { GalleryPreset } from "../gallery";
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
                      each={() => vectorTools.presetVariables}
                      key={(v: { id: string }) => v.id}
                    >
                      {(v: () => (typeof vectorTools.presetVariables)[0]) => (
                        <label class="dsm-preset-window-variable">
                          <span class="dsm-preset-window-variable-name">
                            {() => nameParts(v().name).base}
                            <span class="dsm-preset-window-variable-sub">
                              {() => nameParts(v().name).sub}
                            </span>
                          </span>
                          <input
                            type="range"
                            onUpdate={(element: HTMLInputElement) => {
                              element.min = String(v().min);
                              element.max = String(v().max);
                              element.step = String(
                                v().step ?? (v().max - v().min) / 200
                              );
                              if (document.activeElement !== element)
                                element.value = String(v().current);
                            }}
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
                        </label>
                      )}
                    </For>
                  </div>
                )}
              </If>
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
                            didMount={(element: HTMLElement) => {
                              element.style.background = swatchFor(
                                preset(),
                                vectorTools.is3d
                              );
                            }}
                            onUpdate={(element: HTMLElement) => {
                              element.style.background = swatchFor(
                                preset(),
                                vectorTools.is3d
                              );
                            }}
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
              <label class="dsm-preset-window-look">
                <input
                  type="checkbox"
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
          )}
        </If>
      </div>
    );
  }
}

/** A variable's name split for display: `q_{1}` is q with a subscript 1. */
function nameParts(name: string) {
  const match = /^([A-Za-z])(?:_\{?([A-Za-z0-9]+)\}?)?$/.exec(name);
  return { base: match?.[1] ?? name, sub: match?.[2] ?? "" };
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
