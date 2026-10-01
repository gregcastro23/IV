'use client'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { browserVaultEnvironment, createVault, hasLegacyData, LEGACY_KEYS, readVault, unlockVault, type InventoryVault, type VaultEnvironment } from '@/lib/inventory-vault'
import { isPasswordSet, isPinSet, verifyPassword, verifyPin } from '@/lib/inventory-store'
import { PrivacyContent } from './privacy-content'
import { InventoryWorkspace } from './inventory-shell'
import { downloadText } from './session-review'

export function VaultGate({ offline = false }: { offline?: boolean }) {
  const [env, setEnv] = useState<VaultEnvironment | null>(null)
  const [vault, setVault] = useState<InventoryVault | null>(null)
  const [existing, setExisting] = useState(false)
  const [legacy, setLegacy] = useState(false)
  const [oldPin, setOldPin] = useState(false)
  const [oldPassword, setOldPassword] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [passphrase, setPassphrase] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pin, setPin] = useState('')
  const [password, setPassword] = useState('')
  const [backup, setBackup] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [remaining, setRemaining] = useState(false)
  useEffect(() => {
    try {
      const environment = browserVaultEnvironment()
      setEnv(environment); setExisting(readVault(environment) !== null); setLegacy(hasLegacyData(environment)); setOldPin(isPinSet()); setOldPassword(isPasswordSet())
    } catch { setError('Encrypted storage is unavailable in this browser. Use a current browser with storage enabled. No answers have been changed.') }
    setReady(true)
  }, [])
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!env || busy) return
    setBusy(true); setError('')
    try {
      if (!existing && !backup) {
        if ((oldPin && !verifyPin(pin)) || (oldPassword && !verifyPassword(password))) throw new Error('Your earlier screen-lock credentials do not match.')
        if (passphrase !== confirmation) throw new Error('The two passphrases do not match.')
      }
      const opened = existing || backup ? await unlockVault(passphrase, env, backup) : await createVault(passphrase, env)
      setRemaining(opened.cleanup().length > 0)
      setPassphrase(''); setConfirmation(''); setPin(''); setPassword(''); setBackup(undefined); setExisting(true); setVault(opened)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The vault could not be opened. Original data is preserved.') }
    finally { setBusy(false) }
  }
  if (vault) return <InventoryWorkspace vault={vault} offline={offline} migrationRemaining={remaining} onLock={() => { vault.close(); setVault(null); setPrivacy(false); setError(''); setExisting(true) }} />
  if (!ready) return <main className="flex min-h-screen items-center justify-center" role="status">Preparing private storage…</main>
  if (privacy) return <main className="px-5 py-8"><div className="mx-auto max-w-3xl"><Button variant="outline" className="rounded-xl" onClick={() => setPrivacy(false)}><ArrowLeft className="size-4" />Back to your vault</Button></div><PrivacyContent offline={offline} /></main>
  const creating = !existing && !backup
  return <main className="mx-auto min-h-screen max-w-lg px-5 py-10 sm:py-16">
    <div className="mb-7 text-center"><span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole className="size-8" /></span><p className="mt-5 text-sm font-semibold text-primary">IV · Fourth Step{offline && ' · Offline'}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{creating ? 'A private space for honesty.' : backup ? 'Restore your encrypted backup.' : 'Your inventory is locked.'}</h1><p className="mt-3 text-base leading-relaxed text-muted-foreground">{creating ? 'Before your first HALT check-in, protect your answers with a passphrase only you know.' : 'Enter your passphrase to unlock your answers on this device.'}</p></div>
    <div className="mb-6 space-y-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm leading-relaxed"><p className="flex items-center gap-2 font-semibold text-primary"><ShieldCheck className="size-5" />Encrypted here. No answer uploads.</p><p>The site owner cannot decrypt your saved vault without your passphrase. Future website updates still require trust; a downloaded offline copy lets you choose when to update.</p><button onClick={() => setPrivacy(true)} className="font-semibold text-primary underline underline-offset-4">Read how privacy works</button></div>
    {creating && legacy && <p className="mb-5 rounded-xl border p-4 text-sm leading-relaxed">Your earlier answers are still here. Close other Fourth Step tabs. Setup encrypts and verifies a copy before removing the original readable storage. Earlier screen locks are replaced by this vault.</p>}
    <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
      <fieldset disabled={busy || !env} className="space-y-5">
        {creating && oldPin && <div className="space-y-2"><label htmlFor="migration-pin" className="text-sm font-semibold">Earlier six-digit PIN</label><Input id="migration-pin" type="password" inputMode="numeric" autoComplete="current-password" value={pin} onChange={e => setPin(e.target.value)} required className="h-12 rounded-xl" /></div>}
        {creating && oldPassword && <div className="space-y-2"><label htmlFor="migration-password" className="text-sm font-semibold">Earlier password</label><Input id="migration-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required className="h-12 rounded-xl" /></div>}
        <div className="space-y-2"><label htmlFor="vault-passphrase" className="text-sm font-semibold">{creating ? 'Choose your passphrase' : 'Your passphrase'}</label><Input id="vault-passphrase" type="password" autoComplete={creating ? 'new-password' : 'current-password'} value={passphrase} onChange={e => setPassphrase(e.target.value)} required minLength={creating ? 16 : undefined} maxLength={1024} spellCheck={false} autoCapitalize="none" className="h-12 rounded-xl text-base md:text-base" aria-describedby="passphrase-help" /><p id="passphrase-help" className="text-xs leading-relaxed text-muted-foreground">{creating ? 'At least 16 characters. Use four randomly chosen words or a password manager. Avoid names and familiar phrases.' : 'Your passphrase stays on this device. It is not sent to the owner.'}</p></div>
        {creating && <><div className="space-y-2"><label htmlFor="vault-confirmation" className="text-sm font-semibold">Confirm your passphrase</label><Input id="vault-confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required className="h-12 rounded-xl text-base md:text-base" /></div><label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" required className="mt-1 accent-primary" /><span>I understand that losing this passphrase means losing access. I will keep it securely and make encrypted backups.</span></label></>}
        <Button type="submit" className="h-12 w-full rounded-xl text-base">{busy ? 'Opening your vault…' : creating ? legacy ? 'Encrypt earlier answers & continue' : 'Create private vault' : backup ? 'Restore & unlock' : 'Unlock inventory'}<ArrowRight className="size-4" /></Button>
      </fieldset>
      {error && <p role="alert" className="text-sm leading-relaxed text-destructive">{error}</p>}
    </form>
    {!existing && !legacy && <div className="mt-6 space-y-3 text-center"><label className="inline-block cursor-pointer rounded-xl border bg-card px-4 py-3 text-sm font-semibold text-primary">{backup ? 'Choose another encrypted backup' : 'Restore an encrypted backup'}<input type="file" accept=".json,application/json" className="sr-only" disabled={busy} onChange={async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 32 * 1024 * 1024) { setError('Backup exceeds the 32 MB limit.'); return } try { setBackup(await file.text()); setError('') } catch { setError('That file could not be read.') } }} /></label>{backup && <Button variant="ghost" className="w-full" onClick={() => { setBackup(undefined); setPassphrase('') }}>Cancel restore</Button>}</div>}
    {error && env && <Button variant="ghost" className="mt-4 h-auto w-full whitespace-normal text-sm" onClick={() => { try { const raw = readVault(env); downloadText(raw ?? JSON.stringify(Object.fromEntries(LEGACY_KEYS.map(key => [key, env.storage.getItem(key)]))), raw ? 'fourthstep-original-vault.json' : 'fourthstep-original-readable-data.json', 'application/json') } catch { setError('Browser storage cannot be read. Keep this page open.') } }}>Download original saved data for recovery{!existing && ' (readable, not encrypted)'}</Button>}
    <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">No account or server recovery. Independent security audit pending.</p>
  </main>
}
