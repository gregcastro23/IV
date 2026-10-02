import { z } from 'zod'
import { generateId } from './inventory-store'
import type { InventorySession } from './inventory-sessions'

// A moment is one timestamped check-in: a spot-check inventory taken whenever the app is opened.
// Moments are stored with the UTC instant and the device's UTC offset at capture, so times and days
// stay as the person lived them even after travel or daylight-saving changes.

export const HALT_KEYS = ['hungry', 'angry', 'lonely', 'tired'] as const
export type HaltKey = typeof HALT_KEYS[number]
export type NeedKey = HaltKey | 'urge'
export const NEED_KEYS: readonly NeedKey[] = [...HALT_KEYS, 'urge']
export const NEED_LABELS: Record<NeedKey, { label: string; noun: string }> = {
  hungry: { label: 'Hungry', noun: 'hunger' }, angry: { label: 'Angry', noun: 'anger' },
  lonely: { label: 'Lonely', noun: 'loneliness' }, tired: { label: 'Tired', noun: 'tiredness' },
  urge: { label: 'Urges', noun: 'urges' },
}
export const MOOD_LEVELS = [
  { value: 1, label: 'Struggling' }, { value: 2, label: 'Low' }, { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' }, { value: 5, label: 'Great' },
] as const
export const FEELINGS = [
  { value: 'Anxious', tone: 'difficult' }, { value: 'Afraid', tone: 'difficult' }, { value: 'Irritable', tone: 'difficult' },
  { value: 'Resentful', tone: 'difficult' }, { value: 'Ashamed', tone: 'difficult' }, { value: 'Guilty', tone: 'difficult' },
  { value: 'Sad', tone: 'difficult' }, { value: 'Overwhelmed', tone: 'difficult' }, { value: 'Restless', tone: 'difficult' },
  { value: 'Numb', tone: 'difficult' }, { value: 'Calm', tone: 'comfortable' }, { value: 'Grateful', tone: 'comfortable' },
  { value: 'Hopeful', tone: 'comfortable' }, { value: 'Connected', tone: 'comfortable' }, { value: 'Content', tone: 'comfortable' },
  { value: 'Confident', tone: 'comfortable' },
] as const
export const CONTEXTS = ['Home', 'Work or school', 'On the move', 'Alone', 'With family', 'With friends', 'With a partner', 'At a meeting', 'On my phone', 'Out in public'] as const
export const DAY_PARTS = [
  { key: 'morning', label: 'Morning', range: '5am–noon' },
  { key: 'afternoon', label: 'Afternoon', range: 'noon–5pm' },
  { key: 'evening', label: 'Evening', range: '5–10pm' },
  { key: 'night', label: 'Night', range: '10pm–5am' },
] as const
export type DayPart = typeof DAY_PARTS[number]['key']

const MINUTE = 60_000
const timestamp = z.number().finite().nonnegative()
const level = z.number().min(0).max(10)
const tag = z.string().trim().min(1).max(60)
export const haltSchema = z.object({ hungry: level, angry: level, lonely: level, tired: level })
export const momentSchema = z.object({
  id: z.string().min(1), at: timestamp, offset: z.number().int().min(-16 * 60).max(16 * 60),
  halt: haltSchema, mood: z.number().int().min(1).max(5).nullable(), urge: level.nullable(),
  feelings: z.array(tag).max(30), context: z.array(tag).max(30), note: z.string().max(20_000),
  source: z.enum(['check-in', 'session', 'imported']), sessionId: z.string().min(1).optional(), updatedAt: timestamp,
}).strict()
export type Moment = z.infer<typeof momentSchema>
export type HaltLevels = z.infer<typeof haltSchema>
export type MomentInput = Pick<Moment, 'halt' | 'mood' | 'urge' | 'feelings' | 'context' | 'note'>

const pad = (value: number) => String(value).padStart(2, '0')
const isoDay = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
const wallClock = (moment: Pick<Moment, 'at' | 'offset'>) => new Date(moment.at + moment.offset * MINUTE)
const dayDate = (day: string) => { const [year, month, date] = day.split('-').map(Number); return new Date(Date.UTC(year, month - 1, date)) }
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const round1 = (value: number) => Math.round(value * 10) / 10

export function currentOffset(date = new Date()): number { return -date.getTimezoneOffset() }
/** The calendar day where the person was when they checked in. */
export function momentDay(moment: Pick<Moment, 'at' | 'offset'>): string { return isoDay(wallClock(moment)) }
/** Minutes since local midnight at the time of the check-in. */
export function momentMinutes(moment: Pick<Moment, 'at' | 'offset'>): number { const time = wallClock(moment); return time.getUTCHours() * 60 + time.getUTCMinutes() }
export function formatMomentTime(moment: Pick<Moment, 'at' | 'offset'>): string {
  return wallClock(moment).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}
export function formatDay(day: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }): string {
  return dayDate(day).toLocaleDateString(undefined, { ...options, timeZone: 'UTC' })
}
export function shiftDay(day: string, delta: number): string { const date = dayDate(day); date.setUTCDate(date.getUTCDate() + delta); return isoDay(date) }
export function dayRange(lastDay: string, count: number): string[] { return Array.from({ length: count }, (_, index) => shiftDay(lastDay, index - count + 1)) }
export function formatOffset(offset: number): string { const sign = offset < 0 ? '-' : '+'; const value = Math.abs(offset); return `UTC${sign}${pad(Math.floor(value / 60))}:${pad(value % 60)}` }
/** Converts a `datetime-local` value, read in this device's time zone, into a moment instant. */
export function localInputToInstant(value: string): { at: number; offset: number } | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : { at: date.getTime(), offset: currentOffset(date) }
}
export function instantToLocalInput(moment: Pick<Moment, 'at' | 'offset'>): string {
  const time = wallClock(moment)
  return `${isoDay(time)}T${pad(time.getUTCHours())}:${pad(time.getUTCMinutes())}`
}
export function dayPart(moment: Pick<Moment, 'at' | 'offset'>): DayPart {
  const hour = Math.floor(momentMinutes(moment) / 60)
  return hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : hour >= 17 && hour < 22 ? 'evening' : 'night'
}

