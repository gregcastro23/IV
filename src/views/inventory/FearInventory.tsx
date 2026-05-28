// Fears — every bracketed fear from Column 3 surfaces here automatically,
// alongside the standalone ones the user adds directly.
import { useMemo, useState } from "react";
import { useLedger } from "../../store/LedgerContext.tsx";
import { I } from "../../components/Icons.tsx";
import { AFFECT_DOMAINS, makeId } from "../../data/constants.ts";

interface BracketedFear {
  id: string;
  object: string;
  cause: string;
  fromResentment: string;
  domain: string;
}

export function FearInventory() {
  const { fears, resentments, sealFear, privacyMode } = useLedger();
  const [draft, setDraft] = useState({ object: "", cause: "" });

  // Surface every bracketed fear from Column 3 as a visible row. These can't be
  // edited here — they live with their parent resentment.
  const bracketed = useMemo<BracketedFear[]>(() => {
    const out: BracketedFear[] = [];
    resentments.forEach((r) => {
      if (!r.sealed) return;
      Object.entries(r.affects).forEach(([k, a]) => {
        if (a.on && a.fear.trim()) {
          const dom = AFFECT_DOMAINS.find((d) => d.key === k);
          out.push({
            id: `${r.id}.${k}`,
            object: a.fear,
            cause: `Surfaces through my ${dom ? dom.label.toLowerCase() : k} around ${r.object}.`,
            fromResentment: r.id,
            domain: dom?.label ?? k,
          });
        }
      });
    });
    return out;
  }, [resentments]);

  const submit = () => {
    if (!draft.object.trim()) return;
    sealFear({
      id: makeId("f-"),
      object: draft.object.trim(),
      cause: draft.cause.trim(),
      trustsGodInstead: false,
    });
    setDraft({ object: "", cause: "" });
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-7 border border-zinc-800 rounded-b-md rounded-tr-md bg-zinc-950">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-900">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Fear list</div>
          <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-1">
            Bracketed fears + standalone
          </div>
          <p className="text-[12px] text-zinc-500 mt-2 max-w-prose">
            Every fear you bracketed in Column 3 lands here automatically. Add the ones that aren't
            tied to a resentment — the loose ones you just carry.
          </p>
        </div>

        {bracketed.length > 0 && (
          <div>
            <div className="px-5 py-2 bg-zinc-950 border-b border-zinc-900">
              <span className="mono text-[9.5px] tracking-widest-2 uppercase text-zinc-500">
                From Column 3 · {bracketed.length}
              </span>
            </div>
            <div className="divide-y divide-zinc-900">
              {bracketed.map((f) => (
                <div key={f.id} className="px-5 py-3 flex items-start gap-4">
                  <span className="mono text-[10px] text-red-400/70 w-12 shrink-0 mt-0.5">
                    {f.domain.slice(0, 3).toLowerCase()}
                  </span>
                  <div className={"flex-1 min-w-0 blur-transition " + (privacyMode ? "privacy-blur" : "")}>
                    <div className="text-[12.5px] text-zinc-200">{f.object}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 italic">{f.cause}</div>
                  </div>
                  <span className="mono text-[9.5px] tracking-widest-2 uppercase shrink-0 text-zinc-600">
                    {f.fromResentment}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="px-5 py-2 bg-zinc-950 border-y border-zinc-900">
          <span className="mono text-[9.5px] tracking-widest-2 uppercase text-zinc-500">
            Standalone · {fears.length}
          </span>
        </div>
        <div className="divide-y divide-zinc-900">
          {fears.map((f) => (
            <div key={f.id} className="px-5 py-3.5 flex items-start gap-4">
              <span className="mono text-[10px] text-zinc-600 w-12 shrink-0 mt-0.5">{f.id}</span>
              <div className={"flex-1 min-w-0 blur-transition " + (privacyMode ? "privacy-blur" : "")}>
                <div className="text-[13px] text-zinc-100">{f.object}</div>
                <div className="text-[11.5px] text-zinc-500 mt-1">{f.cause}</div>
              </div>
              <span
                className={
                  "mono text-[9.5px] tracking-widest-2 uppercase shrink-0 " +
                  (f.trustsGodInstead ? "text-emerald-400/80" : "text-zinc-600")
                }
              >
                {f.trustsGodInstead ? "handed over" : "still mine"}
              </span>
            </div>
          ))}
          {fears.length === 0 && (
            <div className="px-5 py-6 text-center text-[11.5px] text-zinc-600">
              No standalone fears yet.
            </div>
          )}
        </div>
      </div>

      <div className="col-span-5 border border-zinc-800 rounded-b-md rounded-tr-md bg-zinc-950 p-5">
        <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Add a fear</div>
        <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-1 mb-4">
          Standalone entry
        </div>

        <label className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
          What I'm afraid of
        </label>
        <input
          value={draft.object}
          onChange={(e) => setDraft({ ...draft, object: e.target.value })}
          placeholder="e.g. Being found out"
          className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600 mb-4"
        />

        <label className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
          Why I have it
        </label>
        <textarea
          value={draft.cause}
          onChange={(e) => setDraft({ ...draft, cause: e.target.value })}
          rows={4}
          placeholder="What it's protecting me from."
          className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600 resize-none mb-4"
        />

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={!draft.object.trim()}
            className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.ShieldCheck size={12} /> Save
          </button>
        </div>

        <div className="mt-6 border border-zinc-900 rounded-md bg-zinc-950/60 p-4">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-2">
            Why this list matters
          </div>
          <p className="text-[11.5px] text-zinc-400 leading-relaxed">
            Counting on yourself alone hasn't been enough. The fear list isn't to be conquered by
            force — it's what you hand over.
          </p>
        </div>
      </div>
    </div>
  );
}
