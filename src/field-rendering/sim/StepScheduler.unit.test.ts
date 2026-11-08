import { StepScheduler } from "./StepScheduler";

/**
 * A stand-in for a simulation step: nonlinear, so that any difference in the
 * sequence of steps, or any step of a different size, shows up in the bits.
 */
class Pendulum {
  angle = 1.2;
  rate = 0;
  constructor(readonly dt: number) {}
  step() {
    this.rate -= Math.sin(this.angle) * this.dt;
    this.angle += this.rate * this.dt;
  }
}

/** Frames at `hz`, optionally jittered, for `seconds`; the state at each step. */
function run(
  hz: number,
  seconds: number,
  { jitter = 0, seed = 1, maxStepsPerFrame = 1000 } = {}
) {
  const stepSeconds = 1 / 600;
  const scheduler = new StepScheduler({ stepSeconds, maxStepsPerFrame });
  const pendulum = new Pendulum(stepSeconds);
  const states: number[] = [];
  let state = seed;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  scheduler.play();
  let now = 0;
  let plan = scheduler.frame(now);
  while (now < seconds * 1000) {
    now += (1000 / hz) * (1 + jitter * (random() - 0.5));
    if (now > seconds * 1000) now = seconds * 1000;
    plan = scheduler.frame(now);
    for (let i = 0; i < plan.steps; i++) {
      pendulum.step();
      states.push(pendulum.angle);
    }
  }
  return { states, plan };
}

