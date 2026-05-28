"use client"

import { useEffect, useState } from 'react'
import { 
  LayoutDashboard, 
  TableProperties, 
  Shield,
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Scale,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type ViewType = 'dashboard' | 'framework' | 'balance' | 'emergency'

interface SidebarProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  privacyMode: boolean
  onPrivacyModeChange: (enabled: boolean) => void
  onLock: () => void
}

const navItems: { id: ViewType; label: string; shortLabel: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard Node', shortLabel: 'Dashboard', icon: LayoutDashboard },
  { id: 'framework', label: 'Framework Matrix', shortLabel: 'Framework', icon: TableProperties },
  { id: 'balance', label: 'Asset & Liability Sheet', shortLabel: 'Balance', icon: Scale },
  { id: 'emergency', label: 'Emergency Grounding Hub', shortLabel: 'Emergency', icon: Zap },
]

export function AppSidebar({ 
  currentView, 
  onViewChange, 
  privacyMode, 
  onPrivacyModeChange,
  onLock 
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Global Escape key listener for privacy blind
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onPrivacyModeChange(!privacyMode)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [privacyMode, onPrivacyModeChange])

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={cn(
          "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <div className="space-y-0.5">
              <h1 className="font-mono text-xs font-semibold text-sidebar-foreground tracking-[0.15em] uppercase">
                Fourth Step Ledger
              </h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Status Indicator */}
        <div className={cn(
          "mx-4 mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-md",
          collapsed ? "p-2" : "p-3"
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <Shield className="h-4 w-4 text-emerald-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Isolated / Enclave Storage Sealed</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="text-xs text-emerald-500 font-mono truncate">
                Isolated / Enclave Sealed
              </span>
            </div>
          )}
        </div>

        <Separator className="mb-2" />

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentView === item.id
            const isEmergency = item.id === 'emergency'

            const button = (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10 font-mono text-xs",
                  collapsed && "justify-center px-0",
                  isEmergency && !isActive && "text-primary hover:text-primary",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className={cn(
                  "h-4 w-4 shrink-0",
                  isEmergency && !isActive && "text-primary"
                )} />
                {!collapsed && <span className="truncate">{item.shortLabel}</span>}
              </Button>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              )
            }

            return button
          })}
        </nav>

        <Separator className="my-2" />

        {/* Bottom Utilities */}
        <div className="p-4 space-y-3">
          {/* Privacy Blind Toggle */}
          <div className={cn(
            "flex items-center gap-3",
            collapsed && "flex-col gap-2"
          )}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={privacyMode ? "default" : "outline"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onPrivacyModeChange(!privacyMode)}
                  >
                    {privacyMode ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Privacy Blind {privacyMode ? 'On' : 'Off'} (Esc)</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {privacyMode ? (
                    <EyeOff className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    Privacy Blind (Esc)
                  </span>
                </div>
                <Switch
                  checked={privacyMode}
                  onCheckedChange={onPrivacyModeChange}
                />
              </>
            )}
          </div>

          {/* Lock Button */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-full h-8"
                  onClick={onLock}
                >
                  <Lock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Lock Ledger</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="outline"
              className="w-full h-9 gap-2 font-mono text-xs"
              onClick={onLock}
            >
              <Lock className="h-3.5 w-3.5" />
              Lock Ledger
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
