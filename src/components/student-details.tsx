"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { User, Music, DollarSign, Mail, Calendar } from "lucide-react"
import { PAYMENT_CATEGORIES } from "@/types/stripe"

interface Parent {
  id: string
  name: string
  email: string
  status: string
  hasStripeAccount: boolean
}

interface Payment {
  id: string
  amount: number
  status: string
  parentEmail: string
  studentName: string
  notes?: string
  createdAt: string
}

interface GuestPayment {
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
}

interface Enrollment {
  category: string
  categoryId: string
  totalOwed: number
  amountPaid: number
  remaining: number
  status: string
  payments: Payment[]
}

interface StudentDetailsProps {
  student: {
    id: string
    name: string
    instrument: string
    grade?: number
    source: string
    parents: Parent[]
    enrollments: Enrollment[]
    guestPayments: GuestPayment[]
    totalOwed: number
    totalPaid: number
    totalRemaining: number
    createdAt: string
    updatedAt: string
  }
}

export function StudentDetails({ student }: StudentDetailsProps) {
  const formatMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Combine all payments for timeline
  const allPayments = [
    ...student.enrollments.flatMap(e => e.payments.map(p => ({ ...p, type: 'authenticated', category: e.category }))),
    ...student.guestPayments.map(p => ({ ...p, type: 'guest', category: p.categoryName }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="space-y-6">
      {/* Student Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Student Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <Music className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Instrument</p>
                <p className="font-medium">{student.instrument}</p>
              </div>
            </div>
            
            {student.grade && (
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Grade</p>
                  <p className="font-medium">{student.grade}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Total Owed</p>
                <p className="font-medium">{formatMoney(student.totalOwed)}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-medium text-green-600">{formatMoney(student.totalPaid)}</p>
              </div>
            </div>
          </div>
          
          {student.totalOwed > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>Payment Progress</span>
                <span>{Math.round((student.totalPaid / student.totalOwed) * 100)}%</span>
              </div>
              <Progress value={(student.totalPaid / student.totalOwed) * 100} className="h-3" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(PAYMENT_CATEGORIES).map(([categoryKey, categoryConfig]) => {
              const enrollment = student.enrollments.find(e => e.category === categoryConfig.name)
              const isEnrolled = !!enrollment
              const amountPaid = enrollment?.amountPaid ?? 0
              const totalOwed = enrollment?.totalOwed ?? 0
              const progress = totalOwed > 0 ? (amountPaid / totalOwed) * 100 : 0
              
              return (
                <div key={categoryKey} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{categoryConfig.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMoney(categoryConfig.totalAmount)} total
                        {categoryConfig.increment < categoryConfig.totalAmount && 
                          ` • ${formatMoney(categoryConfig.increment)} increments`
                        }
                      </p>
                    </div>
                    
                    <div className="text-right">
                      {isEnrolled ? (
                        <>
                          <Badge variant="default" className="mb-1">Enrolled</Badge>
                          <p className="text-sm text-muted-foreground">
                            {formatMoney(amountPaid)} of {formatMoney(totalOwed)} paid
                          </p>
                        </>
                      ) : (
                        <Badge variant="secondary">Not Enrolled</Badge>
                      )}
                    </div>
                  </div>
                  
                  {isEnrolled && totalOwed > 0 && (
                    <div className="space-y-2">
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Remaining: {formatMoney(totalOwed - amountPaid)}</span>
                        <span>{progress.toFixed(1)}% complete</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Parent Information */}
      <Card>
        <CardHeader>
          <CardTitle>Parent Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {student.parents.map((parent) => (
              <div key={parent.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{parent.name}</p>
                    <p className="text-sm text-muted-foreground">{parent.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={parent.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {parent.status}
                  </Badge>
                  {parent.hasStripeAccount && (
                    <Badge variant="outline" className="text-xs">
                      Payment Account
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            
            {student.parents.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No parents linked to this student
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{formatMoney(payment.amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {payment.category} • {formatDate(payment.createdAt)}
                  </p>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: {payment.notes}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <Badge 
                    variant={payment.status === 'COMPLETED' ? 'default' : 'secondary'}
                    className="mb-1"
                  >
                    {payment.status}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {'type' in payment && payment.type === 'guest' ? 'Guest Payment' : 'Account Payment'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {'parentEmail' in payment ? payment.parentEmail : (payment as GuestPayment).parentName}
                  </p>
                </div>
              </div>
            ))}
            
            {allPayments.length === 0 && (
              <p className="text-muted-foreground text-center py-4">
                No payments recorded for this student
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}