export function emptyMomentInput(): MomentInput {
  return { halt: { hungry: 0, angry: 0, lonely: 0, tired: 0 }, mood: null, urge: 0, feelings: [], context: [], note: '' }
}
function cleanInput(input: MomentInput): MomentInput {
  const unique = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))]
  return { ...input, feelings: unique(input.feelings), context: unique(input.context), note: input.note.trim() }
}
export function createMoment(input: MomentInput, now = new Date(), extra: Partial<Pick<Moment, 'source' | 'sessionId' | 'at' | 'offset'>> = {}): Moment {
  return momentSchema.parse({ id: generateId(), at: now.getTime(), offset: currentOffset(now), source: 'check-in', ...extra, ...cleanInput(input), updatedAt: now.getTime() })
}
export function editMoment(moment: Moment, changes: Partial<MomentInput & Pick<Moment, 'at' | 'offset'>>, now = Date.now()): Moment {
  const next = { ...moment, ...changes }
  return momentSchema.parse({ ...next, ...cleanInput(next), updatedAt: now })
}
/** Keeps moments in chronological order with one copy per id. */
export function upsertMoment(moments: Moment[], moment: Moment): Moment[] {
  return [...moments.filter(item => item.id !== moment.id), moment].sort((a, b) => a.at - b.at)
}
export function latestMoment(moments: Moment[]): Moment | undefined {
  return moments.reduce<Moment | undefined>((latest, moment) => !latest || moment.at > latest.at ? moment : latest, undefined)
}

/** A full inventory's HALT step is also a moment; revisiting the step updates the same record. */
export function syncSessionMoment(moments: Moment[], session: InventorySession, now = new Date()): Moment[] {
  const { note, ...halt } = session.halt
  const linked = moments.find(moment => moment.sessionId === session.id)
  if (linked) return upsertMoment(moments, editMoment(linked, { halt, note: linked.source === 'session' ? note : linked.note || note }, now.getTime()))
  return upsertMoment(moments, createMoment({ ...emptyMomentInput(), halt, urge: null, note }, now, { source: 'session', sessionId: session.id }))
}

const legacyHaltLog = z.object({ hungry: z.number(), angry: z.number(), lonely: z.number(), tired: z.number(), note: z.string().optional(), timestamp: timestamp })
const clamp = (value: number) => Math.min(10, Math.max(0, value))
/** Builds a timeline from history recorded before moments existed. Older records keep their original time. */
export function backfillMoments(sessions: InventorySession[], legacyHaltLogs?: string): Moment[] {
  const moments: Moment[] = []
  for (const session of sessions) {
    const { note, ...halt } = session.halt
    const answered = session.reviewed.includes('halt') || note.trim() || Object.values(halt).some(value => value > 0)
    if (!answered) continue
    const at = new Date(session.startedAt)
    moments.push(createMoment({ ...emptyMomentInput(), halt, urge: null, note }, at, { source: 'session', sessionId: session.id }))
  }
  if (legacyHaltLogs) {
    try {
      for (const log of z.array(legacyHaltLog).parse(JSON.parse(legacyHaltLogs))) {
        const halt = { hungry: clamp(log.hungry), angry: clamp(log.angry), lonely: clamp(log.lonely), tired: clamp(log.tired) }
        moments.push(createMoment({ ...emptyMomentInput(), halt, urge: null, note: log.note ?? '' }, new Date(log.timestamp), { source: 'imported' }))
      }
    } catch { /* The original record stays in the encrypted archive. */ }
  }
  return moments.sort((a, b) => a.at - b.at)
}

