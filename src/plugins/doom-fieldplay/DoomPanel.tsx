import { Component, jsx } from "#DCGView";
import type DoomFieldplay from ".";

export class DoomPanel extends Component<{ plugin: () => DoomFieldplay }> {
  template() {
    return (
      <div class="dcg-popover-interior dsm-doom-menu">
        <div class="dcg-popover-title">Doom Fieldplay</div>
        <div
          class="dsm-doom-runtime"
          didMount={(element: HTMLElement) => this.props.plugin().mount(element)}
          willUnmount={() => this.props.plugin().unmount()}
        >
          <div class="dsm-doom-first-run">
            <p data-doom="summary">Choose a legally obtained Doom WAD once. It will be remembered.</p>
            <label class="dcg-btn-blue dsm-doom-file">
              Choose Doom WAD
              <input data-doom="wad" type="file" accept=".wad,application/octet-stream" />
            </label>
            <button data-doom="play" class="dcg-btn-blue" disabled>Play Doom</button>
          </div>
          <div data-doom="stage" class="dsm-doom-stage" hidden>
            <div data-doom-placeholder="native" />
            <div data-doom-placeholder="vectors" />
          </div>
          <div class="dsm-doom-controls">
            <button data-doom="mode" class="dcg-btn-light-gray">Vector field</button>
            <button data-doom="fullscreen" class="dcg-btn-light-gray">Fullscreen</button>
            <button data-doom="stop" class="dcg-btn-light-gray" disabled>Stop</button>
          </div>
          <p data-doom="status" class="dsm-doom-status" role="status">Checking for a saved WAD…</p>
          <p class="dsm-doom-help">Click the game for mouse control. WASD/arrow keys move, mouse turns, left click fires, E/space uses, Escape releases the mouse.</p>
        </div>
      </div>
    );
  }
}

export const DoomPanelFunc = (plugin: DoomFieldplay) => <DoomPanel plugin={() => plugin} />;
