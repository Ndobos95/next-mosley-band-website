import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Heart, Home } from "lucide-react"
import Link from "next/link"

function DonationSuccessContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-md">
        <Card className="text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">
              Thank You!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Heart className="h-6 w-6 text-red-500 mr-2" />
                <span className="text-lg font-medium">Your donation was successful!</span>
              </div>
              
              <p className="text-muted-foreground">
                Your generous contribution will make a real difference in our students&apos; musical education and opportunities.
              </p>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>What happens next?</strong><br />
                  You&apos;ll receive an email confirmation shortly with your donation details.
                  Your contribution goes directly toward supporting our band program.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/donate">
                  <Heart className="mr-2 h-4 w-4" />
                  Make Another Donation
                </Link>
              </Button>
              
              <Button variant="outline" asChild className="w-full">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Return to Homepage
                </Link>
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Thank you for supporting music education! 🎵
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function DonationSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <DonationSuccessContent />
    </Suspense>
  )
}