import type { GameInputState } from "./GameEngine";

export default class InputController {
  private readonly keys = new Set<string>();
  private turn = 0;
  private action = false;

  constructor(private readonly target: HTMLElement) {
    target.tabIndex = 0;
    target.addEventListener("click", this.capture);
    target.addEventListener("keydown", this.keyDown);
    target.addEventListener("keyup", this.keyUp);
    target.addEventListener("mousemove", this.mouseMove);
    target.addEventListener("mousedown", this.mouseDown);
    target.addEventListener("mouseup", this.mouseUp);
    window.addEventListener("blur", this.clear);
  }

  sample(): GameInputState {
    const state = {
      forward: Number(this.keys.has("KeyW") || this.keys.has("ArrowUp")) - Number(this.keys.has("KeyS") || this.keys.has("ArrowDown")),
      strafe: Number(this.keys.has("KeyD")) - Number(this.keys.has("KeyA")),
      turn: Number(this.keys.has("ArrowRight")) - Number(this.keys.has("ArrowLeft")) + this.turn,
      action: this.action,
    };
    this.turn = 0;
    return state;
  }

  destroy() {
    this.target.removeEventListener("click", this.capture);
    this.target.removeEventListener("keydown", this.keyDown);
    this.target.removeEventListener("keyup", this.keyUp);
    this.target.removeEventListener("mousemove", this.mouseMove);
    this.target.removeEventListener("mousedown", this.mouseDown);
    this.target.removeEventListener("mouseup", this.mouseUp);
    window.removeEventListener("blur", this.clear);
    this.clear();
    if (document.pointerLockElement === this.target) document.exitPointerLock();
  }

  private readonly capture = () => { this.target.focus(); void this.target.requestPointerLock(); };
  private readonly keyDown = (event: KeyboardEvent) => {
    if (document.pointerLockElement !== this.target) return;
    event.preventDefault(); event.stopPropagation(); this.keys.add(event.code);
    if (event.code === "Space" || event.code === "KeyE") this.action = true;
    if (event.code === "Escape") document.exitPointerLock();
  };
  private readonly keyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
    if (event.code === "Space" || event.code === "KeyE") this.action = false;
  };
  private readonly mouseMove = (event: MouseEvent) => {
    if (document.pointerLockElement === this.target) this.turn += event.movementX * 0.003;
  };
  private readonly mouseDown = (event: MouseEvent) => {
    if (document.pointerLockElement === this.target && event.button === 0) this.action = true;
  };
  private readonly mouseUp = (event: MouseEvent) => {
    if (event.button === 0) this.action = false;
  };
  private readonly clear = () => { this.keys.clear(); this.turn = 0; this.action = false; };
}
