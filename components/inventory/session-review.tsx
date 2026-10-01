'use client'

import { useRef, useState } from 'react'
import { Download, Pencil, Printer, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { STEP_LABELS, reviewText, type EntrySection, type ReviewContent } from '@/lib/inventory-sessions'

const sectionIds: EntrySection[] = ['resentments', 'fears', 'harms', 'assets']

export function downloadText(content: string, filename: string, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export function SessionReview({ content, title, date, onEdit, showHalt = true }: {
  content: ReviewContent; title: string; date: string; onEdit?: (section: EntrySection | 'halt') => void; showHalt?: boolean
}) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportField = useRef<HTMLTextAreaElement>(null)
  const exportedText = reviewText(content, title, date)
  const patterns = content.resentments.flatMap(item => item.myPart).reduce<Record<string, number>>((counts, part) => ({ ...counts, [part]: (counts[part] ?? 0) + 1 }), {})
  return (
    <div className="space-y-6" id="inventory-review">
      <div className="print-heading hidden"><h1>{title}</h1><p>{date}</p></div>
      <div className="no-print flex flex-wrap items-center gap-2">
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => window.print()}><Printer className="size-4" /> Print review</Button>
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => setExportOpen(true)}><Download className="size-4" /> Export review</Button>
      </div>
      <nav aria-label="Review sections" className="no-print flex flex-wrap gap-2">
        {sectionIds.map(section => <a key={section} href={`#review-${section}`} className="rounded-full border bg-card px-3 py-2 text-sm transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary">{STEP_LABELS[section]} <span className="ml-1 text-muted-foreground">{content[section].length}</span></a>)}
      </nav>

      {showHalt && <section className="review-section rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="review-halt-heading">
        <div className="mb-4 flex items-center justify-between gap-2"><h2 id="review-halt-heading" className="text-lg font-semibold">Where you started · HALT</h2>{onEdit && <EditButton label="Edit HALT check-in" onClick={() => onEdit('halt')} />}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['hungry', 'angry', 'lonely', 'tired'] as const).map(key => <div key={key} className="rounded-xl bg-secondary/65 p-3"><p className="text-sm capitalize text-muted-foreground">{key}</p><p className="mt-1 text-xl font-semibold">{content.halt[key]}<span className="text-sm font-normal text-muted-foreground"> / 10</span></p></div>)}
        </div>
        {content.halt.note && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{content.halt.note}</p>}
      </section>}

      {Object.keys(patterns).length > 0 && <div className="review-section rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" /> Patterns you noticed</h2>
        <div className="mt-3 flex flex-wrap gap-2">{Object.entries(patterns).sort((a, b) => b[1] - a[1]).map(([pattern, count]) => <span key={pattern} className="rounded-full bg-card px-3 py-1.5 text-sm">{pattern} <span className="text-muted-foreground">· {count}</span></span>)}</div>
      </div>}

      {sectionIds.map(section => <section key={section} id={`review-${section}`} className="review-section scroll-mt-24 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby={`review-${section}-heading`}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id={`review-${section}-heading`} className="text-lg font-semibold">{STEP_LABELS[section]} <span className="ml-1 text-sm font-normal text-muted-foreground">{content[section].length}</span></h2>
          {onEdit && <EditButton label={`Edit ${STEP_LABELS[section].toLowerCase()}`} onClick={() => onEdit(section)} />}
        </div>
        {content[section].length === 0 && <p className="text-sm text-muted-foreground">Nothing added in this section.</p>}
        <div className="space-y-5">
          {section === 'resentments' && content.resentments.map((entry, index) => <article key={entry.id} className="review-entry border-t pt-4 first:border-0 first:pt-0">
            <h3 className="font-semibold">{index + 1}. {entry.object}</h3>
            <ReviewField label="What happened" value={entry.cause} />
            <ReviewField label="Affected" value={entry.instincts.join(', ') || 'None selected'} />
            <ReviewField label="My part" value={entry.myPart.join(', ') || 'Still reflecting'} />
          </article>)}
          {section === 'fears' && content.fears.map((entry, index) => <article key={entry.id} className="review-entry border-t pt-4 first:border-0 first:pt-0">
            <h3 className="font-semibold">{index + 1}. {entry.fear}</h3>
            <ReviewField label="Underneath it" value={entry.cause} />
            <ReviewField label="Affected" value={entry.affectedInstincts.join(', ') || 'None selected'} />
          </article>)}
          {section === 'harms' && content.harms.map((entry, index) => <article key={entry.id} className="review-entry border-t pt-4 first:border-0 first:pt-0">
            <h3 className="font-semibold">{index + 1}. {entry.person}</h3>
            <ReviewField label="What happened" value={entry.harm} />
            <ReviewField label="Possible repair" value={entry.amends || 'Still reflecting'} />
            <ReviewField label="Readiness" value={{ ready: 'Ready to discuss', willing: 'Willing, with support', not_yet: 'Not ready yet' }[entry.willingness]} />
          </article>)}
          {section === 'assets' && content.assets.map(entry => <article key={entry.id} className="review-entry border-t pt-4 first:border-0 first:pt-0">
            <h3 className="font-semibold text-primary">{entry.virtue}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{entry.behavior}</p>
          </article>)}
        </div>
      </section>)}
      {(content.reflection || content.nextStep) && <section className="review-section rounded-2xl border bg-card p-5 sm:p-6">
        {content.reflection && <><h2 className="font-semibold">What you are taking away</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{content.reflection}</p></>}
        {content.nextStep && <div className={content.reflection ? 'mt-5' : ''}><h2 className="font-semibold">One next step</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{content.nextStep}</p></div>}
      </section>}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="no-print max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Export your inventory</DialogTitle><DialogDescription>A readable copy of this session. Select the text to copy it, or download a file to keep.</DialogDescription></DialogHeader>
          <label htmlFor="review-export" className="sr-only">Review text to copy</label>
          <Textarea ref={exportField} id="review-export" readOnly value={exportedText} className="h-72 field-sizing-fixed resize-none bg-secondary/30 text-sm leading-relaxed" />
          <DialogFooter className="flex-wrap gap-2"><DialogClose asChild><Button variant="ghost">Done</Button></DialogClose><Button variant="outline" onClick={() => { exportField.current?.focus(); exportField.current?.select() }}>Select all text</Button><Button onClick={() => downloadText(exportedText, `inventory-${date.replace(/[^a-zA-Z0-9]/g, '-')}.txt`)}><Download className="size-4" />Download text file</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button variant="ghost" size="sm" aria-label={label} className="no-print h-10 rounded-lg text-primary" onClick={onClick}><Pencil className="size-3.5" /> Edit</Button>
}

function ReviewField({ label, value }: { label: string; value: string }) {
  return <div className="mt-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{value}</p></div>
}
