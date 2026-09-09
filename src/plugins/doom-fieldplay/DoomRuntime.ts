import DoomEngine from "./DoomEngine";
import VectorFrameRenderer, { type DoomRenderMode } from "./VectorFrameRenderer";
import { loadWad, saveWad, type WadInfo } from "./WadStore";

export default class DoomRuntime {
  private readonly nativeCanvas = document.createElement("canvas");
  private readonly vectorCanvas = document.createElement("canvas");
  private readonly renderer: VectorFrameRenderer;
  private readonly engine: DoomEngine;
  private wad?: { buffer: ArrayBuffer; info: WadInfo };
  private frame?: number;
  private mode: DoomRenderMode = "vectors";
  private running = false;

  constructor(private readonly root: HTMLElement) {
    this.nativeCanvas.dataset.doom = "native";
    this.vectorCanvas.dataset.doom = "vectors";
    this.vectorCanvas.className = "dsm-doom-canvas";
    this.root.querySelector("[data-doom-placeholder=native]")?.replaceWith(this.nativeCanvas);
    this.root.querySelector("[data-doom-placeholder=vectors]")?.replaceWith(this.vectorCanvas);
    this.renderer = new VectorFrameRenderer(this.vectorCanvas);
    this.engine = new DoomEngine(this.nativeCanvas, (message) => this.status(message));
    this.bind();
    void this.restore();
  }

  destroy() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.engine.stop();
    this.renderer.destroy();
  }

  private find<T extends Element>(name: string) {
    const element = this.root.querySelector<T>(`[data-doom="${name}"]`);
    if (element === null) throw new Error(`Missing Doom control: ${name}`);
    return element;
  }

  private bind() {
    const input = this.find<HTMLInputElement>("wad");
    input.addEventListener("change", () => void this.choose(input.files?.[0]));
    this.find<HTMLButtonElement>("play").addEventListener("click", () => void this.play());
    this.find<HTMLButtonElement>("stop").addEventListener("click", () => this.stop());
    this.find<HTMLButtonElement>("mode").addEventListener("click", () => {
      this.mode = this.mode === "vectors" ? "faithful" : "vectors";
      this.renderer.setOptions({ mode: this.mode });
      this.find<HTMLButtonElement>("mode").textContent =
        this.mode === "vectors" ? "Vector field" : "Faithful pixels";
    });
    this.find<HTMLButtonElement>("fullscreen").addEventListener("click", () => {
      void this.find<HTMLElement>("stage").requestFullscreen();
    });
    new ResizeObserver(() => this.resize()).observe(this.find<HTMLElement>("stage"));
  }

  private async restore() {
    try {
      this.wad = await loadWad();
      if (this.wad === undefined) {
        this.status("Choose your Doom WAD to begin.");
        return;
      }
      this.ready(this.wad.info);
    } catch (error) {
      this.status(error instanceof Error ? error.message : "Could not load the saved WAD.", true);
    }
  }

  private async choose(file?: File) {
    if (file === undefined) return;
    try {
      const info = await saveWad(file);
      this.wad = await loadWad();
      this.ready(info);
      await this.play();
    } catch (error) {
      this.status(error instanceof Error ? error.message : "The WAD could not be imported.", true);
    }
  }

  private ready(info: WadInfo) {
    this.find<HTMLButtonElement>("play").disabled = false;
    this.find<HTMLElement>("summary").textContent =
      `${info.name} is ready (${Math.round(info.size / 1048576)} MB). It will load automatically next time.`;
    this.status("Ready to play.");
  }

  private async play() {
    if (this.wad === undefined || this.running) return;
    try {
      const stage = this.find<HTMLElement>("stage");
      stage.hidden = false;
      this.resize();
      await this.engine.start(this.wad.buffer, stage);
      this.running = true;
      this.find<HTMLButtonElement>("play").disabled = true;
      this.find<HTMLButtonElement>("stop").disabled = false;
      this.frame = requestAnimationFrame(this.draw);
    } catch (error) {
      this.status(error instanceof Error ? error.message : "Doom could not start.", true);
      this.stop();
    }
  }

  private readonly draw = () => {
    if (!this.running) return;
    this.engine.pushInput();
    this.renderer.uploadCanvas(this.nativeCanvas);
    this.renderer.draw();
    this.frame = requestAnimationFrame(this.draw);
  };

  private resize() {
    const rect = this.find<HTMLElement>("stage").getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height);
  }

  private stop() {
    this.running = false;
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.engine.stop();
    this.find<HTMLButtonElement>("play").disabled = this.wad === undefined;
    this.find<HTMLButtonElement>("stop").disabled = true;
    this.status("Doom stopped.");
  }

  private status(message: string, error = false) {
    const element = this.find<HTMLElement>("status");
    element.textContent = message;
    element.classList.toggle("dsm-doom-error", error);
  }
}
