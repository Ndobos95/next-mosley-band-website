"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Trash2, User, Music, Loader2, DollarSign, Plus, CreditCard } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PAYMENT_CATEGORIES, type StudentEnrollments, type PaymentCategory } from "@/types/stripe"
import { extractTenantSlugFromPath } from "@/lib/tenant-utils"

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
  const [enrollments, setEnrollments] = useState<StudentEnrollments>({})
  const [loading, setLoading] = useState(true)
  const [enrollmentLoading, setEnrollmentLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // Helper to get current tenant slug
  const getTenantSlug = () => extractTenantSlugFromPath(window.location.pathname)

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)

      const tenantSlug = getTenantSlug()
      if (!tenantSlug) {
        setError('Missing tenant context')
        setLoading(false)
        return
      }

      const [studentsResponse, enrollmentsResponse] = await Promise.all([
        fetch(`/api/students?tenant=${tenantSlug}`, { credentials: 'include' }),
        fetch(`/api/payments/enrollments?tenant=${tenantSlug}`, { credentials: 'include' })
      ])
      
      const studentsData = await studentsResponse.json()
      const enrollmentsData = await enrollmentsResponse.json()

      if (studentsResponse.ok) {
        setStudents(studentsData.students)
      } else {
        setError(studentsData.error || 'Failed to fetch students')
      }
      
      if (enrollmentsResponse.ok) {
        setEnrollments(enrollmentsData.enrollments)
      }
      
    } catch {
      setError('Failed to fetch data')
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

  const handleEnroll = async (studentId: string, category: PaymentCategory) => {
    const loadingKey = `${studentId}-${category}`
    setEnrollmentLoading(prev => ({ ...prev, [loadingKey]: true }))

    try {
      const tenantSlug = getTenantSlug()
      if (!tenantSlug) return

      const response = await fetch(`/api/payments/enroll?tenant=${tenantSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, category })
      })

      if (response.ok) {
        // Refresh enrollments
        const enrollmentsResponse = await fetch(`/api/payments/enrollments?tenant=${tenantSlug}`, {
          credentials: 'include'
        })
        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json()
          setEnrollments(enrollmentsData.enrollments)
        }
      }
    } catch (error) {
      console.error('Failed to enroll student:', error)
    } finally {
      setEnrollmentLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  const handleUnenroll = async (studentId: string, category: PaymentCategory) => {
    const loadingKey = `${studentId}-${category}`
    setEnrollmentLoading(prev => ({ ...prev, [loadingKey]: true }))

    try {
      const tenantSlug = getTenantSlug()
      if (!tenantSlug) return

      const response = await fetch(`/api/payments/enroll?tenant=${tenantSlug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, category })
      })

      if (response.ok) {
        // Refresh enrollments
        const enrollmentsResponse = await fetch(`/api/payments/enrollments?tenant=${tenantSlug}`, {
          credentials: 'include'
        })
        if (enrollmentsResponse.ok) {
          const enrollmentsData = await enrollmentsResponse.json()
          setEnrollments(enrollmentsData.enrollments)
        }
      }
    } catch (error) {
      console.error('Failed to unenroll student:', error)
    } finally {
      setEnrollmentLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
  }

  const formatMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const handlePayment = async (studentId: string, studentName: string, category: PaymentCategory, incrementCount: number = 1) => {
    const loadingKey = `${studentId}-${category}-payment`
    setEnrollmentLoading(prev => ({ ...prev, [loadingKey]: true }))

    try {
      const tenantSlug = getTenantSlug()
      if (!tenantSlug) return

      const response = await fetch(`/api/payments/create-checkout?tenant=${tenantSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          category,
          incrementCount
        })
      })

      const data = await response.json()

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url
      } else {
        console.error('Failed to create checkout session:', data.error)
      }
    } catch (error) {
      console.error('Failed to initiate payment:', error)
    } finally {
      setEnrollmentLoading(prev => ({ ...prev, [loadingKey]: false }))
    }
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
        <div className="space-y-4">
          {students.map((student) => {
            const studentEnrollment = enrollments[student.id]
            
            return (
              <Card key={student.relationshipId} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  {/* Student Header */}
                  <div className="flex items-center justify-between mb-4">
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

                  {/* Payment Categories Section */}
                  {student.status === 'ACTIVE' && (
                    <>
                      <Separator className="mb-4" />
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                          <DollarSign className="h-4 w-4" />
                          <span>Payment Categories</span>
                        </div>
                        
                        {Object.entries(PAYMENT_CATEGORIES).map(([categoryKey, categoryConfig]) => {
                          const category = categoryKey as PaymentCategory
                          const enrollment = studentEnrollment?.categories?.[category]
                          const isEnrolled = enrollment?.enrolled ?? false
                          const amountPaid = enrollment?.amountPaid ?? 0
                          const totalOwed = enrollment?.totalOwed ?? categoryConfig.totalAmount
                          const progress = totalOwed > 0 ? (amountPaid / totalOwed) * 100 : 0
                          const loadingKey = `${student.id}-${category}`
                          const isLoading = enrollmentLoading[loadingKey] ?? false
                          
                          return (
                            <div key={category} className="space-y-2 p-3 border rounded bg-muted/30">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-sm">{categoryConfig.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatMoney(categoryConfig.totalAmount)} total
                                    {categoryConfig.increment < categoryConfig.totalAmount && 
                                      ` • ${formatMoney(categoryConfig.increment)} increments`
                                    }
                                  </p>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  {isEnrolled ? (
                                    <>
                                      <Badge variant="default" className="text-xs">Enrolled</Badge>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleUnenroll(student.id, category)}
                                        disabled={isLoading}
                                        className="h-7 px-2 text-xs"
                                      >
                                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Unenroll'}
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Badge variant="secondary" className="text-xs">Not Enrolled</Badge>
                                      <Button
                                        size="sm"
                                        onClick={() => handleEnroll(student.id, category)}
                                        disabled={isLoading}
                                        className="h-7 px-2 text-xs"
                                      >
                                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3 mr-1" />}
                                        {isLoading ? '' : 'Enroll'}
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {isEnrolled && (
                                <div className="space-y-2">
                                  <div className="flex justify-between text-xs">
                                    <span>Paid: {formatMoney(amountPaid)}</span>
                                    <span>Remaining: {formatMoney(totalOwed - amountPaid)}</span>
                                  </div>
                                  <Progress value={progress} className="h-2" />
                                  
                                  {/* Payment buttons for enrolled categories */}
                                  {amountPaid < totalOwed && (
                                    <div className="flex items-center justify-between pt-2">
                                      <div className="text-xs text-muted-foreground">
                                        {categoryConfig.increment < categoryConfig.totalAmount 
                                          ? `Pay in ${formatMoney(categoryConfig.increment)} increments`
                                          : 'Pay in full'
                                        }
                                      </div>
                                      <div className="flex space-x-1">
                                        {/* Single increment payment button */}
                                        <Button
                                          size="sm"
                                          onClick={() => handlePayment(student.id, student.name, category, 1)}
                                          disabled={enrollmentLoading[`${student.id}-${category}-payment`]}
                                          className="h-6 px-2 text-xs"
                                        >
                                          {enrollmentLoading[`${student.id}-${category}-payment`] ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <>
                                              <CreditCard className="h-3 w-3 mr-1" />
                                              {formatMoney(categoryConfig.increment)}
                                            </>
                                          )}
                                        </Button>
                                        
                                        {/* Multiple increment payment button (for Spring Trip) */}
                                        {category === 'SPRING_TRIP' && (totalOwed - amountPaid) >= (categoryConfig.increment * 4) && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handlePayment(student.id, student.name, category, 4)}
                                            disabled={enrollmentLoading[`${student.id}-${category}-payment`]}
                                            className="h-6 px-2 text-xs"
                                          >
                                            {formatMoney(categoryConfig.increment * 4)}
                                          </Button>
                                        )}
                                        
                                        {/* Pay remaining balance button */}
                                        {(totalOwed - amountPaid) > categoryConfig.increment && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              const remainingIncrements = Math.ceil((totalOwed - amountPaid) / categoryConfig.increment)
                                              handlePayment(student.id, student.name, category, remainingIncrements)
                                            }}
                                            disabled={enrollmentLoading[`${student.id}-${category}-payment`]}
                                            className="h-6 px-2 text-xs"
                                          >
                                            Pay All
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Paid in full message */}
                                  {amountPaid >= totalOwed && (
                                    <div className="flex items-center justify-center py-1">
                                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                                        ✓ Paid in Full
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                  
                  {student.status === 'PENDING' && (
                    <>
                      <Separator className="mb-4" />
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertDescription className="text-yellow-800 text-sm">
                          Payment enrollment will be available once your student is approved by the director.
                        </AlertDescription>
                      </Alert>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
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