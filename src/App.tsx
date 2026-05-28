// App shell — composes the lock screen, sidebar, the active workspace, and the
// settings drawer. Theme accents are driven by CSS variables from the Settings
// store, so the app re-skins without code edits.
import { useState } from "react";
import { LedgerProvider, useLedger } from "./store/LedgerContext.tsx";
import { SettingsProvider, useSettings } from "./store/SettingsContext.tsx";
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
  compact: "px-6 py-5",
  regular: "px-8 py-7",
  comfy: "px-10 py-9",
};

function Shell() {
  const { locked, privacyMode } = useLedger();
  const { settings } = useSettings();
  const [view, setView] = useState<ViewId>("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (locked) return <LockScreen />;

  return (
    <div className="flex min-h-screen">
      <Sidebar view={view} setView={setView} onOpenSettings={() => setSettingsOpen(true)} />
      <main className="flex-1 min-w-0">
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
