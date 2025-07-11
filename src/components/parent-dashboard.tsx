"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
        <Badge variant="secondary" className="text-sm">
          Role: {user.role}
        </Badge>
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