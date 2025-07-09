import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ParentDashboardProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export function ParentDashboard({ user }: ParentDashboardProps) {
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
      
      <Card>
        <CardHeader>
          <CardTitle>Your Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is your parent dashboard. Here you&apos;ll be able to manage your students, 
            make payments, and access important files.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}