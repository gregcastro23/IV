// Page mode — the manuscript typeset like a quiet document, ready to read.
import type { Manuscript } from "./buildManuscript.ts";
import { naturalList } from "./buildManuscript.ts";

export function PageMode({ manuscript }: { manuscript: Manuscript }) {
  return (
    <div className="border border-zinc-900 rounded-md bg-[#faf6ef] text-zinc-900 manuscript-page max-w-[820px] mx-auto">
      <div className="px-12 py-14">
        <div className="text-center pb-6 border-b border-zinc-300">
          <div className="font-serif text-[10px] tracking-[0.3em] uppercase text-zinc-500">
            For my fifth step
          </div>
          <h1 className="font-serif text-2xl tracking-[0.18em] uppercase mt-3 text-zinc-900">
            Manuscript
          </h1>
          <div className="font-serif text-[10px] tracking-[0.16em] uppercase text-zinc-500 mt-3">
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>

        {/* Part I — Resentments */}
        {manuscript.resentments.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-[12px] tracking-[0.2em] uppercase text-zinc-700 border-b border-zinc-300 pb-2">
              Part I · Resentments
            </h2>
            <p className="font-serif text-[12px] text-zinc-700 italic mt-4 leading-relaxed">
              I will read each entry as it stands. I will not soften the cause, I will not rephrase the
              fears, and I will name my part out loud.
            </p>
            <ol className="mt-6 space-y-8">
              {manuscript.resentments.map((r, idx) => (
                <li key={r.id} className="font-serif text-zinc-900">
                  <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500">
                    Entry {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className="text-[15px] mt-1.5">
                    I have a resentment toward{" "}
                    <em className="not-italic font-semibold">{r.object}</em>.
                  </div>
                  <div className="text-[14px] mt-2.5 leading-relaxed">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mr-2">Cause</span>
                    {r.cause}
                  </div>

                  {r.affectsList.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500">
                        This affects my…
                      </div>
                      <ul className="mt-1.5 ml-4 space-y-1.5">
                        {r.affectsList.map((a, j) => (
                          <li key={j} className="text-[14px] leading-relaxed">
                            <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mr-2">
                              {a.label}
                            </span>
                            {a.line}
                            {a.fear && <span className="text-red-800/80"> (fear: {a.fear})</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {r.realization && (
                    <div className="mt-3">
                      <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500">
                        Where I've done the same
                      </div>
                      <div className="text-[14px] mt-1.5 italic">{r.realization}</div>
                    </div>
                  )}

                  {r.defectsList.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500">My part</div>
                      <div className="text-[14px] mt-1.5">
                        I was{" "}
                        <span className="font-semibold">
                          {naturalList(r.defectsList.map((d) => d.label.toLowerCase()))}
                        </span>
                        .
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Part II — Fears */}
        {manuscript.fears.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-[12px] tracking-[0.2em] uppercase text-zinc-700 border-b border-zinc-300 pb-2">
              Part II · Fears
            </h2>
            <p className="font-serif text-[12px] text-zinc-700 italic mt-4 leading-relaxed">
              These are the fears underneath everything I just read. I will read each by name.
            </p>
            <ol className="mt-5 space-y-4">
              {manuscript.fears.map((f, idx) => (
                <li key={f.id} className="font-serif">
                  <div className="text-[14px] leading-relaxed">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mr-2">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    I'm afraid of <em className="not-italic font-semibold">{f.object}</em>.
                    {f.cause && <> Because {f.cause.replace(/\.$/, "")}.</>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Part III — Sex conduct */}
        {manuscript.sex.length > 0 && (
          <section className="mt-12">
            <h2 className="font-serif text-[12px] tracking-[0.2em] uppercase text-zinc-700 border-b border-zinc-300 pb-2">
              Part III · Sex conduct
            </h2>
            <p className="font-serif text-[12px] text-zinc-700 italic mt-4 leading-relaxed">
              Three questions, asked of each row I'm about to read: was I selfish, was I dishonest, was
              I inconsiderate. And what did I stir.
            </p>
            <ol className="mt-5 space-y-4">
              {manuscript.sex.map((s, idx) => (
                <li key={s.id} className="font-serif">
                  <div className="text-[14px] leading-relaxed">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mr-2">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    With <em className="not-italic font-semibold">{s.person}</em>, I was{" "}
                    {naturalList(s.tags) || "none of these"}.
                    {s.aroused && <> I stirred {s.aroused}.</>}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="mt-14 border-t border-zinc-300 pt-5 font-serif text-[12px] text-zinc-700 italic leading-relaxed">
          That is what I came to read. I'm asking you to hear it and to help me see what I still can't.
        </div>
      </div>
    </div>
  );
}
