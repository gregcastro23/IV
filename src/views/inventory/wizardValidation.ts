// Column-isolation gating for the resentments wizard, extracted as a pure
// function: each column only validates once every row satisfies it, which is
// how you "work down the sheets, not across."
import type { Resentment } from "../../types.ts";

type Draft = Omit<Resentment, "sealed" | "sealedAt">;

export function validForStep(step: number, items: Draft[]): boolean {
  const validRows = items.filter((i) => i.object.trim());
  switch (step) {
    case 0:
      return validRows.length >= 1;
    case 1:
      return validRows.every((i) => i.cause.trim().length > 0);
    case 2:
      return validRows.every((i) => Object.values(i.affects).some((a) => a.on));
    case 3:
      return true;
    case 4:
      return validRows.every((i) => Object.values(i.defects).some(Boolean));
    default:
      return false;
  }
}
