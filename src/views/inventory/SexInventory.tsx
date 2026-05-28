// Sex conduct — three questions per person (selfish, dishonest, inconsiderate)
// and what it stirred. Not about propriety.
import { useState } from "react";
import { useLedger } from "../../store/LedgerContext.tsx";
import { I } from "../../components/Icons.tsx";
import { makeId } from "../../data/constants.ts";

type BoolField = "selfish" | "dishonest" | "inconsiderate";

interface SexDraft {
  person: string;
  selfish: boolean;
  dishonest: boolean;
  inconsiderate: boolean;
  aroused: string;
}

const EMPTY: SexDraft = {
  person: "",
  selfish: false,
  dishonest: false,
  inconsiderate: false,
  aroused: "",
};

const FIELDS: { k: BoolField; label: string }[] = [
  { k: "selfish", label: "Selfish" },
  { k: "dishonest", label: "Dishonest" },
  { k: "inconsiderate", label: "Inconsiderate" },
];

export function SexInventory() {
  const { sexConduct, sealSex, privacyMode } = useLedger();
  const [draft, setDraft] = useState<SexDraft>(EMPTY);

  const submit = () => {
    if (!draft.person.trim()) return;
    sealSex({
      id: makeId("s-"),
      ...draft,
      person: draft.person.trim(),
      aroused: draft.aroused.trim(),
    });
    setDraft(EMPTY);
  };

  const toggle = (k: BoolField) => setDraft({ ...draft, [k]: !draft[k] });

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-7 border border-zinc-800 rounded-b-md rounded-tr-md bg-zinc-950">
        <div className="px-5 pt-4 pb-3 border-b border-zinc-900">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
            Sex conduct list
          </div>
          <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-1">
            Where I was selfish · dishonest · inconsiderate
          </div>
          <p className="text-[12px] text-zinc-500 mt-2 max-w-prose leading-relaxed">
            This isn't about propriety. Three simple questions per person: was I selfish, was I
            dishonest, was I inconsiderate. And did I stir jealousy, suspicion, or bitterness in
            anyone.
          </p>
        </div>
        <div className="divide-y divide-zinc-900">
          {sexConduct.map((s) => (
            <div key={s.id} className="px-5 py-3 grid grid-cols-[36px_1.2fr_1fr_1fr] items-center gap-3">
              <span className="mono text-[10px] text-zinc-600">{s.id}</span>
              <span className={"text-[13px] text-zinc-100 blur-transition " + (privacyMode ? "privacy-blur" : "")}>
                {s.person}
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {s.selfish && (
                  <span className="mono text-[9.5px] px-1.5 py-0.5 rounded-sm bg-red-950/40 text-red-300 border border-red-900/50">
                    Selfish
                  </span>
                )}
                {s.dishonest && (
                  <span className="mono text-[9.5px] px-1.5 py-0.5 rounded-sm bg-red-950/40 text-red-300 border border-red-900/50">
                    Dishonest
                  </span>
                )}
                {s.inconsiderate && (
                  <span className="mono text-[9.5px] px-1.5 py-0.5 rounded-sm bg-red-950/40 text-red-300 border border-red-900/50">
                    Inconsiderate
                  </span>
                )}
              </div>
              <span className={"text-[11.5px] text-zinc-500 italic blur-transition " + (privacyMode ? "privacy-blur" : "")}>
                stirred · {s.aroused}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-5 border border-zinc-800 rounded-b-md rounded-tr-md bg-zinc-950 p-5">
        <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Add a row</div>
        <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-1 mb-4">
          Honest, brief, your own
        </div>

        <label className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Person</label>
        <input
          value={draft.person}
          onChange={(e) => setDraft({ ...draft, person: e.target.value })}
          placeholder="e.g. K."
          className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600 mb-4"
        />

        <div className="mb-4">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-2">
            Where I was…
          </div>
          <div className="flex flex-wrap gap-2">
            {FIELDS.map((d) => (
              <button
                key={d.k}
                onClick={() => toggle(d.k)}
                className={
                  "px-3 py-1.5 rounded-full border mono text-[10.5px] tracking-widest-2 uppercase " +
                  (draft[d.k]
                    ? "bg-red-950/40 border-red-900/60 text-red-200"
                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700")
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <label className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
          What I stirred
        </label>
        <input
          value={draft.aroused}
          onChange={(e) => setDraft({ ...draft, aroused: e.target.value })}
          placeholder="jealousy · suspicion · bitterness"
          className="mt-1.5 w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2.5 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600 mb-4"
        />

        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={!draft.person.trim()}
            className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.ShieldCheck size={12} /> Save row
          </button>
        </div>
      </div>
    </div>
  );
}
