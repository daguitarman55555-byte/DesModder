import DoomInput, { type DoomKeyEvent } from "./DoomInput";

interface EmscriptenFS {
  writeFile(path: string, data: Uint8Array): void;
}

interface DoomModule {
  FS: EmscriptenFS;
  canvas: HTMLCanvasElement;
  callMain(args: string[]): void;
  ccall(name: string, returnType: null, argumentTypes: string[], args: number[]): void;
  quit?: (status: number, error: unknown) => void;
}

type DoomFactory = (options: Record<string, unknown>) => Promise<DoomModule>;

declare global {
  interface Window {
    createDesmosDoom?: DoomFactory;
  }
}

let engineScript: Promise<void> | undefined;

function extensionAsset(path: string) {
  const runtime = globalThis.chrome?.runtime;
  return runtime === undefined ? path : runtime.getURL(path);
}

function loadEngineScript() {
  engineScript ??= new Promise<void>((resolve, reject) => {
    if (window.createDesmosDoom !== undefined) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = extensionAsset("assets/doom-engine.js");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The packaged Doom engine could not be loaded."));
    document.head.append(script);
  });
  return engineScript;
}

export default class DoomEngine {
  private module?: DoomModule;
  private input?: DoomInput;
  private running = false;

  constructor(
    readonly nativeCanvas: HTMLCanvasElement,
    private readonly onStatus: (message: string) => void
  ) {
    nativeCanvas.width = 320;
    nativeCanvas.height = 200;
    nativeCanvas.hidden = true;
  }

  async start(wad: ArrayBuffer, inputTarget: HTMLElement) {
    if (this.running) return;
    await loadEngineScript();
    const factory = window.createDesmosDoom;
    if (factory === undefined) throw new Error("The Doom engine factory is missing.");
    this.onStatus("Starting the original Doom engine…");
    const bytes = new Uint8Array(wad);
    this.module = await factory({
      canvas: this.nativeCanvas,
      noInitialRun: true,
      locateFile: (file: string) => extensionAsset(`assets/${file}`),
      preRun: [(module: DoomModule) => module.FS.writeFile("/game.wad", bytes)],
      print: () => undefined,
      printErr: (message: string) => this.onStatus(message),
    });
    this.input = new DoomInput(inputTarget);
    this.module.callMain(["-iwad", "/game.wad"]);
    this.running = true;
    this.onStatus("Doom is running. Click the game to capture the mouse.");
  }

  pushInput() {
    if (!this.running || this.module === undefined || this.input === undefined) return;
    let event: DoomKeyEvent | undefined;
    while ((event = this.input.poll()) !== undefined) {
      this.module.ccall(
        "DG_InjectKey",
        null,
        ["number", "number"],
        [event.pressed ? 1 : 0, event.key]
      );
    }
  }

  stop() {
    this.running = false;
    this.input?.destroy();
    this.input = undefined;
    try {
      this.module?.quit?.(0, new Error("Doom stopped."));
    } catch {
      // Emscripten may report its controlled exit as an exception.
    }
    this.module = undefined;
  }
}
