import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LedgerProvider } from "../store/LedgerContext.tsx";
import { LockScreen } from "./LockScreen.tsx";
import { clearVault } from "../lib/crypto.ts";

describe("LockScreen", () => {
  beforeEach(() => {
    clearVault();
    localStorage.clear();
  });

  it("starts in setup mode on first run and advances to confirm after six digits", async () => {
    render(
      <LedgerProvider>
        <LockScreen />
      </LedgerProvider>,
    );

    expect(screen.getByText("Choose your code")).toBeInTheDocument();

    const user = userEvent.setup();
    for (const d of ["1", "2", "3", "4", "5", "6"]) {
      await user.click(screen.getByRole("button", { name: `Digit ${d}` }));
    }

    expect(await screen.findByText("Confirm your code")).toBeInTheDocument();
  });
});
