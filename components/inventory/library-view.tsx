'use client'

import { useState } from 'react'
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Download, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { STEP_LABELS, entryCount, formatSessionDate, sessionSearchText, type InventorySession, type ReviewContent } from '@/lib/inventory-sessions'
import { cn } from '@/lib/utils'

export function LibraryView({ sessions, legacy, onOpen, onStart, onLegacy, onBackup }: {
  sessions: InventorySession[]; legacy: ReviewContent | null
  onOpen: (session: InventorySession) => void; onStart: () => void; onLegacy: () => void; onBackup: () => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'complete' | 'in-progress'>('all')
  const visible = sessions.filter(session =>
    (filter === 'all' || (filter === 'complete' ? Boolean(session.completedAt) && !session.draft : !session.completedAt || Boolean(session.draft))) && sessionSearchText(session).includes(query.toLocaleLowerCase().trim())
  ).sort((a, b) => b.startedAt - a.startedAt)
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm font-medium text-primary">A place to come back to</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your inventory</h1><p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">Find a past review, pick up an unfinished session, or begin a fresh page.</p></div><Button className="h-12 rounded-xl" onClick={onStart}><Plus className="size-4" />New session</Button></div>

      <div className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
        <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" /><Input aria-label="Search your inventory" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search a name, a thought, or a date…" className="h-12 rounded-xl pl-10 text-base md:text-base" /></div>
        <div className="flex flex-wrap gap-2" aria-label="Filter sessions">{([{ value: 'all', label: 'All sessions' }, { value: 'complete', label: 'Completed' }, { value: 'in-progress', label: 'In progress' }] as const).map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => setFilter(item.value)} className={cn('rounded-full px-3.5 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary', filter === item.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}>{item.label}</button>)}</div>
      </div>

      {visible.length === 0 ? <div className="rounded-2xl border border-dashed bg-card p-9 text-center"><BookOpen className="mx-auto size-8 text-primary/60" /><h2 className="mt-4 text-lg font-semibold">{sessions.length === 0 ? 'Your next page starts here.' : 'No sessions match this search.'}</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{sessions.length === 0 ? 'Start with HALT and follow the prompts. Your review will be waiting here when you finish.' : 'Try another word or show all sessions.'}</p>{sessions.length === 0 && <Button className="mt-5 h-12 rounded-xl" onClick={onStart}>Begin with HALT<ArrowRight className="size-4" /></Button>}</div> : <div className="space-y-3">{visible.map(session => <button type="button" key={session.id} onClick={() => onOpen(session)} className="group w-full rounded-2xl border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:p-6">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary">{session.completedAt && !session.draft ? <CheckCircle2 className="size-3.5" /> : <Clock3 className="size-3.5" />}{session.completedAt && !session.draft ? 'Completed' : `Continue at ${STEP_LABELS[session.draft?.section ?? session.currentStep].toLowerCase()}`}</div><h2 className="break-words text-lg font-semibold">{session.title || 'Fourth Step inventory'}</h2><p className="mt-1 text-sm text-muted-foreground">{formatSessionDate(session.date)}</p></div><ArrowRight className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">{(['resentments', 'fears', 'harms', 'assets'] as const).map(section => <span key={section} className="rounded-full bg-secondary/70 px-2.5 py-1.5">{session[section].length} {STEP_LABELS[section].toLowerCase()}</span>)}{session.draft && <span className="rounded-full bg-primary/10 px-2.5 py-1.5 text-primary">Unfinished answer saved</span>}</div>
      </button>)}</div>}

      {legacy && <button type="button" onClick={onLegacy} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed bg-secondary/40 p-5 text-left"><div><h2 className="font-semibold">Earlier ledger entries</h2><p className="mt-1 text-sm text-muted-foreground">{entryCount(legacy)} entries from your previous ledger, kept together for review.</p></div><ArrowRight className="size-5 shrink-0 text-primary" /></button>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"><p className="max-w-md text-sm leading-relaxed text-muted-foreground">Keep an encrypted recovery copy, including unfinished work and contacts. Restore it in an empty browser or the offline edition with this vault’s passphrase. We cannot recover a forgotten passphrase.</p><Button variant="outline" className="h-11 rounded-xl text-sm" onClick={onBackup}><Download className="size-4" />Download encrypted backup</Button></div>
    </div>
  )
}
