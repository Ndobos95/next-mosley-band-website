import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'


import { stripe } from '@/lib/stripe'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant from request headers
    const tenantId = request.headers.get('x-tenant-id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    // Get connected account for this tenant
    const connectedAccount = await db
      .select()
      .from(connectedAccounts)
      .where(eq(connectedAccounts.tenantId, tenantId))
      .limit(1)

    if (connectedAccount.length === 0) {
      return NextResponse.json({ 
        error: 'No payment account found',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      }, { status: 404 })
    }

    // Get account details from Stripe
    const account = await stripe.accounts.retrieve(connectedAccount[0].stripeAccountId)

    // Update status in database if it changed
    let newStatus = 'pending_onboarding'
    if (account.charges_enabled && account.payouts_enabled) {
      newStatus = 'active'
    } else if (account.details_submitted) {
      newStatus = 'pending_verification'
    }

    if (newStatus !== connectedAccount[0].status) {
      await db
        .update(connectedAccounts)
        .set({ status: newStatus })
        .where(eq(connectedAccounts.id, connectedAccount[0].id))

      // Also update tenant status if payment is fully active
      if (newStatus === 'active') {
        await db
          .update(tenants)
          .set({ status: 'active' } as any)
          .where(eq(tenants.id, tenantId))
      }
    }

    return NextResponse.json({
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
      status: newStatus,
      requirements: account.requirements,
    })
  } catch (error) {
    console.error('Error checking Stripe Connect status:', error)
    return NextResponse.json(
      { error: 'Failed to check payment account status' },
      { status: 500 }
    )
  }
}