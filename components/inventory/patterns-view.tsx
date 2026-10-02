'use client'

import { useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, Clipboard, Download, Lightbulb, Pencil, Plus, Table2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import {
  DAY_PARTS, HALT_KEYS, MOOD_LEVELS, NEED_KEYS, NEED_LABELS, countTags, dayRange, editMoment, findInsights, formatDay, formatMomentTime,
  instantToLocalInput, localInputToInstant, momentDay, momentMinutes, momentsCsv, momentsInDays, momentText, needValue, shiftDay,
  summarizeDayParts, summarizeDays, type Moment, type MomentInput, type NeedKey,
} from '@/lib/moments'
import { CheckInFields } from './check-in'
import { CountBars, DayPartGrid, StripChart, type StripPoint, type StripRow } from './moment-chart'
import { downloadText } from './session-review'
import { cn } from '@/lib/utils'

type Range = 'day' | 'week' | 'month'
const RANGES: { value: Range; label: string; days: number }[] = [{ value: 'day', label: 'Day', days: 1 }, { value: 'week', label: 'Week', days: 7 }, { value: 'month', label: '30 days', days: 30 }]
const moodLabel = (value: number) => MOOD_LEVELS[Math.min(4, Math.max(0, Math.round(value) - 1))].label
const one = (value: number) => (Math.round(value * 10) / 10).toString()
const hourLabel = (hour: number) => new Date(Date.UTC(2000, 0, 1, hour % 24)).toLocaleTimeString(undefined, { hour: 'numeric', timeZone: 'UTC' })

export function PatternsView({ moments, today, onEdit, onDelete, onCheckIn }: {
  moments: Moment[]; today: string; onEdit: (moment: Moment) => Promise<boolean>; onDelete: (id: string) => Promise<boolean>; onCheckIn: () => void
}) {
  const [range, setRange] = useState<Range>('day')
  const [anchor, setAnchor] = useState(today)
  const [table, setTable] = useState(false)
  const [editing, setEditing] = useState<Moment | null>(null)
  const [deleting, setDeleting] = useState<Moment | null>(null)
  const [copied, setCopied] = useState(false)
  const span = RANGES.find(item => item.value === range)!.days
  const days = dayRange(anchor, span)
  const inRange = momentsInDays(moments, days[0], anchor)
  const lastMonth = momentsInDays(moments, shiftDay(anchor, -29), anchor)

  if (!moments.length) return <div className="mx-auto max-w-2xl rounded-3xl border border-dashed bg-card p-8 text-center sm:p-12">
    <Lightbulb className="mx-auto size-10 text-primary/70" />
    <h1 className="mt-4 text-2xl font-semibold tracking-tight">Your patterns will appear here.</h1>
    <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground">Each check-in is saved with its time. After a few, you will see how your mood, HALT needs, and urges move through the day and across weeks.</p>
    <Button className="mt-6 h-12 rounded-xl" onClick={onCheckIn}>Check in now<ArrowRight className="size-4" /></Button>
  </div>

  const rows: StripRow[] = [
    { key: 'mood', label: 'Mood', min: 1, max: 5, scale: '1 struggling – 5 great', format: value => `${one(value)} ${moodLabel(value).toLowerCase()}` },
    ...NEED_KEYS.map(key => ({ key, label: NEED_LABELS[key].label, min: 0, max: 10, scale: '0–10', format: one })),
  ]
  const momentValues = (moment: Moment) => ({ mood: moment.mood, ...Object.fromEntries(NEED_KEYS.map(key => [key, needValue(moment, key)])) })
  const summaries = summarizeDays(inRange, days)
  const points: StripPoint[] = range === 'day'
    ? inRange.map(moment => ({ id: moment.id, x: momentMinutes(moment) / 1440, title: formatMomentTime(moment), subtitle: moment.feelings.slice(0, 3).join(', ') || undefined, values: momentValues(moment) }))
    : summaries.map((day, index) => ({ id: day.day, x: (index + 0.5) / span, title: formatDay(day.day, { weekday: 'short', month: 'short', day: 'numeric' }), subtitle: day.count ? `${day.count} check-in${day.count === 1 ? '' : 's'} · daily average` : 'No check-ins', values: { mood: day.mood, ...day.needs } }))
  const ticks = range === 'day' ? [0, 6, 12, 18, 24].map(hour => ({ x: hour / 24, label: hourLabel(hour) }))
    : range === 'week' ? days.map((day, index) => ({ x: (index + 0.5) / span, label: formatDay(day, { weekday: 'short' }) }))
      : days.map((day, index) => ({ day, index })).filter(({ index }) => index % 7 === 1 || index === span - 1).map(({ day, index }) => ({ x: (index + 0.5) / span, label: formatDay(day, { month: 'short', day: 'numeric' }) }))
  for (const row of rows) {
    const values = inRange.map(moment => row.key === 'mood' ? moment.mood : needValue(moment, row.key as NeedKey)).filter((value): value is number => value !== null)
    row.summary = values.length ? `avg ${row.format(values.reduce((sum, value) => sum + value, 0) / values.length).split(' ')[0]}` : undefined
  }
  const moodValues = inRange.map(moment => moment.mood).filter((value): value is number => value !== null)
  const averageMood = moodValues.length ? moodValues.reduce((sum, value) => sum + value, 0) / moodValues.length : null
  const strongest = NEED_KEYS.map(key => ({ key, values: inRange.map(moment => needValue(moment, key)).filter((value): value is number => value !== null) }))
    .filter(item => item.values.length).map(item => ({ key: item.key, average: item.values.reduce((sum, value) => sum + value, 0) / item.values.length })).sort((a, b) => b.average - a.average)[0]
  const activeDays = summaries.filter(day => day.count).length
  const insights = findInsights(lastMonth, anchor)
  const parts = summarizeDayParts(lastMonth)
  const feelings = countTags(inRange, 'feelings').slice(0, 8)
  const title = range === 'day' ? (anchor === today ? `Today · ${formatDay(anchor, { month: 'long', day: 'numeric' })}` : formatDay(anchor)) : `${formatDay(days[0], { month: 'short', day: 'numeric' })} – ${formatDay(anchor, { month: 'short', day: 'numeric' })}`
  const label = range === 'day' ? `Check-ins through ${formatDay(anchor)}` : `Daily averages from ${formatDay(days[0])} to ${formatDay(anchor)}`

  return <div className="mx-auto max-w-4xl space-y-6 pb-8">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 text-sm font-medium text-primary">Your working inventory</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Patterns</h1><p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">How your mood, needs, and urges move through the day. Look back to notice what tends to come before hard moments.</p></div>
      <Button className="h-12 rounded-xl" onClick={onCheckIn}><Plus className="size-4" />Check in</Button>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="radiogroup" aria-label="Time range" className="flex gap-1 rounded-xl bg-secondary p-1">{RANGES.map(item => <button key={item.value} type="button" role="radio" aria-checked={range === item.value} onClick={() => { setRange(item.value); setAnchor(today) }} className={cn('min-h-10 rounded-lg px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary', range === item.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>{item.label}</button>)}</div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-10 rounded-lg" aria-label="Earlier" onClick={() => setAnchor(shiftDay(anchor, -span))}><ChevronLeft className="size-5" /></Button>
        <span className="min-w-36 text-center text-sm font-medium" aria-live="polite">{title}</span>
        <Button variant="ghost" size="icon" className="size-10 rounded-lg" aria-label="Later" disabled={anchor >= today} onClick={() => setAnchor(shiftDay(anchor, span) > today ? today : shiftDay(anchor, span))}><ChevronRight className="size-5" /></Button>
      </div>
    </div>

    <div className="grid grid-cols-3 gap-3">
      <Stat label="Check-ins" value={String(inRange.length)} detail={range === 'day' ? 'this day' : `on ${activeDays} of ${span} days`} />
      <Stat label="Average mood" value={averageMood === null ? '–' : moodLabel(averageMood)} detail={averageMood === null ? 'not recorded' : `${one(averageMood)} of 5`} />
      <Stat label="Strongest need" value={strongest && strongest.average >= 1 ? NEED_LABELS[strongest.key].label : '–'} detail={strongest && strongest.average >= 1 ? `avg ${one(strongest.average)} of 10` : 'all low'} />
    </div>

    <section className="rounded-2xl border bg-card p-5 pt-6 sm:p-6" aria-labelledby="pattern-chart-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><h2 id="pattern-chart-heading" className="font-semibold">{range === 'day' ? 'Through the day' : 'Day by day'}</h2>
        <Button variant="ghost" size="sm" className="h-9 text-primary" aria-pressed={table} onClick={() => setTable(!table)}><Table2 className="size-4" />{table ? 'Show chart' : 'Show as table'}</Button></div>
      {inRange.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No check-ins {range === 'day' ? 'on this day' : 'in this period'}.</p>
        : table ? <DataTable rows={rows} points={points.filter(point => Object.values(point.values).some(value => value !== null))} />
          : <StripChart rows={rows} points={points} ticks={ticks} label={label} connectGaps={range === 'day'} />}
      {range !== 'day' && inRange.length > 0 && !table && <p className="mt-3 text-xs text-muted-foreground">Each point is a daily average. Gaps are days without a check-in.</p>}
    </section>

    <div className="grid gap-5 lg:grid-cols-2">
      <section className="min-w-0 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6" aria-labelledby="insights-heading">
        <h2 id="insights-heading" className="flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-primary" />What the last 30 days show</h2>
        {insights.length ? <ul className="mt-4 space-y-3">{insights.map(item => <li key={item.id} className="rounded-xl bg-card p-3.5 text-sm leading-relaxed">{item.text}</li>)}</ul>
          : <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Patterns appear once there are a few check-ins at different times and places. Keep checking in when something shifts.</p>}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">These are tendencies in your own entries, not diagnoses. Bring anything that stands out to your sponsor, therapist, or someone you trust.</p>
      </section>
      <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="dayparts-heading">
        <h2 id="dayparts-heading" className="font-semibold">By time of day</h2><p className="mt-1 text-xs text-muted-foreground">Last 30 days · average · deeper means higher</p>
        <div className="mt-4"><DayPartGrid columns={parts.map(part => ({ key: part.key, label: part.label }))}
          rows={[{ key: 'mood', label: 'Mood', max: 5, values: parts.map(part => part.mood), format: one }, ...NEED_KEYS.map(key => ({ key, label: NEED_LABELS[key].label, max: 10, values: parts.map(part => part.needs[key]), format: one }))]} /></div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{parts.map(part => `${part.label} ${DAY_PARTS.find(item => item.key === part.key)!.range} (${part.count})`).join(' · ')}. Numbers in brackets are check-ins.</p>
      </section>
    </div>

    {feelings.length > 0 && <section className="rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="feelings-heading">
      <h2 id="feelings-heading" className="font-semibold">Feelings you named</h2><p className="mb-4 mt-1 text-xs text-muted-foreground">{range === 'day' ? 'This day' : `These ${span} days`} · number of check-ins</p>
      <CountBars items={feelings} label="Feelings you named, by number of check-ins" />
    </section>}

    <section aria-labelledby="log-heading" className="space-y-3">
      <h2 id="log-heading" className="text-lg font-semibold">Check-ins {range === 'day' ? 'this day' : 'in this period'}</h2>
      {inRange.length === 0 && <p className="text-sm text-muted-foreground">Nothing recorded.</p>}
      {[...inRange].reverse().map(moment => <article key={moment.id} className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{range === 'day' ? '' : `${formatDay(momentDay(moment), { weekday: 'short', month: 'short', day: 'numeric' })} · `}{formatMomentTime(moment)}{moment.mood !== null && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">{MOOD_LEVELS[moment.mood - 1].label}</span>}{moment.source !== 'check-in' && <span className="ml-2 text-xs font-normal text-muted-foreground">{moment.source === 'session' ? 'from an inventory' : 'imported'}</span>}</p>
            <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">{HALT_KEYS.map(key => `${NEED_LABELS[key].label} ${moment.halt[key]}`).join(' · ')}{moment.urge !== null && ` · Urges ${moment.urge}`}</p>
            {(moment.feelings.length > 0 || moment.context.length > 0) && <p className="mt-1.5 text-sm">{[...moment.feelings, ...moment.context].join(' · ')}</p>}
            {moment.note && <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{moment.note}</p>}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="size-10 rounded-lg" aria-label={`Edit check-in at ${formatMomentTime(moment)}`} onClick={() => setEditing(moment)}><Pencil className="size-4" /></Button>
            <Button variant="ghost" size="icon" className="size-10 rounded-lg text-muted-foreground" aria-label={`Delete check-in at ${formatMomentTime(moment)}`} onClick={() => setDeleting(moment)}><Trash2 className="size-4" /></Button>
          </div>
        </div>
      </article>)}
    </section>

    <section className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Download every check-in as a spreadsheet to chart it yourself in Google Sheets, Excel, or Numbers. The file is readable, not encrypted.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11 rounded-xl" onClick={async () => { try { await navigator.clipboard.writeText(inRange.map(momentText).join('\n\n')); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { /* Copy is unavailable; the download still works. */ } }}><Clipboard className="size-4" />{copied ? 'Copied' : 'Copy as text'}</Button>
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => downloadText(momentsCsv(moments), `fourthstep-check-ins-${today}.csv`, 'text/csv;charset=utf-8')}><Download className="size-4" />Download CSV</Button>
      </div>
    </section>

    {editing && <EditMoment moment={editing} onClose={() => setEditing(null)} onSave={onEdit} />}
    <AlertDialog open={deleting !== null} onOpenChange={open => { if (!open) setDeleting(null) }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this check-in?</AlertDialogTitle><AlertDialogDescription>The check-in{deleting ? ` from ${formatMomentTime(deleting)}` : ''} will be removed from your patterns. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Keep it</AlertDialogCancel><AlertDialogAction onClick={async () => { if (deleting && await onDelete(deleting.id)) setDeleting(null) }}>Delete check-in</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl border bg-card p-3.5 sm:p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-lg font-semibold sm:text-xl">{value}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div>
}

function DataTable({ rows, points }: { rows: StripRow[]; points: StripPoint[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[30rem] text-sm">
    <thead><tr className="border-b text-left text-xs text-muted-foreground"><th scope="col" className="py-2 pr-3 font-medium">When</th>{rows.map(row => <th key={row.key} scope="col" className="px-2 py-2 text-right font-medium">{row.label}</th>)}</tr></thead>
    <tbody>{points.map(point => <tr key={point.id} className="border-b last:border-0"><th scope="row" className="py-2 pr-3 text-left font-medium">{point.title}</th>{rows.map(row => { const value = point.values[row.key]; return <td key={row.key} className="px-2 py-2 text-right tabular-nums">{value === null || value === undefined ? '–' : one(value)}</td> })}</tr>)}</tbody>
  </table></div>
}

function EditMoment({ moment, onClose, onSave }: { moment: Moment; onClose: () => void; onSave: (moment: Moment) => Promise<boolean> }) {
  const [value, setValue] = useState<MomentInput>({ halt: moment.halt, mood: moment.mood, urge: moment.urge, feelings: moment.feelings, context: moment.context, note: moment.note })
  const [when, setWhen] = useState(instantToLocalInput(moment))
  const [error, setError] = useState('')
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader><DialogTitle>Edit check-in</DialogTitle><DialogDescription>Adjust what you recorded. The time stays as it was unless you change it.</DialogDescription></DialogHeader>
      <div className="space-y-1.5"><label htmlFor="edit-time" className="text-sm font-semibold">When</label><Input id="edit-time" type="datetime-local" value={when} onChange={event => setWhen(event.target.value)} className="h-11 max-w-64 rounded-xl" /></div>
      <CheckInFields value={value} onChange={setValue} idPrefix="edit" />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter className="gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={async () => {
        const instant = when === instantToLocalInput(moment) ? { at: moment.at, offset: moment.offset } : localInputToInstant(when)
        if (!instant || instant.at > Date.now() + 60_000) { setError('Choose a time that has already happened.'); return }
        try { if (await onSave(editMoment(moment, { ...value, ...instant }))) onClose() } catch (cause) { setError(cause instanceof Error ? cause.message : 'This check-in could not be saved.') }
      }}>Save changes</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