export function needValue(moment: Moment, key: NeedKey): number | null { return key === 'urge' ? moment.urge : moment.halt[key] }
type NeedAverages = Record<NeedKey, number | null>
function needAverages(moments: Moment[]): NeedAverages {
  return Object.fromEntries(NEED_KEYS.map(key => [key, average(moments.map(moment => needValue(moment, key)).filter((value): value is number => value !== null))])) as NeedAverages
}
function moodAverage(moments: Moment[]) { return average(moments.map(moment => moment.mood).filter((value): value is number => value !== null)) }

export function momentsOnDay(moments: Moment[], day: string): Moment[] { return moments.filter(moment => momentDay(moment) === day).sort((a, b) => a.at - b.at) }
export function momentsInDays(moments: Moment[], firstDay: string, lastDay: string): Moment[] {
  return moments.filter(moment => { const day = momentDay(moment); return day >= firstDay && day <= lastDay }).sort((a, b) => a.at - b.at)
}
export type DaySummary = { day: string; count: number; mood: number | null; needs: NeedAverages }
export function summarizeDays(moments: Moment[], days: string[]): DaySummary[] {
  const byDay = new Map<string, Moment[]>()
  for (const moment of moments) { const day = momentDay(moment); byDay.set(day, [...byDay.get(day) ?? [], moment]) }
  return days.map(day => { const items = byDay.get(day) ?? []; return { day, count: items.length, mood: moodAverage(items), needs: needAverages(items) } })
}
export type DayPartSummary = { key: DayPart; label: string; range: string; count: number; mood: number | null; needs: NeedAverages }
export function summarizeDayParts(moments: Moment[]): DayPartSummary[] {
  return DAY_PARTS.map(part => { const items = moments.filter(moment => dayPart(moment) === part.key); return { ...part, count: items.length, mood: moodAverage(items), needs: needAverages(items) } })
}
export function countTags(moments: Moment[], field: 'feelings' | 'context'): { value: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const moment of moments) for (const value of moment[field]) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export type Insight = { id: string; text: string; tone: 'notice' | 'encourage' }
const MIN_GROUP = 3
const NEED_GAP = 1.5
const MOOD_GAP = 0.6
/**
 * Plain-language patterns. Each rule needs several check-ins on both sides of a comparison and a
 * noticeable gap, and phrases results as tendencies rather than causes.
 */
