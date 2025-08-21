'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Loader2, AlertCircle, ArrowRight, Home } from 'lucide-react'

export default function PaymentSuccessPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'incomplete' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Check the onboarding status with the backend
    checkOnboardingStatus()
  }, [])

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/stripe/connect/status', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to check status')
      }

      const data = await response.json()

      if (data.charges_enabled && data.payouts_enabled) {
        setStatus('success')
        setMessage('Your payment processing is fully set up!')
      } else if (data.details_submitted) {
        setStatus('incomplete')
        setMessage('Your information has been submitted and is being reviewed by Stripe.')
      } else {
        setStatus('incomplete')
        setMessage('Additional information is needed to complete setup.')
      }
    } catch {
      setStatus('error')
      setMessage('Unable to verify setup status. Please try again.')
    }
  }

  const handleContinueSetup = async () => {
    // Regenerate onboarding link
    try {
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (response.ok) {
        const { url } = await response.json()
        window.location.href = url
      }
    } catch (error) {
      console.error('Failed to continue setup:', error)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-5 w-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
            {status === 'incomplete' && <AlertCircle className="h-5 w-5 text-yellow-600" />}
            {status === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
            Payment Setup Status
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Checking your setup status...'}
            {status !== 'loading' && message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && (
            <>
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  Excellent! Your school can now accept online payments. Parents will be able to pay for band fees, 
                  trips, and equipment directly through your band program website.
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">What happens next?</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Parents can immediately start making payments</li>
                  <li>• Funds will be deposited directly to your school&apos;s bank account</li>
                  <li>• You&apos;ll receive email notifications for each payment</li>
                  <li>• Access payment reports from your dashboard</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => router.push('/dashboard')} className="gap-2">
                  <Home className="h-4 w-4" />
                  Go to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === 'incomplete' && (
            <>
              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                  Your setup is incomplete. Additional information may be required to activate payment processing.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">Why is this happening?</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Stripe may need to verify your school&apos;s information</li>
                  <li>• Additional documentation might be required</li>
                  <li>• Bank account verification may be pending</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleContinueSetup} className="gap-2">
                  Continue Setup
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Return to Dashboard
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertDescription>
                  We couldn&apos;t verify your payment setup status. This might be a temporary issue.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => router.push('/dashboard')}>
                  Return to Dashboard
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}