import type {
  ActivityEntry,
  Asset,
  Fear,
  Halt,
  HaltTask,
  Resentment,
  SexConduct,
} from "../types.ts";

// A handful of pre-written rows so a first run isn't bare. On first load these
// seed localStorage; afterward the user's own data takes over.

export const SEED_RESENTMENTS: Resentment[] = [
  {
    id: "r-1",
    object: "Former employer (M.)",
    cause: "Dismissed me in front of the team during the quarterly review.",
    affects: {
      selfEsteem: { on: true, line: "I am competent and disciplined.", fear: "not good enough" },
      pride: { on: true, line: "Others should see me as a leader.", fear: "humiliated" },
      ambition: { on: true, line: "I want a promotion this cycle.", fear: "passed over" },
      security: { on: true, line: "I need this job to feel stable.", fear: "abandoned" },
      pocketbook: { on: true, line: "My income covers rent.", fear: "broke" },
      personal: { on: false, line: "", fear: "" },
      sex: { on: false, line: "", fear: "" },
    },
    defects: { selfish: true, prideful: true, wrathful: true, envious: true, frightened: true },
    realization: "I have dismissed others in meetings when I felt threatened.",
    sealed: true,
    sealedAt: "2026-05-18T14:22:00Z",
  },
  {
    id: "r-2",
    object: "Brother",
    cause: "Brought up old debt at the family dinner.",
    affects: {
      selfEsteem: { on: true, line: "I am a person who pays his way.", fear: "shamed" },
      pride: { on: true, line: "Others should see I've grown.", fear: "exposed" },
      ambition: { on: false, line: "", fear: "" },
      security: { on: false, line: "", fear: "" },
      pocketbook: { on: true, line: "My finances are private.", fear: "controlled" },
      personal: { on: true, line: "This family should respect distance.", fear: "ganged up on" },
      sex: { on: false, line: "", fear: "" },
    },
    defects: { inconsiderate: true, prideful: true, wrathful: true },
    realization: "I have weaponized other people's old failures the same way.",
    sealed: true,
    sealedAt: "2026-05-21T09:05:00Z",
  },
  {
    id: "r-3",
    object: "Landlord",
    cause: "Withheld the deposit without an itemized list.",
    affects: {
      selfEsteem: { on: false, line: "", fear: "" },
      pride: { on: true, line: "Others should treat me fairly.", fear: "cheated" },
      ambition: { on: false, line: "", fear: "" },
      security: { on: true, line: "I need a stable place to live.", fear: "homeless" },
      pocketbook: { on: true, line: "My deposit was three months saved.", fear: "broke" },
      personal: { on: false, line: "", fear: "" },
      sex: { on: false, line: "", fear: "" },
    },
    defects: { dishonest: true, inconsiderate: true, frightened: true, greedy: true },
    realization: "I have withheld what I owed when I thought I could get away with it.",
    sealed: true,
    sealedAt: "2026-05-24T17:40:00Z",
  },
];

export const SEED_FEARS: Fear[] = [
  { id: "f-1", object: "Running out of money", cause: "Counting on myself alone hasn't been enough.", trustsGodInstead: true, sealed: true },
  { id: "f-2", object: "Being alone in old age", cause: "I tied my worth to being wanted.", trustsGodInstead: false, sealed: true },
  { id: "f-3", object: "Being found out as a fraud", cause: "I built an image instead of a self.", trustsGodInstead: true, sealed: true },
];

export const SEED_SEX: SexConduct[] = [
  { id: "s-1", person: "K.", selfish: true, dishonest: true, inconsiderate: false, aroused: "jealousy", sealed: true },
  { id: "s-2", person: "J.", selfish: false, dishonest: false, inconsiderate: true, aroused: "bitterness", sealed: true },
];

export const SEED_ASSETS: Asset[] = [
  { id: "a-1", virtue: "Honesty", note: "Told the truth about the missed deadline instead of deflecting.", at: "2026-05-26T11:15:00Z" },
  { id: "a-2", virtue: "Consideration", note: "Listened without interrupting on the call with mom.", at: "2026-05-27T19:02:00Z" },
  { id: "a-3", virtue: "Humility", note: "Apologized to J. for the tone in my message.", at: "2026-05-28T08:30:00Z" },
  { id: "a-4", virtue: "Patience", note: "Held my tongue when neighbor's politics came up.", at: "2026-05-28T16:10:00Z" },
];

// Today's grounding list — small, today-only.
export const SEED_HALT_TASKS: HaltTask[] = [
  { id: "t-1", label: "First things first — one hard thing before noon", done: true },
  { id: "t-2", label: "Easy does it — one thing at a time", done: false },
  { id: "t-3", label: "Call a sober person before reaching for the page", done: false },
  { id: "t-4", label: "Eat a real meal before 2 pm", done: true },
  { id: "t-5", label: "Move the body for ten minutes", done: false },
];

export const SEED_HALT: Halt = { H: 3, A: 6, L: 4, T: 5 };

export const INITIAL_ACTIVITY: ActivityEntry[] = [
  { at: "init", msg: "Your private list is closed." },
  { at: "init", msg: "Nothing is sent off the device." },
  { at: "init", msg: "Waiting for your six-digit code." },
];
