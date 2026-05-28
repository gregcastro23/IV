"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronRight, Pencil, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  getResentments, 
  saveResentment, 
  deleteResentment,
  generateId,
  CHARACTER_DEFECTS,
  type Resentment 
} from '@/lib/inventory-store'

interface FrameworkMatrixViewProps {
  privacyMode: boolean
}

const INSTINCTS = [
  'Self-Esteem',
  'Pride',
  'Ambition',
  'Security',
  'Pocketbook',
  'Personal Relations',
  'Sex Relations',
]

const emptyResentment = (): Resentment => ({
  id: generateId(),
  object: '',
  cause: '',
  instincts: [],
  myPart: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export function FrameworkMatrixView({ privacyMode }: FrameworkMatrixViewProps) {
  const [resentments, setResentments] = useState<Resentment[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [editingResentment, setEditingResentment] = useState<Resentment>(emptyResentment())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'wizard' | 'matrix'>('wizard')

  // Track which steps are completed for the wizard lock
  const [objectList, setObjectList] = useState<string[]>([])
  const [currentObjectIndex, setCurrentObjectIndex] = useState(0)

  useEffect(() => {
    setResentments(getResentments())
  }, [])

  const handleSave = () => {
    saveResentment(editingResentment)
    setResentments(getResentments())
    setIsDialogOpen(false)
    setCurrentStep(0)
    setEditingResentment(emptyResentment())
  }

  const handleDelete = (id: string) => {
    deleteResentment(id)
    setResentments(getResentments())
    setDeleteId(null)
  }

  const handleEdit = (resentment: Resentment) => {
    setEditingResentment(resentment)
    setCurrentStep(0)
    setIsDialogOpen(true)
  }

  const handleNew = () => {
    setEditingResentment(emptyResentment())
    setCurrentStep(0)
    setIsDialogOpen(true)
  }

  const toggleInstinct = (instinct: string) => {
    const current = editingResentment.instincts
    const updated = current.includes(instinct)
      ? current.filter(i => i !== instinct)
      : [...current, instinct]
    setEditingResentment({ ...editingResentment, instincts: updated })
  }

  const toggleMyPart = (part: string) => {
    const current = editingResentment.myPart
    const updated = current.includes(part)
      ? current.filter(p => p !== part)
      : [...current, part]
    setEditingResentment({ ...editingResentment, myPart: updated })
  }

  const steps = [
    { 
      title: 'The Object List', 
      description: 'List individuals, institutions, or principles—nothing else.',
      locked: false
    },
    { 
      title: 'The Cause', 
      description: 'What did they do? Be specific about the action.',
      locked: !editingResentment.object.trim()
    },
    { 
      title: 'Instincts Threatened', 
      description: 'Which parts of self were affected?',
      locked: !editingResentment.cause.trim()
    },
    { 
      title: 'My Part / Defects', 
      description: 'Where was I to blame? Map to character liabilities.',
      locked: editingResentment.instincts.length === 0
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-semibold">The Framework Matrix</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sequential column-by-column inventory builder — {resentments.length} {resentments.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'wizard' | 'matrix')}>
            <TabsList className="h-9">
              <TabsTrigger value="wizard" className="text-xs font-mono">Wizard</TabsTrigger>
              <TabsTrigger value="matrix" className="text-xs font-mono">Matrix</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleNew} className="gap-2 font-mono text-xs">
            <Plus className="h-4 w-4" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'matrix' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="font-mono text-xs w-[160px] uppercase tracking-wider">Object</TableHead>
                    <TableHead className="font-mono text-xs w-[220px] uppercase tracking-wider">Cause</TableHead>
                    <TableHead className="font-mono text-xs w-[180px] uppercase tracking-wider">Instincts</TableHead>
                    <TableHead className="font-mono text-xs w-[180px] uppercase tracking-wider">My Part</TableHead>
                    <TableHead className="font-mono text-xs w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resentments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-mono text-sm">
                        No inventory entries. Click &quot;New Entry&quot; to begin the framework.
                      </TableCell>
                    </TableRow>
                  ) : (
                    resentments.map((r) => (
                      <TableRow key={r.id} className="border-border">
                        <TableCell className={cn(
                          "font-mono text-sm",
                          privacyMode && "privacy-blur blur-transition"
                        )}>
                          {r.object}
                        </TableCell>
                        <TableCell className={cn(
                          "text-sm max-w-[220px]",
                          privacyMode && "privacy-blur blur-transition"
                        )}>
                          <p className="line-clamp-2">{r.cause}</p>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "flex flex-wrap gap-1",
                            privacyMode && "privacy-blur blur-transition"
                          )}>
                            {r.instincts.map((inst) => (
                              <Badge key={inst} variant="outline" className="text-xs font-mono">
                                {inst}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={cn(
                            "flex flex-wrap gap-1",
                            privacyMode && "privacy-blur blur-transition"
                          )}>
                            {r.myPart.map((part) => (
                              <Badge key={part} variant="secondary" className="text-xs font-mono bg-destructive/20 text-destructive border-destructive/30">
                                {part}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => handleEdit(r)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteId(r.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Wizard view - cards
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resentments.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center text-muted-foreground font-mono text-sm">
                No inventory entries. Click &quot;New Entry&quot; to begin the framework.
              </CardContent>
            </Card>
          ) : (
            resentments.map((r) => (
              <Card key={r.id} className="overflow-hidden border-border">
                <CardHeader className="pb-2 bg-secondary/30">
                  <CardTitle className={cn(
                    "text-base font-mono",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {r.object}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-3">
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Cause</p>
                    <p className={cn(
                      "text-sm text-muted-foreground line-clamp-2",
                      privacyMode && "privacy-blur blur-transition"
                    )}>
                      {r.cause}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Instincts</p>
                    <div className={cn(
                      "flex flex-wrap gap-1",
                      privacyMode && "privacy-blur blur-transition"
                    )}>
                      {r.instincts.map((inst) => (
                        <Badge key={inst} variant="outline" className="text-xs font-mono">
                          {inst}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">Defects</p>
                    <div className={cn(
                      "flex flex-wrap gap-1",
                      privacyMode && "privacy-blur blur-transition"
                    )}>
                      {r.myPart.map((part) => (
                        <Badge key={part} variant="secondary" className="text-xs font-mono bg-destructive/20 text-destructive border-destructive/30">
                          {part}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 text-xs font-mono"
                      onClick={() => handleEdit(r)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 text-xs text-destructive hover:text-destructive font-mono"
                      onClick={() => setDeleteId(r.id)}
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
      )}

      {/* Sequential Wizard Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono flex items-center gap-2">
              Step {currentStep + 1}: {steps[currentStep].title}
              {steps[currentStep].locked && currentStep > 0 && (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </DialogTitle>
            <DialogDescription>
              {steps[currentStep].description}
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-1 py-2">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  i < currentStep ? "bg-primary" : 
                  i === currentStep ? "bg-primary/70" : 
                  step.locked ? "bg-muted" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="py-4 min-h-[200px]">
            {currentStep === 0 && (
              <div className="space-y-3">
                <Input
                  value={editingResentment.object}
                  onChange={(e) => setEditingResentment({ ...editingResentment, object: e.target.value })}
                  placeholder="Person, institution, or principle..."
                  className="font-mono bg-input border-border focus:border-primary focus:ring-0"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter only the name or identifier. Do not include any details about the cause yet.
                </p>
              </div>
            )}
            {currentStep === 1 && (
              <div className="space-y-3">
                <div className="text-sm font-mono text-muted-foreground mb-2">
                  Re: <span className="text-foreground">{editingResentment.object}</span>
                </div>
                <Textarea
                  value={editingResentment.cause}
                  onChange={(e) => setEditingResentment({ ...editingResentment, cause: e.target.value })}
                  placeholder="What happened? What did they do? Be specific..."
                  className="min-h-[140px] font-mono text-sm bg-input border-border focus:border-primary focus:ring-0 resize-none"
                  autoFocus
                />
              </div>
            )}
            {currentStep === 2 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Select all instincts that were affected:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {INSTINCTS.map((instinct) => (
                    <Button
                      key={instinct}
                      variant={editingResentment.instincts.includes(instinct) ? "default" : "outline"}
                      className="justify-start font-mono text-xs h-auto py-3 px-3"
                      onClick={() => toggleInstinct(instinct)}
                    >
                      {instinct}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {currentStep === 3 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-3">
                  Map to character liabilities (defects):
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CHARACTER_DEFECTS.map((part) => (
                    <Button
                      key={part}
                      variant={editingResentment.myPart.includes(part) ? "default" : "outline"}
                      className={cn(
                        "justify-start font-mono text-xs h-auto py-3 px-3",
                        editingResentment.myPart.includes(part) && "bg-destructive hover:bg-destructive/90"
                      )}
                      onClick={() => toggleMyPart(part)}
                    >
                      {part}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="font-mono text-xs"
              >
                Back
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={steps[currentStep + 1]?.locked}
                className="gap-2 font-mono text-xs"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave} className="font-mono text-xs">
                Save to Ledger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This inventory entry will be permanently removed from the ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-mono text-xs"
            >
              Delete Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
