'use client'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, CloudOff, Fingerprint, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  browserVaultEnvironment, createVault, describeVault, hasLegacyData, LEGACY_KEYS, pinStatus, readVault, unlockVault,
  type InventoryVault, type RecoveryKind, type UnlockMethod, type VaultDescription, type VaultEnvironment,
} from '@/lib/inventory-vault'
import { deviceUnlockName, deviceUnlockSupport, evaluateDevicePasskey, type DeviceSupport } from '@/lib/device-unlock'
import { isPasswordSet, isPinSet, verifyPassword, verifyPin } from '@/lib/inventory-store'
import { PrivacyContent } from './privacy-content'
import { InventoryWorkspace } from './inventory-shell'
import { downloadText } from './session-review'
import { PinInput, QuickUnlockChoices, RecoveryKeyPanel } from './unlock-methods'

const message = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback

export function VaultGate({ offline = false }: { offline?: boolean }) {
  const [env, setEnv] = useState<VaultEnvironment | null>(null)
  const [ready, setReady] = useState(false)
  const [vault, setVault] = useState<InventoryVault | null>(null)
  const [onboarding, setOnboarding] = useState<InventoryVault | null>(null)
  const [existing, setExisting] = useState(false)
  const [stored, setStored] = useState<VaultDescription | null>(null)
  const [legacy, setLegacy] = useState(false)
  const [oldPin, setOldPin] = useState(false)
  const [oldPassword, setOldPassword] = useState(false)
  const [backup, setBackup] = useState<{ raw: string; description: VaultDescription } | null>(null)
  const [stage, setStage] = useState<'welcome' | 'recovery'>('welcome')
  const [privacy, setPrivacy] = useState(false)
  const [device, setDevice] = useState<DeviceSupport>({ available: false })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(false)

  const inspect = (environment: VaultEnvironment) => {
    const raw = readVault(environment)
    setExisting(raw !== null); setStored(null)
    if (raw !== null) { try { setStored(describeVault(raw)) } catch (cause) { setError(message(cause, 'The saved vault could not be read.')) } }
  }
  useEffect(() => {
    try {
      const environment = browserVaultEnvironment()
      setEnv(environment); inspect(environment); setLegacy(hasLegacyData(environment)); setOldPin(isPinSet()); setOldPassword(isPasswordSet())
    } catch { setError('Encrypted storage is unavailable in this browser. Use a current browser with storage enabled. No answers have been changed.') }
    void deviceUnlockSupport().then(setDevice)
    setReady(true)
  }, [])

  const enter = (opened: InventoryVault) => { setRemaining(opened.cleanup().length > 0); setBackup(null); setExisting(true); setError(''); setVault(opened) }
  const unlock = async (method: UnlockMethod) => {
    if (!env || busy) return
    setBusy(true); setError('')
    try { enter(await unlockVault(method, env, backup?.raw)) }
    catch (cause) { setError(message(cause, 'The vault could not be opened. Saved data is unchanged.')) }
    finally { setBusy(false) }
  }
  const create = async (secret: string, kind: RecoveryKind, credentials: { pin: string; password: string }) => {
    if (!env || busy) return
    setBusy(true); setError('')
    try {
      if ((oldPin && !verifyPin(credentials.pin)) || (oldPassword && !verifyPassword(credentials.password))) throw new Error('Your earlier screen-lock credentials do not match.')
      const opened = await createVault(secret, env, kind)
      setRemaining(opened.cleanup().length > 0); setExisting(true); setOnboarding(opened)
    } catch (cause) { setError(message(cause, 'The vault could not be created. Original data is preserved.')) }
    finally { setBusy(false) }
  }
  const chooseBackup = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 32 * 1024 * 1024) { setError('Backup exceeds the 32 MB limit.'); return }
    try { const raw = await file.text(); setBackup({ raw, description: describeVault(raw) }); setError('') }
    catch (cause) { setError(message(cause, 'That file could not be read.')) }
  }

  if (vault) return <InventoryWorkspace vault={vault} offline={offline} migrationRemaining={remaining} onLock={() => { vault.close(); setVault(null); setPrivacy(false); setError(''); if (env) inspect(env) }} />
  if (!ready) return <main className="flex min-h-screen items-center justify-center" role="status">Preparing private storage…</main>
  if (privacy) return <main className="px-5 py-8"><div className="mx-auto max-w-3xl"><Button variant="outline" className="rounded-xl" onClick={() => setPrivacy(false)}><ArrowLeft className="size-4" />Back</Button></div><PrivacyContent offline={offline} /></main>

  if (onboarding) return <Shell offline={offline} step="Step 2 of 2 · Quick unlock" title="Make opening easy, even on a hard day." lead="Your recovery key stays the master key. Quick unlock opens your vault in a second, so you never need to type a long password in a difficult moment.">
    <QuickUnlockChoices vault={onboarding} device={device} />
    <Button className="mt-5 h-12 w-full rounded-xl text-base" onClick={() => { setVault(onboarding); setOnboarding(null) }}>Continue to your first check-in<ArrowRight className="size-4" /></Button>
    <p className="mt-3 text-center text-xs text-muted-foreground">You can change this any time in Privacy &amp; security.</p>
  </Shell>

  const description = backup?.description ?? stored
  if (existing || backup) {
    const here = typeof location === 'undefined' ? '' : location.hostname
    const passkeys = description?.passkeys.filter(passkey => passkey.rpId === here) ?? []
    const pin = env && description && !backup ? pinStatus(env, description.id) : null
    const recoveryLabel = description?.recovery === 'generated' ? 'recovery key' : 'passphrase'
    return <Shell offline={offline} icon={backup ? undefined : 'lock'} title={backup ? 'Restore your encrypted backup.' : 'Welcome back.'} lead={backup ? 'Unlock the backup to copy it into this browser.' : 'Your inventory is locked and encrypted on this device.'} onPrivacy={() => setPrivacy(true)}>
      <UnlockOptions key={`${backup ? 'backup' : 'vault'}-${description?.id}`} busy={busy || !env} device={device.available ? passkeys : []} pin={pin} recoveryLabel={recoveryLabel}
        onDevice={async () => { if (busy) return; try { setError(''); await unlock({ kind: 'passkey', ...await evaluateDevicePasskey(passkeys) }) } catch (cause) { setError(message(cause, 'Device unlock did not work.')) } }}
        onPin={pinValue => unlock({ kind: 'pin', pin: pinValue })} onRecovery={secret => unlock({ kind: 'recovery', secret })} />
      {error && <p role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm leading-relaxed text-destructive">{error}</p>}
      {backup && <Button variant="ghost" className="mt-4 w-full" onClick={() => { setBackup(null); setError('') }}>Cancel restore</Button>}
      {error && env && !backup && <RecoveryDownload env={env} existing={existing} onError={setError} />}
      <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">Forgot your {recoveryLabel}? If device unlock or your PIN still works, open the vault and create a new one in Privacy &amp; security. Nobody else can reset it.</p>
    </Shell>
  }

  if (stage === 'recovery') return <Shell offline={offline} step="Step 1 of 2 · Recovery key" title="Save your recovery key." lead="This is the master key to your vault. You will rarely need it. It cannot be reset by anyone, including us, so keep it somewhere safe.">
    <Button variant="ghost" className="mb-3 h-10 rounded-lg px-2" onClick={() => setStage('welcome')}><ArrowLeft className="size-4" />Back</Button>
    <div className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <LegacyRecoveryPanel busy={busy} legacy={legacy} oldPin={oldPin} oldPassword={oldPassword} onCreate={create} />
      {error && <p role="alert" className="mt-4 text-sm leading-relaxed text-destructive">{error}</p>}
    </div>
    {error && env && <RecoveryDownload env={env} existing={false} onError={setError} />}
  </Shell>

  return <Shell offline={offline} title="A private space for honesty." lead="Check in with yourself through the day and work through your inventory, one small step at a time." onPrivacy={() => setPrivacy(true)}>
    <ul className="space-y-3">
      {[
        { icon: LockKeyhole, title: 'Encrypted before it is saved', text: 'Your answers are encrypted on this device with keys only you hold.' },
        { icon: Fingerprint, title: 'Quick to open', text: device.available ? `Unlock with ${deviceUnlockName()} or a PIN. No long password needed day to day.` : 'Unlock with a short PIN day to day. No long password needed.' },
        { icon: CloudOff, title: 'Nothing is uploaded', text: 'No account, no tracking, and no copy of your answers on our servers.' },
      ].map(item => <li key={item.title} className="flex gap-3 rounded-2xl border bg-card p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon className="size-5" /></span><span><span className="block font-semibold">{item.title}</span><span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">{item.text}</span></span></li>)}
    </ul>
    {legacy && <p className="mt-5 rounded-xl border p-4 text-sm leading-relaxed">Your earlier answers are still here. Close other Fourth Step tabs. Setup encrypts and verifies a copy before removing the original readable storage.</p>}
    <Button className="mt-6 h-12 w-full rounded-xl text-base" disabled={!env} onClick={() => setStage('recovery')}>Get started<ArrowRight className="size-4" /></Button>
    {!legacy && <label className="mt-3 block cursor-pointer rounded-xl border bg-card px-4 py-3 text-center text-sm font-semibold text-primary">Restore an encrypted backup<input type="file" accept=".json,application/json" className="sr-only" disabled={busy} onChange={event => void chooseBackup(event.target.files?.[0])} /></label>}
    {error && <p role="alert" className="mt-4 text-sm leading-relaxed text-destructive">{error}</p>}
  </Shell>
}

