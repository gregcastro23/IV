'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { Check, Copy, Download, Fingerprint, KeyRound, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generateRecoveryKey, MIN_PASSPHRASE_LENGTH, normalizeRecoveryKey, validatePassphrase, type InventoryVault, type RecoveryKind } from '@/lib/inventory-vault'
import { createDevicePasskey, deviceUnlockName, forgetDevicePasskey, type DeviceSupport } from '@/lib/device-unlock'
import { downloadText } from './session-review'
import { cn } from '@/lib/utils'

const message = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback

/** Shows a generated recovery key (or accepts a chosen passphrase) and confirms it was saved. */
export function RecoveryKeyPanel({ submitLabel, busy, onSubmit, children, intro }: {
  submitLabel: string; busy: boolean; onSubmit: (secret: string, kind: RecoveryKind) => void; children?: ReactNode; intro?: ReactNode
}) {
  const [key] = useState(() => generateRecoveryKey(crypto))
  const [mode, setMode] = useState<RecoveryKind>('generated')
  const [check, setCheck] = useState('')
  const [copied, setCopied] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [problem, setProblem] = useState('')
  const lastGroup = key.slice(-4)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'generated') {
      if (normalizeRecoveryKey(check) !== normalizeRecoveryKey(lastGroup)) { setProblem('Those characters do not match the end of your recovery key. Check where you saved it.'); return }
      setProblem(''); onSubmit(key, 'generated'); return
    }
    const issue = validatePassphrase(passphrase) ?? (passphrase !== confirmation ? 'The two passphrases do not match.' : null)
    if (issue) { setProblem(issue); return }
    setProblem(''); onSubmit(passphrase, 'passphrase')
  }
  return <form onSubmit={submit} className="space-y-5">
    {intro}
    {mode === 'generated' ? <>
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Your recovery key</p>
        <p className="mt-3 select-all font-mono text-[1.35rem] font-semibold leading-relaxed tracking-wider sm:text-[1.7rem]" aria-label={`Recovery key: ${key.split('').join(' ')}`}>{key.split('-').map((group, index, groups) => <span key={index} className="inline-block whitespace-nowrap">{group}{index < groups.length - 1 && '-'}</span>)}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={async () => { try { await navigator.clipboard.writeText(key); setCopied(true) } catch { setProblem('Copying is blocked here. Write the key down or download it instead.') } }}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? 'Copied' : 'Copy'}</Button>
          <Button type="button" variant="outline" className="h-11 rounded-xl" onClick={() => downloadText(`Fourth Step recovery key\n\n${key}\n\nThis key opens your encrypted inventory on any device, and with any encrypted backup.\nKeep it somewhere private: a password manager, or on paper in a safe place.\nAnyone with this key and your vault or backup could read your inventory.\n`, 'fourthstep-recovery-key.txt')}><Download className="size-4" />Download</Button>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
        <li>Save it in a password manager, or write it on paper and keep it somewhere private.</li>
        <li>You only need it on a new device, after clearing your browser, or if quick unlock stops working.</li>
        {copied && <li>If your device keeps clipboard history, clear it once the key is saved.</li>}
      </ul>
      <div className="space-y-2"><label htmlFor="recovery-check" className="block text-sm font-semibold">To confirm you saved it, type the last four characters</label>
        <Input id="recovery-check" value={check} onChange={event => setCheck(event.target.value)} maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} className="h-12 max-w-40 rounded-xl font-mono text-lg uppercase tracking-widest md:text-lg" required /></div>
    </> : <>
      <div className="space-y-2"><label htmlFor="own-passphrase" className="text-sm font-semibold">Your passphrase</label>
        <Input id="own-passphrase" type="password" autoComplete="new-password" value={passphrase} onChange={event => setPassphrase(event.target.value)} required minLength={MIN_PASSPHRASE_LENGTH} maxLength={1024} spellCheck={false} autoCapitalize="none" className="h-12 rounded-xl text-base md:text-base" aria-describedby="own-passphrase-help" />
        <p id="own-passphrase-help" className="text-xs leading-relaxed text-muted-foreground">At least {MIN_PASSPHRASE_LENGTH} characters. A short sentence only you would think of works well. You will rarely need to type it.</p></div>
      <div className="space-y-2"><label htmlFor="own-confirmation" className="text-sm font-semibold">Type it again</label>
        <Input id="own-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required className="h-12 rounded-xl text-base md:text-base" /></div>
    </>}
    {children}
    {problem && <p role="alert" className="text-sm leading-relaxed text-destructive">{problem}</p>}
    <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-base">{submitLabel}</Button>
    <button type="button" className="block w-full text-center text-sm font-medium text-primary underline underline-offset-4" onClick={() => { setMode(mode === 'generated' ? 'passphrase' : 'generated'); setProblem('') }}>
      {mode === 'generated' ? 'I would rather choose my own passphrase' : 'Use a generated recovery key instead'}
    </button>
  </form>
}

export function PinInput({ id, value, onChange, length, autoFocus, label }: { id: string; value: string; onChange: (value: string) => void; length?: number; autoFocus?: boolean; label: string }) {
  return <Input id={id} aria-label={label} type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={length ?? 12} autoFocus={autoFocus}
    value={value} onChange={event => onChange(event.target.value.replace(/\D/g, ''))} className="h-14 rounded-xl text-center font-mono text-2xl tracking-[0.5em] md:text-2xl" />
}

