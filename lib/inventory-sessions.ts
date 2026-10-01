import { z } from 'zod'
import {
  generateId,
  type AssetLog,
  type Fear,
  type Harm,
  type Resentment,
} from './inventory-store'

export const SESSION_STORAGE_KEY = 'inventory_sessions_v1'
export const SESSION_STEPS = ['halt', 'resentments', 'fears', 'harms', 'assets', 'review'] as const
export type SessionStep = typeof SESSION_STEPS[number]
export type EntrySection = Exclude<SessionStep, 'halt' | 'review'>

export const STEP_LABELS: Record<SessionStep, string> = {
  halt: 'Check in', resentments: 'Resentments', fears: 'Fears',
  harms: 'Harms', assets: 'Strengths', review: 'Review',
}
export const INSTINCTS = ['Self-esteem', 'Security', 'Ambitions', 'Finances', 'Relationships', 'Intimacy', 'Pride']

const timestamp = z.number().finite().nonnegative()
const resentmentSchema = z.object({
  id: z.string().min(1), object: z.string(), cause: z.string(),
  instincts: z.array(z.string()), myPart: z.array(z.string()),
  createdAt: timestamp, updatedAt: timestamp,
})
const fearSchema = z.object({
  id: z.string().min(1), fear: z.string(), cause: z.string(),
  affectedInstincts: z.array(z.string()), createdAt: timestamp,
})
const harmSchema = z.object({
  id: z.string().min(1), person: z.string(), harm: z.string(), amends: z.string(),
  willingness: z.enum(['ready', 'willing', 'not_yet']), createdAt: timestamp,
})
const assetSchema = z.object({
  id: z.string().min(1), virtue: z.string(), behavior: z.string(), timestamp,
})
const draftSchema = z.discriminatedUnion('section', [
  z.object({ section: z.literal('resentments'), question: z.number().int().min(0).max(3), entry: resentmentSchema }),
  z.object({ section: z.literal('fears'), question: z.number().int().min(0).max(2), entry: fearSchema }),
  z.object({ section: z.literal('harms'), question: z.number().int().min(0).max(3), entry: harmSchema }),
  z.object({ section: z.literal('assets'), question: z.number().int().min(0).max(1), entry: assetSchema }),
])

export const inventorySessionSchema = z.object({
  version: z.literal(1), id: z.string().min(1), title: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startedAt: timestamp, updatedAt: timestamp, completedAt: timestamp.optional(),
  currentStep: z.enum(SESSION_STEPS), reviewed: z.array(z.enum(SESSION_STEPS)),
  halt: z.object({
    hungry: z.number().min(0).max(10), angry: z.number().min(0).max(10),
    lonely: z.number().min(0).max(10), tired: z.number().min(0).max(10), note: z.string(),
  }),
  resentments: z.array(resentmentSchema), fears: z.array(fearSchema),
  harms: z.array(harmSchema), assets: z.array(assetSchema),
  draft: draftSchema.nullable(), reflection: z.string(), nextStep: z.string(),
})

export type InventorySession = z.infer<typeof inventorySessionSchema>
export type EntryDraft = z.infer<typeof draftSchema>
export type ReviewContent = Pick<InventorySession, 'halt' | 'resentments' | 'fears' | 'harms' | 'assets' | 'reflection' | 'nextStep'>

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function formatSessionDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
}

export function createInventorySession(now = new Date()): InventorySession {
  return {
    version: 1, id: generateId(), title: '', date: localDate(now),
    startedAt: now.getTime(), updatedAt: now.getTime(), currentStep: 'halt', reviewed: [],
    halt: { hungry: 0, angry: 0, lonely: 0, tired: 0, note: '' },
    resentments: [], fears: [], harms: [], assets: [], draft: null, reflection: '', nextStep: '',
  }
}

export class InventoryStorageError extends Error {
  constructor(message: string) { super(message); this.name = 'InventoryStorageError' }
}

