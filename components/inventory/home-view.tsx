'use client'

import { ArrowRight, BookOpen, Check, Heart, Leaf, MessageCircle, Shield, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SESSION_STEPS, STEP_LABELS, entryCount, formatSessionDate, localDate, type InventorySession } from '@/lib/inventory-sessions'
import { cn } from '@/lib/utils'

const stepDetails = {
  halt: { icon: Heart, detail: 'Meet yourself where you are.' },
  resentments: { icon: MessageCircle, detail: 'What is still taking up space?' },
  fears: { icon: Shield, detail: 'Name what is underneath.' },
  harms: { icon: Leaf, detail: 'Look honestly at your impact.' },
  assets: { icon: Sparkles, detail: 'Notice the strengths you practice.' },
  review: { icon: BookOpen, detail: 'See the whole picture.' },
}

export function HomeView({ sessions, today, onStart, onOpen, onLibrary }: {
  sessions: InventorySession[]; today: string; onStart: () => void; onOpen: (session: InventorySession) => void; onLibrary: () => void
}) {
  const unfinished = sessions.find(session => !session.completedAt || session.draft)
  const completed = sessions.filter(session => session.completedAt)
  const latest = completed[0]
  const days = Array.from({ length: 7 }, (_, index) => {
    const [year, month, day] = today.split('-').map(Number)
    const date = new Date(year, month - 1, day - 6 + index)
    return { date: localDate(date), label: date.toLocaleDateString(undefined, { weekday: 'short' }) }
  })
  return (
    <div className="space-y-7 pb-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="home-hero relative overflow-hidden rounded-3xl border border-primary/15 p-6 sm:p-9">
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium text-primary"><span className="size-2 rounded-full bg-primary" />{formatSessionDate(today)}</div>
            <h1 className="max-w-md text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl">Your Fourth Step.<br /><span className="text-primary">One small step<br className="hidden sm:block" /> at a time.</span></h1>
            <p className="max-w-sm text-base leading-relaxed text-muted-foreground">Begin with a check-in. Follow the prompts. Finish with an inventory you can return to.</p>
            {unfinished && <div className="max-w-sm rounded-2xl border border-primary/15 bg-card/80 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">Ready when you are</p><p className="mt-1 font-medium">Continue at {STEP_LABELS[unfinished.currentStep].toLowerCase()}</p><p className="mt-1 text-sm text-muted-foreground">{unfinished.title || formatSessionDate(unfinished.date)} · {unfinished.reviewed.length} of 6 steps</p></div>}
            <Button className="h-13 rounded-xl px-6 text-base shadow-sm" onClick={() => unfinished ? onOpen(unfinished) : onStart()}>{unfinished ? 'Continue your session' : 'Begin with HALT'}<ArrowRight className="size-4" /></Button>
            <p className="max-w-sm text-sm text-muted-foreground">Your answers save as you go. Pause and return to the same question.</p>
            {unfinished && <button type="button" className="block text-sm font-medium text-primary underline decoration-primary/30 underline-offset-4" onClick={onStart}>Start a fresh session instead</button>}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-20 size-64 rounded-full border-[35px] border-primary/5" />
        </section>

        <section className="rounded-3xl border bg-card p-6 sm:p-7" aria-labelledby="session-path-heading">
          <div className="mb-6 flex items-center justify-between gap-3"><h2 id="session-path-heading" className="text-lg font-semibold">A clear path through.</h2><span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">6 steps</span></div>
          <ol className="space-y-1">{SESSION_STEPS.map((step, index) => {
            const { icon: Icon, detail } = stepDetails[step]
            const done = unfinished?.reviewed.includes(step)
            const current = unfinished ? unfinished.currentStep === step : index === 0
            return <li key={step} className="relative flex gap-4 pb-4 last:pb-0">
              {index < SESSION_STEPS.length - 1 && <span aria-hidden="true" className="absolute bottom-0 left-5 top-11 w-px bg-border" />}
              <span className={cn('relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl', done || current ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground')}>{done ? <Check className="size-5" /> : <Icon className="size-5" />}</span>
              <div className="pt-0.5"><p className="text-sm font-semibold">{STEP_LABELS[step]}{current && <span className="ml-2 text-xs font-normal text-primary">Next up</span>}</p><p className="mt-0.5 text-sm text-muted-foreground">{detail}</p></div>
            </li>
          })}</ol>
        </section>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">A practice you can return to.</h2><span className="text-sm text-muted-foreground">Past 7 days</span></div>
          <div className="mt-5 grid grid-cols-7 gap-2">{days.map(day => {
            const done = completed.some(session => session.date === day.date)
            return <div key={day.date} className="text-center"><span className={cn('mx-auto flex size-9 items-center justify-center rounded-full border', done ? 'border-primary bg-primary text-primary-foreground' : day.date === today ? 'border-primary/50 bg-primary/5 text-primary' : 'border-border bg-background text-muted-foreground')} aria-label={`${formatSessionDate(day.date)}: ${done ? 'inventory completed' : 'no completed inventory'}`}>{done ? <Check className="size-4" /> : <span className="size-1.5 rounded-full bg-current opacity-50" />}</span><p className="mt-2 text-[11px] text-muted-foreground">{day.label}</p></div>
          })}</div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Each session gets its own page. Earlier work stays available as you begin again.</p>
        </section>
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2"><BookOpen className="size-5 text-primary" /><h2 className="font-semibold">Your inventory, within reach.</h2></div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{sessions.length > 0 ? `${sessions.length} saved ${sessions.length === 1 ? 'session' : 'sessions'} · ${sessions.reduce((count, session) => count + entryCount(session), 0)} entries to revisit.` : 'Your completed reviews and unfinished sessions will live here.'}</p>
          {latest && <button type="button" className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl bg-secondary/60 p-3 text-left" onClick={() => onOpen(latest)}><span className="min-w-0"><span className="block truncate text-sm font-medium">{latest.title || 'Latest completed inventory'}</span><span className="mt-0.5 block text-xs text-muted-foreground">{formatSessionDate(latest.date)}</span></span><ArrowRight className="size-4 shrink-0 text-primary" /></button>}
          <Button variant="link" className="mt-3 h-10 px-0 text-sm" onClick={onLibrary}>Open your inventory<ArrowRight className="size-4" /></Button>
        </section>
      </div>
    </div>
  )
}
