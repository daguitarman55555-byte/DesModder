import type AudioLab from ".";
import { listenToMessageDown, postMessageUp } from "#utils/messages.ts";
import { downsample, peakFrequency, pointsLatex, rms, spotifyUri } from "./dsp";

const QUALITY = {
  performance: { fftSize: 1024, interval: 1000 / 24 },
  balanced: { fftSize: 2048, interval: 1000 / 40 },
  quality: { fftSize: 4096, interval: 1000 / 60 },
} as const;

type Quality = keyof typeof QUALITY;

export default class AudioLabRuntime {
  private context?: AudioContext;
  private analyser?: AnalyserNode;
  private source?: AudioNode;
  private capture?: MediaStream;
  private objectUrl?: string;
  private frame?: number;
  private lastFrame = 0;
  private timeData = new Float32Array();
  private frequencyData = new Float32Array();
  private quality: Quality = "balanced";
  private readonly audio: HTMLAudioElement;
  private readonly wave: HTMLCanvasElement;
  private readonly spectrum: HTMLCanvasElement;
  private readonly spotifyResponses = new Map<
    string,
    {
      resolve: (value?: { name: string }) => void;
      reject: (error: Error) => void;
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
    listenToMessageDown((message) => {
      if (message.type !== "audio-lab-spotify-response") return false;
      const pending = this.spotifyResponses.get(message.requestId);
      if (pending === undefined) return false;
      this.spotifyResponses.delete(message.requestId);
      if (message.ok) pending.resolve(message.value);
      else
        pending.reject(new Error(message.error ?? "Spotify request failed."));
      return false;
    });
    this.frame = requestAnimationFrame(this.draw);
    void this.refreshSpotifyStatus();
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
          () => this.status("Spotify playback started."),
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
    this.find<HTMLButtonElement>("analyze").addEventListener("click", () => {
      void this.analyzeTab();
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

  private async spotifyRequest(
    action: "sign-in" | "status" | "sign-out" | "play",
    uri?: string
  ) {
    const requestId = crypto.randomUUID();
    return await new Promise<{ name: string } | undefined>(
      (resolve, reject) => {
        this.spotifyResponses.set(requestId, { resolve, reject });
        postMessageUp({
          type: "audio-lab-spotify",
          requestId,
          action,
          ...(uri === undefined ? {} : { uri }),
        });
        setTimeout(() => {
          if (!this.spotifyResponses.delete(requestId)) return;
          reject(
            new Error(
              "Spotify did not respond. Reload the extension and retry."
            )
          );
        }, 120_000);
      }
    );
  }

  private async refreshSpotifyStatus() {
    try {
      const profile = await this.spotifyRequest("status");
      this.setSignedIn(profile?.name);
    } catch {
      this.setSignedIn();
    }
  }

  private async signIn() {
    this.status("Opening Spotify sign-in…");
    try {
      const profile = await this.spotifyRequest("sign-in");
      this.setSignedIn(profile?.name);
      this.status("Spotify connected successfully.");
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
      this.source = this.context!.createMediaStreamSource(this.capture);
      this.source.connect(this.analyser!);
      this.find<HTMLButtonElement>("export").disabled = false;
      this.status("Live waveform and spectrum analysis is active.");
    } catch (error) {
      this.status(
        error instanceof Error ? error.message : "Tab analysis was cancelled.",
        true
      );
    }
  }

  private loadFile(file?: File) {
    if (!file?.type.startsWith("audio/")) {
      this.status("Choose a supported audio file.", true);
      return;
    }
    if (this.objectUrl !== undefined) URL.revokeObjectURL(this.objectUrl);
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
    this.analyser = this.context.createAnalyser();
    this.configureAnalyser();
  }

  private ensureAudioElementGraph() {
    if (this.source !== undefined) return;
    this.setupContext();
    this.source = this.context!.createMediaElementSource(this.audio);
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
