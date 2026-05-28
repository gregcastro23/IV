import { describe, expect, it } from "vitest";
import { validForStep } from "./wizardValidation.ts";
import { makeEmptyAffects } from "../../data/constants.ts";
import type { Resentment } from "../../types.ts";

type Draft = Omit<Resentment, "sealed" | "sealedAt">;

const draft = (over: Partial<Draft> = {}): Draft => ({
  id: "d",
  object: "",
  cause: "",
  affects: makeEmptyAffects(),
  defects: {},
  realization: "",
  ...over,
});

describe("wizard column isolation", () => {
  it("Column 1 needs at least one named object", () => {
    expect(validForStep(0, [draft()])).toBe(false);
    expect(validForStep(0, [draft({ object: "Boss" })])).toBe(true);
  });

  it("Column 2 requires a cause on every named row", () => {
    expect(validForStep(1, [draft({ object: "Boss" })])).toBe(false);
    expect(validForStep(1, [draft({ object: "Boss", cause: "did x" })])).toBe(true);
  });

  it("Column 3 requires at least one affected area per row", () => {
    const without = draft({ object: "Boss", cause: "x" });
    expect(validForStep(2, [without])).toBe(false);

    const withArea = draft({ object: "Boss", cause: "x" });
    withArea.affects.pride.on = true;
    expect(validForStep(2, [withArea])).toBe(true);
  });

  it("the realization step is always passable (it is optional)", () => {
    expect(validForStep(3, [draft({ object: "Boss" })])).toBe(true);
  });

  it("Column 4 requires a defect on every named row", () => {
    expect(validForStep(4, [draft({ object: "Boss", cause: "x" })])).toBe(false);
    expect(validForStep(4, [draft({ object: "Boss", defects: { selfish: true } })])).toBe(true);
  });

  it("ignores unnamed (empty) rows when gating", () => {
    expect(validForStep(1, [draft({ object: "Boss", cause: "x" }), draft()])).toBe(true);
  });
});
