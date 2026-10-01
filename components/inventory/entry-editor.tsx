'use client'

import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CHARACTER_ASSETS, CHARACTER_DEFECTS } from '@/lib/inventory-store'
import { INSTINCTS, draftValue, isDraftQuestionValid, updateDraftValue, type EntryDraft } from '@/lib/inventory-sessions'
import { cn } from '@/lib/utils'

type Question = {
  title: string; helper: string; label: string; placeholder?: string
  type: 'text' | 'textarea' | 'multiple' | 'single'; optional?: boolean
  choices?: readonly { value: string; label: string }[]
}
const instincts = INSTINCTS.map(value => ({ value, label: value }))
const questions: Record<EntryDraft['section'], Question[]> = {
  resentments: [
    { title: 'Who or what is on your mind?', helper: 'Start with a person, an institution, or a principle. One entry at a time.', label: 'Person, institution, or principle', type: 'text', placeholder: 'For example, a colleague or an expectation' },
    { title: 'What happened?', helper: 'Describe the specific event or action that is still bothering you.', label: 'The cause of this resentment', type: 'textarea', placeholder: 'I felt resentful when…' },
    { title: 'What did it touch?', helper: 'Choose the parts of your life or sense of self that felt affected.', label: 'Areas affected', type: 'multiple', choices: instincts, optional: true },
    { title: 'What was your part?', helper: 'Look for your own responses or patterns. Taking responsibility for your response does not make someone else’s harmful actions your fault.', label: 'Patterns I noticed in myself', type: 'multiple', choices: CHARACTER_DEFECTS.map(value => ({ value, label: ({ Selfish: 'Selfishness', Dishonest: 'Dishonesty', Inconsiderate: 'Inconsideration', Frightened: 'Fear', Pride: 'Pride', Greed: 'Greed', Anger: 'Anger' })[value] })), optional: true },
  ],
  fears: [
    { title: 'What are you afraid of?', helper: 'Name one fear that is taking up space for you.', label: 'A fear I am carrying', type: 'text', placeholder: 'I am afraid of…' },
    { title: 'What is underneath that fear?', helper: 'Describe what brings it up, or what you worry might happen.', label: 'What is underneath this fear', type: 'textarea', placeholder: 'This comes up when…' },
    { title: 'Where does it affect you?', helper: 'Choose any areas connected to this fear. It is okay to leave this open for now.', label: 'Areas affected by this fear', type: 'multiple', choices: instincts, optional: true },
  ],
  harms: [
    { title: 'Who was affected?', helper: 'Think of one person affected by your actions or your absence.', label: 'Person affected', type: 'text', placeholder: 'A person or a relationship' },
    { title: 'What do you want to take responsibility for?', helper: 'Describe what you did, left undone, or contributed to.', label: 'The harm or my contribution', type: 'textarea', placeholder: 'My actions affected them when…' },
    { title: 'What could thoughtful repair look like?', helper: 'Write an idea to review with someone you trust. You can keep reflecting on this later.', label: 'A possible repair', type: 'textarea', placeholder: 'A thoughtful next step could be…', optional: true },
    { title: 'How ready do you feel?', helper: 'An honest starting point is enough. Readiness can change.', label: 'My readiness', type: 'single', choices: [
      { value: 'ready', label: 'Ready to discuss a next step' }, { value: 'willing', label: 'Willing, with support' }, { value: 'not_yet', label: 'Not ready yet' },
    ] },
  ],
  assets: [
    { title: 'What strength did you practice?', helper: 'Give some attention to the qualities you are building, too.', label: 'A strength I practiced', type: 'single', choices: CHARACTER_ASSETS.map(value => ({ value, label: value })) },
    { title: 'What did that look like?', helper: 'Name a real action, however small. This is something you can build on.', label: 'How I practiced this strength', type: 'textarea', placeholder: 'I practiced this when…' },
  ],
}

interface EntryEditorProps {
  draft: EntryDraft
  onChange: (draft: EntryDraft, requireSave?: boolean) => boolean
  onSave: () => void
  onClose: () => void
}

