"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddStudentForm } from "@/components/add-student-form"
import { StudentCards } from "@/components/student-cards"
import { PaymentHistory } from "@/components/payment-history"

interface ParentDashboardProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export function ParentDashboard({ user }: ParentDashboardProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  
  // Auto-sync when user returns to the tab (e.g., after Stripe checkout)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 Tab became visible, syncing payment data...')
        setRefreshTrigger(prev => prev + 1)
      }
    }
    
    const handleFocus = () => {
      console.log('🔍 Window focused, syncing payment data...')
      setRefreshTrigger(prev => prev + 1)
    }

    // Sync when user returns to tab or window
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    // Also sync periodically (every 30 seconds) while tab is active
    const interval = setInterval(() => {
      if (!document.hidden) {
        console.log('⏰ Periodic sync: checking for payment updates...')
        setRefreshTrigger(prev => prev + 1)
      }
    }, 30000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [])
  
  const handleStudentAdded = () => {
    // Trigger refresh of student list
    setRefreshTrigger(prev => prev + 1)
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground">Parent Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            Role: {user.role}
          </Badge>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <AddStudentForm onStudentAdded={handleStudentAdded} />
        <StudentCards refreshTrigger={refreshTrigger} />
      </div>
      
      <PaymentHistory refreshTrigger={refreshTrigger} />
      
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Welcome to the band program! Add your student above to begin managing 
            payments, accessing files, and staying connected with the program.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}