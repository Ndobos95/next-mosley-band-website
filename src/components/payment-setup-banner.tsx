'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AlertCircle, CreditCard, ArrowRight, X } from 'lucide-react'

interface PaymentSetupBannerProps {
  userRole?: string
}

export function PaymentSetupBanner({ userRole }: PaymentSetupBannerProps) {
  const router = useRouter()
  const [showBanner, setShowBanner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only show for directors
    if (userRole !== 'DIRECTOR') {
      setIsLoading(false)
      return
    }

    checkPaymentStatus()
  }, [userRole])

  const checkPaymentStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect/status', {
        credentials: 'include',
      })

      if (response.status === 404) {
        // No connected account exists
        setShowBanner(true)
      } else if (response.ok) {
        const data = await response.json()
        // Show banner if account is not fully active
        if (!data.charges_enabled || !data.payouts_enabled) {
          setShowBanner(true)
        }
      }
    } catch (error) {
      console.error('Failed to check payment status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !showBanner) {
    return null
  }

  return (
    <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="flex items-center justify-between">
        <span>Payment Processing Setup Required</span>
        <button
          onClick={() => setShowBanner(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm">
          Your band program needs to complete payment setup to start accepting online payments from parents.
        </p>
        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={() => router.push('/onboarding/payment-setup')}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Set Up Payments
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBanner(false)}
          >
            Remind Me Later
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}