export function findInsights(moments: Moment[], today: string): Insight[] {
  if (moments.length < MIN_GROUP) return []
  const insights: (Insight & { weight: number })[] = []
  const overall = needAverages(moments)
  const parts = summarizeDayParts(moments)
  for (const key of NEED_KEYS) {
    const base = overall[key]
    if (base === null) continue
    const peak = parts.filter(part => part.count >= 2 && part.needs[key] !== null).sort((a, b) => b.needs[key]! - a.needs[key]!)[0]
    const value = peak?.needs[key]
    if (!peak || value === null || value === undefined || value < 4 || value - base < NEED_GAP) continue
    insights.push({ id: `time-${key}`, tone: 'notice', weight: value - base, text: `${capitalize(NEED_LABELS[key].noun)} ${key === 'urge' ? 'have' : 'has'} tended to run highest in the ${peak.label.toLowerCase()} — ${round1(value)} on average, compared with ${round1(base)} overall.` })
  }
  const withUrge = moments.filter(moment => moment.urge !== null)
  for (const key of HALT_KEYS) {
    const high = withUrge.filter(moment => moment.halt[key] >= 6)
    const other = withUrge.filter(moment => moment.halt[key] < 6)
    if (high.length < MIN_GROUP || other.length < MIN_GROUP) continue
    const a = average(high.map(moment => moment.urge!))!
    const b = average(other.map(moment => moment.urge!))!
    if (a - b >= NEED_GAP) insights.push({ id: `urge-${key}`, tone: 'notice', weight: a - b + 1, text: `When ${NEED_LABELS[key].noun} was 6 or higher, urges averaged ${round1(a)}, compared with ${round1(b)} at other check-ins.` })
  }
  for (const { value: context } of countTags(moments, 'context')) {
    const present = moments.filter(moment => moment.context.includes(context))
    const absent = moments.filter(moment => !moment.context.includes(context))
    if (present.length < MIN_GROUP || absent.length < MIN_GROUP) continue
    const inside = needAverages(present); const outside = needAverages(absent)
    const strongest = NEED_KEYS.map(key => ({ key, gap: inside[key] !== null && outside[key] !== null ? inside[key]! - outside[key]! : 0 })).sort((x, y) => Math.abs(y.gap) - Math.abs(x.gap))[0]
    if (Math.abs(strongest.gap) >= NEED_GAP) {
      insights.push({ id: `context-${context}`, tone: strongest.gap > 0 ? 'notice' : 'encourage', weight: Math.abs(strongest.gap), text: `${contextPhrase(context)}, ${NEED_LABELS[strongest.key].noun} averaged ${round1(inside[strongest.key]!)} — ${round1(Math.abs(strongest.gap))} ${strongest.gap > 0 ? 'higher' : 'lower'} than at other times.` })
      continue
    }
    const moodInside = moodAverage(present); const moodOutside = moodAverage(absent)
    if (moodInside !== null && moodOutside !== null && Math.abs(moodInside - moodOutside) >= MOOD_GAP) {
      const better = moodInside > moodOutside
      insights.push({ id: `context-mood-${context}`, tone: better ? 'encourage' : 'notice', weight: Math.abs(moodInside - moodOutside) * 2, text: `${contextPhrase(context)}, your mood tended to be ${better ? 'brighter' : 'lower'} (${round1(moodInside)} of 5, versus ${round1(moodOutside)} elsewhere).` })
    }
  }
  const feelings = countTags(moments, 'feelings')
  if (feelings[0]?.count >= MIN_GROUP) insights.push({ id: 'feeling', tone: 'notice', weight: 0.5, text: `“${feelings[0].value}” is the feeling you have named most often (${feelings[0].count} times). Naming a feeling is a small way of easing its grip.` })
  const thisWeek = moodAverage(momentsInDays(moments, shiftDay(today, -6), today).filter(moment => moment.mood !== null))
  const lastWeek = moodAverage(momentsInDays(moments, shiftDay(today, -13), shiftDay(today, -7)).filter(moment => moment.mood !== null))
  const weekCounts = [momentsInDays(moments, shiftDay(today, -6), today), momentsInDays(moments, shiftDay(today, -13), shiftDay(today, -7))].map(items => items.filter(moment => moment.mood !== null).length)
  if (thisWeek !== null && lastWeek !== null && weekCounts.every(count => count >= MIN_GROUP) && Math.abs(thisWeek - lastWeek) >= 0.5) {
    const up = thisWeek > lastWeek
    insights.push({ id: 'mood-trend', tone: up ? 'encourage' : 'notice', weight: 1.2, text: `Your mood averaged ${round1(thisWeek)} of 5 over the past seven days, ${up ? 'up' : 'down'} from ${round1(lastWeek)} the week before.` })
  }
  const activeDays = new Set(momentsInDays(moments, shiftDay(today, -6), today).map(momentDay)).size
  if (activeDays >= 3) insights.push({ id: 'consistency', tone: 'encourage', weight: 0.25, text: `You checked in on ${activeDays} of the last 7 days. Each check-in makes these patterns clearer.` })
  // Lead with the strongest pattern of each kind, then fill remaining space by strength.
  const ranked = insights.sort((a, b) => b.weight - a.weight)
  const kinds = new Set<string>()
  const picked = ranked.filter(item => { const kind = item.id.split('-')[0]; return kinds.has(kind) ? false : (kinds.add(kind), true) })
  for (const item of ranked) if (picked.length < 6 && !picked.includes(item)) picked.push(item)
  return picked.slice(0, 6).sort((a, b) => b.weight - a.weight).map(({ weight: _, ...insight }) => insight)
}
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
function contextPhrase(context: string): string {
  const phrases: Record<string, string> = {
    Home: 'At home', 'Work or school': 'At work or school', 'On the move': 'On the move', Alone: 'When you were alone',
    'With family': 'With family', 'With friends': 'With friends', 'With a partner': 'With a partner', 'At a meeting': 'At meetings',
    'On my phone': 'When you were on your phone', 'Out in public': 'Out in public',
  }
  return phrases[context] ?? `When “${context}” applied`
}

