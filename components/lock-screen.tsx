'use client'

import { useState, type FormEvent } from 'react'
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isPasswordSet, isPinSet, setPasswordHash, setPinHash, verifyPassword, verifyPin } from '@/lib/inventory-store'

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [hasPin] = useState(isPinSet)
  const [hasPassword] = useState(isPasswordSet)
  const [creating, setCreating] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const protectedScreen = hasPin || hasPassword

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      if (creating) {
        if (!/^\d{6}$/.test(pin)) { setError('Choose a PIN with exactly six digits.'); return }
        if (pin !== confirmPin) { setError('The two PINs do not match.'); return }
        if (password && password.length < 8) { setError('Use at least eight characters for the optional password.'); return }
        if (password !== confirmPassword) { setError('The two passwords do not match.'); return }
        setPinHash(pin)
        if (password) setPasswordHash(password)
      } else if ((hasPin && !verifyPin(pin)) || (hasPassword && !verifyPassword(password))) {
        setError('That PIN or password does not match. Try again.'); return
      }
      onUnlock()
    } catch { setError('The screen lock could not access browser storage. Please try again.') }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center"><span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Lock className="size-8" /></span><p className="mt-5 text-sm font-semibold text-primary">IV · Fourth Step</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{creating ? 'Set a screen lock.' : 'Your inventory is covered.'}</h1><p className="mt-3 text-base leading-relaxed text-muted-foreground">{creating ? 'Choose a PIN to cover your inventory when you step away.' : protectedScreen ? 'Enter your credentials to return to your inventory.' : 'Your place and answers are kept. Return whenever you are ready.'}</p></div>
        {(protectedScreen || creating) ? <form onSubmit={submit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          {(hasPin || creating) && <div className="space-y-2"><label htmlFor="lock-pin" className="text-sm font-semibold">{creating ? 'Choose a six-digit PIN' : 'Six-digit PIN'}</label><Input id="lock-pin" type="password" inputMode="numeric" autoComplete={creating ? 'new-password' : 'current-password'} autoFocus maxLength={6} required value={pin} onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-12 rounded-xl text-lg tracking-[0.3em] md:text-lg" /></div>}
          {creating && <div className="space-y-2"><label htmlFor="lock-confirm-pin" className="text-sm font-semibold">Confirm your PIN</label><Input id="lock-confirm-pin" type="password" inputMode="numeric" autoComplete="new-password" maxLength={6} required value={confirmPin} onChange={event => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))} className="h-12 rounded-xl text-lg tracking-[0.3em] md:text-lg" /></div>}
          {(hasPassword || creating) && <div className="space-y-2"><label htmlFor="lock-password" className="text-sm font-semibold">Password{creating && <span className="ml-2 font-normal text-muted-foreground">Optional, 8+ characters</span>}</label><Input id="lock-password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} required={hasPassword} value={password} onChange={event => setPassword(event.target.value)} className="h-12 rounded-xl text-base md:text-base" /></div>}
          {creating && password.length > 0 && <div className="space-y-2"><label htmlFor="lock-confirm-password" className="text-sm font-semibold">Confirm your password</label><Input id="lock-confirm-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="h-12 rounded-xl text-base md:text-base" /></div>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full rounded-xl text-base">{creating ? 'Save screen lock' : 'Unlock inventory'}<ArrowRight className="size-4" /></Button>
          {creating && <Button type="button" variant="ghost" className="h-11 w-full rounded-xl" onClick={() => { setCreating(false); setPin(''); setConfirmPin(''); setPassword(''); setConfirmPassword(''); setError('') }}>Cancel</Button>}
        </form> : <div className="space-y-3"><Button className="h-12 w-full rounded-xl text-base" onClick={onUnlock}>Return to inventory<ArrowRight className="size-4" /></Button><Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => setCreating(true)}><ShieldCheck className="size-4" />Set up a screen lock</Button></div>}
        <p className="text-center text-xs leading-relaxed text-muted-foreground">A screen lock covers the interface. Your entries are stored as readable data in this browser.</p>
      </div>
    </main>
  )
}
