"use client"

import { useState, useEffect } from 'react'
import { AlertTriangle, Check, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { 
  getInventoryStats, 
  getHaltLogs, 
  saveHaltLog, 
  getDailyTasks, 
  saveDailyTask,
  generateId,
  type HaltLog,
  type DailyTask
} from '@/lib/inventory-store'

interface DashboardViewProps {
  privacyMode: boolean
  onNavigateToEmergency: () => void
}

const DEFAULT_DAILY_TASKS = [
  'Morning meditation or prayer',
  'Eat three meals',
  'Connect with another person',
  'Physical movement / exercise',
  'Evening reflection',
]

export function DashboardView({ privacyMode, onNavigateToEmergency }: DashboardViewProps) {
  const [stats, setStats] = useState({ resentments: 0, fears: 0, harms: 0, haltLogs: 0 })
  const [halt, setHalt] = useState({ hungry: 0, angry: 0, lonely: 0, tired: 0 })
  const [haltNote, setHaltNote] = useState('')
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([])
  const [newTask, setNewTask] = useState('')
  const [lastHaltLog, setLastHaltLog] = useState<HaltLog | null>(null)
  const [showHaltWarning, setShowHaltWarning] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    setStats(getInventoryStats())
    
    const logs = getHaltLogs()
    if (logs.length > 0) {
      setLastHaltLog(logs[0])
    }

    let tasks = getDailyTasks(today)
    if (tasks.length === 0) {
      // Initialize with default tasks for today
      tasks = DEFAULT_DAILY_TASKS.map(task => ({
        id: generateId(),
        task,
        completed: false,
        date: today
      }))
      tasks.forEach(saveDailyTask)
    }
    setDailyTasks(tasks)
  }, [today])

  const handleHaltChange = (key: keyof typeof halt, value: number[]) => {
    const newHalt = { ...halt, [key]: value[0] }
    setHalt(newHalt)
    
    // Check for warning conditions
    if (newHalt.angry >= 7 || newHalt.lonely >= 7) {
      setShowHaltWarning(true)
    } else {
      setShowHaltWarning(false)
    }
  }

  const saveHalt = () => {
    const log: HaltLog = {
      id: generateId(),
      ...halt,
      note: haltNote,
      timestamp: Date.now()
    }
    saveHaltLog(log)
    setLastHaltLog(log)
    setHaltNote('')
    setStats(getInventoryStats())
  }

  const toggleTask = (taskId: string) => {
    const task = dailyTasks.find(t => t.id === taskId)
    if (task) {
      const updated = { ...task, completed: !task.completed }
      saveDailyTask(updated)
      setDailyTasks(dailyTasks.map(t => t.id === taskId ? updated : t))
    }
  }

  const addTask = () => {
    if (!newTask.trim()) return
    const task: DailyTask = {
      id: generateId(),
      task: newTask.trim(),
      completed: false,
      date: today
    }
    saveDailyTask(task)
    setDailyTasks([...dailyTasks, task])
    setNewTask('')
  }

  const completedCount = dailyTasks.filter(t => t.completed).length
  const progressPercent = dailyTasks.length > 0 ? (completedCount / dailyTasks.length) * 100 : 0

  const getHaltLabel = (value: number) => {
    if (value <= 2) return 'Low'
    if (value <= 5) return 'Moderate'
    if (value <= 7) return 'Elevated'
    return 'Critical'
  }

  const getHaltColor = (value: number) => {
    if (value <= 2) return 'text-muted-foreground'
    if (value <= 5) return 'text-foreground'
    if (value <= 7) return 'text-primary'
    return 'text-destructive'
  }

  return (
    <div className="space-y-6">
      {/* HALT Warning Banner */}
      {showHaltWarning && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Elevated emotional state detected
                </p>
                <p className="text-xs text-muted-foreground">
                  Consider pausing introspective writing. Your emotional state may affect clarity.
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 gap-2"
                  onClick={onNavigateToEmergency}
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Go to Emergency Toolkit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Resentments', value: stats.resentments },
          { label: 'Fears', value: stats.fears },
          { label: 'Harms', value: stats.harms },
          { label: 'HALT Check-ins', value: stats.haltLogs },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
              <p className={cn(
                "text-3xl font-mono font-semibold mt-1",
                privacyMode && "privacy-blur blur-transition"
              )}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* HALT Check-in */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              HALT Check-in
              {lastHaltLog && (
                <Badge variant="outline" className="font-mono text-xs">
                  Last: {new Date(lastHaltLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {(['hungry', 'angry', 'lonely', 'tired'] as const).map((key) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-mono capitalize">{key}</label>
                  <span className={cn(
                    "text-xs font-mono",
                    getHaltColor(halt[key])
                  )}>
                    {getHaltLabel(halt[key])} ({halt[key]})
                  </span>
                </div>
                <Slider
                  value={[halt[key]]}
                  onValueChange={(v) => handleHaltChange(key, v)}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground">Note (optional)</label>
              <Textarea
                value={haltNote}
                onChange={(e) => setHaltNote(e.target.value)}
                placeholder="Brief observation..."
                className={cn(
                  "h-20 resize-none font-mono text-sm",
                  privacyMode && "privacy-blur blur-transition"
                )}
              />
            </div>

            <Button onClick={saveHalt} className="w-full gap-2 font-mono">
              <Check className="h-4 w-4" />
              Log Check-in
            </Button>
          </CardContent>
        </Card>

        {/* 24-Hour Focus */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-mono flex items-center justify-between">
              24-Hour Focus
              <Badge variant="secondary" className="font-mono">
                {completedCount}/{dailyTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progressPercent} className="h-2" />

            <div className="space-y-2 max-h-[280px] overflow-y-auto">
              {dailyTasks.map((task) => (
                <div 
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-md bg-secondary/30 border border-transparent",
                    task.completed && "border-primary/20 bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <span className={cn(
                    "text-sm font-mono flex-1",
                    task.completed && "line-through text-muted-foreground",
                    privacyMode && "privacy-blur blur-transition"
                  )}>
                    {task.task}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add custom task..."
                className="font-mono text-sm"
              />
              <Button size="icon" onClick={addTask} disabled={!newTask.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
