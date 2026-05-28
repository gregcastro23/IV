// Resentments · Sequential Wizard. Strict column isolation: the next column
// stays locked until the current one validates across every row, so you work
// DOWN the sheets, not across.
import { useState } from "react";
import { useLedger } from "../../store/LedgerContext.tsx";
import { I } from "../../components/Icons.tsx";
import { AFFECT_DOMAINS, DEFECT_KEYS, makeEmptyAffects, makeId } from "../../data/constants.ts";
import { validForStep as validForStepPure } from "./wizardValidation.ts";
import type { Resentment } from "../../types.ts";

type Draft = Omit<Resentment, "sealed" | "sealedAt">;

const RESENTMENT_STEPS = [
  {
    k: "Col 1",
    title: "The object",
    hint: "Person, institution, or principle. Plain noun. Work all the way down before moving on.",
  },
  { k: "Col 2", title: "The cause", hint: "What happened. Short phrases — not the whole story." },
  {
    k: "Col 3",
    title: "Affects my…",
    hint: "Which of the seven areas got touched. Add the role + the fear underneath.",
  },
  {
    k: "+",
    title: "The realization",
    hint: "Where have I done the same to someone else? Skip if Col 1 isn't a person.",
  },
  {
    k: "Col 4",
    title: "My part",
    hint: "The defects I brought to it. The list is long on purpose — pick honestly.",
  },
];

function newDraft(object = ""): Draft {
  return { id: makeId("draft-"), object, cause: "", affects: makeEmptyAffects(), defects: {}, realization: "" };
}

