// Lock screen — real on-device encryption. First run asks you to choose a
// six-digit code (entered twice); after that, the code decrypts your vault.
// A wrong code genuinely can't open it, which is what the warning means.
import { useState } from "react";
import { useLedger } from "../store/LedgerContext.tsx";
import { I } from "./Icons.tsx";

type Phase = "idle" | "working" | "error";
type Stage = "enter" | "confirm";

export function LockScreen() {
  const { hasVault, unlock, setupPin } = useLedger();
  const [pin, setPin] = useState("");
  const [stage, setStage] = useState<Stage>("enter");
  const [firstPin, setFirstPin] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");

  const mode: "unlock" | "setup" = hasVault ? "unlock" : "setup";
  const busy = phase === "working";

  const complete = async (code: string) => {
    if (mode === "unlock") {
      setPhase("working");
      setError("");
      const ok = await unlock(code);
      if (!ok) {
        setPhase("error");
        setError("That code didn't open it. Try again.");
        setPin("");
      }
      return;
    }
    if (stage === "enter") {
      setFirstPin(code);
      setStage("confirm");
      setPin("");
      setPhase("idle");
      setError("");
    } else if (code === firstPin) {
      setPhase("working");
      setError("");
      await setupPin(code);
    } else {
      setStage("enter");
      setFirstPin("");
      setPin("");
      setPhase("error");
      setError("Those didn't match. Start again.");
    }
  };

  const setFromString = (raw: string) => {
    if (busy) return;
    const v = raw.replace(/\D/g, "").slice(0, 6);
    if (phase === "error") {
      setPhase("idle");
      setError("");
    }
    setPin(v);
    if (v.length === 6) complete(v);
  };

  const push = (d: string) => {
    if (busy || pin.length >= 6) return;
    if (phase === "error") {
      setPhase("idle");
      setError("");
    }
    const next = pin + d;
    setPin(next);
    if (next.length === 6) complete(next);
  };
  const del = () => !busy && setPin((p) => p.slice(0, -1));
  const clear = () => !busy && setPin("");

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const heading =
    mode === "unlock"
      ? "Enter your code"
      : stage === "enter"
        ? "Choose your code"
        : "Confirm your code";

  const statusTitle =
    mode === "unlock"
      ? "Closed · waiting for you"
      : stage === "enter"
        ? "New · choose a code"
        : "Confirm · once more";

  const statusSub = busy
    ? mode === "unlock"
      ? "Opening your private key…"
      : "Encrypting your notes…"
    : mode === "unlock"
      ? "Your notes stay on this device. Nothing is sent off it."
      : stage === "enter"
        ? "Pick six digits. They become the only key."
        : "Type the same six digits again.";

  const hint =
    mode === "unlock"
      ? "Six digits · no account, no cloud."
      : stage === "enter"
        ? "You'll confirm it on the next step."
        : "Re-enter the code to lock it in.";

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 vignette relative">
      <div className="absolute inset-0 scan pointer-events-none" />
      <div className="w-full max-w-md relative">
        {/* Brand */}
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto w-12 h-12 rounded-md border border-zinc-800 bg-zinc-900/80 grid place-items-center hairline">
            <I.Shield size={20} className="text-zinc-400" />
          </div>
          <div className="space-y-1">
            <div className="mono text-[11px] tracking-widest-3 text-zinc-500 uppercase">For your eyes</div>
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
              {statusTitle}
            </div>
            <div className="text-[11px] text-emerald-200/60 mt-0.5" aria-live="polite">
              {statusSub}
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
                forget them, the contents are gone for good.
              </p>
            </div>
          </div>
        </div>

        <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 text-center mb-3">
          {heading}
        </div>

        {/* PIN dots */}
        <div className="flex justify-center gap-2.5 mb-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={
                "w-10 h-12 rounded-md border bg-zinc-900/60 grid place-items-center hairline " +
                (phase === "error"
                  ? "border-red-800/70"
                  : pin[i]
                    ? "border-zinc-600"
                    : "border-zinc-800")
              }
            >
              {pin[i] ? <div className="w-2.5 h-2.5 rounded-full bg-zinc-200" /> : null}
            </div>
          ))}
        </div>

        {/* Error line */}
        <div className="h-5 mb-3 text-center" aria-live="assertive">
          {error && <span className="mono text-[10.5px] tracking-widest-2 uppercase text-red-400">{error}</span>}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => push(String(k))}
              disabled={busy}
              aria-label={`Digit ${k}`}
              className="keypad-btn h-14 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-100 mono text-lg disabled:opacity-50"
            >
              {k}
            </button>
          ))}
          <button
            onClick={clear}
            disabled={busy}
            className="keypad-btn h-14 rounded-md border border-zinc-900 bg-zinc-950 hover:border-zinc-800 text-zinc-500 mono text-[10px] uppercase tracking-widest-2 disabled:opacity-50"
          >
            Clear
          </button>
          <button
            onClick={() => push("0")}
            disabled={busy}
            aria-label="Digit 0"
            className="keypad-btn h-14 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-zinc-700 text-zinc-100 mono text-lg disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={del}
            disabled={busy}
            aria-label="Delete last digit"
            className="keypad-btn h-14 rounded-md border border-zinc-900 bg-zinc-950 hover:border-zinc-800 text-zinc-500 grid place-items-center disabled:opacity-50"
          >
            <I.Delete size={16} />
          </button>
        </div>

        {/* Backup text */}
        <div className="mt-6">
          <label htmlFor="pin-backup" className="mono text-[10px] uppercase tracking-widest-2 text-zinc-500">
            Or type the six digits
          </label>
          <input
            id="pin-backup"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={pin}
            disabled={busy}
            onChange={(e) => setFromString(e.target.value)}
            placeholder="••••••"
            className="mt-1.5 w-full bg-zinc-900/40 border border-zinc-800 rounded-md px-3 py-2 mono text-sm tracking-[0.3em] text-center text-zinc-200 placeholder:text-zinc-700 disabled:opacity-50"
          />
        </div>

        <p className="mt-5 text-[11px] text-zinc-600 text-center mono">{hint}</p>
      </div>
    </div>
  );
}
