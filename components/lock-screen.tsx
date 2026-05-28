"use client"

import { useState, useEffect, useCallback } from 'react'
import { Lock, Shield, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { verifyPin, setPinHash, isPinSet } from '@/lib/inventory-store'

interface LockScreenProps {
  onUnlock: () => void
}

export function LockScreen({ onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [isSettingPin, setIsSettingPin] = useState(false)
  const [hasExistingPin, setHasExistingPin] = useState(false)

  useEffect(() => {
    setHasExistingPin(isPinSet())
  }, [])

  const handlePinChange = (value: string, setter: (v: string) => void) => {
    // Only allow digits, max 6 characters
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    setter(cleaned)
    setError('')
  }

  const handleSubmit = useCallback(() => {
    if (hasExistingPin && !isSettingPin) {
      // Verify existing PIN
      if (verifyPin(pin)) {
        onUnlock()
      } else {
        setError('Incorrect passcode')
        setPin('')
      }
    } else if (isSettingPin) {
      // Setting new PIN
      if (pin.length < 4) {
        setError('Passcode must be at least 4 digits')
        return
      }
      if (pin !== confirmPin) {
        setError('Passcodes do not match')
        return
      }
      setPinHash(pin)
      onUnlock()
    } else {
      // First time - skip or set PIN
      onUnlock()
    }
  }, [pin, confirmPin, hasExistingPin, isSettingPin, onUnlock])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }, [handleSubmit])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="font-mono text-xl tracking-tight text-foreground">
              The Inventory
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fourth Step Ledger
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs text-foreground font-medium">
                Local-Only Security
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Data is fully encrypted and stored exclusively on this device. 
                No servers, no tracking, no cloud. If you lose your passcode, 
                your data cannot be recovered.
              </p>
            </div>
          </div>
        </div>

        {/* PIN Entry */}
        <div className="space-y-4">
          {hasExistingPin && !isSettingPin ? (
            // Unlock existing
            <div className="space-y-3">
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Enter Passcode
              </label>
              <Input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) => handlePinChange(e.target.value, setPin)}
                onKeyDown={handleKeyPress}
                placeholder="••••••"
                className="text-center text-2xl tracking-[0.5em] font-mono bg-input border-border h-14"
                autoFocus
              />
            </div>
          ) : isSettingPin ? (
            // Set new PIN
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  Create Passcode (4-6 digits)
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value, setPin)}
                  placeholder="••••••"
                  className="text-center text-2xl tracking-[0.5em] font-mono bg-input border-border h-14"
                  autoFocus
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                  Confirm Passcode
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => handlePinChange(e.target.value, setConfirmPin)}
                  onKeyDown={handleKeyPress}
                  placeholder="••••••"
                  className="text-center text-2xl tracking-[0.5em] font-mono bg-input border-border h-14"
                />
              </div>
            </div>
          ) : (
            // First time - choice to set PIN or skip
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                Secure your inventory with a passcode
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {hasExistingPin && !isSettingPin ? (
              <Button 
                onClick={handleSubmit} 
                className="w-full h-12 font-mono"
                disabled={pin.length < 4}
              >
                Unlock
              </Button>
            ) : isSettingPin ? (
              <>
                <Button 
                  onClick={handleSubmit} 
                  className="w-full h-12 font-mono"
                  disabled={pin.length < 4 || confirmPin.length < 4}
                >
                  Set Passcode
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setIsSettingPin(false)
                    setPin('')
                    setConfirmPin('')
                    setError('')
                  }}
                  className="w-full h-10 text-muted-foreground"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={() => setIsSettingPin(true)} 
                  className="w-full h-12 font-mono"
                >
                  Create Passcode
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onUnlock}
                  className="w-full h-10 text-muted-foreground"
                >
                  Continue Without Passcode
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground/50 font-mono">
            Disconnected / Local-Only Mode
          </p>
        </div>
      </div>
    </div>
  )
}
