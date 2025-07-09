import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DirectorStudentTable } from "@/components/director-student-table"

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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      </div>

      <DirectorStudentTable />
    </div>
  )
}