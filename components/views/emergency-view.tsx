"use client"

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Phone, 
  Timer, 
  Pause, 
  Play, 
  RotateCcw,
  Plus,
  Trash2,
  Pencil,
  Zap,
  X
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getContacts, saveContact, deleteContact, generateId, type Contact } from '@/lib/inventory-store'

interface EmergencyViewProps {
  privacyMode: boolean
}

export function EmergencyView({ privacyMode }: EmergencyViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(300)
  const [isPaused, setIsPaused] = useState(false)
  const [showCircuitBreaker, setShowCircuitBreaker] = useState(false)
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale')
  const [breathCount, setBreathCount] = useState(0)
  
  // Contact dialog
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactRole, setContactRole] = useState('')

  useEffect(() => {
    setContacts(getContacts())
  }, [])

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isTimerActive && !isPaused && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1)
      }, 1000)
    } else if (timerSeconds === 0) {
      setIsTimerActive(false)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isTimerActive, isPaused, timerSeconds])

  // Box breathing animation
  useEffect(() => {
    if (!showCircuitBreaker) return
    
    const phases: Array<'inhale' | 'hold1' | 'exhale' | 'hold2'> = ['inhale', 'hold1', 'exhale', 'hold2']
    let currentPhaseIndex = 0
    
    const interval = setInterval(() => {
      currentPhaseIndex = (currentPhaseIndex + 1) % phases.length
      setBreathPhase(phases[currentPhaseIndex])
      if (currentPhaseIndex === 0) {
        setBreathCount(prev => prev + 1)
      }
    }, 4000)

    return () => clearInterval(interval)
  }, [showCircuitBreaker])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const startTimer = () => {
    setTimerSeconds(300)
    setIsTimerActive(true)
    setIsPaused(false)
  }

  const togglePause = () => {
    setIsPaused(!isPaused)
  }

  const resetTimer = () => {
    setTimerSeconds(300)
    setIsTimerActive(false)
    setIsPaused(false)
  }

  const resetContactForm = () => {
    setContactName('')
    setContactPhone('')
    setContactRole('')
    setEditingContact(null)
  }

  const handleSaveContact = () => {
    const contact: Contact = {
      id: editingContact?.id || generateId(),
      name: contactName,
      phone: contactPhone,
      role: contactRole,
    }
    saveContact(contact)
    setContacts(getContacts())
    setIsContactDialogOpen(false)
    resetContactForm()
  }

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact)
    setContactName(contact.name)
    setContactPhone(contact.phone)
    setContactRole(contact.role)
    setIsContactDialogOpen(true)
  }

  const handleDeleteContact = (id: string) => {
    deleteContact(id)
    setContacts(getContacts())
  }

  const handleNewContact = () => {
    resetContactForm()
    setIsContactDialogOpen(true)
  }

  const activateCircuitBreaker = () => {
    setShowCircuitBreaker(true)
    setBreathPhase('inhale')
    setBreathCount(0)
    startTimer()
  }

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case 'inhale': return 'INHALE'
      case 'hold1': return 'HOLD'
      case 'exhale': return 'EXHALE'
      case 'hold2': return 'HOLD'
    }
  }

  const getBreathRingScale = () => {
    switch (breathPhase) {
      case 'inhale': return 'scale-100'
      case 'hold1': return 'scale-100'
      case 'exhale': return 'scale-75'
      case 'hold2': return 'scale-75'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Emergency Grounding Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tactical protocols for moments of acute volatility
          </p>
        </div>
      </div>

      {/* Full Viewport Circuit Breaker */}
      {showCircuitBreaker && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col items-center justify-center p-8">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-6 right-6 h-12 w-12"
              onClick={() => setShowCircuitBreaker(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Zap className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-mono font-semibold tracking-wider">
                  CIRCUIT BREAKER ACTIVE
                </h1>
              </div>
              <p className="text-muted-foreground font-mono text-sm">
                All inventory data hidden. Focus on grounding.
              </p>
            </div>

            {/* Breathing Ring */}
            <div className="relative flex items-center justify-center mb-8">
              <div 
                className={cn(
                  "w-64 h-64 rounded-full border-4 border-primary/30 transition-transform duration-[4000ms] ease-in-out flex items-center justify-center",
                  getBreathRingScale()
                )}
              >
                <div className="text-center">
                  <p className="text-4xl font-mono font-bold text-primary tracking-widest">
                    {getBreathInstruction()}
                  </p>
                  <p className="text-lg font-mono text-muted-foreground mt-2">
                    4 seconds
                  </p>
                </div>
              </div>
              {/* Outer glow ring */}
              <div 
                className={cn(
                  "absolute w-72 h-72 rounded-full border border-primary/10 transition-transform duration-[4000ms] ease-in-out",
                  getBreathRingScale()
                )}
              />
            </div>

            {/* Timer */}
            <div className="text-center mb-8">
              <p className="text-6xl font-mono font-bold text-foreground tracking-wider">
                {formatTime(timerSeconds)}
              </p>
              <p className="text-sm font-mono text-muted-foreground mt-2">
                Breath cycles completed: {breathCount}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <Button 
                size="lg" 
                variant="outline" 
                onClick={togglePause}
                className="font-mono"
              >
                {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={resetTimer}
                className="font-mono"
              >
                <RotateCcw className="h-5 w-5" />
              </Button>
            </div>

            {/* Exit hint */}
            <p className="absolute bottom-8 text-xs font-mono text-muted-foreground/50">
              Press ESC or click X to exit circuit breaker
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Circuit Breaker Activation Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Anxiety Circuit Breaker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Immediately clears all inventory data from view and initiates a 5-minute 
              box-breathing protocol with visual ring indicator.
            </p>
            <Button 
              onClick={activateCircuitBreaker}
              className="w-full gap-2 font-mono text-xs h-12"
              size="lg"
            >
              <Zap className="h-4 w-4" />
              ACTIVATE CIRCUIT BREAKER
            </Button>
          </CardContent>
        </Card>

        {/* Standalone Timer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Grounding Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-5xl font-mono font-bold text-center py-4">
              {formatTime(timerSeconds)}
            </div>
            <div className="flex items-center justify-center gap-2">
              {!isTimerActive ? (
                <Button onClick={startTimer} className="gap-2 font-mono text-xs">
                  <Play className="h-4 w-4" />
                  Start 5 Minutes
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={togglePause} className="font-mono">
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" onClick={resetTimer} className="font-mono">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Local Emergency Contact Hub */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-mono uppercase tracking-wider flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Local Emergency Contact Hub
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleNewContact} className="gap-1 font-mono text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Node
          </Button>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 font-mono">
              No contact nodes configured. Add local mentors or helpline desks.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contacts.map((contact) => (
                <div 
                  key={contact.id}
                  className="p-4 rounded-md bg-secondary/30 border border-border space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className={cn(privacyMode && "privacy-blur blur-transition")}>
                      <p className="font-mono text-sm font-medium">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">{contact.role}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditContact(contact)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <a 
                    href={`tel:${contact.phone}`}
                    className={cn(
                      "block text-sm font-mono text-primary hover:underline",
                      privacyMode && "privacy-blur blur-transition"
                    )}
                  >
                    {contact.phone}
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Dialog */}
      <Dialog open={isContactDialogOpen} onOpenChange={(open) => {
        setIsContactDialogOpen(open)
        if (!open) resetContactForm()
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingContact ? 'Edit Contact Node' : 'Add Contact Node'}
            </DialogTitle>
            <DialogDescription>
              Configure a local support contact for crisis moments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Name</label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact name"
                className="font-mono bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Phone</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone number"
                className="font-mono bg-input border-border"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">Role</label>
              <Input
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder="e.g., Sponsor, Therapist, Helpline"
                className="font-mono bg-input border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)} className="font-mono text-xs">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveContact} 
              disabled={!contactName.trim() || !contactPhone.trim()}
              className="font-mono text-xs"
            >
              {editingContact ? 'Update Node' : 'Save Node'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
