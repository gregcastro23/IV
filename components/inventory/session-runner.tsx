'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Coffee, Flame, Heart, Moon, Pencil, Plus, Sparkles, Trash2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { EntryEditor } from './entry-editor'
import { SessionReview } from './session-review'
import {
  SESSION_STEPS, STEP_LABELS, advanceSession, createEntryDraft, entryCount, formatSessionDate,
  saveDraftEntry, type EntrySection, type InventorySession, type SessionStep,
} from '@/lib/inventory-sessions'
import { cn } from '@/lib/utils'

const sectionCopy: Record<EntrySection, { title: string; description: string; singular: string; empty: string }> = {
  resentments: { title: 'Make some space for what is still bothering you.', description: 'Walk through one resentment at a time: who, what happened, what it affected, and your response.', singular: 'resentment', empty: 'A person, an institution, or an expectation that is still on your mind.' },
  fears: { title: 'Bring your fears into the open.', description: 'Name a fear, explore what is underneath it, and notice where it affects your life.', singular: 'fear', empty: 'A worry you keep returning to, big or small.' },
  harms: { title: 'Look honestly at your impact.', description: 'Consider who was affected by your actions and what a thoughtful next step might look like.', singular: 'harm', empty: 'A moment you want to take responsibility for.' },
  assets: { title: 'Notice what you are building.', description: 'Your inventory can hold strengths alongside difficulties. Name a quality you put into practice.', singular: 'strength', empty: 'An honest conversation, an act of consideration, or a small moment of courage.' },
}
const haltFields = [
  { key: 'hungry', label: 'Hungry', prompt: 'Does your body need nourishment?', icon: Coffee },
  { key: 'angry', label: 'Angry', prompt: 'How much tension are you carrying?', icon: Flame },
  { key: 'lonely', label: 'Lonely', prompt: 'How disconnected do you feel?', icon: Users },
  { key: 'tired', label: 'Tired', prompt: 'How much rest do you need?', icon: Moon },
] as const

interface SessionRunnerProps {
  session: InventorySession
  onChange: (session: InventorySession, requireSave?: boolean) => boolean
  onPause: () => void
  onComplete: () => void
  onStartNew: () => void
  onSupport: () => void
}

