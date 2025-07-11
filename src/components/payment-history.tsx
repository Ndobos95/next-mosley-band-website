"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar, DollarSign, User, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { StripePaymentData } from "@/types/stripe"

interface PaymentHistoryProps {
  refreshTrigger: number
}

export function PaymentHistory({ refreshTrigger }: PaymentHistoryProps) {
  const [payments, setPayments] = useState<StripePaymentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/payments/history')
      const data = await response.json()

      if (response.ok) {
        setPayments(data.payments || [])
      } else {
        setError(data.error || 'Failed to fetch payment history')
      }
    } catch {
      setError('Failed to fetch payment history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentHistory()
  }, [refreshTrigger])

  const formatMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: StripePaymentData['status']) => {
    switch (status) {
      case 'succeeded':
        return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'refunded':
        return <Badge variant="outline">Refunded</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Payment History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading payment history...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Payment History</span>
          </CardTitle>
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

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Payment History</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No payments yet. Enroll students in payment categories to get started!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5" />
          <span>Payment History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment, index) => (
            <div key={payment.id}>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getStatusBadge(payment.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium text-sm">
                        {payment.metadata.studentName || 'Unknown Student'}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {payment.metadata.category || 'Unknown Category'}
                      {payment.metadata.increment && ` • ${payment.metadata.increment}`}
                    </p>
                    {payment.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {payment.description}
                      </p>
                    )}
                    {payment.metadata.notes && (
                      <p className="text-xs text-blue-600 mt-1">
                        Note: {payment.metadata.notes}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-medium">
                    {formatMoney(payment.amount)}
                  </p>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(payment.created)}</span>
                  </div>
                </div>
              </div>
              
              {index < payments.length - 1 && <Separator />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}