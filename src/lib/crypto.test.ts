import { beforeEach, describe, expect, it } from "vitest";
import { clearVault, createVault, hasVault, openVault } from "./crypto.ts";

describe("vault encryption", () => {
  beforeEach(() => {
    clearVault();
    localStorage.clear();
  });

  it("round-trips data when the code is correct", async () => {
    const data = { secret: "Former employer (M.)", n: 42 };
    await createVault("123456", data);
    expect(hasVault()).toBe(true);

    const opened = await openVault<typeof data>("123456");
    expect(opened).not.toBeNull();
    expect(opened?.data).toEqual(data);
  });

  it("returns null for a wrong code (auth tag fails)", async () => {
    await createVault("123456", { x: 1 });
    const opened = await openVault("000000");
    expect(opened).toBeNull();
  });

  it("persists ciphertext, never plaintext", async () => {
    await createVault("123456", { secret: "Former employer" });
    const raw = localStorage.getItem("fsl:vault") ?? "";
    expect(raw.length).toBeGreaterThan(0);
    expect(raw).not.toContain("Former employer");
  });
});
