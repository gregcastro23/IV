"use client"

import { useState } from 'react'
import { 
  LayoutDashboard, 
  TableProperties, 
  AlertOctagon,
  Heart,
  Shield,
  Lock,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type ViewType = 'dashboard' | 'resentments' | 'fears' | 'harms' | 'emergency'

interface SidebarProps {
  currentView: ViewType
  onViewChange: (view: ViewType) => void
  privacyMode: boolean
  onPrivacyModeChange: (enabled: boolean) => void
  onLock: () => void
}

const navItems: { id: ViewType; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'resentments', label: 'Resentments', icon: TableProperties },
  { id: 'fears', label: 'Fears Inventory', icon: AlertOctagon },
  { id: 'harms', label: 'Harms & Conduct', icon: Heart },
  { id: 'emergency', label: 'Emergency Toolkit', icon: Shield },
]

export function AppSidebar({ 
  currentView, 
  onViewChange, 
  privacyMode, 
  onPrivacyModeChange,
  onLock 
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={cn(
          "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <div className="space-y-0.5">
              <h1 className="font-mono text-sm font-semibold text-sidebar-foreground tracking-tight">
                The Inventory
              </h1>
              <p className="text-xs text-muted-foreground font-mono">
                Fourth Step Ledger
              </p>
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
          "mx-4 mb-4 bg-secondary/50 border border-border rounded-md",
          collapsed ? "p-2" : "p-3"
        )}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Disconnected / Local-Only</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground font-mono truncate">
                Local-Only Mode
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
                  "w-full justify-start gap-3 h-10 font-mono text-sm",
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
                {!collapsed && <span className="truncate">{item.label}</span>}
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
                  <p>Privacy Blind {privacyMode ? 'On' : 'Off'}</p>
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
                    Privacy Blind
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
                <p>Lock Application</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="outline"
              className="w-full h-9 gap-2 font-mono text-xs"
              onClick={onLock}
            >
              <Lock className="h-3.5 w-3.5" />
              Lock Application
            </Button>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
