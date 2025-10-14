import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


import { validateInviteCode, markInviteCodeAsUsed } from '@/lib/invite-codes'
import { isValidSubdomain } from '@/lib/tenant-context'
import { isSubdomainAvailable, getCurrentEnvironment } from '@/lib/environment'
import { getTenantBySlug } from '@/lib/tenant-context'
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
    const environment = getCurrentEnvironment()
    
    if (!isValidSubdomain(schoolData.subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format' },
        { status: 400 }
      )
    }

    // Check if subdomain is reserved or has invalid prefixes for environment
    const formatValid = isSubdomainAvailable(schoolData.subdomain)
    if (!formatValid) {
      return NextResponse.json(
        { error: 'This subdomain is reserved or not allowed' },
        { status: 400 }
      )
    }
    
    // Check if subdomain already exists in database
    const existingTenant = await getTenantBySlug(schoolData.subdomain)
    if (existingTenant) {
      return NextResponse.json(
        { error: 'Subdomain is already taken' },
        { status: 400 }
      )
    }

    // 3. Create tenant
    const tenant = await prisma.tenants.create({
      data: {
        slug: schoolData.subdomain,
        name: schoolData.name,
        director_email: directorData.email,
        director_name: directorData.name,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      }
    })

    // 4. Mark invite code as used
    await markInviteCodeAsUsed(inviteCode, tenant.id)

    // 5. Cache the new tenant for immediate availability
    const cachedTenant = {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      status: tenant.status,
      directorEmail: tenant.director_email,
      directorName: tenant.director_name,
    }
    await RedisCloudCache.setTenant(tenant.slug, cachedTenant)
    MemoryTenantCache.setTenant(tenant.slug, cachedTenant)

    // 6. TODO: Create Stripe Connect account (placeholder for now)
    // const stripeAccount = await createStripeConnectAccount(tenant, schoolData)

    // For now, create a placeholder connected account record
    await prisma.connected_accounts.create({
      data: {
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        stripe_account_id: `acct_placeholder_${tenant.id}`,
        status: 'pending',
        created_at: new Date()
      }
    })

    // 7. TODO: Generate Stripe onboarding link (placeholder for now)
    // const onboardingLink = await createStripeOnboardingLink(stripeAccount.id, tenant.slug)
    
    // Generate appropriate URL based on environment
    const tenantUrl = environment === 'staging' 
      ? `https://${tenant.slug}.boostedband.dev/dashboard`
      : environment === 'development'
      ? `http://${tenant.slug}.localhost:3000/dashboard`
      : `https://${tenant.slug}.boosted.band/dashboard`

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
      },
      environment,
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