"use client"

import { useState, useEffect } from 'react'
import { Plus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { 
  getDefectFrequencies,
  getDefectOccurrences,
  getAssetLogs,
  saveAssetLog,
  deleteAssetLog,
  generateId,
  CHARACTER_DEFECTS,
  CHARACTER_ASSETS,
  type CharacterDefect,
  type CharacterAsset,
  type AssetLog,
  type Resentment
} from '@/lib/inventory-store'

interface BalanceSheetViewProps {
  privacyMode: boolean
}

// Map defects to their mirror virtues
const DEFECT_TO_VIRTUE: Record<CharacterDefect, CharacterAsset> = {
  'Selfish': 'Unselfishness',
  'Dishonest': 'Honesty',
  'Inconsiderate': 'Consideration',
  'Frightened': 'Courage',
  'Pride': 'Humility',
  'Greed': 'Unselfishness',
  'Anger': 'Consideration',
}

export function BalanceSheetView({ privacyMode }: BalanceSheetViewProps) {
  const [defectFrequencies, setDefectFrequencies] = useState<Record<CharacterDefect, number>>({} as Record<CharacterDefect, number>)
  const [expandedDefect, setExpandedDefect] = useState<CharacterDefect | null>(null)
  const [defectOccurrences, setDefectOccurrences] = useState<Array<{ resentment: Resentment; timestamp: number }>>([])
  const [assetLogs, setAssetLogs] = useState<AssetLog[]>([])
  
  // Asset log dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedVirtue, setSelectedVirtue] = useState<CharacterAsset | ''>('')
  const [behaviorText, setBehaviorText] = useState('')

  useEffect(() => {
    setDefectFrequencies(getDefectFrequencies())
    setAssetLogs(getAssetLogs())
  }, [])

  const handleExpandDefect = (defect: CharacterDefect) => {
    if (expandedDefect === defect) {
      setExpandedDefect(null)
      setDefectOccurrences([])
    } else {
      setExpandedDefect(defect)
      setDefectOccurrences(getDefectOccurrences(defect))
    }
  }

  const handleSaveAssetLog = () => {
    if (!selectedVirtue || !behaviorText.trim()) return
    
    const log: AssetLog = {
      id: generateId(),
      virtue: selectedVirtue,
      behavior: behaviorText.trim(),
      timestamp: Date.now(),
    }
    saveAssetLog(log)
    setAssetLogs(getAssetLogs())
    setIsDialogOpen(false)
    setSelectedVirtue('')
    setBehaviorText('')
  }

  const handleDeleteAssetLog = (id: string) => {
    deleteAssetLog(id)
    setAssetLogs(getAssetLogs())
  }

  // Calculate max frequency for scaling bars
  const maxFrequency = Math.max(...Object.values(defectFrequencies), 1)

  // Group asset logs by virtue
  const assetLogsByVirtue = CHARACTER_ASSETS.reduce((acc, virtue) => {
    acc[virtue] = assetLogs.filter(log => log.virtue === virtue)
    return acc
  }, {} as Record<CharacterAsset, AssetLog[]>)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-mono font-semibold">Asset & Liability Balance Sheet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Double-entry character ledger tracking defects and their mirror virtues
        </p>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: Character Liabilities */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-destructive flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive" />
              Character Liabilities (Defects)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {CHARACTER_DEFECTS.map((defect) => {
              const frequency = defectFrequencies[defect] || 0
              const percentage = maxFrequency > 0 ? (frequency / maxFrequency) * 100 : 0
              const isExpanded = expandedDefect === defect

              return (
                <Collapsible
                  key={defect}
                  open={isExpanded}
                  onOpenChange={() => handleExpandDefect(defect)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-sm font-mono">{defect}</span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {frequency}
                        </Badge>
                      </div>
                      <div className="ml-5 h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-destructive/70 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {defectOccurrences.length > 0 ? (
                      <ScrollArea className="h-48 mt-3 ml-5">
                        <div className="space-y-2 pr-4">
                          {defectOccurrences.map(({ resentment, timestamp }) => (
                            <div 
                              key={resentment.id}
                              className="p-2 rounded bg-secondary/50 border border-border"
                            >
                              <p className={cn(
                                "text-xs font-mono font-medium",
                                privacyMode && "privacy-blur blur-transition"
                              )}>
                                {resentment.object}
                              </p>
                              <p className={cn(
                                "text-xs text-muted-foreground line-clamp-2 mt-1",
                                privacyMode && "privacy-blur blur-transition"
                              )}>
                                {resentment.cause}
                              </p>
                              <p className="text-xs text-muted-foreground/50 mt-1">
                                {formatDate(timestamp)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="text-xs text-muted-foreground ml-5 mt-2">
                        No occurrences logged
                      </p>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </CardContent>
        </Card>

        {/* RIGHT: Character Assets */}
        <Card>
          <CardHeader className="pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-mono uppercase tracking-wider text-primary flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Character Assets (Virtues)
            </CardTitle>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-1.5 font-mono text-xs"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Log Asset Action
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHARACTER_ASSETS.map((virtue) => {
              const logs = assetLogsByVirtue[virtue] || []
              const mirrorDefect = Object.entries(DEFECT_TO_VIRTUE).find(([, v]) => v === virtue)?.[0]

              return (
                <div key={virtue} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{virtue}</span>
                      {mirrorDefect && (
                        <span className="text-xs text-muted-foreground">
                          (counters {mirrorDefect})
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {logs.length} logged
                    </Badge>
                  </div>
                  
                  {logs.length > 0 ? (
                    <ScrollArea className="h-24">
                      <div className="space-y-1.5 pr-4">
                        {logs.slice(0, 5).map((log) => (
                          <div 
                            key={log.id}
                            className="p-2 rounded bg-primary/5 border border-primary/20 flex items-start justify-between gap-2"
                          >
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                "text-xs text-muted-foreground line-clamp-2",
                                privacyMode && "privacy-blur blur-transition"
                              )}>
                                {log.behavior}
                              </p>
                              <p className="text-xs text-muted-foreground/50 mt-1">
                                {formatDate(log.timestamp)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteAssetLog(log.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 py-2">
                      No actions logged yet
                    </p>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Asset Log Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono">Log Asset Action</DialogTitle>
            <DialogDescription>
              Document an instance where you actively practiced a virtue today.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Target Virtue
              </label>
              <Select value={selectedVirtue} onValueChange={(v) => setSelectedVirtue(v as CharacterAsset)}>
                <SelectTrigger className="font-mono">
                  <SelectValue placeholder="Select virtue..." />
                </SelectTrigger>
                <SelectContent>
                  {CHARACTER_ASSETS.map((virtue) => (
                    <SelectItem key={virtue} value={virtue} className="font-mono">
                      {virtue}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                Contextual Behavior
              </label>
              <Textarea
                value={behaviorText}
                onChange={(e) => setBehaviorText(e.target.value)}
                placeholder="Describe how you practiced this virtue..."
                className="min-h-[100px] font-mono text-sm resize-none"
              />
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Timestamp: {new Date().toLocaleString()}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAssetLog}
              disabled={!selectedVirtue || !behaviorText.trim()}
            >
              Log Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
