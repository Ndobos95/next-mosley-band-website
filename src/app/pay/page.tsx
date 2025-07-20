import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { GuestPaymentForm } from "@/components/guest-payment-form"
import { PaymentPageContent } from "@/components/payment-page-content"

export const dynamic = 'force-dynamic'

export default async function PaymentPage() {
  const session = await auth.api.getSession({
    headers: await headers()
  })
  
  const categories = await prisma.paymentCategory.findMany({
    where: { active: true },
    orderBy: { name: 'asc' }
  })

  // If user is authenticated, show parent payment interface
  if (session?.user) {
    return <PaymentPageContent />
  }

  // If not authenticated, show guest payment form
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Make a Payment</h1>
          <p className="text-muted-foreground">
            Pay for band fees, trips, or equipment without creating an account
          </p>
        </div>
        
        <GuestPaymentForm categories={categories} />
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Have an account? <a href="/dashboard" className="text-primary hover:underline">Sign in to view your payment history</a>
          </p>
        </div>
      </div>
    </div>
  )
}