export function readInventorySessions(): InventorySession[] {
  if (typeof window === 'undefined') return []
  let raw: string | null
  try { raw = localStorage.getItem(SESSION_STORAGE_KEY) }
  catch { throw new InventoryStorageError('This browser is blocking access to saved sessions.') }
  if (raw === null) return []
  try { return z.array(inventorySessionSchema).parse(JSON.parse(raw)) }
  catch { throw new InventoryStorageError('Saved sessions could not be read. The original data has been preserved.') }
}

export function upsertSession(sessions: InventorySession[], session: InventorySession): InventorySession[] {
  return [...sessions.filter(item => item.id !== session.id), session]
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

// One write keeps the session, its entries, and its unfinished answer together.
export function saveInventorySession(session: InventorySession): InventorySession[] {
  const validSession = inventorySessionSchema.parse(session)
  const sessions = upsertSession(readInventorySessions(), validSession)
  if (typeof window === 'undefined') throw new InventoryStorageError('Local storage is unavailable.')
  try { localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions)) }
  catch { throw new InventoryStorageError('Your changes could not be saved in this browser. Keep this page open and try again.') }
  return sessions
}

export function createEntryDraft(section: EntrySection, existing?: Resentment | Fear | Harm | AssetLog): EntryDraft {
  const id = generateId()
  const now = Date.now()
  switch (section) {
    case 'resentments': return draftSchema.parse({ section, question: 0, entry: existing ?? { id, object: '', cause: '', instincts: [], myPart: [], createdAt: now, updatedAt: now } })
    case 'fears': return draftSchema.parse({ section, question: 0, entry: existing ?? { id, fear: '', cause: '', affectedInstincts: [], createdAt: now } })
    case 'harms': return draftSchema.parse({ section, question: 0, entry: existing ?? { id, person: '', harm: '', amends: '', willingness: 'willing', createdAt: now } })
    case 'assets': return draftSchema.parse({ section, question: 0, entry: existing ?? { id, virtue: '', behavior: '', timestamp: now } })
  }
}

export function draftValue(draft: EntryDraft): string | string[] {
  switch (draft.section) {
    case 'resentments': return [draft.entry.object, draft.entry.cause, draft.entry.instincts, draft.entry.myPart][draft.question]
    case 'fears': return [draft.entry.fear, draft.entry.cause, draft.entry.affectedInstincts][draft.question]
    case 'harms': return [draft.entry.person, draft.entry.harm, draft.entry.amends, draft.entry.willingness][draft.question]
    case 'assets': return [draft.entry.virtue, draft.entry.behavior][draft.question]
  }
}

export function updateDraftValue(draft: EntryDraft, value: string | string[]): EntryDraft {
  const fields = {
    resentments: ['object', 'cause', 'instincts', 'myPart'],
    fears: ['fear', 'cause', 'affectedInstincts'],
    harms: ['person', 'harm', 'amends', 'willingness'],
    assets: ['virtue', 'behavior'],
  }
  return draftSchema.parse({ ...draft, entry: { ...draft.entry, [fields[draft.section][draft.question]]: value } })
}

export function isDraftQuestionValid(draft: EntryDraft): boolean {
  // Optional choices and a possible repair plan can stay empty.
  if (draft.section === 'resentments' && draft.question >= 2) return true
  if (draft.section === 'fears' && draft.question === 2) return true
  if (draft.section === 'harms' && draft.question === 2) return true
  const value = draftValue(draft)
  return typeof value === 'string' && value.trim().length > 0
}

