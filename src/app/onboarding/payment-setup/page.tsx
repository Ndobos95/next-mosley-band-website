'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle2, CreditCard, Shield, Zap, ArrowRight, Loader2 } from 'lucide-react'

export default function PaymentSetupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSetupPayments = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Call API to create Stripe Connect account and get onboarding link
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to start payment setup')
      }

      const { url } = await response.json()
      
      // Redirect to Stripe onboarding
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsLoading(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Set Up Payment Processing</h1>
        <p className="text-lg text-muted-foreground">
          Enable your band program to accept online payments from parents
        </p>
      </div>

      {/* Main Setup Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Processing Setup Required
          </CardTitle>
          <CardDescription>
            To start accepting payments, you&apos;ll need to set up your school&apos;s payment processing account.
            This takes about 5-10 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* What You'll Need */}
          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">What you&apos;ll need:</h3>
            <ul className="space-y-1 text-sm">
              <li>• Your email and phone number</li>
              <li>• Bank account for deposits (routing and account number)</li>
              <li>• School address and basic information</li>
              <li>• Tax ID (only if processing large volumes)</li>
            </ul>
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <Zap className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-semibold">Instant Setup</div>
                <div className="text-sm text-muted-foreground">
                  Start accepting payments immediately after setup
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-semibold">Secure & Compliant</div>
                <div className="text-sm text-muted-foreground">
                  PCI compliant with bank-level security
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-semibold">Direct Deposits</div>
                <div className="text-sm text-muted-foreground">
                  Funds deposited directly to your school account
                </div>
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* CTA Button */}
          <div className="flex justify-center pt-4">
            <Button 
              size="lg" 
              onClick={handleSetupPayments}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting Setup...
                </>
              ) : (
                <>
                  Set Up Payments
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-1">How long does setup take?</h4>
            <p className="text-sm text-muted-foreground">
              Most schools complete setup in 5-10 minutes. You&apos;ll be redirected to Stripe&apos;s secure onboarding flow.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">When will we receive payments?</h4>
            <p className="text-sm text-muted-foreground">
              Payments are typically deposited within 2-3 business days after a parent makes a payment.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">What are the fees?</h4>
            <p className="text-sm text-muted-foreground">
              Standard processing fees apply (2.9% + $0.30 per transaction), plus a small platform fee to support the service.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Is this secure?</h4>
            <p className="text-sm text-muted-foreground">
              Yes! All payment processing is handled by Stripe, a PCI Level 1 certified payment processor used by millions of businesses.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}