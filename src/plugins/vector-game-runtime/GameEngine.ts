export interface GameInputState {
  forward: number;
  strafe: number;
  turn: number;
  action: boolean;
}

export interface GameEngine {
  readonly width: number;
  readonly height: number;
  start: () => Promise<void>;
  step: (dt: number, input: GameInputState) => void;
  render: (target: CanvasRenderingContext2D) => void;
  serialize: () => Uint8Array;
  restore: (state: Uint8Array) => void;
  destroy: () => void;
}

export interface WasmGameExports {
  memory: WebAssembly.Memory;
  game_init: () => void;
  game_step: (dt: number, forward: number, strafe: number, turn: number, action: number) => void;
  game_framebuffer: () => number;
  game_width: () => number;
  game_height: () => number;
  game_state_size: () => number;
  game_save: (pointer: number) => void;
  game_load: (pointer: number) => void;
}

export class WasmGameAdapter implements GameEngine {
  private exports?: WasmGameExports;
  width = 1;
  height = 1;

  constructor(private readonly wasmUrl: string) {}

  async start() {
    const response = await fetch(this.wasmUrl);
    if (!response.ok) throw new Error("Could not load the WebAssembly game module.");
    const result = await WebAssembly.instantiateStreaming(response, { env: {} });
    this.exports = result.instance.exports as unknown as WasmGameExports;
    this.exports.game_init();
    this.width = this.exports.game_width();
    this.height = this.exports.game_height();
  }

  step(dt: number, input: GameInputState) {
    this.require().game_step(dt, input.forward, input.strafe, input.turn, input.action ? 1 : 0);
  }

  render(target: CanvasRenderingContext2D) {
    const api = this.require();
    const offset = api.game_framebuffer();
    const bytes = new Uint8ClampedArray(api.memory.buffer, offset, this.width * this.height * 4);
    target.putImageData(new ImageData(bytes.slice(), this.width, this.height), 0, 0);
  }

  serialize() {
    const api = this.require();
    const size = api.game_state_size();
    const pointer = api.game_framebuffer() + this.width * this.height * 4;
    api.game_save(pointer);
    return new Uint8Array(api.memory.buffer, pointer, size).slice();
  }

  restore(state: Uint8Array) {
    const api = this.require();
    const pointer = api.game_framebuffer() + this.width * this.height * 4;
    new Uint8Array(api.memory.buffer, pointer, state.length).set(state);
    api.game_load(pointer);
  }

  destroy() { this.exports = undefined; }

  private require() {
    if (this.exports === undefined) throw new Error("The game engine is not running.");
    return this.exports;
  }
}
