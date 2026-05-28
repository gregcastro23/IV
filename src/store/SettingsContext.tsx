import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import type { ManuscriptType, Settings } from "../types.ts";
import { DEFAULT_SETTINGS } from "../data/constants.ts";
import { loadJSON, saveJSON } from "../lib/storage.ts";

interface SettingsContextValue {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function manuscriptFontFor(t: ManuscriptType): string {
  switch (t) {
    case "Sans (Inter)":
      return "'Inter Variable', 'Inter', system-ui, sans-serif";
    case "Typewriter (mono)":
      return "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";
    default:
      return "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
  }
}

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(() =>
    loadJSON<Settings>("settings", DEFAULT_SETTINGS),
  );

  const setSetting = useCallback<SettingsContextValue["setSetting"]>((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    saveJSON("settings", settings);
  }, [settings]);

  // Accent palette → the CSS variables every meter and gradient reads from.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--c-virtue-dark", settings.accent[0]);
    root.style.setProperty("--c-virtue", settings.accent[1]);
    root.style.setProperty("--c-defect-dark", settings.accent[2]);
    root.style.setProperty("--c-defect", settings.accent[3]);
  }, [settings.accent]);

  useEffect(() => {
    document.documentElement.style.setProperty("--base-font-size", `${settings.fontSize}px`);
  }, [settings.fontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--manuscript-font",
      manuscriptFontFor(settings.manuscriptType),
    );
  }, [settings.manuscriptType]);

  return (
    <SettingsContext value={{ settings, setSetting }}>{children}</SettingsContext>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
