// In-app display settings. Replaces the design-tool "Tweaks" panel with a real
// drawer: accent palette, body size, manuscript font, density. Everything is
// persisted on the device via the Settings store and applied through CSS vars.
import { useSettings } from "../store/SettingsContext.tsx";
import { ACCENT_PRESET_NAMES, ACCENT_PRESETS } from "../data/constants.ts";
import { useOverlay } from "../lib/useOverlay.ts";
import { I } from "./Icons.tsx";
import type { Density, ManuscriptType } from "../types.ts";

const MANUSCRIPT_OPTIONS: { value: ManuscriptType; label: string }[] = [
  { value: "Serif (Georgia)", label: "Serif" },
  { value: "Sans (Inter)", label: "Sans" },
  { value: "Typewriter (mono)", label: "Mono" },
];

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: "compact", label: "compact" },
  { value: "regular", label: "regular" },
  { value: "comfy", label: "comfy" },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      role="radiogroup"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={
              "px-2 py-2 rounded-md border mono text-[10px] tracking-widest-2 uppercase " +
              (on
                ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <SettingsDrawer onClose={onClose} />;
}

function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const { settings, setSetting } = useSettings();
  const overlayRef = useOverlay<HTMLDivElement>(onClose);

  const accentKey = JSON.stringify(settings.accent).toLowerCase();

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Display settings">
      <div className="absolute inset-0 bg-black/60 anim-fade-in" onClick={onClose} />
      <div
        ref={overlayRef}
        tabIndex={-1}
        className="absolute top-0 right-0 h-screen w-[320px] bg-zinc-950 border-l border-zinc-800 anim-drawer-in flex flex-col shadow-2xl"
      >
        <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <I.Sliders size={14} className="text-zinc-400" />
            <div>
              <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
                Make it yours
              </div>
              <div className="mono text-sm tracking-widest-2 uppercase text-zinc-100 mt-0.5">
                Display
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-8 h-8 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-400 grid place-items-center"
          >
            <I.X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <section>
            <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-3">
              Accent palette
            </div>
            <div className="space-y-2">
              {ACCENT_PRESETS.map((preset, i) => {
                const on = JSON.stringify(preset).toLowerCase() === accentKey;
                return (
                  <button
                    key={ACCENT_PRESET_NAMES[i]}
                    type="button"
                    onClick={() => setSetting("accent", preset)}
                    className={
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md border " +
                      (on
                        ? "border-zinc-500 bg-zinc-900/60"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700")
                    }
                  >
                    <div className="flex gap-1 shrink-0">
                      {preset.map((c, j) => (
                        <span
                          key={j}
                          className="w-4 h-4 rounded-sm hairline"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <span
                      className={
                        "flex-1 text-left mono text-[10.5px] tracking-widest-2 uppercase " +
                        (on ? "text-zinc-100" : "text-zinc-400")
                      }
                    >
                      {ACCENT_PRESET_NAMES[i]}
                    </span>
                    {on && <I.Check size={13} className="text-zinc-200 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-3">Type</div>
            <div className="flex items-center justify-between mb-2">
              <span className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-300">
                Body text
              </span>
              <span className="mono text-[11px] text-zinc-400 tabular-nums">
                {settings.fontSize}px
              </span>
            </div>
            <input
              type="range"
              min={11}
              max={16}
              step={1}
              value={settings.fontSize}
              onChange={(e) => setSetting("fontSize", Number(e.target.value))}
              className="ledger-range"
              aria-label="Body text size"
            />
            <div className="mt-1.5 flex justify-between mono text-[9px] text-zinc-700">
              {[11, 12, 13, 14, 15, 16].map((n) => (
                <span key={n}>{n}</span>
              ))}
            </div>

            <div className="mt-5 mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-2">
              Manuscript font
            </div>
            <Segmented
              options={MANUSCRIPT_OPTIONS}
              value={settings.manuscriptType}
              onChange={(v) => setSetting("manuscriptType", v)}
            />
          </section>

          <section>
            <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 mb-2">
              Density
            </div>
            <Segmented
              options={DENSITY_OPTIONS}
              value={settings.density}
              onChange={(v) => setSetting("density", v)}
            />
            <p className="mt-2 mono text-[9.5px] text-zinc-600 leading-snug">
              Adjusts the breathing room around each workspace.
            </p>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-zinc-900 mono text-[10px] text-zinc-600 flex items-center gap-2">
          <I.Shield size={12} className="text-zinc-500" /> Saved on this device.
        </div>
      </div>
    </div>
  );
}
