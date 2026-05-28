// App shell — composes the lock screen, sidebar, the active workspace, and the
// settings drawer. On large screens the sidebar is persistent; on small ones it
// becomes a slide-in drawer behind a top bar. Theme accents come from CSS
// variables set by the Settings store.
import { useState } from "react";
import { LedgerProvider, useLedger } from "./store/LedgerContext.tsx";
import { SettingsProvider, useSettings } from "./store/SettingsContext.tsx";
import { useOverlay } from "./lib/useOverlay.ts";
import { LockScreen } from "./components/LockScreen.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { SettingsPanel } from "./components/SettingsPanel.tsx";
import { I } from "./components/Icons.tsx";
import { DashboardView } from "./views/Dashboard.tsx";
import { InventoryView } from "./views/inventory/InventoryView.tsx";
import { BalanceSheetView } from "./views/BalanceSheet.tsx";
import { EmergencyView } from "./views/Emergency.tsx";
import { ManuscriptView } from "./views/manuscript/ManuscriptView.tsx";
import type { Density, ViewId } from "./types.ts";

const DENSITY_PADDING: Record<Density, string> = {
  compact: "px-4 py-5 lg:px-6 lg:py-6",
  regular: "px-4 py-5 lg:px-8 lg:py-7",
  comfy: "px-4 py-6 lg:px-10 lg:py-9",
};

function MobileNav({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const ref = useOverlay<HTMLDivElement>(onClose);
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/60 anim-fade-in" onClick={onClose} />
      <div ref={ref} tabIndex={-1} className="absolute top-0 left-0 h-screen anim-drawer-in-left">
        {children}
      </div>
    </div>
  );
}

function Shell() {
  const { locked, privacyMode } = useLedger();
  const { settings } = useSettings();
  const [view, setView] = useState<ViewId>("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  if (locked) return <LockScreen />;

  const goto = (v: ViewId) => {
    setView(v);
    setNavOpen(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Persistent sidebar (large screens) */}
      <div className="hidden lg:block">
        <Sidebar view={view} setView={setView} onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      {/* Slide-in drawer (small screens) */}
      {navOpen && (
        <MobileNav onClose={() => setNavOpen(false)}>
          <Sidebar
            view={view}
            setView={goto}
            onOpenSettings={() => {
              setSettingsOpen(true);
              setNavOpen(false);
            }}
          />
        </MobileNav>
      )}

      <main className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur px-4 h-14">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
            className="w-9 h-9 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-300 grid place-items-center"
          >
            <I.Menu size={16} />
          </button>
          <div className="mono text-[11px] tracking-widest-2 uppercase text-zinc-200 font-semibold">
            Fourth Step Ledger
          </div>
        </div>

        <div className={`${DENSITY_PADDING[settings.density]} max-w-[1500px]`}>
          {view === "dashboard" && <DashboardView onGoEmergency={() => setView("emergency")} />}
          {view === "framework" && <InventoryView />}
          {view === "balance" && <BalanceSheetView />}
          {view === "emergency" && <EmergencyView />}
          {view === "manuscript" && <ManuscriptView />}
        </div>

        {privacyMode && (
          <div className="fixed top-4 right-4 z-30 mono text-[10px] tracking-widest-2 uppercase bg-amber-950/50 border border-amber-900/60 text-amber-200 px-3 py-2 rounded-md flex items-center gap-2 pointer-events-none">
            <I.EyeOff size={12} /> Blurred · press esc
          </div>
        )}
      </main>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <LedgerProvider>
        <Shell />
      </LedgerProvider>
    </SettingsProvider>
  );
}
