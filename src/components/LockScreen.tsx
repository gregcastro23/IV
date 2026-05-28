// Lock screen — a code, four lines about what it means, a keypad. That's it.
// For this build any six digits unlock; the warning copy is honest about the
// fact that there is no recovery path.
import { useState } from "react";
import { useLedger } from "../store/LedgerContext.tsx";
import { I } from "./Icons.tsx";

type Phase = "idle" | "deriving";

export function LockScreen() {
  const { unlock } = useLedger();
  const [pin, setPin] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");

  const push = (d: string) => {
    if (pin.length >= 6 || phase === "deriving") return;
    const next = pin + d;
    setPin(next);
    if (next.length === 6) {
      setPhase("deriving");
      setTimeout(() => unlock(), 900);
    }
  };
  const del = () => phase !== "deriving" && setPin((p) => p.slice(0, -1));
  const clear = () => phase !== "deriving" && setPin("");

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 vignette relative">
      <div className="absolute inset-0 scan pointer-events-none" />
      <div className="w-full max-w-md relative">
        {/* Brand */}
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto w-12 h-12 rounded-md border border-zinc-800 bg-zinc-900/80 grid place-items-center hairline">
            <I.Shield size={20} className="text-zinc-400" />
          </div>
          <div className="space-y-1">
            <div className="mono text-[11px] tracking-widest-3 text-zinc-500 uppercase">
              For your eyes
            </div>
            <h1 className="mono text-base font-semibold tracking-widest-2 uppercase text-zinc-100">
              Fourth Step Ledger
            </h1>
          </div>
        </div>

        {/* Status */}
        <div className="mb-6 rounded-md border border-emerald-900/50 bg-emerald-950/30 p-3 flex items-center gap-3">
          <span className="relative w-2 h-2 rounded-full bg-emerald-400 pulse-dot shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="mono text-[10px] tracking-widest-2 uppercase text-emerald-300/90">
              Closed · waiting for you
            </div>
            <div className="text-[11px] text-emerald-200/60 mt-0.5">
              {phase === "deriving"
                ? "Setting up your private key…"
                : "Your notes stay on this device. Nothing is sent off it."}
            </div>
          </div>
        </div>

        {/* Honest warning */}
        <div className="mb-6 rounded-md border border-red-950 bg-red-950/25 p-3">
          <div className="flex gap-3">
            <I.Alert size={16} className="text-red-500/90 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-[11px] mono uppercase tracking-widest-2 text-red-300/90">
                No password reset
              </div>
              <p className="text-[11.5px] leading-relaxed text-zinc-400">
                Your six digits are the only key. There is no account, no cloud, no recovery. If you
                forget them, the contents are gone.
              </p>
            </div>
          </div>
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-2.5 mb-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={
                "w-10 h-12 rounded-md border bg-zinc-900/60 grid place-items-center hairline " +
                (pin[i] ? "border-zinc-600" : "border-zinc-800")
              }
            >
              {pin[i] ? <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" /> : null}
            </div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => push(String(k))}
              className="keypad-btn h-14 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-100 mono text-lg"
            >
              {k}
            </button>
          ))}
          <button
            onClick={clear}
            className="keypad-btn h-14 rounded-md border border-zinc-900 bg-zinc-950 hover:border-zinc-800 text-zinc-500 mono text-[10px] uppercase tracking-widest-2"
          >
            Clear
          </button>
          <button
            onClick={() => push("0")}
            className="keypad-btn h-14 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-100 mono text-lg"
          >
            0
          </button>
          <button
            onClick={del}
            className="keypad-btn h-14 rounded-md border border-zinc-900 bg-zinc-950 hover:border-zinc-800 text-zinc-500 grid place-items-center"
          >
            <I.Delete size={16} />
          </button>
        </div>

        {/* Backup text */}
        <div className="mt-6">
          <label className="mono text-[10px] uppercase tracking-widest-2 text-zinc-500">
            Or type the six digits
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setPin(v);
              if (v.length === 6) {
                setPhase("deriving");
                setTimeout(() => unlock(), 900);
              }
            }}
            placeholder="••••••"
            className="mt-1.5 w-full bg-zinc-900/40 border border-zinc-800 rounded-md px-3 py-2 mono text-sm tracking-[0.3em] text-center text-zinc-200 placeholder:text-zinc-700"
          />
        </div>

        <p className="mt-5 text-[11px] text-zinc-600 text-center mono">
          For the demo · any six digits work.
        </p>
      </div>
    </div>
  );
}
