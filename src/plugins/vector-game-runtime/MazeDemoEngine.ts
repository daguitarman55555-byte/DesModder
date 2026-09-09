import type { GameEngine, GameInputState } from "./GameEngine";

const MAP = [
  "111111111111",
  "100000000001",
  "101101110101",
  "100100010001",
  "110101011101",
  "100001000001",
  "101111011101",
  "100000000001",
  "111111111111",
];
const WIDTH = 320;
const HEIGHT = 200;

export default class MazeDemoEngine implements GameEngine {
  readonly width = WIDTH;
  readonly height = HEIGHT;
  private x = 2.5;
  private y = 2.5;
  private angle = 0;
  private pulse = 0;

  async start() {}

  step(dt: number, input: GameInputState) {
    this.angle += input.turn * Math.min(dt, 0.05) * 3.2;
    const speed = Math.min(dt, 0.05) * 2.2;
    const dx =
      (Math.cos(this.angle) * input.forward +
        Math.cos(this.angle + Math.PI / 2) * input.strafe) *
      speed;
    const dy =
      (Math.sin(this.angle) * input.forward +
        Math.sin(this.angle + Math.PI / 2) * input.strafe) *
      speed;
    if (!this.wall(this.x + dx, this.y)) this.x += dx;
    if (!this.wall(this.x, this.y + dy)) this.y += dy;
    this.pulse = Math.max(0, this.pulse - dt * 2);
    if (input.action) this.pulse = 1;
  }

  render(context: CanvasRenderingContext2D) {
    const image = context.createImageData(WIDTH, HEIGHT);
    const { data } = image;
    for (let column = 0; column < WIDTH; column++) {
      const ray = this.angle + (column / WIDTH - 0.5) * (Math.PI / 3);
      let distance = 0.02;
      let hit = false;
      while (distance < 20 && !hit) {
        distance += 0.025;
        hit = this.wall(
          this.x + Math.cos(ray) * distance,
          this.y + Math.sin(ray) * distance
        );
      }
      const corrected = distance * Math.cos(ray - this.angle);
      const wallHeight = Math.min(
        HEIGHT,
        Math.floor(HEIGHT / corrected)
      );
      const top = Math.floor((HEIGHT - wallHeight) / 2);
      const bottom = top + wallHeight;
      for (let row = 0; row < HEIGHT; row++) {
        const index = (row * WIDTH + column) * 4;
        let red = 5;
        let green = 10;
        let blue = 20;
        if (row < top) {
          const amount = row / HEIGHT;
          red = 8;
          green = 18 + Math.floor(amount * 30);
          blue = 38 + Math.floor(amount * 45);
        } else if (row < bottom) {
          const shade = Math.max(25, 210 - Math.floor(corrected * 22));
          red = Math.floor(shade * (0.35 + this.pulse * 0.25));
          green = Math.floor(shade * (0.72 + this.pulse * 0.18));
          blue = shade;
        } else {
          const amount = (row - bottom) / Math.max(1, HEIGHT - bottom);
          red = 10 + Math.floor(amount * 12);
          green = 18 + Math.floor(amount * 16);
          blue = 24 + Math.floor(amount * 18);
        }
        data[index] = red;
        data[index + 1] = green;
        data[index + 2] = blue;
        data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    context.fillStyle = "#fff";
    context.font = "11px sans-serif";
    context.fillText("VECTOR MAZE · find the open corridors", 8, 16);
    context.strokeStyle = this.pulse > 0 ? "#ffd166" : "#79d8ff";
    context.beginPath();
    context.moveTo(154, 100);
    context.lineTo(166, 100);
    context.moveTo(160, 94);
    context.lineTo(160, 106);
    context.stroke();
  }

  serialize() {
    const state = new Float64Array([this.x, this.y, this.angle]);
    return new Uint8Array(state.buffer.slice(0));
  }

  restore(bytes: Uint8Array) {
    if (bytes.byteLength !== 24) throw new Error("This save is invalid.");
    const state = new Float64Array(bytes.slice().buffer);
    [this.x, this.y, this.angle] = state;
  }

  destroy() {}

  private wall(x: number, y: number) {
    const row = MAP[Math.floor(y)];
    return row === undefined || row[Math.floor(x)] !== "0";
  }
}
