"use client"

import { useState, useEffect, useCallback } from 'react'
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
  BookOpen,
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

const GROUNDING_GUIDES = [
  {
    title: '5-4-3-2-1 Grounding',
    content: 'Name 5 things you can SEE, 4 things you can TOUCH, 3 things you can HEAR, 2 things you can SMELL, 1 thing you can TASTE.',
  },
  {
    title: 'Box Breathing',
    content: 'Inhale for 4 counts. Hold for 4 counts. Exhale for 4 counts. Hold for 4 counts. Repeat 4 times.',
  },
  {
    title: 'HALT Check',
    content: 'Am I Hungry? Am I Angry? Am I Lonely? Am I Tired? Address the basic need first.',
  },
  {
    title: 'This Too Shall Pass',
    content: 'Feelings are not facts. This moment is temporary. You have survived 100% of your worst days.',
  },
  {
    title: 'Play the Tape Forward',
    content: 'If I act on this impulse, what happens next? Tomorrow? Next week? Is that what I want?',
  },
  {
    title: 'Reach Out',
    content: 'Call someone. Text someone. You are not meant to do this alone. Connection is the opposite of isolation.',
  },
]

export function EmergencyView({ privacyMode }: EmergencyViewProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isTimerActive, setIsTimerActive] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(300) // 5 minutes
  const [isPaused, setIsPaused] = useState(false)
  const [showCircuitBreaker, setShowCircuitBreaker] = useState(false)
  
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

  // Contact management
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Emergency Toolkit
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Immediate grounding protocols for moments of volatility
          </p>
        </div>
      </div>

      {/* Circuit Breaker - Full Screen Overlay */}
      {showCircuitBreaker && (
        <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
          <div className="text-center space-y-8 p-8 max-w-md">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4"
              onClick={() => setShowCircuitBreaker(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            <div className="space-y-4">
              <Zap className="h-16 w-16 mx-auto text-primary" />
              <h2 className="text-2xl font-mono font-semibold">Circuit Breaker Active</h2>
              <p className="text-muted-foreground">
                All inventory text is hidden. Focus on grounding.
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-6xl font-mono font-bold text-primary">
                {formatTime(timerSeconds)}
              </div>
              
              <div className="flex items-center justify-center gap-3">
                {!isTimerActive ? (
                  <Button size="lg" onClick={startTimer} className="gap-2">
                    <Play className="h-5 w-5" />
                    Start 5-Minute Timer
                  </Button>
                ) : (
                  <>
                    <Button size="lg" variant="outline" onClick={togglePause}>
                      {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                    </Button>
                    <Button size="lg" variant="outline" onClick={resetTimer}>
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 bg-secondary/50 rounded-lg text-left space-y-2">
              <p className="font-mono text-sm font-medium">Box Breathing</p>
              <p className="text-sm text-muted-foreground">
                Inhale 4 counts → Hold 4 counts → Exhale 4 counts → Hold 4 counts
              </p>
            </div>

            <Button 
              variant="ghost" 
              onClick={() => setShowCircuitBreaker(false)}
              className="text-muted-foreground"
            >
              Exit Circuit Breaker
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Circuit Breaker Card */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Craving / Anxiety Circuit Breaker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Immediately collapses all inventory text and starts a grounding timer.
            </p>
            <Button 
              onClick={() => {
                setShowCircuitBreaker(true)
                startTimer()
              }}
              className="w-full gap-2 font-mono"
              size="lg"
            >
              <Zap className="h-4 w-4" />
              Activate Circuit Breaker
            </Button>
          </CardContent>
        </Card>

        {/* Grounding Timer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Grounding Timer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-mono font-bold text-center py-4">
              {formatTime(timerSeconds)}
            </div>
            <div className="flex items-center justify-center gap-2">
              {!isTimerActive ? (
                <Button onClick={startTimer} className="gap-2">
                  <Play className="h-4 w-4" />
                  Start
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={togglePause}>
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" onClick={resetTimer}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Emergency Contacts
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleNewContact} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No contacts added. Add emergency support numbers.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contacts.map((contact) => (
                <div 
                  key={contact.id}
                  className="p-3 rounded-md bg-secondary/30 border border-border space-y-2"
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

      {/* Grounding Guides */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-mono flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Quick Grounding Guides
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GROUNDING_GUIDES.map((guide) => (
              <div 
                key={guide.title}
                className="p-4 rounded-lg bg-secondary/30 border border-border space-y-2"
              >
                <h4 className="font-mono text-sm font-medium">{guide.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {guide.content}
                </p>
              </div>
            ))}
          </div>
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
              {editingContact ? 'Edit Contact' : 'Add Emergency Contact'}
            </DialogTitle>
            <DialogDescription>
              Add a support person you can call in crisis.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">Name</label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Contact name"
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">Phone</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone number"
                className="font-mono"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">Role</label>
              <Input
                value={contactRole}
                onChange={(e) => setContactRole(e.target.value)}
                placeholder="e.g., Sponsor, Therapist, Friend"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveContact} 
              disabled={!contactName.trim() || !contactPhone.trim()}
            >
              {editingContact ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
