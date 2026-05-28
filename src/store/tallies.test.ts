import { describe, expect, it } from "vitest";
import { computeAssetTallies, computeDefectTallies, computeFearCount } from "./tallies.ts";
import { SEED_ASSETS, SEED_FEARS, SEED_RESENTMENTS } from "../data/seed.ts";

describe("computeDefectTallies", () => {
  it("counts defects across sealed resentments", () => {
    const t = computeDefectTallies(SEED_RESENTMENTS);
    expect(t.prideful).toBe(2); // r-1, r-2
    expect(t.selfish).toBe(1); // r-1
    expect(t.greedy).toBe(1); // r-3
    expect(t.lustful).toBe(0);
  });

  it("ignores unsealed rows", () => {
    const draft = { ...SEED_RESENTMENTS[0], sealed: false };
    const t = computeDefectTallies([draft]);
    expect(t.selfish).toBe(0);
  });
});

describe("computeFearCount", () => {
  it("sums standalone sealed fears and bracketed Column 3 fears", () => {
    // 3 standalone + (5 + 4 + 3) bracketed = 15
    expect(computeFearCount(SEED_FEARS, SEED_RESENTMENTS)).toBe(15);
  });

  it("does not count fears from unsealed resentments", () => {
    const draft = { ...SEED_RESENTMENTS[0], sealed: false };
    expect(computeFearCount([], [draft])).toBe(0);
  });
});

describe("computeAssetTallies", () => {
  it("tallies logged virtue moments by virtue", () => {
    const t = computeAssetTallies(SEED_ASSETS);
    expect(t.Honesty).toBe(1);
    expect(t.Consideration).toBe(1);
    expect(t.Humility).toBe(1);
    expect(t.Patience).toBe(1);
    expect(t.Tolerance).toBe(0);
  });
});