export function SessionRunner({ session, onChange, onPause, onComplete, onStartNew, onSupport }: SessionRunnerProps) {
  const [draftHidden, setDraftHidden] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [discardDraft, setDiscardDraft] = useState(false)
  const [error, setError] = useState('')
  const step = session.currentStep
  const stepIndex = SESSION_STEPS.indexOf(step)
  const allReviewed = SESSION_STEPS.slice(0, -1).every(item => session.reviewed.includes(item))
  const progress = session.completedAt ? 100 : stepIndex / SESSION_STEPS.length * 100

  const goTo = (next: SessionStep) => {
    if (onChange({ ...session, currentStep: next }, true)) { setDraftHidden(false); setError('') }
  }
  const advance = () => {
    try {
      const next = advanceSession(session)
      if (onChange({ ...next, currentStep: allReviewed ? 'review' : next.currentStep }, true)) { setDraftHidden(false); setError('') }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Please finish this entry first.') }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-7 pb-8">
      <div className="no-print space-y-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <Button variant="ghost" className="h-10 rounded-lg px-0 text-muted-foreground hover:bg-transparent" onClick={onPause}><ArrowLeft className="size-4" /> {session.completedAt ? 'Your inventory' : 'Save & pause'}</Button>
          <span className="text-right text-muted-foreground">{formatSessionDate(session.date)}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm font-medium">
          <span>{session.completedAt && step === 'review' ? 'Inventory complete' : `Step ${stepIndex + 1} of ${SESSION_STEPS.length}`}</span>
          <span className="text-primary">{STEP_LABELS[step]}</span>
        </div>
        <div role="progressbar" aria-label="Session progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} className="h-2.5 overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
        <nav aria-label="Session steps" className="flex gap-2 overflow-x-auto pb-2">
          {SESSION_STEPS.map((item, index) => <button type="button" key={item}
            disabled={(index > stepIndex && !session.reviewed.includes(item)) || (Boolean(session.draft) && item !== step)}
            aria-current={item === step ? 'step' : undefined} onClick={() => goTo(item)}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-primary', item === step ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-primary/10')}>
            {session.reviewed.includes(item) && <Check className="size-3" />}{STEP_LABELS[item]}
          </button>)}
        </nav>
      </div>

      {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</p>}

      {step === 'halt' ? <>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary"><Heart className="size-3.5" /> Start with a little care</div>
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">How are you arriving today?</h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">Before looking inward, check in with your body and emotions. HALT means hungry, angry, lonely, and tired.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {haltFields.map(({ key, label, prompt, icon: Icon }) => <div key={key} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between gap-2"><label htmlFor={`halt-${key}`} className="flex items-center gap-2 text-sm font-semibold sm:text-base"><Icon className="size-4 text-primary sm:size-5" />{label}</label><span className="rounded-lg bg-secondary px-2 py-1 text-sm font-semibold tabular-nums">{session.halt[key]} <span className="font-normal text-muted-foreground">/ 10</span></span></div>
            <p className="mt-2 text-sm text-muted-foreground" id={`halt-${key}-help`}>{prompt}</p>
            <input id={`halt-${key}`} type="range" min="0" max="10" step="1" value={session.halt[key]}
              onChange={event => onChange({ ...session, halt: { ...session.halt, [key]: Number(event.target.value) } })}
              aria-describedby={`halt-${key}-help`} className="mt-5 h-6 w-full cursor-pointer accent-primary" />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>Not at all</span><span>Very much</span></div>
          </div>)}
        </div>
        {Math.max(session.halt.hungry, session.halt.angry, session.halt.lonely, session.halt.tired) >= 7 && <div className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
          <p className="font-semibold">Make a little room for what you need.</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">You can pause, meet a need, or take a short grounding break before continuing.</p>
          <Button variant="outline" className="mt-3 h-11 rounded-xl" onClick={onSupport}>Take a grounding break</Button>
        </div>}
        <div className="space-y-2"><label htmlFor="halt-note" className="text-sm font-semibold">Anything else on your mind? <span className="font-normal text-muted-foreground">Optional</span></label>
          <Textarea id="halt-note" value={session.halt.note} onChange={event => onChange({ ...session, halt: { ...session.halt, note: event.target.value } })} placeholder="A brief note about how you are feeling…" className="min-h-24 rounded-xl bg-card text-base md:text-base" />
        </div>
        <div className="session-actions flex justify-end"><Button className="h-12 rounded-xl px-6 text-base" onClick={advance}>{allReviewed ? 'Back to review' : 'Continue to resentments'}<ArrowRight className="size-4" /></Button></div>
      </> : step === 'review' ? <>
        <div className="no-print space-y-3">
          {session.completedAt && <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CheckCircle2 className="size-8" /></div>}
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{session.completedAt ? 'You made space for honesty.' : 'Bring it all together.'}</h1>
          <p className="text-base leading-relaxed text-muted-foreground">{session.completedAt ? 'Your inventory is saved. Revisit it, make an edit, or begin a fresh session whenever you are ready.' : 'Read through your inventory, notice the patterns, and add one thought to carry forward.'}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><span className="rounded-full bg-secondary px-3 py-1.5">{entryCount(session)} {entryCount(session) === 1 ? 'entry' : 'entries'}</span><span className="rounded-full bg-secondary px-3 py-1.5">{session.reviewed.filter(item => item !== 'review').length} of 5 sections reviewed</span></div>
        </div>
        <SessionReview content={session} title={session.title || 'Fourth Step inventory'} date={formatSessionDate(session.date)} onEdit={goTo} />
        <div className="no-print space-y-5 rounded-2xl border bg-card p-5 sm:p-6">
          <div className="space-y-2"><label htmlFor="session-title" className="text-sm font-semibold">Give this session a name <span className="font-normal text-muted-foreground">Optional</span></label><Input id="session-title" value={session.title} onChange={event => onChange({ ...session, title: event.target.value })} placeholder="For example, finding my footing" className="h-12 rounded-xl text-base md:text-base" /></div>
          <div className="space-y-2"><label htmlFor="session-reflection" className="text-sm font-semibold">What are you taking away? <span className="font-normal text-muted-foreground">Optional</span></label><Textarea id="session-reflection" value={session.reflection} onChange={event => onChange({ ...session, reflection: event.target.value })} placeholder="A pattern, a discovery, or something to discuss…" className="min-h-24 rounded-xl text-base md:text-base" /></div>
          <div className="space-y-2"><label htmlFor="session-next-step" className="text-sm font-semibold">One small next step <span className="font-normal text-muted-foreground">Optional</span></label><Input id="session-next-step" value={session.nextStep} onChange={event => onChange({ ...session, nextStep: event.target.value })} placeholder="Something practical to carry into tomorrow" className="h-12 rounded-xl text-base md:text-base" /></div>
        </div>
        <div className="session-actions no-print flex flex-wrap justify-end gap-3">
          {session.completedAt ? <><Button variant="outline" className="h-12 rounded-xl" onClick={onPause}>Your inventory</Button><Button className="h-12 rounded-xl px-5" onClick={onStartNew}>Start another session<Plus className="size-4" /></Button></> : <Button className="h-12 rounded-xl px-6 text-base" onClick={onComplete}>Complete inventory<Check className="size-4" /></Button>}
        </div>
      </> : <>
        {session.draft?.section === step && !draftHidden ? <EntryEditor draft={session.draft}
          onChange={(draft, requireSave) => onChange({ ...session, draft }, requireSave)}
          onClose={() => setDraftHidden(true)} onSave={() => {
            try { if (onChange(saveDraftEntry(session), true)) { setDraftHidden(false); setError('') } }
            catch (cause) { setError(cause instanceof Error ? cause.message : 'Please finish this entry.') }
          }} /> : <>
          <div className="space-y-3"><h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{sectionCopy[step].title}</h1><p className="text-base leading-relaxed text-muted-foreground">{sectionCopy[step].description}</p></div>
          {session.draft?.section === step && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/25 bg-primary/5 p-4"><span className="text-sm">You have an unfinished entry saved here.</span><div className="flex flex-wrap gap-2"><Button variant="outline" className="h-11 rounded-xl" onClick={() => setDraftHidden(false)}>Resume entry<ArrowRight className="size-4" /></Button><Button variant="ghost" className="h-11 rounded-xl text-muted-foreground" onClick={() => setDiscardDraft(true)}>Discard draft</Button></div></div>}
          <div className="space-y-3">
            {session[step].length === 0 ? <div className="rounded-2xl border border-dashed bg-card p-6 text-center sm:p-10"><div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-secondary text-primary"><Sparkles className="size-6" /></div><p className="font-semibold">Start with one {sectionCopy[step].singular}.</p><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{sectionCopy[step].empty}</p></div> : session[step].map(entry => {
              const title = 'object' in entry ? entry.object : 'fear' in entry ? entry.fear : 'person' in entry ? entry.person : entry.virtue
              const detail = 'cause' in entry ? entry.cause : 'harm' in entry ? entry.harm : entry.behavior
              return <article key={entry.id} className="rounded-2xl border bg-card p-5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-semibold">{title}</h2><p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{detail}</p></div>
                  <div className="flex shrink-0 gap-1"><Button variant="ghost" size="icon" className="size-10 rounded-lg" aria-label={`Edit ${title}`} disabled={Boolean(session.draft)} onClick={() => { if (onChange({ ...session, draft: createEntryDraft(step, entry) }, true)) setDraftHidden(false) }}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon" className="size-10 rounded-lg text-muted-foreground" aria-label={`Remove ${title}`} onClick={() => setDeleteId(entry.id)}><Trash2 className="size-4" /></Button></div>
                </div>
              </article>
            })}
          </div>
          <Button variant="outline" disabled={Boolean(session.draft)} className="h-12 w-full rounded-xl border-dashed text-base text-primary" onClick={() => { if (onChange({ ...session, draft: createEntryDraft(step) }, true)) setDraftHidden(false) }}><Plus className="size-4" />Add {session[step].length > 0 ? 'another' : 'a'} {sectionCopy[step].singular}</Button>
          <div className="session-actions flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" disabled={Boolean(session.draft)} className="h-12 rounded-xl px-3" onClick={() => goTo(SESSION_STEPS[stepIndex - 1])}><ArrowLeft className="size-4" />Back</Button>
            <Button disabled={Boolean(session.draft)} className="h-12 rounded-xl px-5 text-base" onClick={advance}>
              {allReviewed ? 'Back to review' : session[step].length === 0 ? 'Nothing to add · Continue' : `Continue to ${STEP_LABELS[SESSION_STEPS[stepIndex + 1]].toLowerCase()}`}<ArrowRight className="size-4" />
            </Button>
          </div>
        </>}
        <AlertDialog open={discardDraft} onOpenChange={setDiscardDraft}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Discard this unfinished answer?</AlertDialogTitle><AlertDialogDescription>Your saved entries stay in this session. The unfinished changes in this draft will be removed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep writing</AlertDialogCancel><AlertDialogAction onClick={() => { if (onChange({ ...session, draft: null }, true)) { setDiscardDraft(false); setDraftHidden(false) } }}>Discard draft</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={deleteId !== null} onOpenChange={open => { if (!open) setDeleteId(null) }}>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remove this entry?</AlertDialogTitle><AlertDialogDescription>This removes the entry from this session. You can keep it and return to it later instead.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep entry</AlertDialogCancel><AlertDialogAction onClick={() => { if (deleteId && onChange({ ...session, [step]: session[step].filter(entry => entry.id !== deleteId) }, true)) setDeleteId(null) }}>Remove entry</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
      </>}
    </div>
  )
}
