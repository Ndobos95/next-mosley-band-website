import { auth } from "@/lib/auth"
import { db } from "@/lib/drizzle"
import { paymentCategories } from "@/db/schema"
import { asc, and, eq } from "drizzle-orm"
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
  const categories = await db
    .select()
    .from(paymentCategories)
    .where(and(eq(paymentCategories.active, true), eq(paymentCategories.tenantId, tenant.id)))
    .orderBy(asc(paymentCategories.name))

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