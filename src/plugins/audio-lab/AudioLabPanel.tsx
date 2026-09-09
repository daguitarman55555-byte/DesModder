import { Component, jsx } from "#DCGView";
import { format } from "#i18n";
import type AudioLab from ".";
import AudioLabRuntime from "./AudioLabRuntime";
import "./AudioLabPanel.less";

export class AudioLabPanel extends Component<{ audioLab: () => AudioLab }> {
  template() {
    let runtime: AudioLabRuntime | undefined;
    return (
      <div
        class="dcg-popover-interior dsm-audio-lab-menu"
        didMount={(element: HTMLElement) => {
          this.props.audioLab().attachPanelElement(element);
          runtime = new AudioLabRuntime(this.props.audioLab(), element);
        }}
        willUnmount={() => {
          runtime?.destroy();
          this.props.audioLab().detachPanelElement();
        }}
      >
        <div class="dcg-popover-title">{format("audio-lab-name")}</div>
        <div class="dsm-audio-lab-body">
          <section>
            <div class="dsm-audio-lab-account">
              <span data-audio-lab="account">Not signed in</span>
              <button data-audio-lab="sign-in" class="dcg-btn-blue">
                Sign in to Spotify
              </button>
              <button
                data-audio-lab="sign-out"
                class="dcg-btn-light-gray"
                hidden
              >
                Sign out
              </button>
            </div>
          </section>
          <section>
            <label>Spotify link</label>
            <div class="dsm-audio-lab-inline">
              <input data-audio-lab="spotify-url" type="url" />
              <button
                data-audio-lab="spotify-load"
                class="dcg-btn-blue"
                disabled
              >
                Play
              </button>
            </div>
            <button
              data-audio-lab="analyze"
              class="dcg-btn-light-gray dsm-audio-lab-wide"
            >
              Analyze tab audio
            </button>
            <p class="dsm-audio-lab-hint">
              Spotify plays through an active Spotify tab or app. For live
              graphs, select that tab and enable Share tab audio.
            </p>
          </section>
          <section>
            <label class="dsm-audio-lab-file">
              Local audio file
              <input data-audio-lab="file" type="file" accept="audio/*" />
            </label>
            <span data-audio-lab="filename" class="dsm-audio-lab-hint" />
            <div data-audio-lab-placeholder="audio" />
            <div class="dsm-audio-lab-inline">
              <button data-audio-lab="play" class="dcg-btn-light-gray" disabled>
                Play / pause
              </button>
              <input
                data-audio-lab="volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value="0.8"
              />
            </div>
          </section>
          <section>
            <div class="dsm-audio-lab-plot-title">
              <strong>Waveform</strong>
              <span>amplitude</span>
            </div>
            <div data-audio-lab-placeholder="wave" />
            <div class="dsm-audio-lab-plot-title">
              <strong>Spectrum</strong>
              <span>frequency</span>
            </div>
            <div data-audio-lab-placeholder="spectrum" />
          </section>
          <section class="dsm-audio-lab-metrics">
            <span>
              Peak: <strong data-audio-lab="peak">—</strong>
            </span>
            <span>
              RMS: <strong data-audio-lab="rms">—</strong>
            </span>
            <select data-audio-lab="quality">
              <option value="performance">Performance</option>
              <option value="balanced" selected>
                Balanced
              </option>
              <option value="quality">Quality</option>
            </select>
          </section>
        </div>
        <div class="dsm-audio-lab-footer">
          <button
            data-audio-lab="export"
            class="dcg-btn-blue dsm-audio-lab-wide"
            disabled
          >
            Send snapshot to Desmos
          </button>
          <p
            data-audio-lab="status"
            class="dsm-audio-lab-status"
            role="status"
          />
        </div>
      </div>
    );
  }
}

export function AudioLabPanelFunc(audioLab: AudioLab) {
  return <AudioLabPanel audioLab={() => audioLab} />;
}
