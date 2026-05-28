"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Heart, Check, Clock, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { 
  getHarms, 
  saveHarm, 
  deleteHarm,
  generateId,
  type Harm 
} from '@/lib/inventory-store'

interface HarmsViewProps {
  privacyMode: boolean
}

const WILLINGNESS_OPTIONS: { value: Harm['willingness']; label: string; icon: typeof Check }[] = [
  { value: 'ready', label: 'Ready to make amends', icon: Check },
  { value: 'willing', label: 'Willing but not yet', icon: Clock },
  { value: 'not_yet', label: 'Not yet willing', icon: X },
]

export function HarmsView({ privacyMode }: HarmsViewProps) {
  const [harms, setHarms] = useState<Harm[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingHarm, setEditingHarm] = useState<Harm | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [personText, setPersonText] = useState('')
  const [harmText, setHarmText] = useState('')
  const [amendsText, setAmendsText] = useState('')
  const [willingness, setWillingness] = useState<Harm['willingness']>('willing')

  useEffect(() => {
    setHarms(getHarms())
  }, [])

  const resetForm = () => {
    setPersonText('')
    setHarmText('')
    setAmendsText('')
    setWillingness('willing')
    setEditingHarm(null)
  }

  const handleSave = () => {
    const harm: Harm = {
      id: editingHarm?.id || generateId(),
      person: personText,
      harm: harmText,
      amends: amendsText,
      willingness,
      createdAt: editingHarm?.createdAt || Date.now(),
    }
    saveHarm(harm)
    setHarms(getHarms())
    setIsDialogOpen(false)
    resetForm()
  }

  const handleEdit = (harm: Harm) => {
    setEditingHarm(harm)
    setPersonText(harm.person)
    setHarmText(harm.harm)
    setAmendsText(harm.amends)
    setWillingness(harm.willingness)
    setIsDialogOpen(true)
  }

  const handleNew = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteHarm(id)
    setHarms(getHarms())
    setDeleteId(null)
  }

  const getWillingnessColor = (w: Harm['willingness']) => {
    switch (w) {
      case 'ready': return 'bg-green-500/10 text-green-400 border-green-500/20'
      case 'willing': return 'bg-primary/10 text-primary border-primary/20'
      case 'not_yet': return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getWillingnessLabel = (w: Harm['willingness']) => {
    return WILLINGNESS_OPTIONS.find(o => o.value === w)?.label || w
  }

  // Group harms by willingness
  const groupedHarms = {
    ready: harms.filter(h => h.willingness === 'ready'),
    willing: harms.filter(h => h.willingness === 'willing'),
    not_yet: harms.filter(h => h.willingness === 'not_yet'),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-semibold">Harms & Interpersonal Conduct</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {harms.length} {harms.length === 1 ? 'person' : 'people'} on the list
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 font-mono">
          <Plus className="h-4 w-4" />
          Add Person
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-green-400">
              {groupedHarms.ready.length}
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-1">Ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-primary">
              {groupedHarms.willing.length}
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-1">Willing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-mono font-semibold text-muted-foreground">
              {groupedHarms.not_yet.length}
            </p>
            <p className="text-xs font-mono text-muted-foreground mt-1">Not Yet</p>
          </CardContent>
        </Card>
      </div>

      {/* Harms Grid */}
      {harms.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No people added yet.</p>
            <p className="text-sm mt-1">Click &quot;Add Person&quot; to begin your list.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {harms.map((harm) => (
            <Card key={harm.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className={cn(
                    "text-base font-mono",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {harm.person}
                  </CardTitle>
                  <Badge className={cn("shrink-0 text-xs", getWillingnessColor(harm.willingness))}>
                    {harm.willingness === 'ready' && <Check className="h-3 w-3 mr-1" />}
                    {harm.willingness === 'willing' && <Clock className="h-3 w-3 mr-1" />}
                    {harm.willingness === 'not_yet' && <X className="h-3 w-3 mr-1" />}
                    {getWillingnessLabel(harm.willingness).split(' ')[0]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    The Harm
                  </p>
                  <p className={cn(
                    "text-sm text-foreground line-clamp-2",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {harm.harm}
                  </p>
                </div>

                {harm.amends && (
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Amends
                    </p>
                    <p className={cn(
                      "text-sm text-foreground line-clamp-2",
                      privacyMode && "privacy-blur blur-transition"
                    )}>
                      {harm.amends}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 text-xs"
                    onClick={() => handleEdit(harm)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(harm.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingHarm ? 'Edit Entry' : 'Add Person'}
            </DialogTitle>
            <DialogDescription>
              Who did you harm and how?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">
                Person&apos;s Name
              </label>
              <Input
                value={personText}
                onChange={(e) => setPersonText(e.target.value)}
                placeholder="Who did I harm?"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">
                What did I do?
              </label>
              <Textarea
                value={harmText}
                onChange={(e) => setHarmText(e.target.value)}
                placeholder="Describe the harm..."
                className="min-h-[80px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">
                How can I make amends?
              </label>
              <Textarea
                value={amendsText}
                onChange={(e) => setAmendsText(e.target.value)}
                placeholder="What can I do to repair this?"
                className="min-h-[80px] font-mono text-sm"
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-mono text-muted-foreground">
                Willingness Level
              </label>
              <RadioGroup
                value={willingness}
                onValueChange={(v) => setWillingness(v as Harm['willingness'])}
                className="space-y-2"
              >
                {WILLINGNESS_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <div key={option.value} className="flex items-center space-x-3">
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="flex items-center gap-2 font-mono text-sm cursor-pointer">
                        <Icon className="h-4 w-4" />
                        {option.label}
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!personText.trim() || !harmText.trim()}>
              {editingHarm ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This entry will be permanently removed from your list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
