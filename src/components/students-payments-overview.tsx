'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Eye, Users, DollarSign, AlertCircle } from 'lucide-react'

interface StudentPaymentData {
  id: string
  name: string
  instrument: string
  grade?: string
  source: string
  parents: Array<{
    name: string
    email: string
    status: string
  }>
  enrollments: Array<{
    category: string
    categoryId: string
    totalOwed: number
    amountPaid: number
    remaining: number
    status: string
    payments: Array<{
      id: string
      amount: number
      status: string
      parentEmail: string
      studentName: string
      notes?: string
      createdAt: string
    }>
  }>
  guestPayments: Array<{
    id: string
    amount: number
    status: string
    parentName: string
    parentEmail: string
    studentName: string
    categoryName: string
    notes?: string
    createdAt: string
    isGuest: true
  }>
  totalOwed: number
  totalPaid: number
  totalRemaining: number
  createdAt: string
  updatedAt: string
}

export function StudentsPaymentsOverview() {
  const [students, setStudents] = useState<StudentPaymentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<StudentPaymentData | null>(null)

  useEffect(() => {
    fetchStudentsPayments()
  }, [])

  const fetchStudentsPayments = async () => {
    try {
      const response = await fetch('/api/admin/students-payments')
      const data = await response.json()
      
      if (response.ok) {
        setStudents(data.students)
      } else {
        console.error('Failed to fetch students payments:', data.error)
      }
    } catch (error) {
      console.error('Error fetching students payments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      case 'REFUNDED':
        return <Badge className="bg-gray-100 text-gray-800">Refunded</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentProgress = (amountPaid: number, totalOwed: number) => {
    if (totalOwed === 0) return 100
    return Math.round((amountPaid / totalOwed) * 100)
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const totalStats = students.reduce(
    (acc, student) => ({
      totalOwed: acc.totalOwed + student.totalOwed,
      totalPaid: acc.totalPaid + student.totalPaid,
      totalRemaining: acc.totalRemaining + student.totalRemaining
    }),
    { totalOwed: 0, totalPaid: 0, totalRemaining: 0 }
  )

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading students payment data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalStats.totalOwed)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalStats.totalPaid)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalStats.totalRemaining)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Payment Overview</CardTitle>
          <CardDescription>
            All students and their payment status across categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Parents</TableHead>
                <TableHead>Total Owed</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                return (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.instrument}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {student.parents.length > 0 ? (
                          student.parents.map(parent => parent.name).join(', ')
                        ) : (
                          <span className="text-muted-foreground">No linked parents</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(student.totalOwed)}</TableCell>
                    <TableCell className="text-green-600">{formatCurrency(student.totalPaid)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{student.name} - Payment Details</DialogTitle>
                            <DialogDescription>
                              Complete payment history and enrollment details
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedStudent && (
                            <Tabs defaultValue="enrollments" className="w-full">
                              <TabsList>
                                <TabsTrigger value="enrollments">Category Enrollments</TabsTrigger>
                                <TabsTrigger value="payments">Payment History</TabsTrigger>
                                <TabsTrigger value="info">Student Info</TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="enrollments" className="space-y-4">
                                {selectedStudent.enrollments.map((enrollment) => (
                                  <Card key={enrollment.categoryId}>
                                    <CardHeader>
                                      <CardTitle className="text-lg">{enrollment.category}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="grid grid-cols-3 gap-4">
                                        <div>
                                          <p className="text-sm text-muted-foreground">Total Owed</p>
                                          <p className="text-lg font-semibold">{formatCurrency(enrollment.totalOwed)}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Amount Paid</p>
                                          <p className="text-lg font-semibold text-green-600">{formatCurrency(enrollment.amountPaid)}</p>
                                        </div>
                                        <div>
                                          <p className="text-sm text-muted-foreground">Remaining</p>
                                          <p className="text-lg font-semibold text-red-600">{formatCurrency(enrollment.remaining)}</p>
                                        </div>
                                      </div>
                                      <Progress 
                                        value={getPaymentProgress(enrollment.amountPaid, enrollment.totalOwed)} 
                                        className="mt-4" 
                                      />
                                    </CardContent>
                                  </Card>
                                ))}
                              </TabsContent>
                              
                              <TabsContent value="payments" className="space-y-4">
                                <div className="space-y-4">
                                  {/* Authenticated Payments */}
                                  {selectedStudent.enrollments.flatMap(e => e.payments).length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Authenticated Payments</h4>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Parent Email</TableHead>
                                            <TableHead>Notes</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {selectedStudent.enrollments
                                            .flatMap(e => e.payments)
                                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                            .map((payment) => (
                                              <TableRow key={payment.id}>
                                                <TableCell>{formatDate(payment.createdAt)}</TableCell>
                                                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                                <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                                                <TableCell>{payment.parentEmail}</TableCell>
                                                <TableCell>{payment.notes || '-'}</TableCell>
                                              </TableRow>
                                            ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                  
                                  {/* Guest Payments */}
                                  {selectedStudent.guestPayments.length > 0 && (
                                    <div>
                                      <h4 className="font-medium mb-2">Guest Payments</h4>
                                      <Table>
                                        <TableHeader>
                                          <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Parent Name</TableHead>
                                            <TableHead>Parent Email</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Notes</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {selectedStudent.guestPayments.map((payment) => (
                                            <TableRow key={payment.id}>
                                              <TableCell>{formatDate(payment.createdAt)}</TableCell>
                                              <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                              <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                                              <TableCell>{payment.parentName}</TableCell>
                                              <TableCell>{payment.parentEmail}</TableCell>
                                              <TableCell>{payment.categoryName}</TableCell>
                                              <TableCell>{payment.notes || '-'}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  )}
                                  
                                  {selectedStudent.enrollments.flatMap(e => e.payments).length === 0 && 
                                   selectedStudent.guestPayments.length === 0 && (
                                    <p className="text-muted-foreground text-center py-4">No payments found for this student</p>
                                  )}
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="info" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Student Name</p>
                                    <p className="font-medium">{selectedStudent.name}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Instrument</p>
                                    <p className="font-medium">{selectedStudent.instrument}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Grade</p>
                                    <p className="font-medium">{selectedStudent.grade || 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Source</p>
                                    <p className="font-medium">{selectedStudent.source}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Linked Parents</p>
                                    {selectedStudent.parents.length > 0 ? (
                                      <div className="space-y-1">
                                        {selectedStudent.parents.map((parent, idx) => (
                                          <div key={idx}>
                                            <p className="font-medium">{parent.name}</p>
                                            <p className="text-sm text-muted-foreground">{parent.email}</p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-muted-foreground">No linked parents</p>
                                    )}
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}