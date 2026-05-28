// Emergency Grounding — the floor when things are hot. Box-breathing breaker,
// the pause-before-writing card, offline contacts, senses, and reminders.
// Nothing here is logged.
import { useEffect, useState } from "react";
import { useLedger } from "../store/LedgerContext.tsx";
import { ViewHeader } from "../components/common.tsx";
import { I } from "../components/Icons.tsx";
import { useOverlay } from "../lib/useOverlay.ts";
import { EmergencyContacts } from "./EmergencyContacts.tsx";

const BREATH_PHASES = [
  { key: "inhale", label: "Inhale", scale: 1, dur: 4000 },
  { key: "hold1", label: "Hold", scale: 1, dur: 4000 },
  { key: "exhale", label: "Exhale", scale: 0.55, dur: 4000 },
  { key: "hold2", label: "Hold", scale: 0.55, dur: 4000 },
];

const RING_CIRCUMFERENCE = Math.PI * 2 * 160;

function CircuitBreaker({ onClose }: { onClose: () => void }) {
  const [running, setRunning] = useState(true);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cycles, setCycles] = useState(0);
  const [seconds, setSeconds] = useState(4);

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      const next = (phaseIdx + 1) % BREATH_PHASES.length;
      setPhaseIdx(next);
      if (next === 0) setCycles((c) => c + 1);
      setSeconds(4);
    }, BREATH_PHASES[phaseIdx].dur);
    return () => clearTimeout(t);
  }, [phaseIdx, running]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds((s) => (s > 1 ? s - 1 : 4)), 1000);
    return () => clearInterval(id);
  }, [phaseIdx, running]);

  const phase = BREATH_PHASES[phaseIdx];
  const overlayRef = useOverlay<HTMLDivElement>(onClose);

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Box breathing"
      className="fixed inset-0 bg-zinc-950 z-50 flex flex-col"
    >
      <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-900">
        <div>
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Slow down</div>
          <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-0.5">
            Box breathing · 4·4·4·4
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
            Round {cycles + 1}
          </div>
          <button
            onClick={() => setRunning(!running)}
            aria-label={running ? "Pause" : "Resume"}
            className="w-9 h-9 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-300 grid place-items-center"
          >
            {running ? <I.Pause size={14} /> : <I.Play size={14} />}
          </button>
          <button
            onClick={onClose}
            className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 hover:text-zinc-100 px-3 py-2 border border-zinc-800 hover:border-zinc-700 rounded-md flex items-center gap-1.5"
          >
            <I.X size={12} /> Close
          </button>
        </div>
      </div>

      <div className="flex-1 grid place-items-center relative">
        <div className="absolute inset-0 vignette" />

        <div className="relative flex flex-col items-center">
          <div className="relative w-[340px] h-[340px] grid place-items-center">
            <div className="absolute inset-0 rounded-full border border-zinc-900" />
            <svg viewBox="0 0 340 340" className="absolute inset-0 -rotate-90">
              <circle cx="170" cy="170" r="160" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              <circle
                cx="170"
                cy="170"
                r="160"
                fill="none"
                stroke="rgba(245,245,245,0.65)"
                strokeWidth="1.5"
                strokeDasharray={`${RING_CIRCUMFERENCE}`}
                strokeDashoffset={
                  running ? `${RING_CIRCUMFERENCE * (1 - (4 - seconds) / 4)}` : `${RING_CIRCUMFERENCE}`
                }
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <div
              className="breath-ring rounded-full bg-zinc-100/10 border border-zinc-100/30"
              style={{
                width: 260,
                height: 260,
                transform: `scale(${phase.scale})`,
                transition: `transform ${phase.dur}ms cubic-bezier(0.45, 0, 0.55, 1)`,
              }}
            />
            <div className="absolute text-center">
              <div className="mono text-[10px] tracking-widest-3 uppercase text-zinc-500">
                {phase.key}
              </div>
              <div className="mono text-3xl tracking-widest-2 uppercase text-zinc-100 mt-1">
                {phase.label}
              </div>
              <div className="mono text-[40px] text-zinc-300 mt-2 tabular-nums leading-none">
                {seconds}
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-3">
            {BREATH_PHASES.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={"w-2 h-2 rounded-full " + (i === phaseIdx ? "bg-zinc-100" : "bg-zinc-800")} />
                <span
                  className={
                    "mono text-[10px] tracking-widest-2 uppercase " +
                    (i === phaseIdx ? "text-zinc-200" : "text-zinc-600")
                  }
                >
                  {p.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-10 mono text-[10.5px] text-zinc-500 max-w-md text-center leading-relaxed">
            Nothing on your screen behind this. Sit here as long as you need.
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmergencyView() {
  const { setPrivacyMode, lock, resetHalt } = useLedger();
  const [breaker, setBreaker] = useState(false);
  const [groundingChecks, setGroundingChecks] = useState<Record<number, boolean>>({});

  const grounding = [
    "Name five things you can see.",
    "Four you can physically touch.",
    "Three you can hear right now.",
    "Two you can smell.",
    "One you can taste.",
  ];

  const noWriting = [
    "Don't write inventory in this state.",
    "Eat something, even small.",
    "Drink water, not coffee.",
    "Move for ten minutes if you can.",
    "Reach a person before reaching the page.",
  ];

  const pauseSteps = [
    "See this person as sick — in the same kind of way you've been sick.",
    "Ask, silently, how you could be useful to them today.",
    "Ask the anger to be set down for the next ten minutes.",
    "Then — and only then — go write Column 4.",
  ];

  return (
    <div>
      <ViewHeader
        eyebrow="When things are hot"
        title="Grounding"
        sub="This view is the floor — nothing on it is logged. Use it before you sit down to write, or instead of writing if you can't."
        right={
          <button
            onClick={() => setBreaker(true)}
            className="mono text-[10px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.Wind size={12} /> Slow down
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 border border-zinc-900 rounded-md bg-zinc-950 p-6 flex flex-col">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
            First thing to try
          </div>
          <h3 className="mono text-xl tracking-widest-2 uppercase text-zinc-100 mt-1">Box breathing</h3>
          <p className="text-[12.5px] text-zinc-500 mt-2 max-w-prose leading-relaxed">
            A full-screen 4-4-4-4 pace. Inhale four, hold four, exhale four, hold four. Nothing else
            on the screen behind it.
          </p>

          <div className="mt-6 relative h-56 grid-bg rounded-md border border-zinc-900 grid place-items-center overflow-hidden">
            <div className="absolute inset-0 vignette" />
            <div
              className="relative w-32 h-32 rounded-full border border-zinc-700 grid place-items-center"
              style={{ animation: "pulse-ring 4s ease-in-out infinite" }}
            >
              <div className="w-20 h-20 rounded-full bg-zinc-100/5 border border-zinc-100/20" />
              <div className="absolute mono text-[10px] tracking-widest-2 uppercase text-zinc-400">
                4 · 4 · 4 · 4
              </div>
            </div>
            <button
              onClick={() => setBreaker(true)}
              className="absolute bottom-4 right-4 mono text-[10.5px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white px-3.5 py-2 rounded-md flex items-center gap-1.5"
            >
              Begin <I.Play size={11} />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setPrivacyMode(true)}
              className="border border-zinc-800 rounded-md p-3 hover:border-zinc-700 hover:bg-zinc-900/40 text-left"
            >
              <div className="flex items-center gap-2">
                <I.EyeOff size={13} className="text-amber-500" />
                <span className="mono text-[10px] tracking-widest-2 uppercase text-zinc-300">Blur it</span>
              </div>
              <div className="mono text-[9.5px] text-zinc-600 mt-1">Hide the details</div>
            </button>
            <button
              onClick={lock}
              className="border border-zinc-800 rounded-md p-3 hover:border-zinc-700 hover:bg-zinc-900/40 text-left"
            >
              <div className="flex items-center gap-2">
                <I.Lock size={13} className="text-zinc-400" />
                <span className="mono text-[10px] tracking-widest-2 uppercase text-zinc-300">
                  Close now
                </span>
              </div>
              <div className="mono text-[9.5px] text-zinc-600 mt-1">Back to the lock screen</div>
            </button>
            <button
              onClick={resetHalt}
              className="border border-zinc-800 rounded-md p-3 hover:border-zinc-700 hover:bg-zinc-900/40 text-left"
            >
              <div className="flex items-center gap-2">
                <I.Reset size={13} className="text-zinc-400" />
                <span className="mono text-[10px] tracking-widest-2 uppercase text-zinc-300">
                  Reset HALT
                </span>
              </div>
              <div className="mono text-[9.5px] text-zinc-600 mt-1">Start the day over</div>
            </button>
          </div>
        </div>

        <EmergencyContacts />

        {/* Pause-before-Col-4 card */}
        <div className="lg:col-span-12 border border-zinc-900 rounded-md bg-zinc-950 p-5">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-start">
            <div>
              <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
                Before writing
              </div>
              <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-1">
                A pause for the resented
              </div>
              <p className="text-[12px] text-zinc-500 mt-2 leading-relaxed">
                Sponsors recommend doing this before you write Column 4 about a person you're angry
                with. It's not erasure. It's enough quiet to write honestly.
              </p>
            </div>
            <ol className="space-y-3 list-none">
              {pauseSteps.map((line, i) => (
                <li key={i} className="flex gap-4">
                  <span className="mono text-[11px] text-zinc-700 mt-0.5 shrink-0 w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] text-zinc-200 leading-relaxed">{line}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="lg:col-span-7 border border-zinc-900 rounded-md bg-zinc-950 p-5">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">5-4-3-2-1</div>
          <h3 className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-1">
            Senses checklist
          </h3>
          <div className="mt-4 space-y-1.5">
            {grounding.map((line, i) => {
              const on = !!groundingChecks[i];
              return (
                <button
                  key={i}
                  onClick={() => setGroundingChecks({ ...groundingChecks, [i]: !on })}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md border border-zinc-900 hover:border-zinc-800"
                >
                  <span
                    className={
                      "w-4 h-4 rounded-sm border grid place-items-center shrink-0 " +
                      (on ? "bg-zinc-100 border-zinc-100 text-zinc-950" : "border-zinc-700")
                    }
                  >
                    {on && <I.Check size={10} strokeWidth={3} />}
                  </span>
                  <span className={"text-[12.5px] " + (on ? "text-zinc-500 line-through" : "text-zinc-200")}>
                    {line}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 border border-zinc-900 rounded-md bg-zinc-950 p-5">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-red-400/80">Don't write</div>
          <h3 className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-1">Reminders</h3>
          <ul className="mt-4 space-y-2">
            {noWriting.map((line, i) => (
              <li key={i} className="flex gap-3 text-[12.5px] text-zinc-300 leading-relaxed">
                <span className="mono text-zinc-700 mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {breaker && <CircuitBreaker onClose={() => setBreaker(false)} />}
    </div>
  );
}