export function ResentmentsWizard() {
  const { sealResentment } = useLedger();
  const [step, setStep] = useState(0);
  const [items, setItems] = useState<Draft[]>([
    { ...newDraft("Coworker who took credit") },
    { ...newDraft() },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);

  const validRows = items.filter((i) => i.object.trim());
  const validForStep = (s: number) => validForStepPure(s, items);

  const advance = () => {
    if (!validForStep(step)) return;
    if (step < 4) {
      setStep(step + 1);
      setActiveIdx(0);
    } else {
      validRows.forEach((i) => sealResentment(i));
      setItems([newDraft()]);
      setStep(0);
      setActiveIdx(0);
    }
  };

  const updateActive = (mut: (it: Draft) => Draft) =>
    setItems(items.map((it, i) => (i === activeIdx ? mut(it) : it)));

  const active = items[activeIdx];

  return (
    <div className="border border-zinc-800 rounded-b-md rounded-tr-md bg-zinc-950">
      {/* Stepper */}
      <div className="overflow-x-auto border-b border-zinc-900">
        <div className="grid grid-cols-5 min-w-[640px]">
        {RESENTMENT_STEPS.map((c, i) => {
          const reached = i <= step;
          const current = i === step;
          const locked = i > step;
          return (
            <div
              key={i}
              className={
                "px-4 py-3.5 border-r border-zinc-900 last:border-r-0 " + (current ? "bg-zinc-900/50" : "")
              }
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={
                    "w-6 h-6 rounded-sm border grid place-items-center mono text-[10px] shrink-0 " +
                    (current
                      ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                      : reached
                        ? "border-emerald-700 text-emerald-400"
                        : "border-zinc-800 text-zinc-600")
                  }
                >
                  {reached && !current ? <I.Check size={11} strokeWidth={2.5} /> : i + 1}
                </div>
                <div className="min-w-0">
                  <div
                    className={
                      "mono text-[9.5px] tracking-widest-2 uppercase " +
                      (current ? "text-zinc-100" : "text-zinc-500")
                    }
                  >
                    {c.k}
                  </div>
                  <div
                    className={"mono text-[11px] mt-0.5 truncate " + (locked ? "text-zinc-600" : "text-zinc-200")}
                  >
                    {locked && <I.Lock size={9} className="inline mr-1 text-zinc-600" />}
                    {c.title}
                  </div>
                </div>
              </div>
              <div className="mono text-[9.5px] text-zinc-600 mt-2 leading-snug">{c.hint}</div>
            </div>
          );
        })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Row list */}
        <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-zinc-900">
          <div className="px-4 pt-3 pb-2 border-b border-zinc-900 flex items-center justify-between">
            <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
              Working down · {validRows.length} rows
            </div>
            {step === 0 && (
              <button
                onClick={() => setItems([...items, newDraft()])}
                className="mono text-[10px] tracking-widest-2 uppercase text-zinc-300 hover:text-zinc-100 flex items-center gap-1"
              >
                <I.Plus size={11} /> Row
              </button>
            )}
          </div>
          <div className="divide-y divide-zinc-900 max-h-[34rem] overflow-y-auto">
            {items.map((it, idx) => (
              <button
                key={it.id}
                onClick={() => setActiveIdx(idx)}
                className={
                  "w-full text-left px-4 py-3 flex items-start gap-3 " +
                  (activeIdx === idx ? "bg-zinc-900/60" : "hover:bg-zinc-900/30")
                }
              >
                <span className="mono text-[10px] text-zinc-600 w-6 mt-0.5">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={"text-[12px] truncate " + (it.object ? "text-zinc-200" : "text-zinc-600 italic")}>
                    {it.object || "untitled row"}
                  </div>
                  <div className="mono text-[9.5px] text-zinc-600 mt-1 flex flex-wrap gap-1.5">
                    {it.cause && <span className="text-emerald-500/80">· cause</span>}
                    {Object.values(it.affects).some((a) => a.on) && (
                      <span className="text-amber-500/80">· col 3</span>
                    )}
                    {it.realization && <span className="text-blue-400/80">· realized</span>}
                    {Object.values(it.defects).some(Boolean) && (
                      <span className="text-red-400/80">· part</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Active editor */}
        <div className="lg:col-span-8 p-6 min-h-[34rem]">
          {step === 0 && <Step1Object active={active} updateActive={updateActive} />}
          {step === 1 && <Step2Cause active={active} updateActive={updateActive} />}
          {step === 2 && <Step3Affects active={active} updateActive={updateActive} />}
          {step === 3 && <Step3pRealization active={active} updateActive={updateActive} />}
          {step === 4 && <Step4Defects active={active} updateActive={updateActive} />}
        </div>
      </div>

      <div className="border-t border-zinc-900 px-5 py-3 flex items-center justify-between">
        <button
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
          className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-400 disabled:text-zinc-700 hover:text-zinc-200 flex items-center gap-1.5"
        >
          <I.ChevronL size={13} /> Back a column
        </button>

        <div className="mono text-[10px] text-zinc-600">
          {validRows.length} rows · step {step + 1} of {RESENTMENT_STEPS.length}
        </div>

        <button
          disabled={!validForStep(step)}
          onClick={advance}
          className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 px-3.5 py-2 rounded-md flex items-center gap-1.5"
        >
          {step < 4 ? (
            <>
              Save column · continue <I.ChevronR size={13} />
            </>
          ) : (
            <>
              Save {validRows.length} row{validRows.length === 1 ? "" : "s"}{" "}
              <I.ShieldCheck size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StepHeader({
  tag,
  title,
  sub,
  sponsor,
}: {
  tag: string;
  title: string;
  sub?: string;
  sponsor?: string;
}) {
  return (
    <div className="mb-5">
      <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">{tag}</div>
      <h3 className="mono text-base tracking-widest-2 uppercase text-zinc-100 mt-1">{title}</h3>
      {sub && <p className="text-[12.5px] text-zinc-500 mt-2 max-w-prose leading-relaxed">{sub}</p>}
      {sponsor && (
        <div className="mt-3 border-l-2 border-zinc-800 pl-3 text-[11.5px] text-zinc-400 italic max-w-prose">
          {sponsor}
        </div>
      )}
    </div>
  );
}

interface StepProps {
  active: Draft;
  updateActive: (mut: (it: Draft) => Draft) => void;
}

function Step1Object({ active, updateActive }: StepProps) {
  return (
    <div>
      <StepHeader
        tag="Column 1"
        title="The object of resentment"
        sub="People, institutions, or principles. Plain nouns. The classic instruction is to make this column thorough before you touch the next."
        sponsor="If you can't think of anyone, you probably haven't been paying attention. Put down at least the people who keep coming up."
      />
      <input
        value={active.object}
        onChange={(e) => updateActive((it) => ({ ...it, object: e.target.value }))}
        placeholder="e.g. Former employer (M.)"
        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-3 text-[14px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600"
      />
      <div className="mt-3 mono text-[10px] text-zinc-600">
        Add another row from the list on the left before continuing.
      </div>
    </div>
  );
}

function Step2Cause({ active, updateActive }: StepProps) {
  return (
    <div>
      <StepHeader
        tag={"Column 2 · " + (active.object || "—")}
        title="The cause"
        sub="What did they actually do. Bone, not meat — short phrases. You're not writing a victim impact statement."
        sponsor="If it takes more than two sentences, you're explaining instead of inventorying."
      />
      <textarea
        value={active.cause}
        onChange={(e) => updateActive((it) => ({ ...it, cause: e.target.value }))}
        placeholder="One or two sentences."
        rows={5}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-3 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600 resize-none"
      />
    </div>
  );
}

function Step3Affects({ active, updateActive }: StepProps) {
  const toggle = (key: (typeof AFFECT_DOMAINS)[number]["key"]) =>
    updateActive((it) => ({
      ...it,
      affects: { ...it.affects, [key]: { ...it.affects[key], on: !it.affects[key].on } },
    }));
  const setLine = (key: (typeof AFFECT_DOMAINS)[number]["key"], line: string) =>
    updateActive((it) => ({ ...it, affects: { ...it.affects, [key]: { ...it.affects[key], line } } }));
  const setFear = (key: (typeof AFFECT_DOMAINS)[number]["key"], fear: string) =>
    updateActive((it) => ({ ...it, affects: { ...it.affects, [key]: { ...it.affects[key], fear } } }));

  return (
    <div>
      <StepHeader
        tag={"Column 3 · " + (active.object || "—")}
        title="Affects my…"
        sub="The seven areas of self. Check what's been touched, write the role you'd given yourself or them, then put the fear underneath in brackets."
        sponsor="The role is the lie you were telling. The bracket is the fear underneath the lie. Both go on the page."
      />

      <div className="space-y-2.5">
        {AFFECT_DOMAINS.map((d) => {
          const a = active.affects[d.key];
          return (
            <div
              key={d.key}
              className={
                "rounded-md border " +
                (a.on ? "border-amber-900/60 bg-amber-950/15" : "border-zinc-800 bg-zinc-950")
              }
            >
              <button
                onClick={() => toggle(d.key)}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left"
              >
                <span
                  className={
                    "w-4 h-4 rounded-sm border grid place-items-center shrink-0 " +
                    (a.on ? "bg-amber-500 border-amber-500 text-zinc-950" : "border-zinc-700")
                  }
                >
                  {a.on && <I.Check size={10} strokeWidth={3} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className={
                      "mono text-[10.5px] tracking-widest-2 uppercase " +
                      (a.on ? "text-amber-200" : "text-zinc-400")
                    }
                  >
                    {d.label}
                  </div>
                  <div className="mono text-[9.5px] text-zinc-600 mt-0.5">{d.hint}</div>
                </div>
                {a.on && (
                  <span className="mono text-[9.5px] tracking-widest-2 uppercase text-zinc-500">
                    finish · "{d.start}"
                  </span>
                )}
              </button>

              {a.on && (
                <div className="px-3.5 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_140px] gap-2 items-start">
                  <input
                    value={a.line}
                    onChange={(e) => setLine(d.key, e.target.value)}
                    placeholder={d.start}
                    className="bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-[12.5px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600"
                  />
                  <span className="mono text-[10px] text-zinc-600 self-center px-1">fear →</span>
                  <input
                    value={a.fear}
                    onChange={(e) => setFear(d.key, e.target.value)}
                    placeholder="(not enough)"
                    className="bg-zinc-950 border border-red-900/40 rounded-sm px-2.5 py-2 text-[12px] text-red-300 placeholder:text-red-900/40 focus:border-red-700/60"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step3pRealization({ active, updateActive }: StepProps) {
  return (
    <div>
      <StepHeader
        tag={"Realization · " + (active.object || "—")}
        title="Where have I done the same?"
        sub="Before you write your part, name a place you've done to someone else what you've been resenting them for. Skip if Col 1 isn't a person."
        sponsor="If you can see them as sick the way you've been sick, the next column gets a lot easier to write."
      />
      <textarea
        value={active.realization}
        onChange={(e) => updateActive((it) => ({ ...it, realization: e.target.value }))}
        placeholder="One sentence is enough."
        rows={5}
        className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-3 text-[13px] text-zinc-100 placeholder:text-zinc-700 focus:border-zinc-600 resize-none"
      />
    </div>
  );
}

function Step4Defects({ active, updateActive }: StepProps) {
  const toggle = (key: (typeof DEFECT_KEYS)[number]["key"]) =>
    updateActive((it) => ({ ...it, defects: { ...it.defects, [key]: !it.defects[key] } }));

  const programDefects = DEFECT_KEYS.filter((d) => d.set !== "extended");
  const extendedDefects = DEFECT_KEYS.filter((d) => d.set === "extended");

  return (
    <div>
      <StepHeader
        tag={"Column 4 · " + (active.object || "—")}
        title="My part"
        sub="Set the other person aside completely. Where was I to blame, before, during, after? The classic five sit on top. The traditional seven are underneath them — pick what's honest."
        sponsor="Selfish, dishonest, self-seeking, frightened — and prideful. Then the older list if you keep finding pride in everything."
      />

      <div className="space-y-4 mb-6">
        <div>
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-2">
            Program list
          </div>
          <div className="flex flex-wrap gap-2">
            {programDefects.map((d) => {
              const on = !!active.defects[d.key];
              return (
                <button
                  key={d.key}
                  onClick={() => toggle(d.key)}
                  className={
                    "px-3.5 py-2 rounded-full border mono text-[11px] tracking-widest-2 uppercase " +
                    (on
                      ? "bg-red-950/40 border-red-900/60 text-red-200"
                      : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300")
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-2">
            Older list · the deadly six (pride sits above)
          </div>
          <div className="flex flex-wrap gap-2">
            {extendedDefects.map((d) => {
              const on = !!active.defects[d.key];
              return (
                <button
                  key={d.key}
                  onClick={() => toggle(d.key)}
                  className={
                    "px-3.5 py-2 rounded-full border mono text-[11px] tracking-widest-2 uppercase " +
                    (on
                      ? "bg-red-950/40 border-red-900/60 text-red-200"
                      : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300")
                  }
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border border-zinc-900 rounded-md bg-zinc-950/60 p-4 space-y-2">
        <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
          Counter-virtues that will surface on the balance sheet
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DEFECT_KEYS.filter((d) => active.defects[d.key]).map((d) => (
            <span
              key={d.key}
              className="mono text-[10px] px-2 py-1 rounded-sm bg-amber-950/40 text-amber-200 border border-amber-900/60"
            >
              → {d.virtue}
            </span>
          ))}
          {!Object.values(active.defects).some(Boolean) && (
            <span className="mono text-[10px] text-zinc-600">
              Pick a defect above to see its counter-virtue.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
