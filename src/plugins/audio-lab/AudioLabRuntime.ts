import type AudioLab from ".";
import { listenToMessageDown, postMessageUp } from "#utils/messages.ts";
import { downsample, peakFrequency, pointsLatex, rms, spotifyUri } from "./dsp";

const QUALITY = {
  performance: { fftSize: 1024, interval: 1000 / 24 },
  balanced: { fftSize: 2048, interval: 1000 / 40 },
  quality: { fftSize: 4096, interval: 1000 / 60 },
} as const;

type Quality = keyof typeof QUALITY;
type SpotifyAction =
  | "sign-in"
  | "status"
  | "sign-out"
  | "play"
  | "pause"
  | "resume"
  | "next"
  | "previous"
  | "playback-state"
  | "open";

interface SpotifyProfile {
  name: string;
}

interface SpotifyPlayback {
  active: boolean;
  isPlaying?: boolean;
  progressMs?: number;
  durationMs?: number;
  track?: string;
  artist?: string;
  device?: string;
}

export default class AudioLabRuntime {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: AudioNode;
  private localSource?: MediaElementAudioSourceNode;
  private sourceMode?: "local" | "capture";
  private capture?: MediaStream;
  private objectUrl?: string;
  private frame?: number;
  private lastFrame = 0;
  private timeData = new Float32Array();
  private frequencyData = new Float32Array();
  private quality: Quality = "balanced";
  private spotifyPlaying = false;
  private readonly playbackPoll: ReturnType<typeof setInterval>;
  private readonly messageListener: (event: MessageEvent) => void;
  private readonly audio: HTMLAudioElement;
  private readonly wave: HTMLCanvasElement;
  private readonly spectrum: HTMLCanvasElement;
  private readonly spotifyResponses = new Map<
    string,
    {
      resolve: (value?: unknown) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(
    private readonly plugin: AudioLab,
    private readonly root: HTMLElement
  ) {
    this.hydrateMediaElements();
    this.audio = this.find<HTMLAudioElement>("audio");
    this.wave = this.find<HTMLCanvasElement>("wave");
    this.spectrum = this.find<HTMLCanvasElement>("spectrum");
    this.bind();
    this.messageListener = listenToMessageDown((message) => {
      if (message.type !== "audio-lab-spotify-response") return false;
      const pending = this.spotifyResponses.get(message.requestId);
      if (pending === undefined) return false;
      this.spotifyResponses.delete(message.requestId);
      clearTimeout(pending.timeout);
      if (message.ok) pending.resolve(message.value);
      else
        pending.reject(new Error(message.error ?? "Spotify request failed."));
      return false;
    });
    this.frame = requestAnimationFrame(this.draw);
    void this.refreshSpotifyStatus();
    this.playbackPoll = setInterval(() => {
      void this.refreshPlayback();
    }, 2500);
  }

  private hydrateMediaElements() {
    const replace = (name: string, element: HTMLElement) => {
      element.dataset.audioLab = name;
      this.root
        .querySelector(`[data-audio-lab-placeholder="${name}"]`)
        ?.replaceWith(element);
    };
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    replace("audio", audio);
    for (const name of ["wave", "spectrum"]) {
      const canvas = document.createElement("canvas");
      canvas.className = "dsm-audio-lab-canvas";
      replace(name, canvas);
    }
  }

  destroy() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    window.removeEventListener("message", this.messageListener, false);
    if (this.playbackPoll !== undefined) clearInterval(this.playbackPoll);
    for (const pending of this.spotifyResponses.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Audio Lab closed."));
    }
    this.spotifyResponses.clear();
    this.capture?.getTracks().forEach((track) => track.stop());
    this.source?.disconnect();
    void this.context?.close();
    if (this.objectUrl !== undefined) URL.revokeObjectURL(this.objectUrl);
  }

  private find<T extends Element>(name: string) {
    const element = this.root.querySelector<T>(`[data-audio-lab="${name}"]`);
    if (element === null) throw new Error(`Missing Audio Lab element: ${name}`);
    return element;
  }