export function EntryEditor({ draft, onChange, onSave, onClose }: EntryEditorProps) {
  const question = questions[draft.section][draft.question]
  const value = draftValue(draft)
  const isLast = draft.question === questions[draft.section].length - 1
  const valid = isDraftQuestionValid(draft)
  const changeValue = (next: string | string[]) => onChange(updateDraftValue(draft, next))
  useEffect(() => {
    if (question.type === 'single' || question.type === 'multiple') document.getElementById('entry-question-heading')?.focus({ preventScroll: true })
  }, [draft.question, draft.entry.id, question.type])

  return (
    <div className="space-y-6" key={`${draft.entry.id}-${draft.question}`}>
      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>Question {draft.question + 1} of {questions[draft.section].length}</span>
        <span className="flex items-center gap-1.5"><Sparkles className="size-3.5" /> One entry at a time</span>
      </div>
      <div className="space-y-2">
        <h1 id="entry-question-heading" tabIndex={-1} className="text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl">{question.title}</h1>
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground" id="question-help">{question.helper}</p>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
        <label htmlFor="inventory-answer" className="mb-3 block text-sm font-semibold">
          {question.label}{question.optional && <span className="ml-2 font-normal text-muted-foreground">Optional</span>}
        </label>
        {question.type === 'text' && (
          <Input id="inventory-answer" autoFocus value={typeof value === 'string' ? value : ''}
            onChange={event => changeValue(event.target.value)} placeholder={question.placeholder}
            aria-describedby="question-help" required className="h-14 rounded-xl text-base md:text-base"
            onKeyDown={event => { if (event.key === 'Enter' && valid) { event.preventDefault(); onChange({ ...draft, question: draft.question + 1 }, true) } }} />
        )}
        {question.type === 'textarea' && (
          <Textarea id="inventory-answer" autoFocus rows={5} value={typeof value === 'string' ? value : ''}
            onChange={event => changeValue(event.target.value)} placeholder={question.placeholder}
            aria-describedby="question-help" required={!question.optional}
            className="min-h-40 rounded-xl text-base leading-relaxed md:text-base" />
        )}
        {(question.type === 'single' || question.type === 'multiple') && (
          <fieldset aria-describedby="question-help">
            <legend className="sr-only">{question.label}</legend>
            <div className={cn('grid gap-3', draft.section === 'harms' ? 'grid-cols-1' : 'grid-cols-2')}>
              {question.choices?.map(choice => {
                const selected = Array.isArray(value) ? value.includes(choice.value) : value === choice.value
                return (
                  <button key={choice.value} type="button" aria-pressed={selected}
                    onClick={() => changeValue(question.type === 'multiple'
                      ? (Array.isArray(value) && value.includes(choice.value) ? value.filter(item => item !== choice.value) : [...(Array.isArray(value) ? value : []), choice.value])
                      : choice.value)}
                    className={cn('flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 p-3 text-left text-sm transition-colors sm:p-4 sm:text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary', selected ? 'border-primary bg-primary/8 text-primary' : 'border-border bg-background/50 hover:border-primary/40')}>
                    <span className="min-w-0 break-words">{choice.label}</span>
                    <span className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border')}>
                      {selected && <Check className="size-3.5" />}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        )}
        {question.optional && <p className="mt-4 text-sm text-muted-foreground">{question.type === 'textarea' ? 'You can keep reflecting on this later.' : 'You can continue without making a selection.'}</p>}
      </div>

      <div className="session-actions flex items-center justify-between gap-3">
        <Button variant="ghost" className="h-12 rounded-xl px-3" onClick={() => draft.question === 0 ? onClose() : onChange({ ...draft, question: draft.question - 1 }, true)}>
          <ArrowLeft className="size-4" /> Back
        </Button>
        <Button disabled={!valid} className="h-12 min-w-36 rounded-xl px-5 text-base"
          onClick={() => isLast ? onSave() : onChange({ ...draft, question: draft.question + 1 }, true)}>
          {isLast ? 'Save entry' : 'Continue'} {isLast ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
        </Button>
      </div>
    </div>
  )
}
