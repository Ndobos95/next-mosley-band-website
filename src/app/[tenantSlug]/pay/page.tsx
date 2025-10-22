import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { headers } from 'next/headers'
import { resolveTenantFromHeaders } from '@/lib/tenancy'
import { GuestPaymentForm } from "@/components/guest-payment-form"
import { PaymentPageContent } from "@/components/payment-page-content"

export const dynamic = 'force-dynamic'

export default async function PaymentPage() {
  // TODO: Replace with Supabase Auth
  const session = null // Temporary during migration

  const tenant = await resolveTenantFromHeaders(await headers())
  if (!tenant) throw new Error('Tenant not found')

  const categoriesData = await prisma.payment_categories.findMany({
    where: {
      active: true,
      tenant_id: tenant.id
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Transform database results to match component interface (snake_case -> camelCase)
  const categories = categoriesData.map(cat => ({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    fullAmount: cat.full_amount,
    allowIncrements: cat.allow_increments,
    incrementAmount: cat.increment_amount
  }))

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
            Have an account? <Link href="/login" className="text-primary hover:underline">Sign in to view your payment history</Link>
          </p>
        </div>
      </div>
    </div>
  )
}