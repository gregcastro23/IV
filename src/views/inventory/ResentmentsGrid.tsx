import { useLedger } from "../../store/LedgerContext.tsx";
import { AFFECT_DOMAINS, DEFECT_KEYS } from "../../data/constants.ts";

const COLS = "grid-cols-[40px_1.2fr_1.4fr_2.1fr_1.6fr_1.2fr]";

export function ResentmentsGrid() {
  const { resentments, privacyMode } = useLedger();

  return (
    <div className="border border-zinc-800 rounded-b-md rounded-tr-md bg-zinc-950 overflow-x-auto">
      <div className="min-w-[880px]">
      <div className={"grid " + COLS + " border-b border-zinc-900 bg-zinc-950"}>
        {[
          "#",
          "Col 1 · The person, institution, principle",
          "Col 2 · The cause",
          "Col 3 · Affects my…  (with fears)",
          "Col 4 · My part",
          "The realization",
        ].map((c, i) => (
          <div
            key={i}
            className={
              "px-4 py-3 mono text-[9.5px] tracking-widest-2 uppercase text-zinc-500 " +
              (i > 0 ? "border-l border-zinc-900" : "")
            }
          >
            {c}
          </div>
        ))}
      </div>

      <div className="divide-y divide-zinc-900">
        {resentments.map((r, idx) => (
          <div key={r.id} className={"grid " + COLS + " hover:bg-zinc-900/20"}>
            <div className="px-4 py-4 mono text-[11px] text-zinc-600 self-start">
              {String(idx + 1).padStart(2, "0")}
            </div>

            <div
              className={
                "px-4 py-4 border-l border-zinc-900 blur-transition " +
                (privacyMode ? "privacy-blur" : "")
              }
            >
              <div className="text-[12.5px] text-zinc-100">{r.object}</div>
              <div className="mono text-[9.5px] text-zinc-600 mt-1.5">
                written · {r.sealedAt ? new Date(r.sealedAt).toLocaleDateString() : "—"}
              </div>
            </div>

            <div
              className={
                "px-4 py-4 border-l border-zinc-900 text-[12px] text-zinc-400 leading-relaxed blur-transition " +
                (privacyMode ? "privacy-blur" : "")
              }
            >
              {r.cause}
            </div>

            <div
              className={
                "px-4 py-4 border-l border-zinc-900 space-y-1.5 blur-transition " +
                (privacyMode ? "privacy-blur" : "")
              }
            >
              {AFFECT_DOMAINS.filter((d) => r.affects[d.key].on).map((d) => {
                const a = r.affects[d.key];
                return (
                  <div key={d.key} className="text-[11.5px] leading-snug">
                    <span className="mono text-[9.5px] tracking-widest-2 uppercase text-amber-400/80">
                      {d.label}
                    </span>
                    <span className="text-zinc-300"> · {a.line}</span>
                    {a.fear && <span className="text-red-400/80"> ({a.fear})</span>}
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-4 border-l border-zinc-900">
              <div className="flex flex-wrap gap-1.5">
                {DEFECT_KEYS.filter((d) => r.defects[d.key]).map((d) => (
                  <span
                    key={d.key}
                    className="mono text-[9.5px] px-1.5 py-0.5 rounded-sm bg-red-950/40 text-red-300 border border-red-900/50"
                  >
                    {d.label}
                  </span>
                ))}
              </div>
            </div>

            <div
              className={
                "px-4 py-4 border-l border-zinc-900 text-[11.5px] text-zinc-400 italic leading-relaxed blur-transition " +
                (privacyMode ? "privacy-blur" : "")
              }
            >
              {r.realization || (
                <span className="text-zinc-700 not-italic">— skip if Col 1 isn't a person</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-zinc-900 px-4 py-3 flex items-center justify-between bg-zinc-950">
        <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
          {resentments.length} written · work down each column, not across rows
        </div>
        <div className="mono text-[10px] text-zinc-600">resentment list</div>
      </div>
      </div>
    </div>
  );
}
