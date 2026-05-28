// Assets · Liabilities — the shopkeeper's ledger. Liabilities are everything
// already named in the inventory; assets are only what was actually done today.
import { useState } from "react";
import { useLedger } from "../store/LedgerContext.tsx";
import { ViewHeader } from "../components/common.tsx";
import { I } from "../components/Icons.tsx";
import { DEFECT_KEYS, VIRTUE_KEYS } from "../data/constants.ts";
import type { Virtue } from "../types.ts";

interface LiabilityRowData {
  key: string;
  label: string;
  count: number;
  virtue: string;
  set: string;
  synthetic?: boolean;
}

export function BalanceSheetView() {
  const { defectTallies, fearCount, assetTallies, assets, addAsset, privacyMode } = useLedger();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [virtue, setVirtue] = useState<Virtue>(VIRTUE_KEYS[0]);
  const [note, setNote] = useState("");

  const liabilities: LiabilityRowData[] = [
    ...DEFECT_KEYS.map((d) => ({
      key: d.key,
      label: d.label,
      count: defectTallies[d.key],
      virtue: d.virtue,
      set: d.set,
    })),
    { key: "fear", label: "Fear", count: fearCount, virtue: "Faith · trust", synthetic: true, set: "underneath" },
  ];

  const maxDefect = Math.max(1, ...liabilities.map((l) => l.count));
  const maxAsset = Math.max(1, ...Object.values(assetTallies));

  const submit = () => {
    if (!note.trim()) return;
    addAsset(virtue, note.trim());
    setNote("");
    setDialogOpen(false);
  };

  return (
    <div>
      <ViewHeader
        eyebrow="The ledger"
        title="Assets · Liabilities"
        sub="The metaphor is a shopkeeper's. Disclose the damaged and unsalable, get rid of them without regret. Liabilities are everything you've already named in the inventory. Assets are only what you actually did today."
        right={
          <button
            onClick={() => setDialogOpen(true)}
            className="mono text-[10px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.Plus size={12} /> Log a virtue moment
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-zinc-900 rounded-md bg-zinc-950">
          <div className="px-5 pt-4 pb-3 border-b border-zinc-900 flex items-center justify-between">
            <div>
              <div className="mono text-[10px] tracking-widest-2 uppercase text-red-400/80">
                Liabilities
              </div>
              <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-0.5">
                Defect patterns + fear
              </div>
            </div>
            <div className="mono text-[10px] text-zinc-600">across the whole list</div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-3">
                Program list
              </div>
              {liabilities
                .filter((l) => l.set === "program" || l.set === "shared")
                .map((d) => (
                  <LiabilityRow key={d.key} d={d} maxDefect={maxDefect} privacyMode={privacyMode} />
                ))}
            </div>
            <div className="pt-3 border-t border-zinc-900">
              <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-3">
                Older list · the deadly six
              </div>
              {liabilities
                .filter((l) => l.set === "extended")
                .map((d) => (
                  <LiabilityRow key={d.key} d={d} maxDefect={maxDefect} privacyMode={privacyMode} />
                ))}
            </div>
            <div className="pt-3 border-t border-zinc-900">
              <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-3">
                Underneath them
              </div>
              {liabilities
                .filter((l) => l.synthetic)
                .map((d) => (
                  <LiabilityRow key={d.key} d={d} maxDefect={maxDefect} privacyMode={privacyMode} />
                ))}
            </div>
          </div>
          <div className="px-5 py-3 border-t border-zinc-900 mono text-[10px] text-zinc-600 leading-relaxed">
            Fear sits beneath every other line. The old books say it's a corroding thread — that's
            why it gets its own row.
          </div>
        </div>

        <div className="border border-zinc-900 rounded-md bg-zinc-950">
          <div className="px-5 pt-4 pb-3 border-b border-zinc-900 flex items-center justify-between">
            <div>
              <div className="mono text-[10px] tracking-widest-2 uppercase text-amber-400/90">
                Assets
              </div>
              <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-0.5">
                Virtues actually applied
              </div>
            </div>
            <div className="mono text-[10px] text-zinc-600">today · this week</div>
          </div>
          <div className="p-5 space-y-5">
            {VIRTUE_KEYS.map((v) => {
              const n = assetTallies[v];
              const pct = (n / maxAsset) * 100;
              return (
                <div key={v}>
                  <div className="flex items-baseline justify-between mb-2">
                    <div className="mono text-[11.5px] tracking-widest-2 uppercase text-zinc-200">
                      {v}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={
                          "mono text-[11px] text-zinc-400 tabular-nums blur-transition " +
                          (privacyMode ? "privacy-blur" : "")
                        }
                      >
                        {n}
                      </span>
                      <span className="mono text-[9.5px] text-zinc-600">acts</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${pct}%`,
                        transition: "width 600ms ease",
                        background:
                          "linear-gradient(90deg, var(--c-virtue-dark, #78350f) 0%, var(--c-virtue, #f59e0b) 100%)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-zinc-900 mono text-[10px] text-zinc-600 leading-relaxed">
            Done, not intended. A logged virtue moment is the only kind that earns a tick here.
          </div>
        </div>
      </div>

      <div className="mt-8 border border-zinc-900 rounded-md bg-zinc-950">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-900 flex items-center justify-between">
          <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100">
            Virtue moments — the log
          </div>
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-600">
            {assets.length} entries
          </div>
        </div>
        <div className="divide-y divide-zinc-900">
          {assets.map((a) => (
            <div key={a.id} className="px-5 py-3 flex items-start gap-4">
              <span className="mono text-[9.5px] tracking-widest-2 uppercase text-amber-400/80 w-32 shrink-0 mt-0.5">
                {a.virtue}
              </span>
              <p
                className={
                  "text-[12.5px] text-zinc-300 flex-1 leading-relaxed blur-transition " +
                  (privacyMode ? "privacy-blur" : "")
                }
              >
                {a.note}
              </p>
              <span className="mono text-[10px] text-zinc-600 w-24 text-right shrink-0">
                {new Date(a.at).toLocaleDateString()}
              </span>
            </div>
          ))}
          {assets.length === 0 && (
            <div className="px-5 py-8 text-center text-[12px] text-zinc-600">Nothing logged yet.</div>
          )}
        </div>
      </div>

      {dialogOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm grid place-items-center z-40 p-6 anim-fade-in"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-md max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="mono text-[10px] tracking-widest-2 uppercase text-amber-400/90">
                  Virtue moment
                </div>
                <div className="mono text-base tracking-widest-2 uppercase text-zinc-100 mt-1">
                  Log one
                </div>
              </div>
              <button onClick={() => setDialogOpen(false)} className="text-zinc-500 hover:text-zinc-200">
                <I.X size={16} />
              </button>
            </div>
            <p className="text-[12px] text-zinc-500 mt-2 mb-5">
              A small concrete thing you did. The bar is on the floor.
            </p>

            <div className="mb-4">
              <label className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
                Virtue
              </label>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {VIRTUE_KEYS.map((v) => (
                  <button
                    key={v}
                    onClick={() => setVirtue(v)}
                    className={
                      "mono text-[9.5px] tracking-widest-2 uppercase px-1.5 py-2 rounded-sm border " +
                      (virtue === v
                        ? "bg-amber-950/40 border-amber-900/60 text-amber-100"
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300")
                    }
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
                What happened
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder="One or two sentences. Concrete."
                className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600 resize-none"
                autoFocus
              />
            </div>

            <div className="flex justify-between items-center">
              <span className="mono text-[10px] text-zinc-600">stays on this device</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="mono text-[10px] tracking-widest-2 uppercase text-zinc-400 hover:text-zinc-100 px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={!note.trim()}
                  className="mono text-[10px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-2 rounded-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiabilityRow({
  d,
  maxDefect,
  privacyMode,
}: {
  d: LiabilityRowData;
  maxDefect: number;
  privacyMode: boolean;
}) {
  const pct = (d.count / maxDefect) * 100;
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="flex items-baseline gap-2">
          <div className="mono text-[11.5px] tracking-widest-2 uppercase text-zinc-200">{d.label}</div>
          {d.synthetic && (
            <span className="mono text-[8.5px] tracking-widest-2 uppercase text-red-400/70 border border-red-900/40 rounded-sm px-1">
              underneath
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={
              "mono text-[11px] text-zinc-400 tabular-nums blur-transition " +
              (privacyMode ? "privacy-blur" : "")
            }
          >
            {d.count}
          </span>
          <span className="mono text-[9.5px] text-zinc-600">{d.synthetic ? "fears" : "rows"}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-900 overflow-hidden">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            transition: "width 600ms ease",
            background:
              "linear-gradient(90deg, var(--c-defect-dark, #7f1d1d) 0%, var(--c-defect, #ef4444) 100%)",
          }}
        />
      </div>
      <div className="mt-1 mono text-[9.5px] text-zinc-600 flex items-center gap-1.5">
        <I.ChevronR size={9} /> counter-virtue · {d.virtue}
      </div>
    </div>
  );
}
