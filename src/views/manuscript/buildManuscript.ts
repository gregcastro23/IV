// Composes the three sealed lists into a single readable manuscript, with
// renderers for plain text (.txt / clipboard), print HTML (→ PDF), and the
// read-aloud teleprompter cards.
import type { DefectDef, Fear, Resentment, SexConduct } from "../../types.ts";
import { AFFECT_DOMAINS, DEFECT_KEYS } from "../../data/constants.ts";

export interface AffectLine {
  label: string;
  line: string;
  fear: string;
}

export interface ResentmentEntry {
  id: string;
  object: string;
  cause: string;
  realization: string;
  affectsList: AffectLine[];
  defectsList: DefectDef[];
}

export interface FearEntry {
  id: string;
  object: string;
  cause: string;
}

export interface SexEntry {
  id: string;
  person: string;
  tags: string[];
  aroused: string;
}

export interface AloudCard {
  section: string;
  eyebrow?: string;
  body: string;
  subBody?: string | null;
}

export interface Manuscript {
  resentments: ResentmentEntry[];
  fears: FearEntry[];
  sex: SexEntry[];
  toPlainText(): string;
  toPrintHTML(): string;
  toAloudCards(): AloudCard[];
}

export function naturalList(arr: string[]): string {
  if (!arr || !arr.length) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr[0] + " and " + arr[1];
  return arr.slice(0, -1).join(", ") + ", and " + arr[arr.length - 1];
}