export function PinForm({ submitLabel, onSubmit }: { submitLabel: string; onSubmit: (pin: string) => Promise<void> }) {
  const [pin, setPin] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')
  return <form className="space-y-3" onSubmit={async event => {
    event.preventDefault()
    if (pin !== confirmation) { setProblem('The two PINs do not match.'); return }
    setBusy(true); setProblem('')
    try { await onSubmit(pin); setPin(''); setConfirmation('') } catch (cause) { setProblem(message(cause, 'The PIN could not be saved.')) } finally { setBusy(false) }
  }}>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><label htmlFor="new-pin" className="text-sm font-semibold">New PIN <span className="font-normal text-muted-foreground">6–12 digits</span></label><PinInput id="new-pin" label="New PIN" value={pin} onChange={setPin} /></div>
      <div className="space-y-1.5"><label htmlFor="new-pin-confirm" className="text-sm font-semibold">Repeat PIN</label><PinInput id="new-pin-confirm" label="Repeat PIN" value={confirmation} onChange={setConfirmation} /></div>
    </div>
    {problem && <p role="alert" className="text-sm text-destructive">{problem}</p>}
    <Button type="submit" disabled={busy || pin.length < 6} className="h-11 rounded-xl">{busy ? 'Saving PIN…' : submitLabel}</Button>
  </form>
}

/** Device unlock and PIN, with their honest trade-offs. Used during setup and in settings. */
export function QuickUnlockChoices({ vault, device, onChange }: { vault: InventoryVault; device: DeviceSupport; onChange?: () => void }) {
  const [, setVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const [pinOpen, setPinOpen] = useState(false)
  const [problem, setProblem] = useState('')
  const [notice, setNotice] = useState('')
  const info = vault.describe()
  const here = typeof location === 'undefined' ? '' : location.hostname
  const passkeys = info.passkeys.filter(passkey => passkey.rpId === here)
  const changed = (text: string) => { setVersion(value => value + 1); setNotice(text); setProblem(''); onChange?.() }
  const addDevice = async () => {
    setBusy(true); setProblem(''); setNotice('')
    let created: Awaited<ReturnType<typeof createDevicePasskey>> | null = null
    try {
      created = await createDevicePasskey(info.passkeys.map(passkey => passkey.credentialId))
      await vault.addPasskey(created, created.prf)
      changed(`${deviceUnlockName()} is ready. Next time, unlock with one tap.`)
    } catch (cause) {
      if (created) forgetDevicePasskey(created.rpId, created.credentialId)
      setProblem(message(cause, 'Device unlock could not be set up.'))
    } finally { setBusy(false) }
  }
  return <div className="space-y-3">
    <section className={cn('rounded-2xl border bg-card p-5', passkeys.length && 'border-primary/30')}>
      <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Fingerprint className="size-6" /></span>
        <div className="min-w-0 flex-1"><h3 className="font-semibold">Unlock with {deviceUnlockName()}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Fastest and strongest. Your device confirms it is you, and the key stays in its secure hardware. If your fingerprint or face is not recognized, your device screen-lock code works too.</p></div></div>
      {passkeys.length > 0 && <ul className="mt-4 space-y-2">{passkeys.map(passkey => <li key={passkey.credentialId} className="flex items-center justify-between gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-sm"><span className="flex min-w-0 items-center gap-2"><Check className="size-4 shrink-0 text-primary" /><span className="min-w-0"><span className="block truncate font-medium">{passkey.label.split(' · ')[0] || 'This device'}</span>{passkey.label.includes(' · ') && <span className="block truncate text-xs text-muted-foreground">{passkey.label.split(' · ').slice(1).join(' · ')}</span>}</span></span>
        <Button type="button" variant="ghost" size="sm" disabled={busy} className="h-9 text-muted-foreground" aria-label={`Remove ${passkey.label}`} onClick={async () => {
          setBusy(true)
          try { await vault.removePasskey(passkey.credentialId); forgetDevicePasskey(passkey.rpId, passkey.credentialId); changed('Device unlock removed for that device.') }
          catch (cause) { setProblem(message(cause, 'That device could not be removed.')) } finally { setBusy(false) }
        }}><Trash2 className="size-4" />Remove</Button></li>)}</ul>}
      {device.available ? <Button type="button" variant={passkeys.length ? 'outline' : 'default'} disabled={busy} className="mt-4 h-11 rounded-xl" onClick={addDevice}><Fingerprint className="size-4" />{busy ? 'Waiting for your device…' : passkeys.length ? 'Add another device' : 'Set up device unlock'}</Button>
        : <p className="mt-3 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">{device.reason ?? 'Not available in this browser.'}</p>}
    </section>
    <section className={cn('rounded-2xl border bg-card p-5', info.pin && 'border-primary/30')}>
      <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><KeyRound className="size-6" /></span>
        <div className="min-w-0 flex-1"><h3 className="font-semibold">Unlock with a PIN {info.pin && <span className="ml-1 text-xs font-medium text-primary">On</span>}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Quick to type when your hands are shaking. A PIN stops someone who picks up your device, and turns off after 5 wrong tries. It is weaker than device unlock against someone who copies this browser’s files, and it stays on this device only.</p></div></div>
      {pinOpen ? <div className="mt-4"><PinForm submitLabel={info.pin ? 'Change PIN' : 'Turn on PIN unlock'} onSubmit={async pin => { await vault.setPin(pin); setPinOpen(false); changed('PIN unlock is on for this browser.') }} /></div>
        : <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant={info.pin || passkeys.length ? 'outline' : 'default'} className="h-11 rounded-xl" onClick={() => setPinOpen(true)}>{info.pin ? 'Change PIN' : 'Set a PIN'}</Button>
          {info.pin && <Button type="button" variant="ghost" className="h-11 rounded-xl text-muted-foreground" onClick={() => { vault.removePin(); changed('PIN unlock is off.') }}>Turn off PIN</Button>}</div>}
    </section>
    {notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-primary/10 p-3 text-sm font-medium text-primary"><Check className="size-4" />{notice}</p>}
    {problem && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{problem}</p>}
  </div>
}