/** Spreadsheet programs run cells that start with formula characters, so text cells are neutralised. */
function csvCell(value: string | number | null): string {
  if (value === null) return ''
  if (typeof value === 'number') return String(value)
  const safe = /^[\s]*[=+\-@]|^[\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}
export function momentsCsv(moments: Moment[]): string {
  const header = ['Date', 'Time', 'UTC offset', 'Mood (1-5)', 'Mood', 'Hungry', 'Angry', 'Lonely', 'Tired', 'Urges', 'Feelings', 'Context', 'Note', 'Source']
  const rows = [...moments].sort((a, b) => a.at - b.at).map(moment => [
    momentDay(moment), formatMomentTime(moment), formatOffset(moment.offset), moment.mood,
    MOOD_LEVELS.find(level => level.value === moment.mood)?.label ?? '', moment.halt.hungry, moment.halt.angry,
    moment.halt.lonely, moment.halt.tired, moment.urge, moment.feelings.join('; '), moment.context.join('; '), moment.note, moment.source,
  ].map(csvCell).join(','))
  return `﻿${[header.map(csvCell).join(','), ...rows].join('\r\n')}\r\n`
}
export function momentText(moment: Moment): string {
  const mood = MOOD_LEVELS.find(level => level.value === moment.mood)?.label
  return [
    `${formatDay(momentDay(moment))} · ${formatMomentTime(moment)}`,
    [mood && `Mood: ${mood}`, ...HALT_KEYS.map(key => `${NEED_LABELS[key].label}: ${moment.halt[key]}/10`), moment.urge !== null && `Urges: ${moment.urge}/10`].filter(Boolean).join(' · '),
    moment.feelings.length ? `Feeling: ${moment.feelings.join(', ')}` : '',
    moment.context.length ? `Context: ${moment.context.join(', ')}` : '',
    moment.note,
  ].filter(Boolean).join('\n')
}

export type Suggestion = { id: string; title: string; text: string; action: 'support' | 'resentments' | 'fears' | 'harms' | 'assets' | null; urgent?: boolean }
/** Gentle next steps after a check-in, most pressing first. Urgent reach-out always leads. */
export function checkInSuggestions(moment: Pick<Moment, 'halt' | 'mood' | 'urge' | 'feelings'>): Suggestion[] {
  const has = (...values: string[]) => values.some(value => moment.feelings.includes(value))
  const urge = moment.urge ?? 0
  const items: Suggestion[] = []
  if (urge >= 7 || moment.mood === 1) items.push({ id: 'reach-out', urgent: true, action: 'support', title: 'Reach out before you act', text: 'This feeling will rise and fall. Call or text someone on your list, or use a grounding exercise while it passes.' })
  else if (urge >= 4) items.push({ id: 'urge', action: 'support', title: 'Notice the urge', text: 'Play it forward: how does it usually end? Then choose the next right thing, even a small one.' })
  if (moment.halt.angry >= 6 || has('Resentful', 'Irritable')) items.push({ id: 'resentment', action: 'resentments', title: 'Write it out as a resentment', text: 'Who or what is on your mind, and what did it touch? Your part can wait until you are ready.' })
  if (has('Afraid', 'Anxious', 'Overwhelmed')) items.push({ id: 'fear', action: 'fears', title: 'Name the fear underneath', text: 'Putting a fear into words takes some of its power away.' })
  if (has('Guilty', 'Ashamed')) items.push({ id: 'harm', action: 'harms', title: 'Look honestly at your part', text: 'Write down what happened. Deciding what to do about it can come later, with support.' })
  if (moment.halt.lonely >= 6) items.push({ id: 'lonely', action: 'support', title: 'Connect with someone', text: 'A short call, a text, or a meeting can ease loneliness more than waiting it out.' })
  if (moment.halt.hungry >= 6) items.push({ id: 'hungry', action: null, title: 'Eat something steady', text: 'A real meal or snack can change how everything else feels.' })
  if (moment.halt.tired >= 6) items.push({ id: 'tired', action: null, title: 'Rest if you can', text: 'Even ten quiet minutes counts. Big decisions can wait until you are rested.' })
  if ((moment.mood ?? 0) >= 4 || has('Grateful', 'Hopeful', 'Confident', 'Connected')) items.push({ id: 'strength', action: 'assets', title: 'Note a strength you practiced', text: 'Good moments belong in your inventory too.' })
  if (!items.length) items.push({ id: 'steady', action: null, title: 'Thank you for checking in', text: 'Noticing how you are is the practice. Come back whenever something shifts.' })
  return items.slice(0, 4)
}
