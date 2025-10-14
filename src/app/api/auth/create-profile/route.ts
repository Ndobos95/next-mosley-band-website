import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


import { createClient } from '@/lib/supabase/server'

function getTenantSlugFromHost(host: string): string | null {
  // Remove port if present
  const hostname = host.split(':')[0]
  
  // For localhost development
  if (hostname === 'localhost') return null
  
  // Check for subdomain.localhost pattern (development)
  if (hostname.endsWith('.localhost')) {
    const subdomain = hostname.replace('.localhost', '')
    return subdomain
  }
  
  // Extract subdomain for production (first part before first dot)
  const parts = hostname.split('.')
  if (parts.length > 2) {
    const subdomain = parts[0]
    // Skip www and other reserved subdomains
    if (subdomain === 'www' || subdomain === 'app') return null
    return subdomain
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    const { displayName } = await request.json()

    // Get the actual authenticated user from Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get tenant from the host header directly
    const host = request.headers.get('host') || ''
    const tenantSlug = getTenantSlugFromHost(host)

    let targetTenant

    if (tenantSlug) {
      // We're on a tenant subdomain, use that tenant
      targetTenant = await prisma.tenants.findFirst({
        where: { slug: tenantSlug }
      })
    } else {
      // We're on the main site, use default tenant
      targetTenant = await prisma.tenants.findFirst({
        where: { slug: 'default' }
      })
    }

    if (!targetTenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 500 })
    }

    try {
      // Create both user profile and membership in a transaction
      await prisma.$transaction(async (tx) => {
        // Create user profile
        await tx.user_profiles.create({
          data: {
            id: user.id,
            email: user.email!,
            display_name: displayName || null,
            role: 'PARENT',
            tenant_id: targetTenant.id,
            created_at: new Date(),
            updated_at: new Date()
          }
        })

        // Create membership to associate user with tenant
        await tx.memberships.create({
          data: {
            user_id: user.id,
            tenant_id: targetTenant.id,
            role: 'PARENT',
            created_at: new Date()
          }
        })
      })

      return NextResponse.json({
        success: true,
        tenantSlug: targetTenant.slug,
        userId: user.id
      })
    } catch (dbError) {
      console.error('Profile creation failed:', dbError)
      return NextResponse.json({ error: 'Database insert failed' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error creating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

