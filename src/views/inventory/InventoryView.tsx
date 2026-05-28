// Inventory — three lists (resentments, fears, sex conduct). Resentments use a
// sequential wizard so you really do work down columns, not across rows.
import { useState } from "react";
import { ViewHeader } from "../../components/common.tsx";
import { I } from "../../components/Icons.tsx";
import { ResentmentsGrid } from "./ResentmentsGrid.tsx";
import { ResentmentsWizard } from "./ResentmentsWizard.tsx";
import { FearInventory } from "./FearInventory.tsx";
import { SexInventory } from "./SexInventory.tsx";

type InvTab = "resentments" | "fears" | "sex";
type Mode = "grid" | "sequential";

const TABS: { id: InvTab; label: string; sub: string }[] = [
  { id: "resentments", label: "Resentments", sub: "People · institutions · principles" },
  { id: "fears", label: "Fears", sub: "What I'm afraid of" },
  { id: "sex", label: "Sex conduct", sub: "Where I was selfish · dishonest · inconsiderate" },
];

export function InventoryView() {
  const [inv, setInv] = useState<InvTab>("resentments");
  const [mode, setMode] = useState<Mode>("grid");

  return (
    <div>
      <ViewHeader
        eyebrow="The work"
        title="Inventory"
        sub="Three lists. Resentments first, then fears, then sex conduct. The instructions are old and short: name them, name the cause, see what they're hitting in you, name your part."
        right={
          inv === "resentments" ? (
            <div className="inline-flex border border-zinc-800 rounded-md p-0.5 bg-zinc-950">
              <button
                onClick={() => setMode("grid")}
                className={
                  "px-3 py-1.5 rounded-sm mono text-[10px] tracking-widest-2 uppercase flex items-center gap-1.5 " +
                  (mode === "grid" ? "bg-zinc-900 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")
                }
              >
                <I.Table size={12} /> Tabular
              </button>
              <button
                onClick={() => setMode("sequential")}
                className={
                  "px-3 py-1.5 rounded-sm mono text-[10px] tracking-widest-2 uppercase flex items-center gap-1.5 " +
                  (mode === "sequential"
                    ? "bg-zinc-900 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300")
                }
              >
                <I.Activity size={12} /> Wizard
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="flex items-end justify-between gap-4 mb-4">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setInv(t.id)}
              className={
                "text-left px-4 py-2.5 rounded-t-md border-t border-l border-r min-w-[180px] " +
                (inv === t.id
                  ? "bg-zinc-950 border-zinc-800 text-zinc-100"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-zinc-300")
              }
            >
              <div className="mono text-[11px] tracking-widest-2 uppercase">{t.label}</div>
              <div className="mono text-[9.5px] text-zinc-600 mt-0.5">{t.sub}</div>
            </button>
          ))}
        </div>
        <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-600 pb-1">
          three lists · take them in order
        </div>
      </div>

      {inv === "resentments" && (mode === "grid" ? <ResentmentsGrid /> : <ResentmentsWizard />)}
      {inv === "fears" && <FearInventory />}
      {inv === "sex" && <SexInventory />}
    </div>
  );
}
