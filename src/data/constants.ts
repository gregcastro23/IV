import type {
  AccentPalette,
  AffectDomain,
  Affects,
  DefectDef,
  Settings,
  Virtue,
} from "../types.ts";

// Column 3 — the seven areas of self. Each starts with a stem the user
// finishes in their own words, then we ask them to bracket the fear underneath.
export const AFFECT_DOMAINS: readonly AffectDomain[] = [
  { key: "selfEsteem", label: "Self-esteem", start: "I am…", hint: "The role I've given myself" },
  { key: "pride", label: "Pride", start: "Others should…", hint: "The role I've given other people" },
  { key: "ambition", label: "Ambitions", start: "I want…", hint: "What I wanted to happen" },
  { key: "security", label: "Security", start: "I need…", hint: "What I need to feel okay" },
  { key: "pocketbook", label: "Pocketbook", start: "My money…", hint: "Money, work, possessions" },
  { key: "personal", label: "Personal relations", start: "This person should…", hint: "How I think this relationship should look" },
  { key: "sex", label: "Sex relations", start: "A partner should…", hint: "What I expected from a partner" },
];

// Column 4 — defects. The cardinal program list, plus the older traditions the
// user asked to surface. Each one points at a working counter-virtue.
export const DEFECT_KEYS: readonly DefectDef[] = [
  // cardinal program list
  { key: "selfish", label: "Selfish", virtue: "Unselfishness", set: "program" },
  { key: "dishonest", label: "Dishonest", virtue: "Honesty", set: "program" },
  { key: "inconsiderate", label: "Inconsiderate", virtue: "Consideration", set: "program" },
  { key: "frightened", label: "Frightened", virtue: "Courage", set: "program" },
  { key: "prideful", label: "Prideful", virtue: "Humility", set: "shared" },
  // extended set
  { key: "greedy", label: "Greedy", virtue: "Generosity", set: "extended" },
  { key: "wrathful", label: "Wrathful", virtue: "Patience", set: "extended" },
  { key: "envious", label: "Envious", virtue: "Gratitude", set: "extended" },
  { key: "slothful", label: "Slothful", virtue: "Diligence", set: "extended" },
  { key: "lustful", label: "Lustful", virtue: "Self-restraint", set: "extended" },
  { key: "gluttonous", label: "Gluttonous", virtue: "Temperance", set: "extended" },
];

export const VIRTUE_KEYS: readonly Virtue[] = [
  "Honesty",
  "Unselfishness",
  "Consideration",
  "Courage",
  "Humility",
  "Tolerance",
  "Patience",
  "Generosity",
  "Gratitude",
  "Diligence",
  "Self-restraint",
  "Temperance",
];

// Each preset is [virtue dark, virtue bright, defect dark, defect bright].
export const ACCENT_PRESETS: AccentPalette[] = [
  ["#78350f", "#f59e0b", "#7f1d1d", "#ef4444"], // Amber & Crimson (default)
  ["#064e3b", "#10b981", "#7f1d1d", "#ef4444"], // Emerald & Crimson
  ["#312e81", "#818cf8", "#7f1d1d", "#ef4444"], // Indigo & Crimson
  ["#3f3f46", "#a1a1aa", "#52525b", "#d4d4d8"], // Monochrome (no warmth)
  ["#5b3a1e", "#d4a373", "#5b1e1e", "#c1666b"], // Faded paper
];

export const ACCENT_PRESET_NAMES: readonly string[] = [
  "Amber & Crimson",
  "Emerald & Crimson",
  "Indigo & Crimson",
  "Monochrome",
  "Faded paper",
];

export const DEFAULT_SETTINGS: Settings = {
  accent: ["#78350f", "#f59e0b", "#7f1d1d", "#ef4444"],
  fontSize: 13,
  density: "regular",
  manuscriptType: "Serif (Georgia)",
};

/** A fresh, empty Column 3 map — every area off, no role line, no fear. */
export function makeEmptyAffects(): Affects {
  return Object.fromEntries(
    AFFECT_DOMAINS.map((d) => [d.key, { on: false, line: "", fear: "" }]),
  ) as Affects;
}

/** Short random id with a stable prefix, matching the prototype's scheme. */
export function makeId(prefix: string): string {
  return prefix + Math.random().toString(36).slice(2, 7);
}
