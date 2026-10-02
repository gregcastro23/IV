'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, BarChart3, BookOpen, Check, Eye, EyeOff, Heart, Lock, RefreshCw, ShieldCheck, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmergencyView } from '@/components/views/emergency-view'
import { HomeView } from './home-view'
import { LibraryView } from './library-view'
import { SessionRunner } from './session-runner'
import { SessionReview, downloadText } from './session-review'
import { PrivacyContent } from './privacy-content'
import { CheckInView } from './check-in'
import { PatternsView } from './patterns-view'
import { SecuritySettings } from './security-settings'
import { createEntryDraft, createInventorySession, finishInventorySession, localDate, upsertSession, type EntrySection, type InventorySession } from '@/lib/inventory-sessions'
import { latestMoment, syncSessionMoment, upsertMoment, type Moment } from '@/lib/moments'
import { LEGACY_KEYS, type InventoryVault, type VaultData, type VaultSettings } from '@/lib/inventory-vault'
import { cn } from '@/lib/utils'

type View = 'home' | 'checkin' | 'patterns' | 'session' | 'library' | 'support' | 'legacy' | 'privacy' | 'security'
const navigation = [
  { view: 'home' as const, label: 'Today', icon: Sun },
  { view: 'patterns' as const, label: 'Patterns', icon: BarChart3 },
  { view: 'library' as const, label: 'Inventory', icon: BookOpen },
  { view: 'support' as const, label: 'Support', icon: Heart },
]
const RECENT_CHECK_IN = 30 * 60_000
const IDLE_LOCK = 15 * 60_000

