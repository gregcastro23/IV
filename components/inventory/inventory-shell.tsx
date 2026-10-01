'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, Check, Eye, EyeOff, Heart, Leaf, Lock, Play, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LockScreen } from '@/components/lock-screen'
import { EmergencyView } from '@/components/views/emergency-view'
import { HomeView } from './home-view'
import { LibraryView } from './library-view'
import { SessionRunner } from './session-runner'
import { SessionReview, downloadText } from './session-review'
import { SESSION_STORAGE_KEY, createInventorySession, entryCount, finishInventorySession, inventorySessionSchema, localDate, readInventorySessions, saveInventorySession, type InventorySession, type ReviewContent } from '@/lib/inventory-sessions'
import { getAssetLogs, getFears, getHaltLogs, getHarms, getResentments, isPasswordSet, isPinSet } from '@/lib/inventory-store'
import { cn } from '@/lib/utils'

type View = 'home' | 'session' | 'library' | 'support' | 'legacy'
const navigation = [
  { view: 'home' as const, label: 'Practice', icon: Play },
  { view: 'library' as const, label: 'Your inventory', icon: BookOpen },
  { view: 'support' as const, label: 'Support', icon: Heart },
]

function readLegacyContent(): ReviewContent | null {
  const empty = createInventorySession()
  const logs = getHaltLogs()
  const content: ReviewContent = {
    halt: logs.length > 0 ? inventorySessionSchema.shape.halt.parse(logs[0]) : empty.halt,
    resentments: inventorySessionSchema.shape.resentments.parse(getResentments()),
    fears: inventorySessionSchema.shape.fears.parse(getFears()),
    harms: inventorySessionSchema.shape.harms.parse(getHarms()),
    assets: inventorySessionSchema.shape.assets.parse(getAssetLogs()), reflection: '', nextStep: '',
  }
  return entryCount(content) > 0 || logs.length > 0 ? content : null
}

