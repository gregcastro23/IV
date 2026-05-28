// Read-aloud teleprompter — one card at a time, full screen, arrow-key driven.
import { useEffect, useState } from "react";
import { I } from "../../components/Icons.tsx";
import type { AloudCard } from "./buildManuscript.ts";

export function ReadAloud({
  cards,
  startIdx = 0,
  onClose,
}: {
  cards: AloudCard[];
  startIdx?: number;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const total = cards.length;
  const card = cards[Math.min(idx, total - 1)];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setIdx((i) => Math.min(total - 1, i + 1));
      }
      if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, onClose]);

  return (
    <div className="fixed inset-0 bg-zinc-950 z-50 flex flex-col">
      <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <I.Mic size={14} className="text-zinc-400" />
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">Reading aloud</div>
          <div className="mono text-[10px] text-zinc-700">·</div>
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-300">{card.section}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
            {idx + 1} of {total}
          </div>
          <button
            onClick={onClose}
            className="mono text-[10px] tracking-widest-2 uppercase text-zinc-500 hover:text-zinc-100 px-3 py-2 border border-zinc-800 hover:border-zinc-700 rounded-md flex items-center gap-1.5"
          >
            <I.X size={12} /> Close
          </button>
        </div>
      </div>

      <div className="flex-1 grid place-items-center relative">
        <div className="absolute inset-0 vignette pointer-events-none" />
        <div className="max-w-3xl px-12 text-center relative">
          {card.eyebrow && (
            <div className="mono text-[12px] tracking-widest-3 uppercase text-zinc-500 mb-6">
              {card.eyebrow}
            </div>
          )}
          <div
            className="font-serif text-zinc-100 leading-relaxed"
            style={{ fontSize: "clamp(20px, 3.6vw, 36px)" }}
          >
            {card.body}
          </div>
          {card.subBody && (
            <div
              className="font-serif italic text-zinc-400 mt-6 leading-relaxed"
              style={{ fontSize: "clamp(16px, 2.4vw, 22px)" }}
            >
              {card.subBody}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-5 border-t border-zinc-900 flex items-center justify-between">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-400 hover:text-zinc-100 disabled:text-zinc-700 flex items-center gap-1.5"
        >
          <I.ChevronL size={13} /> Back
        </button>
        <div className="w-2/3 mx-6">
          <div className="h-[2px] bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-zinc-200"
              style={{ width: `${((idx + 1) / total) * 100}%`, transition: "width 240ms ease" }}
            />
          </div>
          <div className="mt-2 text-center mono text-[9.5px] tracking-widest-2 uppercase text-zinc-600">
            ← / → to step · esc to close
          </div>
        </div>
        <button
          onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
          disabled={idx === total - 1}
          className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 px-3.5 py-2 rounded-md flex items-center gap-1.5"
        >
          Next <I.ChevronR size={13} />
        </button>
      </div>
    </div>
  );
}
