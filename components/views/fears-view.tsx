"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  getFears, 
  saveFear, 
  deleteFear,
  generateId,
  type Fear 
} from '@/lib/inventory-store'

interface FearsViewProps {
  privacyMode: boolean
}

const AFFECTED_INSTINCTS = [
  'Self-Esteem',
  'Security',
  'Ambition',
  'Personal Relations',
  'Sex Relations',
  'Pride',
  'Finances',
]

export function FearsView({ privacyMode }: FearsViewProps) {
  const [fears, setFears] = useState<Fear[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFear, setEditingFear] = useState<Fear | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [fearText, setFearText] = useState('')
  const [causeText, setCauseText] = useState('')
  const [selectedInstincts, setSelectedInstincts] = useState<string[]>([])

  useEffect(() => {
    setFears(getFears())
  }, [])

  const resetForm = () => {
    setFearText('')
    setCauseText('')
    setSelectedInstincts([])
    setEditingFear(null)
  }

  const handleSave = () => {
    const fear: Fear = {
      id: editingFear?.id || generateId(),
      fear: fearText,
      cause: causeText,
      affectedInstincts: selectedInstincts,
      createdAt: editingFear?.createdAt || Date.now(),
    }
    saveFear(fear)
    setFears(getFears())
    setIsDialogOpen(false)
    resetForm()
  }

  const handleEdit = (fear: Fear) => {
    setEditingFear(fear)
    setFearText(fear.fear)
    setCauseText(fear.cause)
    setSelectedInstincts(fear.affectedInstincts)
    setIsDialogOpen(true)
  }

  const handleNew = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    deleteFear(id)
    setFears(getFears())
    setDeleteId(null)
  }

  const toggleInstinct = (instinct: string) => {
    setSelectedInstincts(prev =>
      prev.includes(instinct)
        ? prev.filter(i => i !== instinct)
        : [...prev, instinct]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-semibold">Fears Inventory</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {fears.length} {fears.length === 1 ? 'fear' : 'fears'} logged
          </p>
        </div>
        <Button onClick={handleNew} className="gap-2 font-mono">
          <Plus className="h-4 w-4" />
          Add Fear
        </Button>
      </div>

      {/* Fears Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fears.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No fears logged yet.</p>
              <p className="text-sm mt-1">Click &quot;Add Fear&quot; to begin your inventory.</p>
            </CardContent>
          </Card>
        ) : (
          fears.map((fear) => (
            <Card key={fear.id}>
              <CardHeader className="pb-2">
                <CardTitle className={cn(
                  "text-base font-mono line-clamp-2",
                  privacyMode && "privacy-blur blur-transition"
                )}>
                  {fear.fear}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Cause
                  </p>
                  <p className={cn(
                    "text-sm text-foreground line-clamp-3",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {fear.cause || 'Not specified'}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Affected Areas
                  </p>
                  <div className={cn(
                    "flex flex-wrap gap-1",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {fear.affectedInstincts.length > 0 ? (
                      fear.affectedInstincts.map((inst) => (
                        <Badge key={inst} variant="outline" className="text-xs font-mono">
                          {inst}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">None specified</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 text-xs"
                    onClick={() => handleEdit(fear)}
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(fear.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {editingFear ? 'Edit Fear' : 'Add New Fear'}
            </DialogTitle>
            <DialogDescription>
              Identify your fear and its root cause.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">
                What am I afraid of?
              </label>
              <Input
                value={fearText}
                onChange={(e) => setFearText(e.target.value)}
                placeholder="Describe the fear..."
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">
                Why do I have this fear?
              </label>
              <Textarea
                value={causeText}
                onChange={(e) => setCauseText(e.target.value)}
                placeholder="What caused this fear? When did it start?"
                className="min-h-[100px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">
                What instincts does it affect?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AFFECTED_INSTINCTS.map((instinct) => (
                  <Button
                    key={instinct}
                    variant={selectedInstincts.includes(instinct) ? "default" : "outline"}
                    className="justify-start font-mono text-sm h-auto py-2.5"
                    onClick={() => toggleInstinct(instinct)}
                  >
                    {instinct}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!fearText.trim()}>
              {editingFear ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this fear?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This fear entry will be permanently removed.
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
