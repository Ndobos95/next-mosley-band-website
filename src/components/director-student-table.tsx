"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Music, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { LinkStudentDialog } from "@/components/link-student-dialog"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

interface StudentWithParent {
  id: string
  name: string
  instrument: string
  source: 'ROSTER' | 'PARENT_REGISTRATION' | 'MANUAL'
  parentName?: string
  parentEmail?: string
  status: 'PENDING' | 'ACTIVE' | 'UNCLAIMED' | 'REJECTED'
  relationshipId?: string
  createdAt?: string
}

export function DirectorStudentTable() {
  const [students, setStudents] = useState<StudentWithParent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data } = await supabase.from('students').select('*')

        setStudents(data || [])
    } catch {
      setError('Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  const handleApproveStudent = async (relationshipId: string) => {
    try {
      const response = await fetch(`/api/director/students/${relationshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      })

      if (response.ok) {
        console.log('Successfully approved student')
        fetchStudents() // Refresh the list
      } else {
        const error = await response.json()
        console.error('Failed to approve student:', error)
      }
    } catch (error) {
      console.error('Error approving student:', error)
    }
  }

  const handleRejectStudent = async (relationshipId: string) => {
    try {
      const response = await fetch(`/api/director/students/${relationshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      })

      if (response.ok) {
        console.log('Successfully rejected student')
        fetchStudents() // Refresh the list
      } else {
        const error = await response.json()
        console.error('Failed to reject student:', error)
      }
    } catch (error) {
      console.error('Error rejecting student:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'REJECTED':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'UNCLAIMED':
        return <AlertCircle className="h-4 w-4 text-gray-400" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">Active</Badge>
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>
      case 'UNCLAIMED':
        return <Badge variant="outline">Unclaimed</Badge>
      default:
        return null
    }
  }

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'ROSTER':
        return <Badge variant="default" className="text-xs">Official</Badge>
      case 'PARENT_REGISTRATION':
        return <Badge variant="secondary" className="text-xs">Parent Input</Badge>
      case 'MANUAL':
        return <Badge variant="outline" className="text-xs">Manual</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student Roster</CardTitle>
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
          <CardTitle>Student Roster</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Student Roster
          <Badge variant="outline" className="ml-auto">
            {students.length} students
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{student.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <span>{student.instrument}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getSourceBadge(student.source)}
                  </TableCell>
                  <TableCell>
                    {student.parentName ? (
                      <div>
                        <div className="font-medium">{student.parentName}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.parentEmail}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No parent assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(student.status)}
                      {getStatusBadge(student.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.status === 'PENDING' && student.relationshipId && (
                      <div className="flex gap-2">
                        {student.source === 'PARENT_REGISTRATION' && (
                          <LinkStudentDialog
                            parentName={student.parentName || 'Unknown Parent'}
                            studentName={student.name}
                            relationshipId={student.relationshipId}
                            onSuccess={fetchStudents}
                          />
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleApproveStudent(student.relationshipId!)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectStudent(student.relationshipId!)}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        {students.filter(s => s.status === 'PENDING').length > 0 && (
          <Alert className="mt-4 border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              You have {students.filter(s => s.status === 'PENDING').length} pending student registrations that need review.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}