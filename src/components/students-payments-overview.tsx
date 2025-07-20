'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Eye, Users, DollarSign, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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


  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
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
                      <Link href={`/dashboard/student/${student.id}`}>
                        <Button 
                          variant="outline" 
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                      </Link>
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