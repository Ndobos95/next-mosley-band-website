import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BoosterDashboardProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export function BoosterDashboard({ user }: BoosterDashboardProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground">Booster Dashboard</p>
        </div>
        <Badge variant="destructive" className="text-sm">
          Role: {user.role}
        </Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="text-lg">Parent Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Monitor parent accounts and student registrations across the program.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              View all registered students and their parent associations.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booster Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            As a booster, you have access to view all payment data, parent accounts, and student registrations. 
            You can help track payments and support families with their band program participation.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Note: You cannot access the director&apos;s private roster or administrative settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}