function Shell({ offline, step, title, lead, icon, onPrivacy, children }: { offline: boolean; step?: string; title: string; lead: string; icon?: 'lock'; onPrivacy?: () => void; children: ReactNode }) {
  return <main className="mx-auto min-h-screen max-w-lg px-5 py-10 sm:py-14">
    <div className="mb-7 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon === 'lock' ? <LockKeyhole className="size-8" /> : <ShieldCheck className="size-8" />}</span>
      <p className="mt-5 text-sm font-semibold text-primary">{step ?? `IV · Fourth Step${offline ? ' · Offline' : ''}`}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-muted-foreground">{lead}</p>
    </div>
    {children}
    {onPrivacy && <p className="mt-6 text-center text-sm"><button onClick={onPrivacy} className="font-semibold text-primary underline underline-offset-4">How your privacy is protected</button></p>}
    <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">No account or server recovery. Independent security audit pending.</p>
  </main>
}

function UnlockOptions({ busy, device, pin, recoveryLabel, onDevice, onPin, onRecovery }: {
  busy: boolean; device: unknown[]; pin: { length: number; attemptsLeft: number } | null; recoveryLabel: string
  onDevice: () => void; onPin: (pin: string) => Promise<void>; onRecovery: (secret: string) => Promise<void>
}) {
  const [pinValue, setPinValue] = useState('')
  const [secret, setSecret] = useState('')
  const [showRecovery, setShowRecovery] = useState(!device.length && !pin)
  const submitPin = async (value: string) => { await onPin(value); setPinValue('') }
  return <div className="space-y-4">
    {device.length > 0 && <Button className="h-14 w-full rounded-2xl text-base" disabled={busy} onClick={onDevice}><Fingerprint className="size-5" />{busy ? 'Unlocking…' : `Unlock with ${deviceUnlockName()}`}</Button>}
    {pin && <form className="space-y-2 rounded-2xl border bg-card p-5" onSubmit={event => { event.preventDefault(); if (pinValue.length >= 6) void submitPin(pinValue) }}>
      <label htmlFor="unlock-pin" className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4 text-primary" />Enter your PIN</label>
      <PinInput id="unlock-pin" label="PIN" value={pinValue} length={pin.length} autoFocus={!device.length} onChange={value => { setPinValue(value); if (value.length === pin.length && !busy) void submitPin(value) }} />
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{busy ? 'Checking…' : pin.attemptsLeft < 5 ? `${pin.attemptsLeft} attempts left` : `${pin.length} digits`}</span><Button type="submit" size="sm" variant="ghost" disabled={busy || pinValue.length < 6}>Unlock</Button></div>
    </form>}
    {showRecovery ? <form className="space-y-3 rounded-2xl border bg-card p-5" onSubmit={async (event: FormEvent) => { event.preventDefault(); await onRecovery(secret); setSecret('') }}>
      <label htmlFor="vault-passphrase" className="text-sm font-semibold">Your {recoveryLabel}</label>
      <Input id="vault-passphrase" type="password" autoComplete="current-password" value={secret} onChange={event => setSecret(event.target.value)} required maxLength={1024} spellCheck={false} autoCapitalize="none" autoFocus={Boolean(device.length || pin)} className="h-12 rounded-xl text-base md:text-base" />
      <p className="text-xs leading-relaxed text-muted-foreground">It stays on this device and is never sent anywhere.</p>
      <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base">{busy ? 'Unlocking…' : 'Unlock'}<ArrowRight className="size-4" /></Button>
    </form> : <button type="button" className="block w-full py-2 text-center text-sm font-medium text-primary underline underline-offset-4" onClick={() => setShowRecovery(true)}>Use your {recoveryLabel} instead</button>}
  </div>
}