export function buildManuscript(
  resentments: Resentment[],
  fears: Fear[],
  sex: SexConduct[],
): Manuscript {
  const resentmentEntries: ResentmentEntry[] = resentments.map((r) => {
    const affectsList = AFFECT_DOMAINS.filter((d) => r.affects[d.key].on).map((d) => ({
      label: d.label,
      line: r.affects[d.key].line,
      fear: r.affects[d.key].fear,
    }));
    const defectsList = DEFECT_KEYS.filter((d) => r.defects[d.key]);
    return {
      id: r.id,
      object: r.object,
      cause: r.cause,
      realization: r.realization || "",
      affectsList,
      defectsList,
    };
  });

  const fearEntries: FearEntry[] = (() => {
    const out: FearEntry[] = fears.map((f) => ({ id: f.id, object: f.object, cause: f.cause }));
    resentments.forEach((r) => {
      Object.entries(r.affects).forEach(([k, a]) => {
        if (a.on && a.fear.trim()) {
          const dom = AFFECT_DOMAINS.find((d) => d.key === k);
          out.push({
            id: `${r.id}.${k}`,
            object: a.fear,
            cause: `it surfaces through my ${dom ? dom.label.toLowerCase() : k} around ${r.object}`,
          });
        }
      });
    });
    return out;
  })();

  const sexEntries: SexEntry[] = sex.map((s) => {
    const tags: string[] = [];
    if (s.selfish) tags.push("selfish");
    if (s.dishonest) tags.push("dishonest");
    if (s.inconsiderate) tags.push("inconsiderate");
    return { id: s.id, person: s.person, tags, aroused: s.aroused };
  });

  return {
    resentments: resentmentEntries,
    fears: fearEntries,
    sex: sexEntries,

    toPlainText() {
      const L: string[] = [];
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      L.push("FIFTH STEP MANUSCRIPT");
      L.push(today);
      L.push("");
      if (resentmentEntries.length) {
        L.push("PART I — RESENTMENTS");
        L.push("");
        resentmentEntries.forEach((r, i) => {
          L.push(`${String(i + 1).padStart(2, "0")}.  I have a resentment toward ${r.object}.`);
          L.push(`    Cause: ${r.cause}`);
          if (r.affectsList.length) {
            L.push(`    This affects my…`);
            r.affectsList.forEach((a) =>
              L.push(`      • ${a.label}: ${a.line}${a.fear ? `  (fear: ${a.fear})` : ""}`),
            );
          }
          if (r.realization) L.push(`    Realization: ${r.realization}`);
          if (r.defectsList.length)
            L.push(`    My part: I was ${naturalList(r.defectsList.map((d) => d.label.toLowerCase()))}.`);
          L.push("");
        });
      }
      if (fearEntries.length) {
        L.push("PART II — FEARS");
        L.push("");
        fearEntries.forEach((f, i) => {
          L.push(
            `${String(i + 1).padStart(2, "0")}.  I am afraid of ${f.object}.${
              f.cause ? ` Because ${f.cause.replace(/\.$/, "")}.` : ""
            }`,
          );
        });
        L.push("");
      }
      if (sexEntries.length) {
        L.push("PART III — SEX CONDUCT");
        L.push("");
        sexEntries.forEach((s, i) => {
          L.push(
            `${String(i + 1).padStart(2, "0")}.  With ${s.person}, I was ${
              naturalList(s.tags) || "none of these"
            }.${s.aroused ? ` I stirred ${s.aroused}.` : ""}`,
          );
        });
        L.push("");
      }
      L.push("---");
      L.push(
        "That is what I came to read. I'm asking you to hear it and to help me see what I still can't.",
      );
      return L.join("\n");
    },

    toPrintHTML() {
      const esc = (s: string) =>
        String(s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c);
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      let h = `<h1>Fifth Step Manuscript</h1><div class="small">${esc(today)}</div>`;
      if (resentmentEntries.length) {
        h += `<h2>Part I · Resentments</h2><ol>`;
        resentmentEntries.forEach((r) => {
          h += `<li><p>I have a resentment toward <strong>${esc(r.object)}</strong>.</p>`;
          h += `<p><span class="col">Cause</span> ${esc(r.cause)}</p>`;
          if (r.affectsList.length) {
            h += `<p><span class="col">Affects my…</span></p><ul>`;
            r.affectsList.forEach((a) => {
              h += `<li>${esc(a.label)}: ${esc(a.line)}${
                a.fear ? ` <span class="fear">(fear: ${esc(a.fear)})</span>` : ""
              }</li>`;
            });
            h += `</ul>`;
          }
          if (r.realization) h += `<p><span class="col">Realization</span> <em>${esc(r.realization)}</em></p>`;
          if (r.defectsList.length)
            h += `<p><span class="col">My part</span> I was <strong>${esc(
              naturalList(r.defectsList.map((d) => d.label.toLowerCase())),
            )}</strong>.</p>`;
          h += `</li>`;
        });
        h += `</ol>`;
      }
      if (fearEntries.length) {
        h += `<h2>Part II · Fears</h2><ol>`;
        fearEntries.forEach((f) => {
          h += `<li>I'm afraid of <strong>${esc(f.object)}</strong>.${
            f.cause ? ` Because ${esc(f.cause.replace(/\.$/, ""))}.` : ""
          }</li>`;
        });
        h += `</ol>`;
      }
      if (sexEntries.length) {
        h += `<h2>Part III · Sex conduct</h2><ol>`;
        sexEntries.forEach((s) => {
          h += `<li>With <strong>${esc(s.person)}</strong>, I was ${esc(
            naturalList(s.tags) || "none of these",
          )}.${s.aroused ? ` I stirred ${esc(s.aroused)}.` : ""}</li>`;
        });
        h += `</ol>`;
      }
      h += `<p style="margin-top:2em;border-top:1px solid #aaa;padding-top:1em;"><em>That is what I came to read. I'm asking you to hear it and to help me see what I still can't.</em></p>`;
      return h;
    },

    toAloudCards() {
      const cards: AloudCard[] = [];
      cards.push({
        section: "Opening",
        eyebrow: "Before I begin",
        body: "I am about to read what I wrote. I will not edit it as I go.",
      });
      if (resentmentEntries.length) {
        cards.push({ section: "Part I", eyebrow: "Part one", body: "Resentments." });
        resentmentEntries.forEach((r, i) => {
          cards.push({
            section: `Part I · ${i + 1}/${resentmentEntries.length}`,
            eyebrow: `Resentment ${String(i + 1).padStart(2, "0")}`,
            body: `I have a resentment toward ${r.object}.`,
            subBody: r.cause,
          });
          r.affectsList.forEach((a) => {
            cards.push({
              section: `Part I · ${i + 1}/${resentmentEntries.length}`,
              eyebrow: a.label,
              body: a.line,
              subBody: a.fear ? `(fear: ${a.fear})` : null,
            });
          });
          if (r.realization) {
            cards.push({
              section: `Part I · ${i + 1}/${resentmentEntries.length}`,
              eyebrow: "Where I've done the same",
              body: r.realization,
            });
          }
          if (r.defectsList.length) {
            cards.push({
              section: `Part I · ${i + 1}/${resentmentEntries.length}`,
              eyebrow: "My part",
              body: `I was ${naturalList(r.defectsList.map((d) => d.label.toLowerCase()))}.`,
            });
          }
        });
      }
      if (fearEntries.length) {
        cards.push({ section: "Part II", eyebrow: "Part two", body: "Fears." });
        fearEntries.forEach((f, i) => {
          cards.push({
            section: `Part II · ${i + 1}/${fearEntries.length}`,
            eyebrow: `Fear ${String(i + 1).padStart(2, "0")}`,
            body: `I'm afraid of ${f.object}.`,
            subBody: f.cause ? `Because ${f.cause.replace(/\.$/, "")}.` : null,
          });
        });
      }
      if (sexEntries.length) {
        cards.push({ section: "Part III", eyebrow: "Part three", body: "Sex conduct." });
        sexEntries.forEach((s, i) => {
          cards.push({
            section: `Part III · ${i + 1}/${sexEntries.length}`,
            eyebrow: `Row ${String(i + 1).padStart(2, "0")}`,
            body: `With ${s.person}, I was ${naturalList(s.tags) || "none of these"}.`,
            subBody: s.aroused ? `I stirred ${s.aroused}.` : null,
          });
        });
      }
      cards.push({
        section: "Close",
        eyebrow: "What I came to read",
        body: "That is what I came to read.",
        subBody: "I'm asking you to hear it and to help me see what I still can't.",
      });
      return cards;
    },
  };
}
