import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/drizzle'
import { tenants, connectedAccounts } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { validateInviteCode, markInviteCodeAsUsed } from '@/lib/invite-codes'
import { isSubdomainAvailable, isValidSubdomain } from '@/lib/tenant-context'
import { RedisCloudCache } from '@/lib/redis-cloud'
import { MemoryTenantCache } from '@/lib/tenant-memory-cache'

interface SchoolData {
  name: string
  subdomain: string
  address: string
  phone: string
}

interface DirectorData {
  name: string
  email: string
}

interface CreateSchoolRequest {
  inviteCode: string
  schoolData: SchoolData
  directorData: DirectorData
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSchoolRequest = await request.json()
    const { inviteCode, schoolData, directorData } = body

    // Validate required fields
    if (!inviteCode || !schoolData.name || !schoolData.subdomain || !directorData.name || !directorData.email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1. Validate invite code
    const inviteValidation = await validateInviteCode(inviteCode)
    if (!inviteValidation.valid || !inviteValidation.invite) {
      return NextResponse.json(
        { error: inviteValidation.error || 'Invalid invite code' },
        { status: 400 }
      )
    }

    // 2. Validate subdomain
    if (!isValidSubdomain(schoolData.subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
        { status: 400 }
      )
    }

    const subdomainAvailable = await isSubdomainAvailable(schoolData.subdomain)
    if (!subdomainAvailable) {
      return NextResponse.json(
        { error: 'Subdomain is not available' },
        { status: 400 }
      )
    }

    // 3. Create tenant  
    const tenantResult = await db.insert(tenants).values({
      slug: schoolData.subdomain,
      name: schoolData.name,
      directorEmail: directorData.email,
      directorName: directorData.name,
      status: 'active', // Set status explicitly
    } as any).returning()

    const tenant = tenantResult[0]

    // 4. Mark invite code as used
    const codeUsed = await markInviteCodeAsUsed(inviteCode, tenant.id)
    if (!codeUsed) {
      // Rollback tenant creation if invite code update fails
      await db.delete(tenants).where(eq(tenants.id, tenant.id))
      return NextResponse.json(
        { error: 'Failed to process invite code' },
        { status: 500 }
      )
    }

    // 5. Cache the new tenant for immediate availability
    const cachedTenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      directorEmail: tenant.directorEmail,
      directorName: tenant.directorName,
    }
    await RedisCloudCache.setTenant(tenant.slug, cachedTenant)
    MemoryTenantCache.setTenant(tenant.slug, cachedTenant)

    // 6. TODO: Create Stripe Connect account (placeholder for now)
    // const stripeAccount = await createStripeConnectAccount(tenant, schoolData)
    
    // For now, create a placeholder connected account record
    await db.insert(connectedAccounts).values({
      tenantId: tenant.id,
      stripeAccountId: `acct_placeholder_${tenant.id}`,
      status: 'pending',
    })

    // 7. TODO: Generate Stripe onboarding link (placeholder for now)
    // const onboardingLink = await createStripeOnboardingLink(stripeAccount.id, tenant.slug)
    
    // For now, redirect to tenant dashboard
    const tenantUrl = `https://${tenant.slug}.boosted.band/dashboard`

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      // onboardingLink, // TODO: Add when Stripe Connect is implemented
      redirectUrl: tenantUrl,
    })

  } catch (error) {
    console.error('Error creating school:', error)
    return NextResponse.json(
      { error: 'Failed to create school account' },
      { status: 500 }
    )
  }
}