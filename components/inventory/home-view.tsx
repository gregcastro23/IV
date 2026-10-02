'use client'

import { ArrowRight, BarChart3, BookOpen, Check, Clock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SESSION_STEPS, STEP_LABELS, formatSessionDate, localDate, type InventorySession } from '@/lib/inventory-sessions'
import { HALT_KEYS, MOOD_LEVELS, NEED_LABELS, formatMomentTime, latestMoment, momentDay, momentsOnDay, type Moment } from '@/lib/moments'
import { cn } from '@/lib/utils'

export function relativeTime(at: number, now = Date.now()): string {
  const minutes = Math.round((now - at) / 60_000)
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
const greeting = (hour: number) => hour >= 5 && hour < 12 ? 'Good morning.' : hour >= 12 && hour < 17 ? 'Good afternoon.' : hour >= 17 && hour < 22 ? 'Good evening.' : 'Hello.'

export function HomeView({ sessions, moments, today, onCheckIn, onStart, onOpen, onLibrary, onPatterns }: {
  sessions: InventorySession[]; moments: Moment[]; today: string; onCheckIn: () => void; onStart: () => void
  onOpen: (session: InventorySession) => void; onLibrary: () => void; onPatterns: () => void
}) {
  const unfinished = sessions.find(session => !session.completedAt || session.draft)
  const completed = sessions.filter(session => session.completedAt)
  const latest = latestMoment(moments)
  const todays = momentsOnDay(moments, today)
  const days = Array.from({ length: 7 }, (_, index) => {
    const [year, month, day] = today.split('-').map(Number)
    const date = new Date(year, month - 1, day - 6 + index)
    const key = localDate(date)
    return { date: key, label: date.toLocaleDateString(undefined, { weekday: 'short' }), checkIns: moments.filter(moment => momentDay(moment) === key).length, inventory: completed.some(session => session.date === key) }
  })
  return (
    <div className="space-y-6 pb-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="home-hero relative overflow-hidden rounded-3xl border border-primary/15 p-6 sm:p-9">
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium text-primary"><span className="size-2 rounded-full bg-primary" />{formatSessionDate(today)}</div>
            <h1 className="max-w-md text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">{greeting(new Date().getHours())}<br /><span className="text-primary">How are you, right now?</span></h1>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground">A spot-check takes under a minute. Each one is saved with the time, so your days become a picture you can learn from.</p>
            <Button className="h-13 rounded-xl px-6 text-base shadow-sm" onClick={onCheckIn}>Check in now<ArrowRight className="size-4" /></Button>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="size-4" />{latest ? `Last check-in ${relativeTime(latest.at)}${latest.mood ? ` · ${MOOD_LEVELS[latest.mood - 1].label}` : ''}` : 'Your first check-in starts your timeline.'}</p>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-20 size-64 rounded-full border-[35px] border-primary/5" />
        </section>

        <section className="rounded-3xl border bg-card p-6 sm:p-7" aria-labelledby="today-heading">
          <div className="mb-4 flex items-center justify-between gap-3"><h2 id="today-heading" className="text-lg font-semibold">Today so far</h2><span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{todays.length} check-in{todays.length === 1 ? '' : 's'}</span></div>
          {todays.length === 0 ? <p className="text-sm leading-relaxed text-muted-foreground">Nothing yet today. Check in whenever something shifts: after a hard conversation, before a meeting, or when an urge shows up.</p>
            : <ol className="space-y-2">{[...todays].reverse().slice(0, 5).map(moment => {
              const peak = HALT_KEYS.map(key => ({ key, value: moment.halt[key] })).sort((a, b) => b.value - a.value)[0]
              return <li key={moment.id} className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2.5 text-sm">
                <span className="w-16 shrink-0 font-semibold tabular-nums">{formatMomentTime(moment)}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{[moment.mood && MOOD_LEVELS[moment.mood - 1].label, peak.value >= 5 && `${NEED_LABELS[peak.key].label} ${peak.value}`, moment.urge !== null && moment.urge >= 5 && `Urges ${moment.urge}`, ...moment.feelings.slice(0, 2)].filter(Boolean).join(' · ') || 'Steady'}</span>
              </li>
            })}</ol>}
          <Button variant="link" className="mt-3 h-10 px-0 text-sm" onClick={onPatterns}><BarChart3 className="size-4" />See your patterns</Button>
        </section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6" aria-labelledby="deeper-heading">
          <div className="flex items-center gap-2"><BookOpen className="size-5 text-primary" /><h2 id="deeper-heading" className="font-semibold">Go deeper: a full Fourth Step inventory</h2></div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Walk through {SESSION_STEPS.slice(1, -1).map(step => STEP_LABELS[step].toLowerCase()).join(', ')}, then review. Pause any time and return to the same question.</p>
          {unfinished ? <button type="button" className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left" onClick={() => onOpen(unfinished)}><span className="min-w-0"><span className="block text-xs font-semibold uppercase tracking-wider text-primary">Ready when you are</span><span className="mt-1 block font-medium">Continue at {STEP_LABELS[unfinished.draft?.section ?? unfinished.currentStep].toLowerCase()}</span><span className="mt-0.5 block truncate text-sm text-muted-foreground">{unfinished.title || formatSessionDate(unfinished.date)} · {unfinished.reviewed.length} of 6 steps</span></span><ArrowRight className="size-4 shrink-0 text-primary" /></button>
            : <Button variant="outline" className="mt-4 h-11 rounded-xl" onClick={onStart}><Plus className="size-4" />Begin an inventory</Button>}
          {unfinished && <button type="button" className="mt-3 block text-sm font-medium text-primary underline decoration-primary/30 underline-offset-4" onClick={onStart}>Start a fresh inventory instead</button>}
          <Button variant="link" className="mt-1 h-10 px-0 text-sm" onClick={onLibrary}>Your inventory · {sessions.length} saved<ArrowRight className="size-4" /></Button>
        </section>
        <section className="rounded-2xl border bg-card p-6" aria-labelledby="week-heading">
          <div className="flex items-center justify-between gap-3"><h2 id="week-heading" className="font-semibold">A practice you can return to</h2><span className="text-sm text-muted-foreground">Past 7 days</span></div>
          <div className="mt-5 grid grid-cols-7 gap-2">{days.map(day => <div key={day.date} className="text-center">
            <span className={cn('relative mx-auto flex size-10 items-center justify-center rounded-full border text-sm font-semibold tabular-nums', day.checkIns ? 'border-primary bg-primary text-primary-foreground' : day.date === today ? 'border-primary/50 bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground')}
              aria-label={`${formatSessionDate(day.date)}: ${day.checkIns} check-in${day.checkIns === 1 ? '' : 's'}${day.inventory ? ', inventory completed' : ''}`}>
              {day.checkIns || <span className="size-1.5 rounded-full bg-current opacity-50" />}
              {day.inventory && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground"><Check className="size-2.5" /></span>}
            </span><p className="mt-2 text-[11px] text-muted-foreground">{day.label}</p></div>)}</div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Numbers show check-ins each day. A tick marks a completed inventory.</p>
        </section>
      </div>
    </div>
  )
}
