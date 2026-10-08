import { hookIntoFunction } from "./listenerHelpers";

function target() {
  const calls: string[] = [];
  const obj = {
    redraw: (value: number) => {
      calls.push(`original ${value}`);
      return value * 2;
    },
  };
  return { obj, calls };
}

describe("hookIntoFunction", () => {
  test("two hooks on one function both run, highest priority first", () => {
    const { obj, calls } = target();
    hookIntoFunction(obj, "redraw", "low", 0, (_stop, v) =>
      calls.push(`low ${v}`)
    );
    hookIntoFunction(obj, "redraw", "high", 5, (_stop, v) =>
      calls.push(`high ${v}`)
    );
    expect(obj.redraw(3)).toBe(6);
    // Each once: a second hook used to replace the first's list, so the
    // first never ran and the second ran twice.
    expect(calls).toEqual(["high 3", "low 3", "original 3"]);
  });

  test("unhooking one leaves the other, and the last restores the original", () => {
    const { obj, calls } = target();
    const original = obj.redraw;
    const unhookA = hookIntoFunction(obj, "redraw", "a", 0, () =>
      calls.push("a")
    );
    const unhookB = hookIntoFunction(obj, "redraw", "b", 0, () =>
      calls.push("b")
    );
    unhookA();
    obj.redraw(1);
    expect(calls).toEqual(["b", "original 1"]);
    unhookB();
    expect(obj.redraw).toBe(original);
  });

  test("hooking a key again replaces its handler and can still unhook", () => {
    const { obj, calls } = target();
    hookIntoFunction(obj, "redraw", "k", 0, () => calls.push("first"));
    const unhook = hookIntoFunction(obj, "redraw", "k", 0, () =>
      calls.push("second")
    );
    obj.redraw(1);
    expect(calls).toEqual(["second", "original 1"]);
    unhook();
    calls.length = 0;
    obj.redraw(2);
    expect(calls).toEqual(["original 2"]);
  });

  test("a handler can stop the call and give its own result", () => {
    const { obj, calls } = target();
    hookIntoFunction(obj, "redraw", "stop", 0, (stop) => stop(42));
    expect(obj.redraw(1)).toBe(42);
    expect(calls).toEqual([]);
  });
});
