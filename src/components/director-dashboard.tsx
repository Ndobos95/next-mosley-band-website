"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DirectorStudentTable } from "@/components/director-student-table"
import { StudentsPaymentsOverview } from "@/components/students-payments-overview"
import { DonationsOverview } from "@/components/donations-overview"
import { Heart } from "lucide-react"

interface DirectorDashboardProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export function DirectorDashboard({ user }: DirectorDashboardProps) {
  const [donationTotals, setDonationTotals] = useState<{count: number, amount: number} | null>(null)

  const fetchDonationTotals = async () => {
    try {
      const response = await fetch('/api/donations', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setDonationTotals(data.totals)
      }
    } catch (error) {
      console.error('Error fetching donation totals:', error)
    }
  }

  useEffect(() => {
    fetchDonationTotals()
  }, [])

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground">Director Dashboard</p>
        </div>
        <Badge variant="default" className="text-sm">
          Role: {user.role}
        </Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Review and approve student registrations from parents.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              View payment status and history for all families in the band program.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">File Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Upload and manage forms, documents, and other files for parents.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg">Donations</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {donationTotals ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(donationTotals.amount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {donationTotals.count} donation{donationTotals.count !== 1 ? 's' : ''} received
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl font-bold">Loading...</div>
                <p className="text-xs text-muted-foreground">Fetching donation data</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Student Management</TabsTrigger>
          <TabsTrigger value="payments">Payment Overview</TabsTrigger>
          <TabsTrigger value="donations">Donations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="students">
          <DirectorStudentTable />
        </TabsContent>
        
        <TabsContent value="payments">
          <StudentsPaymentsOverview />
        </TabsContent>
        
        <TabsContent value="donations">
          <DonationsOverview />
        </TabsContent>
      </Tabs>
    </div>
  )
}