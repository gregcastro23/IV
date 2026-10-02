'use client'

import { useEffect, useState } from 'react'
import { Check, Download, Fingerprint, KeyRound, Lock, ShieldCheck, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { InventoryVault, UnlockMethod, VaultSettings } from '@/lib/inventory-vault'
import { deviceUnlockName, deviceUnlockSupport, evaluateDevicePasskey, type DeviceSupport } from '@/lib/device-unlock'
import { PinInput, QuickUnlockChoices, RecoveryKeyPanel } from './unlock-methods'
import { cn } from '@/lib/utils'

const message = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback

export function SecuritySettings({ vault, settings, offline, onSettings, onBackup, onPrivacy }: {
  vault: InventoryVault; settings: VaultSettings; offline: boolean
  onSettings: (settings: VaultSettings) => Promise<boolean>; onBackup: () => void; onPrivacy: () => void
}) {
  const [device, setDevice] = useState<DeviceSupport>({ available: false })
  const [, setVersion] = useState(0)
  const [replacing, setReplacing] = useState<'verify' | 'choose' | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [problem, setProblem] = useState('')
  useEffect(() => { void deviceUnlockSupport().then(setDevice) }, [])
  const info = vault.describe()
  return <div className="mx-auto max-w-3xl space-y-8 pb-8">
    <div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="size-4" />Encrypted on this device</p><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy &amp; security</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">Choose how you unlock, keep your recovery key current, and decide when Fourth Step locks itself.</p></div>

    <section className="space-y-3" aria-labelledby="unlock-heading">
      <h2 id="unlock-heading" className="text-xl font-semibold">How you unlock</h2>
      <QuickUnlockChoices vault={vault} device={device} onChange={() => setVersion(value => value + 1)} />
    </section>

    <section className="space-y-3 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="recovery-heading">
      <h2 id="recovery-heading" className="flex items-center gap-2 text-xl font-semibold"><KeyRound className="size-5 text-primary" />Recovery key</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">You are using {info.recovery === 'generated' ? 'a generated recovery key' : 'a passphrase you chose'}. It opens your vault on any device and unlocks encrypted backups. If you have lost it, replace it while you can still unlock here.</p>
      {replacing === null && <Button variant="outline" className="h-11 rounded-xl" onClick={() => { setReplacing('verify'); setNotice(''); setProblem('') }}>Replace recovery key</Button>}
      {replacing === 'verify' && <Reverify vault={vault} device={device} onCancel={() => setReplacing(null)} onVerified={() => setReplacing('choose')} />}
      {replacing === 'choose' && <div className="rounded-2xl border bg-background p-4 sm:p-5"><RecoveryKeyPanel busy={busy} submitLabel={busy ? 'Saving…' : 'Use this recovery key'} onSubmit={async (secret, kind) => {
        setBusy(true); setProblem('')
        try { await vault.replaceRecovery(secret, kind); setReplacing(null); setNotice('Your new recovery key is active and the old one no longer opens this vault. Backups made before today still open with the key that was active when they were made, so download a fresh backup.') }
        catch (cause) { setProblem(message(cause, 'The recovery key could not be replaced.')) } finally { setBusy(false) }
      }} /><Button variant="ghost" className="mt-2 w-full" onClick={() => setReplacing(null)}>Cancel</Button></div>}
      {notice && <p role="status" className="flex gap-2 rounded-xl bg-primary/10 p-3 text-sm text-primary"><Check className="mt-0.5 size-4 shrink-0" />{notice}</p>}
      {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
    </section>

    <section className="space-y-4 rounded-2xl border bg-card p-5 sm:p-6" aria-labelledby="lock-heading">
      <h2 id="lock-heading" className="flex items-center gap-2 text-xl font-semibold"><Timer className="size-5 text-primary" />Automatic locking</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">When you switch apps, Fourth Step hides your screen right away. If you are gone longer than this, it locks:</p>
      <div role="radiogroup" aria-label="Lock after time away" className="flex flex-wrap gap-2">{([1, 5, 15] as const).map(minutes => <button key={minutes} type="button" role="radio" aria-checked={settings.backgroundLockMinutes === minutes} onClick={() => void onSettings({ ...settings, backgroundLockMinutes: minutes })}
        className={cn('min-h-11 rounded-xl border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary', settings.backgroundLockMinutes === minutes ? 'border-primary bg-primary text-primary-foreground' : 'bg-background')}>{minutes} minute{minutes === 1 ? '' : 's'}</button>)}</div>
      <p className="text-xs leading-relaxed text-muted-foreground">It also locks after 15 minutes without activity. Quick unlock makes a short setting painless.</p>
    </section>

    <section className="flex items-start justify-between gap-4 rounded-2xl border bg-card p-5 sm:p-6">
      <div><h2 className="font-semibold"><label htmlFor="check-in-on-open">Start with a check-in</label></h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">When you open Fourth Step, begin with a quick spot-check (skipped if you checked in within the last 30 minutes).</p></div>
      <Switch id="check-in-on-open" checked={settings.checkInOnOpen} onCheckedChange={checked => void onSettings({ ...settings, checkInOnOpen: checked })} />
    </section>

    <section className="space-y-3 rounded-2xl border bg-secondary/40 p-5 sm:p-6" aria-labelledby="backup-heading">
      <h2 id="backup-heading" className="flex items-center gap-2 text-xl font-semibold"><Lock className="size-5 text-primary" />Backups</h2>
      <p className="text-sm leading-relaxed text-muted-foreground">An encrypted backup holds everything, including check-ins and contacts. It opens with your recovery key{info.passkeys.length ? ` or ${deviceUnlockName()} on this website` : ''}. A PIN never travels with a backup.</p>
      <div className="flex flex-wrap gap-2"><Button variant="outline" className="h-11 rounded-xl" onClick={onBackup}><Download className="size-4" />Download encrypted backup</Button>
        {!offline && <Button variant="ghost" className="h-11 rounded-xl" asChild><a href="/downloads/fourthstep-offline.html" download>Download offline edition</a></Button>}</div>
    </section>
    <p className="text-center text-sm"><button type="button" onClick={onPrivacy} className="font-semibold text-primary underline underline-offset-4">How your privacy is protected, and its limits</button></p>
  </div>
}

/** Confirms it is really you before changing the recovery key. */
function Reverify({ vault, device, onVerified, onCancel }: { vault: InventoryVault; device: DeviceSupport; onVerified: () => void; onCancel: () => void }) {
  const info = vault.describe()
  const here = typeof location === 'undefined' ? '' : location.hostname
  const passkeys = device.available ? info.passkeys.filter(passkey => passkey.rpId === here) : []
  const [pin, setPin] = useState('')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  const check = async (method: () => Promise<UnlockMethod>) => {
    setBusy(true); setProblem('')
    try { await vault.verify(await method()); onVerified() } catch (cause) { setProblem(message(cause, 'That did not match.')) } finally { setBusy(false) }
  }
  return <div className="space-y-4 rounded-2xl border bg-background p-4 sm:p-5">
    <p className="text-sm font-semibold">First, confirm it is you.</p>
    {passkeys.length > 0 && <Button disabled={busy} className="h-12 w-full rounded-xl" onClick={() => check(async () => ({ kind: 'passkey', ...await evaluateDevicePasskey(passkeys) }))}><Fingerprint className="size-5" />Confirm with {deviceUnlockName()}</Button>}
    {info.pin && <form className="space-y-2" onSubmit={event => { event.preventDefault(); void check(async () => ({ kind: 'pin', pin })) }}><label htmlFor="verify-pin" className="text-sm font-medium">Or enter your PIN</label><div className="flex gap-2"><PinInput id="verify-pin" label="PIN" value={pin} length={info.pin.length} onChange={setPin} /><Button type="submit" variant="outline" disabled={busy || pin.length < 6} className="h-14 rounded-xl">Confirm</Button></div></form>}
    <form className="space-y-2" onSubmit={event => { event.preventDefault(); void check(async () => ({ kind: 'recovery', secret })) }}><label htmlFor="verify-secret" className="text-sm font-medium">{passkeys.length || info.pin ? 'Or enter' : 'Enter'} your current {info.recovery === 'generated' ? 'recovery key' : 'passphrase'}</label><div className="flex gap-2"><Input id="verify-secret" type="password" autoComplete="current-password" value={secret} onChange={event => setSecret(event.target.value)} className="h-12 rounded-xl" /><Button type="submit" variant="outline" disabled={busy || !secret} className="h-12 rounded-xl">Confirm</Button></div></form>
    {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
    <Button variant="ghost" className="w-full" onClick={onCancel}>Cancel</Button>
  </div>
}
