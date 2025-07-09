"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, User, Music, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Student {
  id: string
  name: string
  instrument: string
  status: 'PENDING' | 'ACTIVE'
  relationshipId: string
  createdAt: string
}

interface StudentCardsProps {
  refreshTrigger: number
}

export function StudentCards({ refreshTrigger }: StudentCardsProps) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/students')
      const data = await response.json()

      if (response.ok) {
        setStudents(data.students)
      } else {
        setError(data.error || 'Failed to fetch students')
      }
    } catch {
      setError('Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [refreshTrigger])

  const handleDeleteStudent = async (relationshipId: string) => {
    // TODO: Implement soft delete API endpoint
    console.log('Delete student relationship:', relationshipId)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading students...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Students</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Students</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No students registered yet. Add a student to get started!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Students</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.relationshipId}
              className="flex items-center justify-between p-3 border rounded-lg bg-card"
            >
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{student.name}</p>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Music className="h-4 w-4" />
                    <span>{student.instrument}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {student.status === 'ACTIVE' ? 'Active' : 'Pending'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteStudent(student.relationshipId)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {students.some(s => s.status === 'PENDING') && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              Some students are pending verification. Your account is being set up.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}