describe("a fixed-step schedule", () => {
  test("30, 60, 120 and 144 Hz reach the same physical state", () => {
    const runs = [30, 60, 120, 144].map((hz) => run(hz, 2));
    for (const { states, plan } of runs) {
      // 2 s at 600 steps per second, whatever the frame rate.
      expect(plan.totalSteps).toBe(1200);
      expect(states.length).toBe(1200);
      expect(plan.simulatedSeconds).toBeCloseTo(2, 12);
    }
    // Bit for bit, step by step: the frames chose how many, never how long.
    for (const { states } of runs.slice(1)) {
      expect(states).toEqual(runs[0].states);
    }
  });

  test("jittered frames still run the same steps by the same moment", () => {
    const steady = run(60, 3);
    const jittered = run(60, 3, { jitter: 0.8, seed: 99 });
    expect(jittered.plan.totalSteps).toBe(steady.plan.totalSteps);
    expect(jittered.states).toEqual(steady.states);
  });

  test("a slow machine runs slower than real time, and says so", () => {
    const scheduler = new StepScheduler({
      stepSeconds: 1 / 600,
      maxStepsPerFrame: 5,
    });
    scheduler.play();
    let plan = scheduler.frame(0);
    for (let now = 1000 / 60; now <= 3000; now += 1000 / 60) {
      plan = scheduler.frame(now);
      expect(plan.steps).toBeLessThanOrEqual(5);
    }
    expect(plan.behind).toBe(true);
    // Five steps a frame at 60 Hz is 300 a second against 600 owed.
    expect(plan.realTimeFactor).toBeCloseTo(0.5, 1);
  });

  test("a stall is dropped, not caught up in a burst", () => {
    const scheduler = new StepScheduler({
      stepSeconds: 1 / 600,
      maxStepsPerFrame: 1000,
    });
    scheduler.play();
    scheduler.frame(0);
    scheduler.frame(16);
    const before = scheduler.frame(32).totalSteps;
    // Five seconds hidden: 3000 steps owed at face value, and only one
    // frame's worth (1/30 s, 20 steps) run.
    const after = scheduler.frame(5032);
    expect(after.steps).toBe(20);
    expect(after.totalSteps).toBe(before + 20);
    expect(scheduler.stallCount).toBe(1);
    expect(scheduler.frame(5048).steps).toBeLessThanOrEqual(10);
  });

  test("pausing stops the clock, and resuming does not repay the pause", () => {
    const scheduler = new StepScheduler({ stepSeconds: 0.01 });
    scheduler.play();
    scheduler.frame(0);
    expect(scheduler.frame(100).totalSteps).toBe(10);
    scheduler.pause();
    expect(scheduler.frame(150).steps).toBe(0);
    expect(scheduler.frame(5000).steps).toBe(0);
    scheduler.play();
    expect(scheduler.frame(5016).steps).toBe(0);
    expect(scheduler.frame(5116).totalSteps).toBe(20);
  });

  test("changing the step size keeps simulated time continuous", () => {
    const scheduler = new StepScheduler({ stepSeconds: 0.01 });
    scheduler.play();
    scheduler.frame(0);
    const before = scheduler.frame(100);
    expect(before.simulatedSeconds).toBeCloseTo(0.1, 12);
    // What Auto does when it halves the lattice speed.
    scheduler.setStepSeconds(0.005);
    scheduler.frame(100);
    const after = scheduler.frame(200);
    expect(after.totalSteps).toBe(10 + 20);
    expect(after.simulatedSeconds).toBeCloseTo(0.2, 12);
  });

  test("speed scales simulated time against real time", () => {
    const scheduler = new StepScheduler({ stepSeconds: 0.01, speed: 0.5 });
    scheduler.play();
    let simulated = 0;
    for (let now = 0; now <= 1000; now += 20) {
      simulated = scheduler.frame(now).simulatedSeconds;
    }
    expect(simulated).toBeCloseTo(0.5, 12);
  });

  test("a machine whose every frame stalls still moves, slower than real time", () => {
    const scheduler = new StepScheduler({
      stepSeconds: 1 / 600,
      maxStepsPerFrame: 1000,
    });
    scheduler.play();
    let plan = scheduler.frame(0);
    for (let now = 300; now <= 6000; now += 300) plan = scheduler.frame(now);
    // 20 frames of 1/30 s each: 400 steps, where real time would be 3600.
    expect(plan.totalSteps).toBe(400);
    expect(plan.realTimeFactor).toBeCloseTo(1 / 9, 2);
  });

  test("nonsense settings are refused", () => {
    expect(() => new StepScheduler({ stepSeconds: 0 })).toThrow(RangeError);
    expect(() => new StepScheduler({ stepSeconds: NaN })).toThrow(RangeError);
    expect(() => new StepScheduler({ stepSeconds: 0.01, speed: -1 })).toThrow(
      RangeError
    );
  });
});

describe("the time budget", () => {
  test("a tank too big for the GPU settles at a usable frame rate, slower than real time", () => {
    // Each frame takes 2 ms plus 2.5 ms a step: the 64-step cap made 162 ms
    // frames, the 6 fps the 2026-10-13 stress run measured at 1024 cells.
    const scheduler = new StepScheduler({ stepSeconds: 1 / 6000 });
    scheduler.play();
    let now = 0;
    let plan = scheduler.frame(now);
    const intervals: number[] = [];
    while (now < 6000) {
      const interval = 2 + 2.5 * plan.steps;
      now += interval;
      intervals.push(interval);
      plan = scheduler.frame(now);
    }
    const recent = intervals.slice(-30);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    expect(mean).toBeLessThan(45);
    expect(scheduler.stepCap).toBeLessThan(64);
    // Said, not hidden: the simulation is behind real time.
    expect(plan.realTimeFactor).toBeLessThan(1);
  });

  test("a 30 Hz display with a fast GPU keeps every step", () => {
    const scheduler = new StepScheduler({ stepSeconds: 1 / 600 });
    scheduler.play();
    let plan = scheduler.frame(0);
    for (let now = 1000 / 30; now <= 3000; now += 1000 / 30)
      plan = scheduler.frame(now);
    expect(scheduler.stepCap).toBe(64);
    expect(plan.realTimeFactor).toBeCloseTo(1, 1);
  });
});
