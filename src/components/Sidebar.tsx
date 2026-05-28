// Sidebar — brand, five workspaces, a live peek at the activity log, the
// privacy blind toggle, manual lock, and the settings trigger.
import { useLedger } from "../store/LedgerContext.tsx";
import { I } from "./Icons.tsx";
import type { IconComponent } from "./Icons.tsx";
import type { ViewId } from "../types.ts";

const NAV: { id: ViewId; short: string; label: string; icon: IconComponent }[] = [
  { id: "dashboard", short: "Today", label: "Today", icon: I.Dashboard },
  { id: "framework", short: "Inventory", label: "Inventory", icon: I.Grid },
  { id: "balance", short: "Balance", label: "Assets · Liabilities", icon: I.Scale },
  { id: "emergency", short: "Grounding", label: "Emergency Grounding", icon: I.Zap },
  { id: "manuscript", short: "5th Step", label: "5th Step Manuscript", icon: I.Book },
];

export function Sidebar({
  view,
  setView,
  onOpenSettings,
}: {
  view: ViewId;
  setView: (v: ViewId) => void;
  onOpenSettings: () => void;
}) {
  const { privacyMode, setPrivacyMode, lock, activityLog, resentments, fears, sexConduct } =
    useLedger();

  const totalRows = resentments.length + fears.length + sexConduct.length;

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-900 bg-zinc-950/90 backdrop-blur flex flex-col h-screen sticky top-0">
      {/* Brand */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-sm border border-zinc-800 grid place-items-center bg-zinc-900">
            <I.Cube size={13} className="text-zinc-500" />
          </div>
          <div className="leading-tight">
            <div className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-100 font-semibold">
              Fourth Step
            </div>
            <div className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-500">Ledger</div>
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-md border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5 flex items-center gap-2.5">
        <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
        <span className="mono text-[10px] tracking-widest-2 uppercase text-emerald-300/80 truncate">
          On this device only
        </span>
      </div>

      <nav className="px-2 space-y-0.5 flex-1 overflow-y-auto">
        <div className="px-2 pt-2 pb-1 mono text-[9.5px] uppercase tracking-widest-2 text-zinc-600">
          Workspaces
        </div>
        {NAV.map((n) => {
          const active = view === n.id;
          const IconCmp = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              aria-current={active ? "page" : undefined}
              aria-label={n.label}
              className={
                "w-full h-9 px-2.5 rounded-md flex items-center gap-2.5 mono text-[11.5px] " +
                (active
                  ? "bg-zinc-900 text-zinc-100 hairline"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/40")
              }
            >
              <IconCmp size={14} className={active ? "text-zinc-200" : "text-zinc-500"} />
              <span className="tracking-wide">{n.short}</span>
              {n.id === "emergency" && <span className="ml-auto w-1 h-1 rounded-full bg-amber-500" />}
              {n.id === "manuscript" && (
                <span className="ml-auto mono text-[9.5px] text-zinc-600 tracking-widest-2 uppercase">
                  export
                </span>
              )}
            </button>
          );
        })}

        <div className="mt-5 mx-2 rounded-md border border-zinc-900 bg-zinc-950/50 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="mono text-[9.5px] uppercase tracking-widest-2 text-zinc-600">
              Activity
            </span>
            <span className="mono text-[9.5px] text-zinc-700">{totalRows} rows</span>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {activityLog.slice(0, 5).map((l, i) => (
              <div key={i} className="mono text-[10px] text-zinc-500 leading-snug truncate">
                <span className="text-zinc-700">›</span> {l.msg}
              </div>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t border-zinc-900 p-3 space-y-2.5">
        <div className="flex items-center gap-2.5 px-1">
          {privacyMode ? (
            <I.EyeOff size={13} className="text-amber-500" />
          ) : (
            <I.Eye size={13} className="text-zinc-500" />
          )}
          <div className="flex-1 min-w-0">
            <div className="mono text-[10.5px] uppercase tracking-widest-2 text-zinc-300">
              Blur details
            </div>
            <div className="mono text-[9.5px] text-zinc-600">Esc to toggle</div>
          </div>
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            role="switch"
            aria-checked={privacyMode}
            aria-label="Blur details"
            className={
              "w-9 h-5 rounded-full relative transition-colors " +
              (privacyMode ? "bg-amber-700/70" : "bg-zinc-800")
            }
          >
            <span
              className={
                "absolute top-0.5 w-4 h-4 rounded-full bg-zinc-100 transition-all " +
                (privacyMode ? "left-[18px]" : "left-0.5")
              }
            />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={lock}
            className="flex-1 h-9 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-300 mono text-[10.5px] tracking-widest-2 uppercase flex items-center justify-center gap-2"
          >
            <I.Lock size={12} /> Close now
          </button>
          <button
            onClick={onOpenSettings}
            aria-label="Display settings"
            title="Display settings"
            className="w-9 h-9 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 text-zinc-400 grid place-items-center"
          >
            <I.Sliders size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
