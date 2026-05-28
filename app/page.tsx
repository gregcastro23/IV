"use client"

import { useState, useEffect } from 'react'
import { LockScreen } from '@/components/lock-screen'
import { AppSidebar, type ViewType } from '@/components/app-sidebar'
import { DashboardView } from '@/components/views/dashboard-view'
import { ResentmentsView } from '@/components/views/resentments-view'
import { FearsView } from '@/components/views/fears-view'
import { HarmsView } from '@/components/views/harms-view'
import { EmergencyView } from '@/components/views/emergency-view'

export default function InventoryApp() {
  const [isLocked, setIsLocked] = useState(true)
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [privacyMode, setPrivacyMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isLocked) {
    return <LockScreen onUnlock={() => setIsLocked(false)} />
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView 
            privacyMode={privacyMode} 
            onNavigateToEmergency={() => setCurrentView('emergency')} 
          />
        )
      case 'resentments':
        return <ResentmentsView privacyMode={privacyMode} />
      case 'fears':
        return <FearsView privacyMode={privacyMode} />
      case 'harms':
        return <HarmsView privacyMode={privacyMode} />
      case 'emergency':
        return <EmergencyView privacyMode={privacyMode} />
      default:
        return <DashboardView privacyMode={privacyMode} onNavigateToEmergency={() => setCurrentView('emergency')} />
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        privacyMode={privacyMode}
        onPrivacyModeChange={setPrivacyMode}
        onLock={() => setIsLocked(true)}
      />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl">
          {renderView()}
        </div>
      </main>
    </div>
  )
}
