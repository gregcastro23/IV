"use client"

import { useState, useEffect, useCallback } from 'react'
import { Lock, Shield, AlertTriangle, Delete } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { verifyPin, setPinHash, isPinSet, setPasswordHash, verifyPassword, isPasswordSet } from '@/lib/inventory-store'

interface LockScreenProps {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false)
  const [step, setStep] = useState<'pin' | 'password'>('pin')

  useEffect(() => {
    setHasExistingCredentials(isPinSet() || isPasswordSet())
  }, [])

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      const newPin = pin + digit
      setPin(newPin)
      setError('')
    }
  }

  const handlePinDelete = () => {
    setPin(pin.slice(0, -1))
    setError('')
  }

  const handleSubmit = useCallback(() => {
    if (hasExistingCredentials && !isSettingUp) {
      // Verify existing credentials
      const pinValid = verifyPin(pin)
      const passwordValid = verifyPassword(password)
      
      if (pinValid && passwordValid) {
        onUnlock()
      } else {
        setError('Incorrect credentials')
        setPin('')
        setPassword('')
      }
    } else if (isSettingUp) {
      if (step === 'pin') {
        if (pin.length !== 6) {
          setError('PIN must be exactly 6 digits')
          return
        }
        if (pin !== confirmPin) {
          setError('PINs do not match')
          return
        }
        setStep('password')
        setError('')
      } else {
        if (password.length < 8) {
          setError('Password must be at least 8 characters')
          return
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }
        setPinHash(pin)
        setPasswordHash(password)
        onUnlock()
      }
    } else {
      onUnlock()
    }
  }, [pin, confirmPin, password, confirmPassword, hasExistingCredentials, isSettingUp, step, onUnlock])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }, [handleSubmit])

  const pinPadDigits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center border border-border">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-semibold text-foreground tracking-[0.2em] uppercase">
              Fourth Step Ledger
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Cryptographic Access Required
            </p>
          </div>
        </div>

        {/* Security Warning */}
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-foreground font-mono font-medium">
                Zero-Knowledge Local Storage
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All strings are encrypted at rest using AES-GCM-256 on your local device. 
                Data is unrecoverable if the passcode is forgotten. No cloud backup exists.
              </p>
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div className="space-y-4">
          {hasExistingCredentials && !isSettingUp ? (
            // Unlock existing
            <div className="space-y-4">
              {/* PIN Display */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  Enter 6-Digit PIN
                </label>
                <div className="flex justify-center gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="w-10 h-12 rounded border border-border bg-input flex items-center justify-center"
                    >
                      {pin[i] ? (
                        <div className="w-3 h-3 rounded-full bg-primary" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {/* PIN Pad */}
              <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                {pinPadDigits.map((digit, i) => (
                  <div key={i}>
                    {digit === '' ? (
                      <div className="h-12" />
                    ) : digit === 'del' ? (
                      <Button
                        variant="outline"
                        className="w-full h-12 font-mono"
                        onClick={handlePinDelete}
                      >
                        <Delete className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full h-12 font-mono text-lg"
                        onClick={() => handlePinDigit(digit)}
                      >
                        {digit}
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Password Field */}
              {isPasswordSet() && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                    Local Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Enter password"
                    className="font-mono bg-input border-border"
                  />
                </div>
              )}
            </div>
          ) : isSettingUp ? (
            // Setup new credentials
            <div className="space-y-4">
              {step === 'pin' ? (
                <>
                  {/* PIN Display */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      Create 6-Digit PIN
                    </label>
                    <div className="flex justify-center gap-2">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="w-10 h-12 rounded border border-border bg-input flex items-center justify-center"
                        >
                          {pin[i] ? (
                            <div className="w-3 h-3 rounded-full bg-primary" />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PIN Pad */}
                  <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
                    {pinPadDigits.map((digit, i) => (
                      <div key={i}>
                        {digit === '' ? (
                          <div className="h-12" />
                        ) : digit === 'del' ? (
                          <Button
                            variant="outline"
                            className="w-full h-12 font-mono"
                            onClick={handlePinDelete}
                          >
                            <Delete className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full h-12 font-mono text-lg"
                            onClick={() => handlePinDigit(digit)}
                          >
                            {digit}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Confirm PIN */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      Confirm PIN
                    </label>
                    <Input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Re-enter PIN"
                      className="text-center font-mono bg-input border-border"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      Create Local Password (min 8 chars)
                    </label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="font-mono bg-input border-border"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                      Confirm Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Re-enter password"
                      className="font-mono bg-input border-border"
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            // First time - choice to set up or skip
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Secure your ledger with cryptographic access
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm justify-center">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-mono text-xs">{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {hasExistingCredentials && !isSettingUp ? (
              <Button 
                onClick={handleSubmit} 
                className="w-full h-11 font-mono text-xs tracking-wider"
                disabled={pin.length < 6}
              >
                Unlock Ledger
              </Button>
            ) : isSettingUp ? (
              <>
                <Button 
                  onClick={handleSubmit} 
                  className="w-full h-11 font-mono text-xs tracking-wider"
                  disabled={step === 'pin' ? pin.length !== 6 : password.length < 8}
                >
                  {step === 'pin' ? 'Continue to Password' : 'Complete Setup'}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setIsSettingUp(false)
                    setStep('pin')
                    setPin('')
                    setConfirmPin('')
                    setPassword('')
                    setConfirmPassword('')
                    setError('')
                  }}
                  className="w-full h-10 text-muted-foreground text-xs"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => setIsSettingUp(true)} 
                  className="w-full h-11 font-mono text-xs tracking-wider"
                >
                  Configure Cryptographic Access
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onUnlock}
                  className="w-full h-10 text-muted-foreground text-xs"
                >
                  Continue Without Protection
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground/50 font-mono tracking-wider">
            Isolated / Enclave Storage Sealed
          </p>
        </div>
      </div>
    </div>
  )
}
