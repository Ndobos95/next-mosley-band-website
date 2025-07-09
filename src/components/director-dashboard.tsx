import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DirectorDashboardProps {
  user: {
    name: string
    email: string
    role: string
  }
}

export function DirectorDashboard({ user }: DirectorDashboardProps) {
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
      
      <Card>
        <CardHeader>
          <CardTitle>Admin Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is your director dashboard. Here you&apos;ll be able to manage students, 
            review registrations, upload files, and view analytics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}