"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle2, DollarSign, Search } from "lucide-react"

interface BoosterDashboardProps {
  user: {
    name: string
    email: string
    role: string
  }
}

interface GuestPayment {
  id: string
  parentName: string
  parentEmail: string
  studentName: string
  amount: number
  notes: string | null
  status: string
  category: {
    name: string
    description: string | null
  }
  matchedStudent: {
    id: string
    name: string
    instrument: string
  } | null
  resolutionNotes: string | null
  createdAt: string
}

interface Student {
  id: string
  name: string
  instrument: string
}

export function BoosterDashboard({ user }: BoosterDashboardProps) {
  const [guestPayments, setGuestPayments] = useState<GuestPayment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedPayment, setSelectedPayment] = useState<GuestPayment | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState("")
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const fetchData = async () => {
    try {
      console.log('🚀 BOOSTER DASHBOARD: Fetching guest payments...')
      
      const [paymentsRes, studentsRes] = await Promise.all([
        fetch('/api/booster/guest-payments'),
        fetch('/api/booster/students')
      ])
      
      console.log('📡 Payments API response status:', paymentsRes.status)
      console.log('📡 Students API response status:', studentsRes.status)
      
      if (paymentsRes.ok && studentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        const studentsData = await studentsRes.json()
        
        console.log('📥 Received payments data:', paymentsData)
        console.log('📥 Number of guest payments:', paymentsData.length)
        console.log('📥 Received students data length:', studentsData.length)
        
        setGuestPayments(paymentsData)
        setStudents(studentsData)
      } else {
        console.error('❌ API call failed - Payments status:', paymentsRes.status, 'Students status:', studentsRes.status)
        
        // Try to get error details
        try {
          const paymentsError = await paymentsRes.text()
          const studentsError = await studentsRes.text()
          console.error('❌ Payments error response:', paymentsError)
          console.error('❌ Students error response:', studentsError)
        } catch {
          console.error('❌ Could not read error responses')
        }
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const unresolvedPayments = guestPayments.filter(p => !p.matchedStudent && p.status === 'COMPLETED')
  const resolvedPayments = guestPayments.filter(p => p.matchedStudent || p.status !== 'COMPLETED')

  const handleResolvePayment = async () => {
    if (!selectedPayment || !selectedStudentId) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/booster/resolve-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          studentId: selectedStudentId,
          resolutionNotes
        })
      })
      
      if (response.ok) {
        await fetchData()
        setIsDialogOpen(false)
        setSelectedPayment(null)
        setSelectedStudentId("")
        setResolutionNotes("")
      }
    } catch (error) {
      console.error('Error resolving payment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`

  const getStatusBadge = (payment: GuestPayment) => {
    if (payment.matchedStudent) {
      return <Badge className="bg-green-100 text-green-800">Resolved</Badge>
    }
    return <Badge variant="secondary">Needs Review</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
          <p className="text-muted-foreground">Booster Dashboard - Guest Payment Review</p>
        </div>
        <Badge variant="destructive" className="text-sm">
          Role: {user.role}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guest Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{guestPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(guestPayments.reduce((sum, p) => sum + p.amount, 0))} total
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{unresolvedPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Requires manual matching
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              Successfully matched
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="unresolved" className="space-y-4">
        <TabsList>
          <TabsTrigger value="unresolved">
            Needs Review ({unresolvedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedPayments.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="unresolved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Guest Payments Requiring Review</CardTitle>
              <CardDescription>
                These payments could not be automatically matched to students and require manual verification.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unresolvedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.parentName}</div>
                          <div className="text-sm text-muted-foreground">{payment.parentEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{payment.studentName}</TableCell>
                      <TableCell>{payment.category.name}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getStatusBadge(payment)}</TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen && selectedPayment?.id === payment.id} onOpenChange={(open) => {
                          setIsDialogOpen(open)
                          if (open) {
                            setSelectedPayment(payment)
                            setResolutionNotes(payment.resolutionNotes || "")
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Search className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Resolve Guest Payment</DialogTitle>
                              <DialogDescription>
                                Match this payment to the correct student.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-medium mb-2">Payment Details</h4>
                                <div className="text-sm space-y-1">
                                  <div><strong>Parent:</strong> {payment.parentName}</div>
                                  <div><strong>Student:</strong> {payment.studentName}</div>
                                  <div><strong>Amount:</strong> {formatCurrency(payment.amount)}</div>
                                  <div><strong>Category:</strong> {payment.category.name}</div>
                                  {payment.notes && <div><strong>Notes:</strong> {payment.notes}</div>}
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="student">Select Correct Student</Label>
                                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose student..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {students.map((student) => (
                                      <SelectItem key={student.id} value={student.id}>
                                        {student.name} ({student.instrument})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="notes">Resolution Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={resolutionNotes}
                                  onChange={(e) => setResolutionNotes(e.target.value)}
                                  placeholder="Add notes about this resolution..."
                                  rows={3}
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={handleResolvePayment}
                                  disabled={!selectedStudentId || isLoading}
                                  className="flex-1"
                                >
                                  {isLoading ? "Resolving..." : "Resolve Payment"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsDialogOpen(false)}
                                  disabled={isLoading}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                  {unresolvedPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No payments requiring review
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resolved" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resolved Guest Payments</CardTitle>
              <CardDescription>
                These payments have been successfully matched to students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Matched Student</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resolvedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{payment.parentName}</div>
                          <div className="text-sm text-muted-foreground">{payment.parentEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{payment.studentName}</TableCell>
                      <TableCell>
                        {payment.matchedStudent ? (
                          <div>
                            <div className="font-medium">{payment.matchedStudent.name}</div>
                            <div className="text-sm text-muted-foreground">{payment.matchedStudent.instrument}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{payment.category.name}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getStatusBadge(payment)}</TableCell>
                    </TableRow>
                  ))}
                  {resolvedPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No resolved payments yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}