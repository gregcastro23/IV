// The shape of the things we look at: resentments, fears, sex conduct,
// the assets we log, and the daily self-check. Three little inventories
// that together make the Fourth Step.

export type AffectKey =
  | "selfEsteem"
  | "pride"
  | "ambition"
  | "security"
  | "pocketbook"
  | "personal"
  | "sex";

export interface AffectDomain {
  key: AffectKey;
  label: string;
  /** Sentence stem the user finishes in their own words. */
  start: string;
  hint: string;
}

/** A single Column 3 cell: the role line, plus the fear bracketed beneath it. */
export interface AffectEntry {
  on: boolean;
  line: string;
  fear: string;
}

export type Affects = Record<AffectKey, AffectEntry>;

export type DefectSet = "program" | "shared" | "extended";

export type DefectKey =
  | "selfish"
  | "dishonest"
  | "inconsiderate"
  | "frightened"
  | "prideful"
  | "greedy"
  | "wrathful"
  | "envious"
  | "slothful"
  | "lustful"
  | "gluttonous";

export interface DefectDef {
  key: DefectKey;
  label: string;
  /** The working counter-virtue this defect points at. */
  virtue: Virtue;
  set: DefectSet;
}

export type DefectFlags = Partial<Record<DefectKey, boolean>>;

export type Virtue =
  | "Honesty"
  | "Unselfishness"
  | "Consideration"
  | "Courage"
  | "Humility"
  | "Tolerance"
  | "Patience"
  | "Generosity"
  | "Gratitude"
  | "Diligence"
  | "Self-restraint"
  | "Temperance";

export interface Resentment {
  id: string;
  /** Column 1 — the person, institution, or principle. */
  object: string;
  /** Column 2 — what happened. */
  cause: string;
  /** Column 3 — which of the seven areas were touched. */
  affects: Affects;
  /** Column 4 — my part. */
  defects: DefectFlags;
  /** The Realization, sitting between Columns 3 and 4. */
  realization: string;
  sealed: boolean;
  sealedAt?: string;
}

export interface Fear {
  id: string;
  object: string;
  cause: string;
  trustsGodInstead: boolean;
  sealed: boolean;
}

export interface SexConduct {
  id: string;
  person: string;
  selfish: boolean;
  dishonest: boolean;
  inconsiderate: boolean;
  /** What I stirred — jealousy, suspicion, bitterness. */
  aroused: string;
  sealed: boolean;
}

export interface Asset {
  id: string;
  virtue: Virtue;
  note: string;
  /** ISO timestamp. */
  at: string;
}

export interface HaltTask {
  id: string;
  label: string;
  done: boolean;
}

export interface Halt {
  H: number;
  A: number;
  L: number;
  T: number;
}

export interface ActivityEntry {
  /** ISO timestamp, or the literal "init" for the seeded boot messages. */
  at: string;
  msg: string;
}

/** The full set of ledger data persisted to the device. */
export interface LedgerData {
  resentments: Resentment[];
  fears: Fear[];
  sexConduct: SexConduct[];
  assets: Asset[];
  haltTasks: HaltTask[];
  halt: Halt;
}

// ── Settings (the user-customizable theme) ──────────────────────────────────

/** [virtue dark, virtue bright, defect dark, defect bright] */
export type AccentPalette = [string, string, string, string];

export type Density = "compact" | "regular" | "comfy";

export type ManuscriptType = "Serif (Georgia)" | "Sans (Inter)" | "Typewriter (mono)";

export interface Settings {
  accent: AccentPalette;
  fontSize: number;
  density: Density;
  manuscriptType: ManuscriptType;
}

/** The five workspaces in the app shell. */
export type ViewId = "dashboard" | "framework" | "balance" | "emergency" | "manuscript";