function LegacyRecoveryPanel({ busy, legacy, oldPin, oldPassword, onCreate }: { busy: boolean; legacy: boolean; oldPin: boolean; oldPassword: boolean; onCreate: (secret: string, kind: RecoveryKind, credentials: { pin: string; password: string }) => void }) {
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  return <RecoveryKeyPanel busy={busy} submitLabel={busy ? 'Encrypting your vault…' : legacy ? 'Encrypt earlier answers & continue' : 'Create my private vault'} onSubmit={(secret, kind) => onCreate(secret, kind, { pin, password })}>
    {oldPin && <div className="space-y-2"><label htmlFor="migration-pin" className="text-sm font-semibold">Earlier six-digit PIN</label><Input id="migration-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e => setPin(e.target.value)} required className="h-12 rounded-xl" /></div>}
    {oldPassword && <div className="space-y-2"><label htmlFor="migration-password" className="text-sm font-semibold">Earlier password</label><Input id="migration-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl" /></div>}
    <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" required className="mt-1 accent-primary" /><span>I understand that nobody can recover my inventory without this key or my quick unlock. I will keep it safe and make encrypted backups.</span></label>
  </RecoveryKeyPanel>
}

function RecoveryDownload({ env, existing, onError }: { env: VaultEnvironment; existing: boolean; onError: (message: string) => void }) {
  return <Button variant="ghost" className="mt-4 h-auto w-full whitespace-normal text-sm" onClick={() => {
    try { const raw = readVault(env); downloadText(raw ?? JSON.stringify(Object.fromEntries(LEGACY_KEYS.map(key => [key, env.storage.getItem(key)]))), raw ? 'fourthstep-original-vault.json' : 'fourthstep-original-readable-data.json', 'application/json') }
    catch { onError('Browser storage cannot be read. Keep this page open.') }
  }}>Download original saved data for recovery{!existing && ' (readable, not encrypted)'}</Button>
}
