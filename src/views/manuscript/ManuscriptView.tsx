// 5th Step Manuscript — composes the three sealed lists into a readable
// document with three modes (Page / Read-aloud / Plain) and export to
// clipboard, .txt, and the system print sheet (→ PDF on most platforms).
import { useMemo, useState } from "react";
import { useLedger } from "../../store/LedgerContext.tsx";
import { ViewHeader } from "../../components/common.tsx";
import { I } from "../../components/Icons.tsx";
import { buildManuscript } from "./buildManuscript.ts";
import { PageMode } from "./PageMode.tsx";
import { ReadAloud } from "./ReadAloud.tsx";

type Mode = "page" | "aloud" | "plain";

function Counts({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="border border-zinc-900 rounded-md p-4 bg-zinc-950">
      <div className="mono text-[9.5px] tracking-widest-2 uppercase text-zinc-500">{label}</div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="mono text-3xl text-zinc-100 font-medium">{value}</span>
        {unit && (
          <span className="mono text-[10px] tracking-widest-2 uppercase text-zinc-600">{unit}</span>
        )}
      </div>
    </div>
  );
}

export function ManuscriptView() {
  const { resentments, fears, sexConduct } = useLedger();
  const [mode, setMode] = useState<Mode>("page");
  const [aloudIdx, setAloudIdx] = useState(0);
  const [aloud, setAloud] = useState(false);

  const sealedR = resentments.filter((r) => r.sealed);
  const sealedF = fears.filter((f) => f.sealed);
  const sealedS = sexConduct.filter((s) => s.sealed);

  const manuscript = useMemo(
    () => buildManuscript(sealedR, sealedF, sealedS),
    [sealedR, sealedF, sealedS],
  );
  const plain = useMemo(() => manuscript.toPlainText(), [manuscript]);
  const aloudCards = useMemo(() => manuscript.toAloudCards(), [manuscript]);

  const bracketedFearCount = sealedR.reduce(
    (n, r) => n + Object.values(r.affects).filter((a) => a.on && a.fear.trim()).length,
    0,
  );

  const downloadTxt = () => {
    const blob = new Blob([plain], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fifth-step-manuscript.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(plain);
    } catch {
      // Clipboard blocked (insecure context / permissions) — silently skip.
    }
  };

  const printPage = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8">
      <title>Fifth Step Manuscript</title>
      <style>
        @page { margin: 0.75in; }
        body { font-family: Georgia, 'Iowan Old Style', 'Times New Roman', serif; line-height: 1.55; color: #111; max-width: 7in; margin: 0 auto; padding: 0.5in 0; }
        h1 { font-size: 14pt; letter-spacing: 0.18em; text-transform: uppercase; border-bottom: 1px solid #111; padding-bottom: 0.6em; }
        h2 { font-size: 11pt; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 2em; border-bottom: 1px solid #aaa; padding-bottom: 0.3em; }
        h3 { font-size: 11pt; margin-top: 1.4em; }
        p, li { font-size: 11pt; }
        .pre { white-space: pre-wrap; font-family: Georgia, serif; font-size: 11pt; }
        .small { color: #555; font-size: 9pt; letter-spacing: 0.08em; text-transform: uppercase; }
        em { color: #444; }
        .col { color: #555; font-size: 9.5pt; letter-spacing: 0.12em; text-transform: uppercase; }
        .fear { color: #8a0a0a; }
        ol { padding-left: 1.4em; }
      </style></head><body>${manuscript.toPrintHTML()}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 350);
  };

  return (
    <div>
      <ViewHeader
        eyebrow="Step Five"
        title="Manuscript"
        sub="The fourth step ends when you read what you wrote out loud to another person. This view composes your three lists into a single readable manuscript — one to read with a sponsor, or to print and bring with you."
        right={
          <div className="inline-flex border border-zinc-800 rounded-md p-0.5 bg-zinc-950">
            {(
              [
                { id: "page", label: "Page" },
                { id: "aloud", label: "Read aloud" },
                { id: "plain", label: "Plain" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={
                  "px-3 py-1.5 rounded-sm mono text-[10px] tracking-widest-2 uppercase " +
                  (mode === t.id ? "bg-zinc-900 text-zinc-100" : "text-zinc-500 hover:text-zinc-300")
                }
              >
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Counts strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Counts label="Resentment rows" value={sealedR.length} />
        <Counts label="Fears named" value={sealedF.length + bracketedFearCount} />
        <Counts label="Sex conduct rows" value={sealedS.length} />
        <Counts
          label="Reading time"
          value={Math.max(1, Math.round(plain.split(/\s+/).length / 130))}
          unit="minutes"
        />
      </div>

      {/* Export bar */}
      <div className="mb-6 border border-zinc-900 rounded-md bg-zinc-950 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <I.Book size={16} className="text-zinc-400" />
          <div>
            <div className="mono text-[10.5px] tracking-widest-2 uppercase text-zinc-200">
              Ready to read aloud
            </div>
            <div className="mono text-[9.5px] text-zinc-500 mt-0.5">
              {sealedR.length + sealedF.length + sealedS.length} items composed · stays on this device
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAloudIdx(0);
              setAloud(true);
            }}
            className="mono text-[10px] tracking-widest-2 uppercase text-zinc-200 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.Mic size={12} /> Start read-aloud
          </button>
          <button
            onClick={copyClipboard}
            className="mono text-[10px] tracking-widest-2 uppercase text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.Type size={12} /> Copy text
          </button>
          <button
            onClick={downloadTxt}
            className="mono text-[10px] tracking-widest-2 uppercase text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.Download size={12} /> .txt
          </button>
          <button
            onClick={printPage}
            className="mono text-[10px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.Printer size={12} /> Print · save PDF
          </button>
        </div>
      </div>

      {mode === "page" && <PageMode manuscript={manuscript} />}
      {mode === "plain" && (
        <div className="border border-zinc-900 rounded-md bg-zinc-950">
          <div className="px-5 py-3 border-b border-zinc-900 mono text-[10px] tracking-widest-2 uppercase text-zinc-500">
            Plain text · paste anywhere
          </div>
          <pre className="p-5 text-[12.5px] text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
            {plain}
          </pre>
        </div>
      )}
      {mode === "aloud" && (
        <div className="border border-zinc-900 rounded-md bg-zinc-950 p-5">
          <p className="text-[12.5px] text-zinc-400 leading-relaxed max-w-prose">
            Read-aloud mode is a full-screen teleprompter, one row at a time. Use it sitting across
            from the person who's hearing your step.
          </p>
          <button
            onClick={() => {
              setAloudIdx(0);
              setAloud(true);
            }}
            className="mt-4 mono text-[10px] tracking-widest-2 uppercase text-zinc-950 bg-zinc-100 hover:bg-white px-3 py-2 rounded-md flex items-center gap-1.5"
          >
            <I.Mic size={12} /> Begin
          </button>
        </div>
      )}

      {aloud && <ReadAloud cards={aloudCards} startIdx={aloudIdx} onClose={() => setAloud(false)} />}
    </div>
  );
}