  private bind() {
    const url = this.find<HTMLInputElement>("spotify-url");
    url.value = this.plugin.spotifyUrl;
    this.find<HTMLButtonElement>("sign-in").addEventListener("click", () => {
      void this.signIn();
    });
    this.find<HTMLButtonElement>("sign-out").addEventListener("click", () => {
      void this.signOut();
    });
    this.find<HTMLButtonElement>("open-spotify").addEventListener(
      "click",
      () => {
        void this.spotifyRequest("open").catch((error: unknown) =>
          this.status(
            error instanceof Error ? error.message : "Could not open Spotify.",
            true
          )
        );
      }
    );
    this.find<HTMLButtonElement>("spotify-load").addEventListener(
      "click",
      () => {
        const uri = spotifyUri(url.value);
        if (uri === undefined) {
          this.status("Paste a valid Spotify link.", true);
          return;
        }
        this.plugin.setSpotifyUrl(url.value.trim());
        void this.spotifyRequest("play", uri).then(
          () => {
            this.status("Spotify playback started.");
            void this.refreshPlayback();
          },
          (error: unknown) =>
            this.status(
              error instanceof Error
                ? error.message
                : "Spotify playback failed.",
              true
            )
        );
      }
    );
    this.find<HTMLButtonElement>("spotify-toggle").addEventListener(
      "click",
      () => {
        this.runPlaybackCommand(this.spotifyPlaying ? "pause" : "resume").catch(
          () => undefined
        );
      }
    );
    this.find<HTMLButtonElement>("previous").addEventListener("click", () =>
      this.runPlaybackCommand("previous").catch(() => undefined)
    );
    this.find<HTMLButtonElement>("next").addEventListener("click", () =>
      this.runPlaybackCommand("next").catch(() => undefined)
    );
    this.find<HTMLButtonElement>("analyze").addEventListener("click", () => {
      if (this.capture === undefined) void this.analyzeTab();
      else this.stopTabAnalysis();
    });
    const file = this.find<HTMLInputElement>("file");
    file.addEventListener("change", () => this.loadFile(file.files?.[0]));
    this.audio.addEventListener("play", () => this.ensureAudioElementGraph());
    this.find<HTMLButtonElement>("play").addEventListener("click", () => {
      if (this.audio.paused) void this.audio.play();
      else this.audio.pause();
    });
    this.find<HTMLInputElement>("volume").addEventListener("input", (event) => {
      this.audio.volume = Number((event.target as HTMLInputElement).value);
    });
    this.find<HTMLSelectElement>("quality").addEventListener(
      "change",
      (event) => {
        this.quality = (event.target as HTMLSelectElement).value as Quality;
        this.configureAnalyser();
      }
    );
    this.find<HTMLButtonElement>("export").addEventListener("click", () =>
      this.exportSnapshot()
    );
  }