export function InventoryWorkspace({ vault, offline, migrationRemaining, onLock }: { vault: InventoryVault; offline: boolean; migrationRemaining: boolean; onLock: () => void }) {
  const [privacy, setPrivacy] = useState(false)
  const [data, setData] = useState(vault.snapshot)
  const [view, setView] = useState<View>(() => {
    const latest = latestMoment(data.moments)
    return data.settings.checkInOnOpen && (!latest || Date.now() - latest.at > RECENT_CHECK_IN) ? 'checkin' : 'home'
  })
  const [checkInKey, setCheckInKey] = useState(0)
  const [active, setActive] = useState<InventorySession | null>(null)
  const activeRef = useRef(active)
  const [saveError, setSaveError] = useState('')
  const [pending, setPending] = useState(0)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const sequence = useRef(0)
  const [remaining, setRemaining] = useState(migrationRemaining)
  const [today, setToday] = useState(localDate())
  const settingsRef = useRef(data.settings)
  settingsRef.current = data.settings
  const autoCovered = useRef(false)
  const privacyRef = useRef(privacy)
  privacyRef.current = privacy
  const working = (value: boolean) => { busyRef.current = value; setBusy(value) }
  const showActive = (value: InventorySession) => { activeRef.current = value; setActive(value) }

  const write = async (change: (value: VaultData) => VaultData): Promise<boolean> => {
    const request = ++sequence.current
    setPending(value => value + 1)
    try {
      const operation = vault.update(change)
      setData(vault.snapshot())
      await operation
      if (request === sequence.current) { setSaveError(''); setRemaining(vault.cleanup().length > 0) }
      return true
    } catch (cause) {
      if (request === sequence.current) setSaveError(cause instanceof Error ? cause.message : 'Your changes could not be saved.')
      return false
    } finally { setPending(value => value - 1) }
  }
  const persist = async (candidate: InventorySession, requireSave = false): Promise<boolean> => {
    if (busyRef.current) return false
    if (requireSave) working(true)
    const previous = activeRef.current
    const next = { ...candidate, updatedAt: Date.now() }
    // Finishing the HALT step records it on the timeline; revisiting it updates the same moment.
    const leavingHalt = previous?.id === next.id && previous.currentStep === 'halt' && next.currentStep !== 'halt'
    if (!requireSave) showActive(next)
    const saved = await write(current => ({ ...current, sessions: upsertSession(current.sessions, next), moments: leavingHalt ? syncSessionMoment(current.moments, next) : current.moments }))
    if (requireSave) { if (saved) showActive(next); working(false) }
    return saved
  }
  const saveBeforeLeaving = async () => {
    if (busyRef.current) return false
    return activeRef.current ? persist(activeRef.current, true) : write(value => value)
  }
  const navigate = async (next: View) => {
    if (!await saveBeforeLeaving()) return
    if (next === 'checkin') setCheckInKey(value => value + 1)
    setView(next)
  }
  /** Begins an inventory from a check-in, so the HALT step is already answered. */
  const startFromMoment = async (moment: Moment, section: EntrySection | null) => {
    if (!await saveBeforeLeaving()) return
    const base = createInventorySession()
    const session: InventorySession = {
      ...base, halt: { ...moment.halt, note: moment.note }, reviewed: ['halt'], currentStep: section ?? 'resentments',
      draft: section ? createEntryDraft(section) : null,
    }
    working(true)
    const saved = await write(current => ({ ...current, sessions: upsertSession(current.sessions, session), moments: upsertMoment(current.moments, { ...moment, sessionId: session.id }) }))
    working(false)
    if (saved) { showActive(session); setView('session') }
  }
  const start = async () => {
    const latest = latestMoment(data.moments)
    if (latest && !latest.sessionId && Date.now() - latest.at < RECENT_CHECK_IN) return startFromMoment(latest, null)
    if (await saveBeforeLeaving()) { const next = createInventorySession(); if (await persist(next, true)) setView('session') }
  }
  const open = async (session: InventorySession) => {
    if (!await saveBeforeLeaving()) return
    showActive(session.draft ? { ...session, currentStep: session.draft.section } : session.completedAt ? { ...session, currentStep: 'review' } : session); setView('session')
  }
  const pause = async () => { if (await saveBeforeLeaving()) setView(activeRef.current?.completedAt ? 'library' : 'home') }
  const complete = async () => {
    if (!activeRef.current) return
    try { await persist(finishInventorySession(activeRef.current), true) }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Finish the remaining sections first.') }
  }
  const backup = async () => {
    try { downloadText(await vault.backup(), `fourthstep-encrypted-${today}.json`, 'application/json') }
    catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'The backup could not be made.') }
  }
  const saveMoment = (moment: Moment) => write(current => ({ ...current, moments: upsertMoment(current.moments, moment) }))
  const deleteMoment = (id: string) => write(current => ({ ...current, moments: current.moments.filter(moment => moment.id !== id) }))
  const updateSettings = (settings: VaultSettings) => write(current => ({ ...current, settings }))
  const lockRef = useRef<() => Promise<void>>(async () => {})
  lockRef.current = async () => { if (await saveBeforeLeaving()) onLock() }

  useEffect(() => {
    // Vaults opened in the earlier format are rewritten in the current one straight away.
    if (vault.describe().storedVersion === 1) void write(value => value)
    let deadline = Date.now() + IDLE_LOCK
    let hiddenAt: number | null = null
    const activity = () => { deadline = Date.now() + IDLE_LOCK }
    const check = setInterval(() => { if (Date.now() >= deadline) { deadline = Date.now() + IDLE_LOCK; void lockRef.current() } }, 5000)
    const hide = (event: KeyboardEvent) => { if (event.key === 'Escape') { autoCovered.current = false; setPrivacy(true) } }
    const refreshDay = () => setToday(localDate())
    // Cover the screen as soon as the app is in the background (app switchers take snapshots), and lock
    // on return if it was away longer than the chosen time.
    const visibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        if (!privacyRef.current) { autoCovered.current = true; setPrivacy(true) }
        return
      }
      const away = hiddenAt === null ? 0 : Date.now() - hiddenAt
      hiddenAt = null; refreshDay()
      if (away >= settingsRef.current.backgroundLockMinutes * 60_000 || Date.now() >= deadline) void lockRef.current()
      else if (autoCovered.current) { autoCovered.current = false; setPrivacy(false) }
    }
    const events = ['keydown', 'pointerdown', 'input', 'wheel'] as const
    events.forEach(event => window.addEventListener(event, activity, { passive: true }))
    window.addEventListener('keydown', hide); window.addEventListener('focus', refreshDay); document.addEventListener('visibilitychange', visibility)
    return () => { clearInterval(check); events.forEach(event => window.removeEventListener(event, activity)); window.removeEventListener('keydown', hide); window.removeEventListener('focus', refreshDay); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  useEffect(() => {
    if (!saveError && pending === 0) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [saveError, pending])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
    const target = document.getElementById('inventory-answer') ?? document.getElementById('entry-question-heading') ?? document.getElementById('app-main')
    target?.focus({ preventScroll: true })
  }, [view, active?.currentStep, active?.completedAt, active?.draft?.question])
  useEffect(() => {
    const checkOriginals = (event: StorageEvent) => {
      if (event.key === null || LEGACY_KEYS.some(key => key === event.key)) {
        try { setRemaining(vault.cleanup().length > 0) } catch { setRemaining(true) }
      }
    }
    window.addEventListener('storage', checkOriginals)
    return () => window.removeEventListener('storage', checkOriginals)
  }, [vault])
  const selectedNav = view === 'session' ? (active?.completedAt ? 'library' : 'home') : view === 'legacy' ? 'library' : view === 'checkin' ? 'home' : view
  const navButton = (item: typeof navigation[number], mobile = false) => <button type="button" key={item.view} disabled={busy} onClick={() => void navigate(item.view)} aria-current={selectedNav === item.view ? 'page' : undefined}
    className={cn('flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50', mobile ? 'min-h-14 flex-1 flex-col gap-1 py-2 text-xs' : 'min-h-11 px-4', selectedNav === item.view ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary')}>
    <item.icon className={mobile ? 'size-5' : 'size-4'} />{item.label}
  </button>
  return <div className="min-h-screen pb-22 md:pb-0">
    <a href="#app-main" className="sr-only z-50 rounded-lg bg-card p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <header className="app-chrome sticky top-0 z-30 border-b bg-background/95 backdrop-blur-sm"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
      <button type="button" disabled={busy} aria-label="Fourth Step home" onClick={() => void navigate('home')} className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-primary"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">IV</span><span className="hidden text-left min-[380px]:block"><span className="block text-sm font-semibold">Fourth Step{offline && ' · Offline'}</span><span className="block text-[11px] text-muted-foreground">A little clarity, every day.</span></span></button>
      <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">{navigation.map(item => navButton(item))}</nav>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" disabled={busy} className={cn('size-11 rounded-xl', view === 'security' && 'bg-primary/10 text-primary')} aria-label="Privacy and security settings" title="Privacy & security" onClick={() => { setPrivacy(false); void navigate('security') }}><ShieldCheck className="size-5" /></Button>
        <Button variant="ghost" size="icon" disabled={busy} className="size-11 rounded-xl" aria-label={privacy ? 'Reveal inventory' : 'Hide inventory'} title="Esc hides your inventory" onClick={() => { autoCovered.current = false; setPrivacy(!privacy) }}>{privacy ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</Button>
        <Button variant="ghost" size="icon" disabled={busy} className="size-11 rounded-xl" aria-label="Lock vault" title="Save and lock vault" onClick={() => void lockRef.current()}><Lock className="size-4.5" /></Button>
      </div>
    </div></header>
    <main id="app-main" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6 outline-none sm:px-6 sm:py-9 lg:px-8">
      {privacy ? <section className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center"><EyeOff className="mb-5 size-12 text-primary" /><h1 className="text-2xl font-semibold">Your inventory is hidden.</h1><p className="mt-3 leading-relaxed text-muted-foreground">Your vault is still unlocked. Lock it when you step away.</p><Button className="mt-6 h-12 rounded-xl" onClick={() => { autoCovered.current = false; setPrivacy(false) }}>Reveal inventory<Eye className="size-4" /></Button><Button variant="outline" className="mt-3 h-12 rounded-xl" onClick={() => void lockRef.current()}>Save & lock vault<Lock className="size-4" /></Button></section> : <>
        {remaining && <div role="alert" className="no-print mb-6 space-y-3 rounded-2xl border p-5 text-sm"><p className="font-semibold">An encrypted copy exists, but some readable storage remains.</p><p>Close earlier inventory tabs, then retry cleanup. Changed originals are preserved for recovery.</p><Button variant="outline" onClick={() => setRemaining(vault.cleanup().length > 0)}>Retry removing verified originals</Button></div>}
        {saveError && <div role="alert" className="no-print mb-6 space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-semibold text-destructive">Your latest changes are not saved yet.</p><p>{saveError}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy} className="h-10 rounded-lg" onClick={() => void saveBeforeLeaving()}><RefreshCw className="size-4" />Try saving again</Button><Button variant="outline" className="h-10 rounded-lg" onClick={() => void backup()}>Download encrypted recovery backup</Button></div></div>}
        <fieldset disabled={busy} aria-busy={busy} className="min-w-0 border-0 p-0">
          {view === 'home' && <HomeView sessions={data.sessions} moments={data.moments} today={today} onCheckIn={() => void navigate('checkin')} onStart={() => void start()} onOpen={open} onLibrary={() => void navigate('library')} onPatterns={() => void navigate('patterns')} />}
          {view === 'checkin' && <CheckInView key={checkInKey} moments={data.moments} onSave={saveMoment} onDone={() => void navigate('home')} onInventory={(moment, section) => void startFromMoment(moment, section)} onSupport={() => void navigate('support')} onPatterns={() => void navigate('patterns')} />}
          {view === 'patterns' && <PatternsView moments={data.moments} today={today} onEdit={saveMoment} onDelete={deleteMoment} onCheckIn={() => void navigate('checkin')} />}
          {view === 'library' && <LibraryView sessions={data.sessions} legacy={data.legacy} onStart={() => void start()} onOpen={open} onLegacy={() => void navigate('legacy')} onBackup={backup} />}
          {view === 'session' && active && <SessionRunner key={active.id} session={active} onChange={persist} onPause={pause} onComplete={complete} onStartNew={() => void start()} onSupport={() => void navigate('support')} />}
          {view === 'support' && <div className="mx-auto max-w-4xl space-y-5">{active && !active.completedAt && <Button variant="outline" className="h-11 rounded-xl" onClick={() => void navigate('session')}><ArrowLeft className="size-4" />Back to your session</Button>}<EmergencyView privacyMode={false} contacts={data.contacts} onContactsChange={contacts => write(value => ({ ...value, contacts }))} /></div>}
          {view === 'legacy' && data.legacy && <div className="mx-auto max-w-3xl space-y-6"><Button variant="ghost" className="h-11 rounded-xl" onClick={() => void navigate('library')}><ArrowLeft className="size-4" />Your inventory</Button><div><h1 className="text-3xl font-semibold tracking-tight">Earlier ledger entries</h1><p className="mt-3 text-muted-foreground">Your earlier entries are preserved in this encrypted vault.</p></div><SessionReview content={data.legacy} title="Earlier ledger entries" date="Previous inventory" /></div>}
          {view === 'security' && <SecuritySettings vault={vault} settings={data.settings} offline={offline} onSettings={updateSettings} onBackup={() => void backup()} onPrivacy={() => void navigate('privacy')} />}
          {view === 'privacy' && <><Button variant="outline" className="rounded-xl" onClick={() => void navigate('security')}><ArrowLeft className="size-4" />Privacy &amp; security</Button><PrivacyContent offline={offline} /></>}
        </fieldset>
      </>}
    </main>
    <footer className="app-chrome mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-6 text-xs text-muted-foreground sm:px-6 lg:px-8"><button disabled={busy} onClick={() => { setPrivacy(false); void navigate('security') }} className="flex items-center gap-1.5 text-primary underline underline-offset-4"><Lock className="size-3.5" />{remaining ? 'Encryption setup needs attention' : 'Encrypted on this device'} · Privacy &amp; security</button><span role="status" className={cn('flex items-center gap-1.5', saveError ? 'text-destructive' : 'text-primary')}>{!saveError && pending === 0 && <Check className="size-3.5" />}{saveError ? 'Changes waiting to save' : pending ? 'Encrypting & saving…' : 'Encrypted answers saved'}</span><span>Locks after {data.settings.backgroundLockMinutes} min away or 15 min idle.</span></footer>
    <nav aria-label="Mobile navigation" className="app-chrome mobile-nav fixed inset-x-0 bottom-0 z-30 flex gap-1 border-t bg-background/95 px-3 pt-2 backdrop-blur-sm md:hidden">{navigation.map(item => navButton(item, true))}</nav>
  </div>
}
