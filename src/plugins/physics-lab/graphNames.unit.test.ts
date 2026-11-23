import { placeAnswer } from "./graphNames";

describe("placeAnswer", () => {
  test("a C the graph does not use stays C", () => {
    const placed = placeAnswer(["y=\\frac{x^{2}}{2}+C"], ["y=\\sin x"]);
    expect(placed.items).toEqual(["y=\\frac{x^{2}}{2}+C"]);
  });

  test("a C the graph already uses becomes C_1, then C_2", () => {
    const first = placeAnswer(["y=x+C"], ["y=x^{2}+C", "C=4"]);
    expect(first.items).toEqual(["y=x+C_{1}"]);
    const second = placeAnswer(["y=\\cos x+C"], ["y=x^{2}+C", "y=x+C_{1}"]);
    expect(second.items).toEqual(["y=\\cos x+C_{2}"]);
  });

  test("a particular solution renames its curve and its C = value together", () => {
    const placed = placeAnswer(["y=Ce^{x}", "C=3"], ["C=1"]);
    expect(placed.items).toEqual(["y=C_{1}e^{x}", "C_{1}=3"]);
  });

  test("C_1 and C_2 of a second-order solution each get a free name", () => {
    const placed = placeAnswer(
      ["y=C_{1}\\cos x+C_{2}\\sin x"],
      ["y=C_{1}x", "C_{3}=2"]
    );
    // C_1 is taken, so it moves to the first name neither the graph nor the
    // answer uses; C_2 is free and stays.
    expect(placed.items).toEqual(["y=C_{4}\\cos x+C_{2}\\sin x"]);
  });

  test("a name the user typed is theirs and is never renamed", () => {
    const placed = placeAnswer(["y=\\frac{Cx^{2}}{2}+K"], ["C=2"], {
      input: "Cx",
    });
    expect(placed.items).toEqual(["y=\\frac{Cx^{2}}{2}+K"]);
  });

  test("other capital letters are left alone", () => {
    const placed = placeAnswer(["y=2Ax"], ["A=3"]);
    expect(placed.items).toEqual(["y=2Ax"]);
  });

  test("a definition already present is not added twice", () => {
    const placed = placeAnswer(["I=g(2)"], ["g(t)=t^{2}"], {
      definitions: ["g(t)=t^{2}"],
    });
    expect(placed.definitions).toEqual([]);
    expect(placed.items).toEqual(["I=g(2)"]);
  });

  test("a definition whose name means something else is renamed, not overwritten", () => {
    const placed = placeAnswer(["y=g(x)"], ["g(t)=5t"], {
      definitions: ["g(t)=t^{2}"],
    });
    expect(placed.definitions).toEqual(["g_{1}(t)=t^{2}"]);
    expect(placed.items).toEqual(["y=g_{1}(x)"]);
  });

  test("\\tan and \\operatorname names are not mistaken for constants", () => {
    const placed = placeAnswer(
      ["y=\\operatorname{Ci}\\left(x\\right)+\\tan x+C"],
      ["C=1"]
    );
    expect(placed.items).toEqual([
      "y=\\operatorname{Ci}\\left(x\\right)+\\tan x+C_{1}",
    ]);
  });
});