  private async spotifyRequest(action: SpotifyAction, uri?: string) {
    const requestId = crypto.randomUUID();
    return await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.spotifyResponses.delete(requestId)) return;
        reject(
          new Error("Spotify did not respond. Reload the extension and retry.")
        );
      }, 120_000);
      this.spotifyResponses.set(requestId, { resolve, reject, timeout });
      postMessageUp({
        type: "audio-lab-spotify",
        requestId,
        action,
        ...(uri === undefined ? {} : { uri }),
      });
    });
  }

  private async refreshSpotifyStatus() {
    try {
      const profile = await this.spotifyRequest("status");
      this.setSignedIn((profile as SpotifyProfile | undefined)?.name);
      await this.refreshPlayback();
    } catch {
      this.setSignedIn();
    }
  }

  private async signIn() {
    this.status("Opening Spotify sign-in…");
    try {
      const profile = await this.spotifyRequest("sign-in");
      this.setSignedIn((profile as SpotifyProfile | undefined)?.name);
      this.status("Spotify connected successfully.");
      await this.refreshPlayback();
    } catch (error) {
      this.setSignedIn();
      this.status(
        error instanceof Error ? error.message : "Spotify sign-in failed.",
        true
      );
    }
  }

  private async signOut() {
    try {
      await this.spotifyRequest("sign-out");
      this.setSignedIn();
      this.status("Signed out of Spotify.");
    } catch (error) {
      this.status(
        error instanceof Error ? error.message : "Spotify sign-out failed.",
        true
      );
    }
  }

  private setSignedIn(name?: string) {
    const signedIn = name !== undefined;
    this.find<HTMLElement>("account").textContent = signedIn
      ? `Signed in as ${name}`
      : "Not signed in";
    this.find<HTMLButtonElement>("sign-in").hidden = signedIn;
    this.find<HTMLButtonElement>("sign-out").hidden = !signedIn;
    this.find<HTMLButtonElement>("spotify-load").disabled = !signedIn;
    if (!signedIn) this.showPlayback({ active: false });
  }

  private async runPlaybackCommand(
    action: "pause" | "resume" | "next" | "previous"
  ) {
    try {
      await this.spotifyRequest(action);
      await new Promise((resolve) => setTimeout(resolve, 250));
      await this.refreshPlayback();
    } catch (error) {
      this.status(
        error instanceof Error ? error.message : "Playback command failed.",
        true
      );
    }
  }

  private async refreshPlayback() {
    if (!this.find<HTMLButtonElement>("sign-in").hidden) return;
    try {
      const playback = (await this.spotifyRequest(
        "playback-state"
      )) as SpotifyPlayback;
      this.showPlayback(playback);
    } catch {
      // A transient status poll should not replace a useful user-facing message.
    }
  }

  private showPlayback(playback: SpotifyPlayback) {
    this.spotifyPlaying = playback.isPlaying ?? false;
    this.find<HTMLElement>("track").textContent = playback.active
      ? (playback.track ?? "Unknown track")
      : "No active Spotify player";
    this.find<HTMLElement>("artist").textContent = playback.active
      ? [playback.artist, playback.device].filter(Boolean).join(" · ")
      : "Open Spotify and play anything once.";
    this.find<HTMLElement>("playback-time").textContent = `${this.formatTime(
      (playback.progressMs ?? 0) / 1000
    )} / ${this.formatTime((playback.durationMs ?? 0) / 1000)}`;
    const toggle = this.find<HTMLButtonElement>("spotify-toggle");
    toggle.textContent = this.spotifyPlaying ? "Pause" : "Play";
    for (const name of ["spotify-toggle", "previous", "next"])
      this.find<HTMLButtonElement>(name).disabled = !playback.active;
  }

  private formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const whole = Math.floor(seconds);
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
  }

  private async analyzeTab() {
    try {
      this.capture?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      stream.getVideoTracks().forEach((track) => track.stop());
      if (stream.getAudioTracks().length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error(
          "No tab audio was shared. Enable Share tab audio and retry."
        );
      }
      this.capture = new MediaStream(stream.getAudioTracks());
      this.setupContext();
      this.source?.disconnect();
      this.analyser!.disconnect();
      this.source = this.context!.createMediaStreamSource(this.capture);
      this.sourceMode = "capture";
      this.source.connect(this.analyser!);
      this.capture
        .getAudioTracks()[0]
        ?.addEventListener("ended", () => this.stopTabAnalysis());
      this.find<HTMLButtonElement>("export").disabled = false;
      this.find<HTMLButtonElement>("analyze").textContent = "Stop tab analysis";
      this.status("Live waveform and spectrum analysis is active.");
    } catch (error) {
      this.status(
        error instanceof Error ? error.message : "Tab analysis was cancelled.",
        true
      );
    }
  }

  private stopTabAnalysis() {
    const capture = this.capture;
    this.capture = undefined;
    capture?.getTracks().forEach((track) => track.stop());
    if (this.sourceMode === "capture") {
      this.source?.disconnect();
      this.source = undefined;
      this.sourceMode = undefined;
    }
    this.find<HTMLButtonElement>("analyze").textContent = "Analyze tab audio";
    this.status("Tab analysis stopped.");
  }

  private loadFile(file?: File) {
    if (!file?.type.startsWith("audio/")) {
      this.status("Choose a supported audio file.", true);
      return;
    }
    if (this.objectUrl !== undefined) URL.revokeObjectURL(this.objectUrl);
    this.stopTabAnalysis();
    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    this.find<HTMLButtonElement>("play").disabled = false;
    this.find<HTMLButtonElement>("export").disabled = false;
    this.find<HTMLElement>("filename").textContent = file.name;
    this.status("Audio ready.");
  }

  private setupContext() {
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") void this.context.resume();
    if (this.analyser === undefined) {
      this.analyser = this.context.createAnalyser();
      this.configureAnalyser();
    }
  }

  private ensureAudioElementGraph() {
    this.setupContext();
    if (this.sourceMode === "local") return;
    this.source?.disconnect();
    this.analyser!.disconnect();
    this.localSource ??= this.context!.createMediaElementSource(this.audio);
    this.source = this.localSource;
    this.sourceMode = "local";
    this.source.connect(this.analyser!);
    this.analyser!.connect(this.context!.destination);
  }

  private configureAnalyser() {
    if (this.analyser === undefined) return;
    this.analyser.fftSize = QUALITY[this.quality].fftSize;
    this.analyser.smoothingTimeConstant = 0.72;
    this.timeData = new Float32Array(this.analyser.fftSize);
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
  }

  private readonly draw = (timestamp: number) => {
    this.frame = requestAnimationFrame(this.draw);
    if (
      this.analyser === undefined ||
      timestamp - this.lastFrame < QUALITY[this.quality].interval
    )
      return;
    this.lastFrame = timestamp;
    this.analyser.getFloatTimeDomainData(this.timeData);
    this.analyser.getFloatFrequencyData(this.frequencyData);
    this.drawWaveform();
    this.drawSpectrum();
    const rate = this.context?.sampleRate ?? 0;
    this.find<HTMLElement>("peak").textContent = `${Math.round(
      peakFrequency(this.frequencyData, rate, this.analyser.fftSize)
    )} Hz`;
    this.find<HTMLElement>("rms").textContent = rms(this.timeData).toFixed(3);
  };

  private prepareCanvas(canvas: HTMLCanvasElement) {
    const ratio = Math.min(devicePixelRatio, 2);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d")!;
    context.clearRect(0, 0, width, height);
    return { context, width, height };
  }

  private drawWaveform() {
    const { context, width, height } = this.prepareCanvas(this.wave);
    context.strokeStyle = "#2d70b3";
    context.lineWidth = Math.max(1, devicePixelRatio);
    context.beginPath();
    for (let i = 0; i < this.timeData.length; i++) {
      const x = (i / (this.timeData.length - 1)) * width;
      const y = (0.5 - this.timeData[i] * 0.45) * height;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
  }

  private drawSpectrum() {
    const { context, width, height } = this.prepareCanvas(this.spectrum);
    const values = downsample(this.frequencyData, 128);
    context.fillStyle = "#2d70b3";
    values.forEach((value, index) => {
      const normalized = Math.max(0, Math.min(1, (value + 100) / 100));
      const barWidth = width / values.length;
      context.fillRect(
        index * barWidth,
        height * (1 - normalized),
        Math.max(1, barWidth - 1),
        height * normalized
      );
    });
  }

  private exportSnapshot() {
    if (this.analyser === undefined) return;
    const waveform = downsample(this.timeData, 256);
    const spectrum = downsample(this.frequencyData, 192).map((value) =>
      Math.max(0, Math.min(1, (value + 100) / 100))
    );
    this.plugin.calc.setExpressions([
      {
        id: "audio_lab_waveform",
        latex: pointsLatex(waveform, -10, 10, 2.5, 2.5),
        lines: true,
        points: false,
        color: "#2d70b3",
      },
      {
        id: "audio_lab_spectrum",
        latex: pointsLatex(spectrum, -10, 10, 4, -5),
        lines: true,
        points: false,
        color: "#388c46",
      },
    ]);
    this.status("Current waveform and spectrum sent to the expression list.");
  }

  private status(message: string, error = false) {
    const status = this.find<HTMLElement>("status");
    status.textContent = message;
    status.classList.toggle("dsm-audio-lab-error", error);
  }
}
