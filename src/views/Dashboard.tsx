// Today — the daily check before opening the books. HALT split into the two
// physical / two emotional pair, today's list, program slogans, recent rows.
import { useLedger } from "../store/LedgerContext.tsx";
import { ViewHeader, Metric } from "../components/common.tsx";
import { I } from "../components/Icons.tsx";
import { DEFECT_KEYS } from "../data/constants.ts";

function HALTSlider({
  k,
  label,
  value,
  onChange,
  hot,
  kind,
}: {
  k: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  hot: boolean;
  kind: "physical" | "emotional";
}) {
  const tint = kind === "physical" ? "text-blue-300/90" : "text-amber-300/90";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={
              "mono text-[10px] tracking-widest-2 uppercase " + (hot ? "text-red-400" : "text-zinc-300")
            }
          >
            {k} · {label}
          </span>
          <span className={"mono text-[9px] tracking-widest-2 uppercase " + tint}>· {kind}</span>
        </div>
        <span className={"mono text-[11px] tabular-nums " + (hot ? "text-red-400" : "text-zinc-400")}>
          {value} <span className="text-zinc-700">/ 10</span>
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={"ledger-range " + (hot ? "hot" : "")}
        aria-label={`${label} level`}
      />
      <div className="mt-1.5 flex justify-between mono text-[9px] text-zinc-700">
        {[0, 2, 4, 6, 8, 10].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}

export function DashboardView({ onGoEmergency }: { onGoEmergency: () => void }) {
  const { resentments, sexConduct, assets, halt, setHalt, haltTasks, toggleTask, fearCount, privacyMode } =
    useLedger();
  const sealedResentments = resentments.filter((r) => r.sealed).length;
  const sealedSex = sexConduct.filter((s) => s.sealed).length;
  const elevatedAngry = halt.A > 7;
  const elevatedLonely = halt.L > 7;
  const elevated = elevatedAngry || elevatedLonely;

  return (
    <div>
      <ViewHeader
        eyebrow="Today"
        title="Quick check"
        sub="How you feel right now decides what you can honestly write. Take the two-minute check before sitting down to the page."
        right={
          <div className="text-right">
            <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Today</div>
            <div className="mono text-[12px] text-zinc-300 mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-8">
        <Metric label="Resentments written" value={sealedResentments} unit="rows" hint="On the list so far" />
        <Metric
          label="Fears named"
          value={fearCount}
          unit="entries"
          hint="Bracketed + standalone"
          tone="red"
        />
        <Metric
          label="Sex conduct rows"
          value={sealedSex}
          unit="rows"
          hint="Selfish · dishonest · inconsiderate"
        />
        <Metric
          label="Acts of virtue today"
          value={assets.length}
          unit="logged"
          hint="Done, not just intended"
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-8 border border-zinc-900 rounded-md bg-zinc-950">
          <div className="px-5 pt-4 pb-3 border-b border-zinc-900 flex items-center justify-between">
            <div>
              <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Self-check</div>
              <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-0.5">
                HALT · two physical, two emotional
              </div>
            </div>
            <div className="mono text-[10px] text-zinc-600">over 7 · sit down somewhere else</div>
          </div>

          <div className="grid grid-cols-2 divide-x divide-zinc-900">
            <div className="p-5 space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-3 bg-blue-400/70 rounded-sm" />
                <span className="mono text-[10px] tracking-widest-2 uppercase text-blue-300/80">
                  Physical
                </span>
              </div>
              <HALTSlider
                k="H"
                label="Hungry"
                kind="physical"
                value={halt.H}
                onChange={(v) => setHalt({ ...halt, H: v })}
                hot={halt.H > 7}
              />
              <HALTSlider
                k="T"
                label="Tired"
                kind="physical"
                value={halt.T}
                onChange={(v) => setHalt({ ...halt, T: v })}
                hot={halt.T > 7}
              />
            </div>
            <div className="p-5 space-y-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1 h-3 bg-amber-400/80 rounded-sm" />
                <span className="mono text-[10px] tracking-widest-2 uppercase text-amber-300/80">
                  Emotional
                </span>
              </div>
              <HALTSlider
                k="A"
                label="Angry"
                kind="emotional"
                value={halt.A}
                onChange={(v) => setHalt({ ...halt, A: v })}
                hot={elevatedAngry}
              />
              <HALTSlider
                k="L"
                label="Lonely"
                kind="emotional"
                value={halt.L}
                onChange={(v) => setHalt({ ...halt, L: v })}
                hot={elevatedLonely}
              />
            </div>
          </div>

          {elevated && (
            <div className="m-5 mt-1 rounded-md border border-amber-900/60 bg-amber-950/30 p-4">
              <div className="flex gap-3">
                <I.Alert size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="mono text-[10px] tracking-widest-2 uppercase text-amber-400 mb-1">
                    Step away first
                  </div>
                  <p className="text-[12px] text-zinc-300 leading-relaxed">
                    {elevatedAngry && "Anger is high. "}
                    {elevatedLonely && "Loneliness is high. "}
                    Writing inventory in this state tends to import the state into the writing. Get a
                    meal, get a person on the phone, then come back to the page.
                  </p>
                  <button
                    onClick={onGoEmergency}
                    className="mt-3 inline-flex items-center gap-1.5 mono text-[10.5px] tracking-widest-2 uppercase text-amber-300 hover:text-amber-200"
                  >
                    <I.Wind size={12} /> Take me to grounding →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-4 border border-zinc-900 rounded-md bg-zinc-950 p-5">
          <div className="flex items-baseline justify-between mb-1">
            <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100">Today's list</div>
            <div className="mono text-[9.5px] tracking-widest-2 uppercase text-zinc-600">
              resets at midnight
            </div>
          </div>
          <div className="mono text-[10px] text-zinc-500 mb-4">Small. Today only.</div>

          <div className="space-y-2">
            {haltTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTask(t.id)}
                className="w-full text-left flex items-start gap-3 p-2.5 rounded border border-zinc-900 hover:border-zinc-800 bg-zinc-950 hover:bg-zinc-900/40"
              >
                <span
                  className={
                    "mt-0.5 w-4 h-4 rounded-sm border grid place-items-center shrink-0 " +
                    (t.done ? "bg-zinc-100 border-zinc-100 text-zinc-950" : "border-zinc-700")
                  }
                >
                  {t.done && <I.Check size={11} strokeWidth={2.5} />}
                </span>
                <span
                  className={
                    "text-[12px] leading-snug " +
                    (t.done ? "text-zinc-600 line-through" : "text-zinc-200")
                  }
                >
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-900 flex items-center justify-between">
            <span className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Done</span>
            <span className="mono text-[11px] text-zinc-300">
              {haltTasks.filter((t) => t.done).length} / {haltTasks.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-12 gap-4">
        <div className="col-span-8 border border-zinc-900 rounded-md bg-zinc-950">
          <div className="px-5 pt-4 pb-3 border-b border-zinc-900 flex items-center justify-between">
            <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100">Last few rows</div>
            <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-600">
              {resentments.length} written
            </div>
          </div>
          <div className="divide-y divide-zinc-900">
            {resentments
              .slice(-3)
              .reverse()
              .map((r) => (
                <div key={r.id} className="px-5 py-3 flex items-center gap-4">
                  <span className="mono text-[10px] text-zinc-600 w-10">{r.id}</span>
                  <span
                    className={
                      "text-[12.5px] text-zinc-200 flex-1 truncate blur-transition " +
                      (privacyMode ? "privacy-blur" : "")
                    }
                  >
                    {r.object}
                  </span>
                  <div className="flex gap-1">
                    {DEFECT_KEYS.filter((d) => r.defects[d.key])
                      .slice(0, 3)
                      .map((d) => (
                        <span
                          key={d.key}
                          className="mono text-[9.5px] px-1.5 py-0.5 rounded-sm bg-red-950/40 text-red-400 border border-red-900/40"
                        >
                          {d.label}
                        </span>
                      ))}
                  </div>
                  <span className="mono text-[10px] text-zinc-600 w-20 text-right">
                    {r.sealedAt ? new Date(r.sealedAt).toLocaleDateString() : "—"}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="col-span-4 border border-zinc-900 rounded-md bg-zinc-950 p-5">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
            A short instruction
          </div>
          <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-1 mb-4">
            Pick one for the day
          </div>
          <ul className="space-y-3">
            {[
              "First things first.",
              "Easy does it.",
              "One day at a time.",
              "Live and let live.",
              "Think · think · think.",
            ].map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="mono text-[10px] text-zinc-600 mt-0.5 w-5 shrink-0">
                  {String(i + 1).padStart(2, "·")}
                </span>
                <span className="text-[12.5px] text-zinc-200">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 mono text-[10px] text-zinc-600">
            Program slogans · use one if the day is wobbling.
          </div>
        </div>
      </div>
    </div>
  );
}
