import type { ReactNode } from "react";
import { useLedger } from "../store/LedgerContext.tsx";

export function ViewHeader({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 pb-6 mb-6 border-b border-zinc-900">
      <div>
        <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-1.5">
          {eyebrow}
        </div>
        <h2 className="mono text-xl sm:text-2xl tracking-widest-2 uppercase text-zinc-100 font-medium">
          {title}
        </h2>
        {sub && (
          <div className="text-[12px] text-zinc-500 mt-2 max-w-prose leading-relaxed">{sub}</div>
        )}
      </div>
      {right}
    </div>
  );
}

export function Metric({
  label,
  value,
  unit,
  hint,
  blurable = true,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  hint?: ReactNode;
  blurable?: boolean;
  tone?: "default" | "red" | "amber";
}) {
  const { privacyMode } = useLedger();
  const toneCls =
    tone === "red" ? "text-red-300" : tone === "amber" ? "text-amber-300" : "text-zinc-100";
  return (
    <div className="border border-zinc-900 rounded-md p-4 bg-zinc-950">
      <div className="mono text-[9.5px] tracking-widest-2 uppercase text-zinc-500">{label}</div>
      <div
        className={
          "mt-3 flex items-baseline gap-1.5 blur-transition " +
          (privacyMode && blurable ? "privacy-blur" : "")
        }
      >
        <span className={"mono text-3xl font-medium " + toneCls}>{value}</span>
        {unit && (
          <span className="mono text-[10px] tracking-widest-2 uppercase text-zinc-600">{unit}</span>
        )}
      </div>
      {hint && <div className="mt-1.5 text-[11px] text-zinc-600">{hint}</div>}
    </div>
  );
}
