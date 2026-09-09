export interface DoomKeyEvent {
  pressed: boolean;
  key: number;
}

const KEY = {
  Enter: 13, Escape: 27, " ": 32,
  ArrowLeft: 0xac, ArrowUp: 0xad, ArrowRight: 0xae, ArrowDown: 0xaf,
  ControlLeft: 0xa3, ControlRight: 0xa3, ShiftLeft: 0x80, ShiftRight: 0x80,
  AltLeft: 0x81, AltRight: 0x81, Tab: 9, Backspace: 127,
} as const;

export default class DoomInput {
  private readonly queue: DoomKeyEvent[] = [];
  private readonly held = new Set<number>();
  private active = false;

  constructor(private readonly target: HTMLElement) {
    target.tabIndex = 0;
    target.addEventListener("click", this.capture);
    target.addEventListener("keydown", this.keyDown);
    target.addEventListener("keyup", this.keyUp);
    target.addEventListener("mousemove", this.mouseMove);
    target.addEventListener("mousedown", this.mouseDown);
    target.addEventListener("mouseup", this.mouseUp);
    document.addEventListener("pointerlockchange", this.lockChanged);
    window.addEventListener("blur", this.releaseAll);
  }

  poll() {
    return this.queue.shift();
  }

  destroy() {
    this.releaseAll();
    this.target.removeEventListener("click", this.capture);
    this.target.removeEventListener("keydown", this.keyDown);
    this.target.removeEventListener("keyup", this.keyUp);
    this.target.removeEventListener("mousemove", this.mouseMove);
    this.target.removeEventListener("mousedown", this.mouseDown);
    this.target.removeEventListener("mouseup", this.mouseUp);
    document.removeEventListener("pointerlockchange", this.lockChanged);
    window.removeEventListener("blur", this.releaseAll);
    if (document.pointerLockElement === this.target) document.exitPointerLock();
  }

  private readonly capture = () => {
    this.target.focus();
    void this.target.requestPointerLock();
  };

  private translate(event: KeyboardEvent) {
    const mapped = KEY[event.code as keyof typeof KEY];
    if (mapped !== undefined) return mapped;
    if (event.key.length === 1) return event.key.toLowerCase().charCodeAt(0);
    return undefined;
  }

  private readonly keyDown = (event: KeyboardEvent) => {
    if (!this.active) return;
    const key = this.translate(event);
    if (key === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.held.has(key)) return;
    this.held.add(key);
    this.queue.push({ pressed: true, key });
  };

  private readonly keyUp = (event: KeyboardEvent) => {
    if (!this.active) return;
    const key = this.translate(event);
    if (key === undefined) return;
    event.preventDefault();
    event.stopPropagation();
    this.held.delete(key);
    this.queue.push({ pressed: false, key });
  };

  private readonly mouseMove = (event: MouseEvent) => {
    if (!this.active) return;
    // Doom's native controls consume arrow-key events. Convert horizontal
    // relative mouse movement into short turn pulses without altering gameplay.
    const amount = Math.min(8, Math.floor(Math.abs(event.movementX) / 2));
    const key = event.movementX < 0 ? KEY.ArrowLeft : KEY.ArrowRight;
    for (let i = 0; i < amount; i++) {
      this.queue.push({ pressed: true, key }, { pressed: false, key });
    }
  };

  private readonly mouseDown = (event: MouseEvent) => {
    if (!this.active) return;
    event.preventDefault();
    const key = event.button === 0 ? KEY.ControlLeft : event.button === 2 ? KEY[" "] : KEY.ShiftLeft;
    this.queue.push({ pressed: true, key });
  };

  private readonly mouseUp = (event: MouseEvent) => {
    if (!this.active) return;
    event.preventDefault();
    const key = event.button === 0 ? KEY.ControlLeft : event.button === 2 ? KEY[" "] : KEY.ShiftLeft;
    this.queue.push({ pressed: false, key });
  };

  private readonly lockChanged = () => {
    this.active = document.pointerLockElement === this.target;
    if (!this.active) this.releaseAll();
  };

  private readonly releaseAll = () => {
    for (const key of this.held) this.queue.push({ pressed: false, key });
    this.held.clear();
    this.active = false;
  };
}