export function InventoryShell() {
  const [mounted, setMounted] = useState(false)
  const [locked, setLocked] = useState(true)
  const [privacy, setPrivacy] = useState(false)
  const [view, setView] = useState<View>('home')
  const [sessions, setSessions] = useState<InventorySession[]>([])
  const [active, setActive] = useState<InventorySession | null>(null)
  const [legacy, setLegacy] = useState<ReviewContent | null>(null)
  const [loadError, setLoadError] = useState('')
  const [legacyError, setLegacyError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [today, setToday] = useState(localDate())

  useEffect(() => {
    try { setLocked(isPinSet() || isPasswordSet()) }
    catch { setLocked(false); setLoadError('Browser storage is unavailable. Keep this page open until your answers can be saved.') }
    setMounted(true)
  }, [])

  const loadData = useCallback(() => {
    try { setSessions(readInventorySessions()); setLoadError('') }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Saved sessions could not be loaded.') }
    try { setLegacy(readLegacyContent()); setLegacyError('') }
    catch { setLegacyError('Some earlier ledger entries could not be read. They have been preserved in browser storage.') }
  }, [])
  useEffect(() => { if (mounted && !locked) loadData() }, [mounted, locked, loadData])
  useEffect(() => {
    const refreshDay = () => setToday(localDate())
    const interval = setInterval(refreshDay, 60000)
    window.addEventListener('focus', refreshDay)
    return () => { clearInterval(interval); window.removeEventListener('focus', refreshDay) }
  }, [])
  useEffect(() => {
    if (locked) return
    const hide = (event: KeyboardEvent) => { if (event.key === 'Escape') setPrivacy(true) }
    window.addEventListener('keydown', hide)
    return () => window.removeEventListener('keydown', hide)
  }, [locked])
  useEffect(() => {
    if (!saveError) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saveError])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    const target = document.getElementById('inventory-answer') ?? document.getElementById('entry-question-heading') ?? document.getElementById('app-main')
    target?.focus({ preventScroll: true })
  }, [view, active?.currentStep, active?.completedAt])

  const persist = (candidate: InventorySession, requireSave = false): boolean => {
    const next = { ...candidate, updatedAt: Date.now() }
    if (!requireSave) setActive(next)
    try {
      setSessions(saveInventorySession(next)); setActive(next); setSaveError(''); setLoadError('')
      return true
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Your answers could not be saved.'); return false }
  }
  const navigate = (next: View) => {
    if (saveError && active && !persist(active, true)) return
    setView(next)
  }
  const start = () => {
    if (saveError && active && !persist(active, true)) return
    persist(createInventorySession()); setView('session')
  }
  const open = (session: InventorySession) => {
    if (saveError && active && !persist(active, true)) return
    setActive(session.draft ? { ...session, currentStep: session.draft.section } : session.completedAt ? { ...session, currentStep: 'review' } : session); setView('session')
  }
  const pause = () => { if (active && persist(active, true)) setView(active.completedAt ? 'library' : 'home') }
  const complete = () => {
    if (!active) return
    try { persist(finishInventorySession(active), true) }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Finish the remaining sections first.') }
  }
  const selectedNav = view === 'session' ? (active?.completedAt ? 'library' : 'home') : view === 'legacy' ? 'library' : view

  if (!mounted) return <div className="flex min-h-screen items-center justify-center" role="status"><span className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /><span className="sr-only">Loading your inventory</span></div>
  if (locked) return <LockScreen onUnlock={() => { setLocked(false); setPrivacy(false) }} />

  const navButton = (item: typeof navigation[number], mobile = false) => <button type="button" key={item.view} onClick={() => navigate(item.view)} aria-current={selectedNav === item.view ? 'page' : undefined}
    className={cn('flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary', mobile ? 'min-h-14 flex-1 flex-col gap-1 py-2 text-xs' : 'min-h-11 px-4', selectedNav === item.view ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary')}>
    <item.icon className={mobile ? 'size-5' : 'size-4'} />{item.label}
  </button>

  return (
    <div className="min-h-screen pb-22 sm:pb-0">
      <a href="#app-main" className="sr-only z-50 rounded-lg bg-card p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <header className="app-chrome sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <button type="button" aria-label="Fourth Step home" onClick={() => navigate('home')} className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-semibold tracking-tight text-primary-foreground">IV</span><span className="hidden text-left min-[380px]:block"><span className="block text-sm font-semibold">Fourth Step</span><span className="block text-[11px] text-muted-foreground">A little clarity, every day.</span></span></button>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex">{navigation.map(item => navButton(item))}</nav>
          <div className="flex shrink-0 items-center gap-1"><Button variant="ghost" size="icon" className="size-11 rounded-xl" aria-label={privacy ? 'Reveal inventory' : 'Hide inventory'} title={privacy ? 'Reveal inventory' : 'Hide inventory (Esc)'} onClick={() => setPrivacy(!privacy)}>{privacy ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</Button><Button variant="ghost" size="icon" className="size-11 rounded-xl" aria-label="Lock screen" title="Lock screen" onClick={() => setLocked(true)}><Lock className="size-4.5" /></Button></div>
        </div>
      </header>

      <main id="app-main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none sm:px-6 sm:py-9 lg:px-8">
        {privacy ? <section className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center"><span className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-secondary text-primary"><EyeOff className="size-8" /></span><h1 className="text-2xl font-semibold">Your inventory is hidden.</h1><p className="mt-3 text-base leading-relaxed text-muted-foreground">Take your time. Your place and answers are kept.</p><Button className="mt-6 h-12 rounded-xl px-6" onClick={() => setPrivacy(false)}>Reveal inventory<Eye className="size-4" /></Button></section> : <>
          {(loadError || saveError) && <div role="alert" className="no-print mb-6 space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-semibold text-destructive">{saveError ? 'Your latest changes are not saved yet.' : 'Saved sessions need attention.'}</p><p>{saveError || loadError}</p><div className="flex flex-wrap gap-2">{saveError && active ? <Button variant="outline" className="h-10 rounded-lg" onClick={() => persist(active, true)}><RefreshCw className="size-4" />Try saving again</Button> : <Button variant="outline" className="h-10 rounded-lg" onClick={loadData}>Try loading again</Button>}{loadError && <Button variant="ghost" className="h-10 rounded-lg" onClick={() => { try { const raw = localStorage.getItem(SESSION_STORAGE_KEY); if (raw) downloadText(raw, 'inventory-original-data.json', 'application/json') } catch { /* The visible storage error remains. */ } }}>Download original saved data</Button>}</div></div>}
          {legacyError && <p role="alert" className="no-print mb-5 rounded-xl border p-4 text-sm text-muted-foreground">{legacyError}</p>}
          {view === 'home' && <HomeView sessions={sessions} today={today} onStart={start} onOpen={open} onLibrary={() => navigate('library')} />}
          {view === 'library' && <LibraryView sessions={sessions} legacy={legacy} today={today} onStart={start} onOpen={open} onLegacy={() => navigate('legacy')} />}
          {view === 'session' && active && <SessionRunner key={active.id} session={active} onChange={persist} onPause={pause} onComplete={complete} onStartNew={start} onSupport={() => navigate('support')} />}
          {view === 'support' && <div className="mx-auto max-w-4xl space-y-5">{active && !active.completedAt && <Button variant="outline" className="h-11 rounded-xl" onClick={() => navigate('session')}><ArrowLeft className="size-4" />Back to your session</Button>}<EmergencyView privacyMode={false} /></div>}
          {view === 'legacy' && legacy && <div className="mx-auto max-w-3xl space-y-6"><Button variant="ghost" className="h-11 rounded-xl" onClick={() => navigate('library')}><ArrowLeft className="size-4" />Your inventory</Button><div><h1 className="text-3xl font-semibold tracking-tight">Earlier ledger entries</h1><p className="mt-3 text-muted-foreground">Your previous entries are preserved here. New guided sessions have their own dated reviews.</p></div><SessionReview content={legacy} title="Earlier ledger entries" date="Previous inventory" /></div>}
        </>}
      </main>
      <footer className="app-chrome mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-6 text-xs text-muted-foreground sm:px-6 lg:px-8"><span className="flex items-center gap-1.5"><Leaf className="size-3.5" />Stored in this browser.</span>{active && view === 'session' && !privacy && <span role="status" className={cn('flex items-center gap-1.5', saveError ? 'text-destructive' : 'text-primary')}>{!saveError && <Check className="size-3.5" />}{saveError ? 'Changes waiting to save' : 'Answers saved'}</span>}<span>Esc hides your inventory.</span></footer>
      <nav aria-label="Mobile navigation" className="app-chrome mobile-nav fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t bg-background/95 px-3 pt-2 backdrop-blur-sm sm:hidden">{navigation.map(item => navButton(item, true))}</nav>
    </div>
  )
}