export function saveDraftEntry(session: InventorySession): InventorySession {
  const draft = session.draft
  if (!draft) throw new Error('There is no entry to save.')
  const questionCount = draft.section === 'fears' ? 3 : draft.section === 'assets' ? 2 : 4
  for (let question = 0; question < questionCount; question++) {
    if (!isDraftQuestionValid({ ...draft, question })) throw new Error('Finish the required answers before saving this entry.')
  }
  const entry = Object.fromEntries(Object.entries(draft.entry).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]))
  if (draft.section === 'resentments') entry.updatedAt = Date.now()
  return inventorySessionSchema.parse({
    ...session, [draft.section]: [...session[draft.section].filter(item => item.id !== draft.entry.id), entry], draft: null,
  })
}

export function advanceSession(session: InventorySession): InventorySession {
  if (session.draft?.section === session.currentStep) throw new Error('Save your unfinished entry before continuing.')
  const index = SESSION_STEPS.indexOf(session.currentStep)
  return {
    ...session, reviewed: [...new Set([...session.reviewed, session.currentStep])],
    currentStep: SESSION_STEPS[Math.min(index + 1, SESSION_STEPS.length - 1)],
  }
}

export function finishInventorySession(session: InventorySession): InventorySession {
  if (session.draft) throw new Error('Save your unfinished entry before completing the inventory.')
  if (SESSION_STEPS.slice(0, -1).some(step => !session.reviewed.includes(step))) {
    throw new Error('Visit each section before completing your inventory.')
  }
  return { ...session, currentStep: 'review', reviewed: [...new Set([...session.reviewed, 'review' as const])], completedAt: session.completedAt ?? Date.now() }
}

export function entryCount(content: Pick<ReviewContent, EntrySection>): number {
  return content.resentments.length + content.fears.length + content.harms.length + content.assets.length
}

export function sessionSearchText(session: InventorySession): string {
  return [session.title, session.date, formatSessionDate(session.date), session.reflection, session.nextStep,
    ...session.resentments.flatMap(item => [item.object, item.cause]),
    ...session.fears.flatMap(item => [item.fear, item.cause]),
    ...session.harms.flatMap(item => [item.person, item.harm, item.amends]),
    ...session.assets.flatMap(item => [item.virtue, item.behavior]),
  ].join(' ').toLocaleLowerCase()
}

export function reviewText(content: ReviewContent, title: string, date: string): string {
  const lines = [title, date, '', 'HALT CHECK-IN',
    `Hungry: ${content.halt.hungry}/10 · Angry: ${content.halt.angry}/10 · Lonely: ${content.halt.lonely}/10 · Tired: ${content.halt.tired}/10`,
    content.halt.note, '', 'RESENTMENTS',
    ...content.resentments.flatMap((item, index) => [
      `${index + 1}. ${item.object}`, `What happened: ${item.cause}`,
      `Affected: ${item.instincts.join(', ') || 'None selected'}`, `My part: ${item.myPart.join(', ') || 'None identified'}`, '',
    ]),
    ...(content.resentments.length ? [] : ['Nothing added in this section.', '']),
    'FEARS', ...content.fears.flatMap((item, index) => [
      `${index + 1}. ${item.fear}`, `Underneath it: ${item.cause}`, `Affected: ${item.affectedInstincts.join(', ') || 'None selected'}`, '',
    ]),
    ...(content.fears.length ? [] : ['Nothing added in this section.', '']),
    'HARMS', ...content.harms.flatMap((item, index) => [
      `${index + 1}. ${item.person}`, `What happened: ${item.harm}`, `Possible repair: ${item.amends || 'Still reflecting'}`,
      `Readiness: ${{ ready: 'Ready to discuss', willing: 'Willing, with support', not_yet: 'Not ready yet' }[item.willingness]}`, '',
    ]),
    ...(content.harms.length ? [] : ['Nothing added in this section.', '']),
    'STRENGTHS', ...content.assets.flatMap(item => [`${item.virtue}: ${item.behavior}`, '']),
    ...(content.assets.length ? [] : ['Nothing added in this section.', '']),
    'REFLECTION', content.reflection || 'No reflection added.', '', 'ONE NEXT STEP', content.nextStep || 'No next step added.',
  ]
  return lines.join('\n')
}
