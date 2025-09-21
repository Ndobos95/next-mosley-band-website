import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/drizzle'
import { connectedAccounts, tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get tenant from request headers (set by middleware)
    const tenantId = request.headers.get('x-tenant-id')
    const tenantSlug = request.headers.get('x-tenant-slug')

    if (!tenantId || !tenantSlug) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    // Check if user is a director for this tenant
    // TODO: Add proper role checking once membership system is in place
    
    // Check if tenant already has a connected account
    const existingAccount = await db
      .select()
      .from(connectedAccounts)
      .where(eq(connectedAccounts.tenantId, tenantId))
      .limit(1)

    let stripeAccountId: string

    if (existingAccount.length > 0) {
      // Use existing account
      stripeAccountId = existingAccount[0].stripeAccountId
      console.log('Using existing Stripe account:', stripeAccountId)
    } else {
      // Get tenant details
      const tenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1)

      if (!tenant[0]) {
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
      }

      // Create new Stripe Connect account (Express type for simplicity)
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: tenant[0].directorEmail || user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Don't specify business_type - let Stripe ask during onboarding
        // This way schools can choose: individual, company, or non_profit
        business_profile: {
          name: tenant[0].name,
          product_description: 'School band program accepting payments for fees, trips, and equipment',
        },
        metadata: {
          tenantId: tenantId,
          tenantSlug: tenantSlug,
          platform: 'boosted-band',
        },
      })

      stripeAccountId = account.id

      // Save to database
      await db.insert(connectedAccounts).values({
        tenantId: tenantId,
        stripeAccountId: stripeAccountId,
        status: 'pending_onboarding',
      })

      console.log('Created new Stripe account:', stripeAccountId)
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${getBaseUrl(request)}/onboarding/payment-setup`,
      return_url: `${getBaseUrl(request)}/onboarding/payment-success`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ 
      url: accountLink.url,
      accountId: stripeAccountId,
    })
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error)
    return NextResponse.json(
      { error: 'Failed to create payment account' },
      { status: 500 }
    )
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  return `${protocol}://${host}`
}