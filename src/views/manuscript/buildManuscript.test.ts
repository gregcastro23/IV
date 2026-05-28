import { describe, expect, it } from "vitest";
import { buildManuscript, naturalList } from "./buildManuscript.ts";
import { SEED_FEARS, SEED_RESENTMENTS, SEED_SEX } from "../../data/seed.ts";

describe("naturalList", () => {
  it("formats 0, 1, 2, and 3+ item lists", () => {
    expect(naturalList([])).toBe("");
    expect(naturalList(["a"])).toBe("a");
    expect(naturalList(["a", "b"])).toBe("a and b");
    expect(naturalList(["a", "b", "c"])).toBe("a, b, and c");
  });
});

describe("buildManuscript", () => {
  const m = buildManuscript(SEED_RESENTMENTS, SEED_FEARS, SEED_SEX);

  it("derives bracketed Column 3 fears into the fears section", () => {
    expect(m.fears.length).toBe(15); // 3 standalone + 12 bracketed
  });

  it("renders plain text with section headers and content", () => {
    const txt = m.toPlainText();
    expect(txt).toContain("PART I — RESENTMENTS");
    expect(txt).toContain("Former employer (M.)");
    expect(txt).toContain("My part: I was");
    expect(txt).toContain("PART III — SEX CONDUCT");
  });

  it("brackets the read-aloud cards with an opening and a close", () => {
    const cards = m.toAloudCards();
    expect(cards.length).toBeGreaterThan(3);
    expect(cards[0].section).toBe("Opening");
    expect(cards[cards.length - 1].section).toBe("Close");
  });

  it("escapes HTML in the print output", () => {
    const html = buildManuscript(
      [{ ...SEED_RESENTMENTS[0], object: "<script>x</script>" }],
      [],
      [],
    ).toPrintHTML();
    expect(html).not.toContain("<script>x");
    expect(html).toContain("&lt;script&gt;");
  });
});
