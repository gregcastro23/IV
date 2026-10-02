'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Annoyed, ArrowRight, BarChart3, Check, Clock, Coffee, Flame, Frown, Heart, Laugh, LifeBuoy, Meh, Moon, Smile, Sparkles, Users, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  CONTEXTS, FEELINGS, MOOD_LEVELS, checkInSuggestions, createMoment, emptyMomentInput, formatDay, formatMomentTime, instantToLocalInput,
  latestMoment, localInputToInstant, momentDay, type Moment, type MomentInput, type Suggestion,
} from '@/lib/moments'
import type { EntrySection } from '@/lib/inventory-sessions'
import { cn } from '@/lib/utils'

const haltFields = [
  { key: 'hungry', label: 'Hungry', prompt: 'Does your body need nourishment?', icon: Coffee },
  { key: 'angry', label: 'Angry', prompt: 'How much tension are you carrying?', icon: Flame },
  { key: 'lonely', label: 'Lonely', prompt: 'How disconnected do you feel?', icon: Users },
  { key: 'tired', label: 'Tired', prompt: 'How much rest do you need?', icon: Moon },
] as const
const moodIcons = [Frown, Annoyed, Meh, Smile, Laugh]

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={cn('min-h-10 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary', selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:border-primary/50')}>{selected && <Check className="-ml-0.5 mr-1 inline size-3.5" />}{children}</button>
}
function Level({ id, label, prompt, value, onChange, previous, icon: Icon }: { id: string; label: string; prompt: string; value: number; onChange: (value: number) => void; previous?: number | null; icon: typeof Coffee }) {
  return <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
    <div className="flex items-center justify-between gap-2"><label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold sm:text-base"><Icon className="size-4 text-primary sm:size-5" />{label}</label><span className="rounded-lg bg-secondary px-2 py-1 text-sm font-semibold tabular-nums">{value} <span className="font-normal text-muted-foreground">/ 10</span></span></div>
    <p className="mt-2 text-sm text-muted-foreground" id={`${id}-help`}>{prompt}</p>
    <input id={id} type="range" min="0" max="10" step="1" value={value} onChange={event => onChange(Number(event.target.value))} aria-describedby={`${id}-help`} className="mt-4 h-6 w-full cursor-pointer accent-primary" />
    <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>Not at all</span>{previous !== undefined && previous !== null && <span>Last time: {previous}</span>}<span>Very much</span></div>
  </div>
}

/** The fields of one check-in. Used when checking in and when editing an earlier moment. */
export function CheckInFields({ value, onChange, previous, idPrefix = 'checkin' }: { value: MomentInput; onChange: (value: MomentInput) => void; previous?: Moment; idPrefix?: string }) {
  const toggle = (field: 'feelings' | 'context', item: string) => onChange({ ...value, [field]: value[field].includes(item) ? value[field].filter(entry => entry !== item) : [...value[field], item] })
  return <div className="space-y-7">
    <fieldset className="space-y-3"><legend className="mb-3 text-lg font-semibold">Overall, how are you?</legend>
      <div role="radiogroup" aria-label="Mood" className="grid grid-cols-5 gap-2">{MOOD_LEVELS.map((level, index) => {
        const Icon = moodIcons[index]; const selected = value.mood === level.value
        return <button type="button" role="radio" aria-checked={selected} key={level.value} onClick={() => onChange({ ...value, mood: selected ? null : level.value })}
          className={cn('flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:text-sm', selected ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50')}>
          <Icon className="size-6" />{level.label}
        </button>
      })}</div>
    </fieldset>
    <fieldset><legend className="mb-1 text-lg font-semibold">HALT</legend><p className="mb-3 text-sm text-muted-foreground">Hungry, angry, lonely, tired: needs that can make everything harder.</p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">{haltFields.map(field => <Level key={field.key} id={`${idPrefix}-${field.key}`} label={field.label} prompt={field.prompt} icon={field.icon} value={value.halt[field.key]} previous={previous?.halt[field.key]} onChange={next => onChange({ ...value, halt: { ...value.halt, [field.key]: next } })} />)}</div>
    </fieldset>
    <Level id={`${idPrefix}-urge`} label="Cravings or urges" prompt="Any pull toward drinking, using, or an old behavior you want to leave behind?" icon={Waves} value={value.urge ?? 0} previous={previous?.urge} onChange={urge => onChange({ ...value, urge })} />
    <fieldset><legend className="mb-1 text-lg font-semibold">What are you feeling? <span className="text-sm font-normal text-muted-foreground">Choose any</span></legend><p className="mb-3 text-sm text-muted-foreground">Naming a feeling can loosen its hold.</p>
      <div className="flex flex-wrap gap-2">{FEELINGS.map(feeling => <Chip key={feeling.value} selected={value.feelings.includes(feeling.value)} onClick={() => toggle('feelings', feeling.value)}>{feeling.value}</Chip>)}</div>
    </fieldset>
    <fieldset><legend className="mb-3 text-lg font-semibold">Where are you, and with whom? <span className="text-sm font-normal text-muted-foreground">Optional</span></legend>
      <div className="flex flex-wrap gap-2">{CONTEXTS.map(context => <Chip key={context} selected={value.context.includes(context)} onClick={() => toggle('context', context)}>{context}</Chip>)}</div>
    </fieldset>
    <div className="space-y-2"><label htmlFor={`${idPrefix}-note`} className="text-lg font-semibold">What is going on? <span className="text-sm font-normal text-muted-foreground">Optional</span></label>
      <Textarea id={`${idPrefix}-note`} value={value.note} onChange={event => onChange({ ...value, note: event.target.value })} placeholder="What just happened, or what is on your mind…" className="min-h-24 rounded-xl bg-card text-base md:text-base" />
    </div>
  </div>
}

export function CheckInView({ moments, onSave, onDone, onInventory, onSupport, onPatterns }: {
  moments: Moment[]; onSave: (moment: Moment) => Promise<boolean>; onDone: () => void
  onInventory: (moment: Moment, section: EntrySection | null) => void; onSupport: () => void; onPatterns: () => void
}) {
  const [input, setInput] = useState<MomentInput>(emptyMomentInput)
  const [saved, setSaved] = useState<Moment | null>(null)
  const [now, setNow] = useState(() => new Date())
  const [earlier, setEarlier] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const previous = latestMoment(moments)
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 20_000); return () => clearInterval(timer) }, [])
  const current = { at: now.getTime(), offset: -now.getTimezoneOffset() }
  const save = async () => {
    setError('')
    const instant = earlier ? localInputToInstant(earlier) : null
    if (earlier && (!instant || instant.at > Date.now() + 60_000)) { setError('Choose a time that has already happened.'); return }
    setBusy(true)
    try {
      const moment = instant ? createMoment(input, new Date(instant.at), instant) : createMoment(input)
      if (await onSave(moment)) { setSaved(moment); window.scrollTo({ top: 0 }) }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This check-in could not be saved.') }
    finally { setBusy(false) }
  }
  if (saved) return <AfterCheckIn moment={saved} count={moments.filter(item => momentDay(item) === momentDay(saved)).length} onDone={onDone} onInventory={section => onInventory(saved, section)} onSupport={onSupport} onPatterns={onPatterns} />
  return <div className="mx-auto max-w-3xl space-y-7 pb-8">
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Clock className="size-3.5" />{earlier ? 'Logging an earlier moment' : `${formatDay(momentDay(current))} · ${formatMomentTime(current)}`}</div>
      <h1 id="entry-question-heading" tabIndex={-1} className="text-3xl font-semibold leading-tight tracking-tight outline-none sm:text-4xl">How are you right now?</h1>
      <p className="max-w-xl text-base leading-relaxed text-muted-foreground">A quick spot-check. Each check-in is saved with the time, so you can look back and see how your days move.</p>
    </div>
    <CheckInFields value={input} onChange={setInput} previous={previous} />
    <div className="rounded-2xl border bg-card p-4 text-sm">
      {earlier === null ? <button type="button" className="font-medium text-primary underline underline-offset-4" onClick={() => setEarlier(instantToLocalInput(current))}>This happened earlier? Set the time</button>
        : <div className="flex flex-wrap items-end gap-3"><div className="space-y-1.5"><label htmlFor="checkin-time" className="font-semibold">When was this?</label><Input id="checkin-time" type="datetime-local" value={earlier} max={instantToLocalInput(current)} onChange={event => setEarlier(event.target.value)} className="h-11 rounded-xl" /></div><Button type="button" variant="ghost" className="h-11" onClick={() => setEarlier(null)}>Use now instead</Button></div>}
    </div>
    {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}
    <div className="session-actions flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" className="h-12 rounded-xl" onClick={onDone}>Not now</Button>
      <Button className="h-12 rounded-xl px-6 text-base" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save check-in'}<Check className="size-4" /></Button>
    </div>
  </div>
}

const actionLabels: Record<NonNullable<Suggestion['action']>, string> = {
  support: 'Open support', resentments: 'Write a resentment', fears: 'Name a fear', harms: 'Look at a harm', assets: 'Note a strength',
}
function AfterCheckIn({ moment, count, onDone, onInventory, onSupport, onPatterns }: {
  moment: Moment; count: number; onDone: () => void; onInventory: (section: EntrySection | null) => void; onSupport: () => void; onPatterns: () => void
}) {
  const suggestions = checkInSuggestions(moment)
  return <div className="mx-auto max-w-2xl space-y-6 pb-8">
    <div className="space-y-3">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Check className="size-8" /></span>
      <h1 id="entry-question-heading" tabIndex={-1} className="text-3xl font-semibold tracking-tight outline-none">Checked in at {formatMomentTime(moment)}.</h1>
      <p className="text-base leading-relaxed text-muted-foreground">{formatDay(momentDay(moment))} · {count === 1 ? 'Your first check-in today.' : `Check-in ${count} today.`} Here is what might help next.</p>
    </div>
    <ul className="space-y-3">{suggestions.map(item => <li key={item.id} className={cn('rounded-2xl border bg-card p-5', item.urgent && 'border-primary/40 bg-primary/5')}>
      <h2 className="flex items-center gap-2 font-semibold">{item.urgent ? <LifeBuoy className="size-5 text-primary" /> : item.action === 'assets' ? <Sparkles className="size-4 text-primary" /> : <Heart className="size-4 text-primary" />}{item.title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
      {item.urgent && <p className="mt-3 rounded-xl bg-card p-3 text-sm leading-relaxed">If you might hurt yourself or someone else, call your local emergency number. In the US, call or text <a className="font-semibold text-primary underline" href="tel:988">988</a> (Suicide &amp; Crisis Lifeline), or call SAMHSA’s free, confidential helpline at <a className="font-semibold text-primary underline" href="tel:18006624357">1-800-662-4357</a>.</p>}
      {item.action && <Button variant={item.urgent ? 'default' : 'outline'} className="mt-4 h-11 rounded-xl" onClick={() => item.action === 'support' ? onSupport() : onInventory(item.action as EntrySection)}>{actionLabels[item.action]}<ArrowRight className="size-4" /></Button>}
    </li>)}</ul>
    <div className="flex flex-wrap gap-3 border-t pt-5">
      <Button className="h-12 rounded-xl px-5" onClick={onDone}>Done</Button>
      <Button variant="outline" className="h-12 rounded-xl" onClick={() => onInventory(null)}>Take a full inventory</Button>
      <Button variant="ghost" className="h-12 rounded-xl" onClick={onPatterns}><BarChart3 className="size-4" />See your patterns</Button>
    </div>
  </div>
}
