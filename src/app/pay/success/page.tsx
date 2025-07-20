import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Home, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

function SuccessContent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Payment Successful!</CardTitle>
            <CardDescription>
              Your payment has been processed successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 text-sm">
              <p className="font-medium mb-2">What happens next?</p>
              <ul className="text-left space-y-1 text-muted-foreground">
                <li>• You&apos;ll receive a receipt via email</li>
                <li>• Payment will be applied to the student&apos;s account</li>
                <li>• Band director will verify student information if needed</li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link href="/pay">
                  <Receipt className="mr-2 h-4 w-4" />
                  Make Another Payment
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Questions? Contact the band director or{" "}
                <Link href="/dashboard" className="text-primary hover:underline">
                  create an account
                </Link>{" "}
                to track your payments.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}