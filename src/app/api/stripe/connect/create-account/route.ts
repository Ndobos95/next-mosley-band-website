import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'


import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to access tenant
    const profile = await prisma.user_profiles.findUnique({
      where: { id: user.id },
      select: { tenant_id: true, role: true, email: true }
    })

    if (!profile || !['DIRECTOR', 'BOOSTER'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Director/Booster access required' }, { status: 403 })
    }

    // Get tenant from user profile (until multi-tenant middleware is implemented)
    const tenantId = profile.tenant_id

    if (!tenantId) {
      return NextResponse.json({ error: 'User profile missing tenant assignment' }, { status: 400 })
    }

    // Get tenant details including slug
    const tenant = await prisma.tenants.findUnique({
      where: { id: tenantId },
      select: { id: true, slug: true, name: true, director_email: true }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const tenantSlug = tenant.slug

    // Check if tenant already has a connected account
    const existingAccount = await prisma.connected_accounts.findFirst({
      where: { tenant_id: tenantId }
    })

    let stripeAccountId: string

    if (existingAccount) {
      // Use existing account
      stripeAccountId = existingAccount.stripe_account_id
      console.log('Using existing Stripe account:', stripeAccountId)
    } else {
      // Create new Stripe Connect account (Express type for simplicity)
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: tenant.director_email || profile.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        // Don't specify business_type - let Stripe ask during onboarding
        // This way schools can choose: individual, company, or non_profit
        business_profile: {
          name: tenant.name,
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
      await prisma.connected_accounts.create({
        data: {
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          stripe_account_id: stripeAccountId,
          status: 'pending_onboarding',
          created_at: new Date()
        }
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