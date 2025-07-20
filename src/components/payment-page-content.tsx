"use client"

import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StudentCards } from "@/components/student-cards"
import Link from "next/link"

export function PaymentPageContent() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Make a Payment</h1>
            <p className="text-muted-foreground">
              Pay for your students&apos; band fees, trips, and equipment
            </p>
          </div>
        </div>

        {/* Reuse StudentCards component - it already has all the payment logic */}
        <StudentCards refreshTrigger={0} />

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Need to manage your enrollments? <Link href="/dashboard" className="text-primary hover:underline">Go to Dashboard</Link></p>
            <p>Questions about payments? Contact the band director.</p>
          </div>
        </div>
      </div>
    </div>
  )
}