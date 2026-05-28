"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronRight, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  type Resentment 
} from '@/lib/inventory-store'

interface ResenmentsViewProps {
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

const MY_PART_OPTIONS = [
  'Selfish',
  'Dishonest',
  'Inconsiderate',
  'Frightened',
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

export function ResentmentsView({ privacyMode }: ResenmentsViewProps) {
  const [resentments, setResentments] = useState<Resentment[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [editingResentment, setEditingResentment] = useState<Resentment>(emptyResentment())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'matrix' | 'wizard'>('matrix')

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
    { title: 'Object', description: 'Who or what are you resentful toward?' },
    { title: 'Cause', description: 'What did they do? Be specific.' },
    { title: 'Instincts', description: 'What part of self was threatened?' },
    { title: 'My Part', description: 'Where was I to blame?' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-mono font-semibold">Resentments Grid</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {resentments.length} {resentments.length === 1 ? 'entry' : 'entries'} logged
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'matrix' | 'wizard')}>
            <TabsList className="h-9">
              <TabsTrigger value="matrix" className="text-xs font-mono">Matrix</TabsTrigger>
              <TabsTrigger value="wizard" className="text-xs font-mono">Cards</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleNew} className="gap-2 font-mono">
            <Plus className="h-4 w-4" />
            Add Entry
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
                    <TableHead className="font-mono text-xs w-[180px]">Object</TableHead>
                    <TableHead className="font-mono text-xs w-[250px]">Cause</TableHead>
                    <TableHead className="font-mono text-xs w-[200px]">Instincts Threatened</TableHead>
                    <TableHead className="font-mono text-xs w-[150px]">My Part</TableHead>
                    <TableHead className="font-mono text-xs w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resentments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                        No resentments logged yet. Click &quot;Add Entry&quot; to begin.
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
                          "text-sm max-w-[250px] truncate",
                          privacyMode && "privacy-blur blur-transition"
                        )}>
                          {r.cause}
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
                              <Badge key={part} variant="secondary" className="text-xs font-mono">
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resentments.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center text-muted-foreground">
                No resentments logged yet. Click &quot;Add Entry&quot; to begin.
              </CardContent>
            </Card>
          ) : (
            resentments.map((r) => (
              <Card key={r.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className={cn(
                    "text-base font-mono",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {r.object}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className={cn(
                    "text-sm text-muted-foreground line-clamp-2",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {r.cause}
                  </p>
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
                  <div className={cn(
                    "flex flex-wrap gap-1",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {r.myPart.map((part) => (
                      <Badge key={part} variant="secondary" className="text-xs font-mono">
                        {part}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 text-xs"
                      onClick={() => handleEdit(r)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 text-xs text-destructive hover:text-destructive"
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              Step {currentStep + 1}: {steps[currentStep].title}
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
                  "flex-1 h-1 rounded-full transition-colors",
                  i <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="py-4">
            {currentStep === 0 && (
              <Input
                value={editingResentment.object}
                onChange={(e) => setEditingResentment({ ...editingResentment, object: e.target.value })}
                placeholder="Person, place, institution, or principle..."
                className="font-mono"
                autoFocus
              />
            )}
            {currentStep === 1 && (
              <Textarea
                value={editingResentment.cause}
                onChange={(e) => setEditingResentment({ ...editingResentment, cause: e.target.value })}
                placeholder="What happened? What did they do?"
                className="min-h-[120px] font-mono text-sm"
                autoFocus
              />
            )}
            {currentStep === 2 && (
              <div className="grid grid-cols-2 gap-2">
                {INSTINCTS.map((instinct) => (
                  <Button
                    key={instinct}
                    variant={editingResentment.instincts.includes(instinct) ? "default" : "outline"}
                    className="justify-start font-mono text-sm h-auto py-3"
                    onClick={() => toggleInstinct(instinct)}
                  >
                    {instinct}
                  </Button>
                ))}
              </div>
            )}
            {currentStep === 3 && (
              <div className="grid grid-cols-2 gap-2">
                {MY_PART_OPTIONS.map((part) => (
                  <Button
                    key={part}
                    variant={editingResentment.myPart.includes(part) ? "default" : "outline"}
                    className="justify-start font-mono text-sm h-auto py-3"
                    onClick={() => toggleMyPart(part)}
                  >
                    {part}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
              >
                Back
              </Button>
            )}
            {currentStep < steps.length - 1 ? (
              <Button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={currentStep === 0 && !editingResentment.object.trim()}
                className="gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSave}>
                Save Entry
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This resentment entry will be permanently removed.
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
