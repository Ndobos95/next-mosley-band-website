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
      targetTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, tenantSlug))
        .limit(1)
    } else {
      // We're on the main site, use default tenant
      targetTenant = await db
        .select()
        .from(tenants)
        .where(eq(tenants.slug, 'default'))
        .limit(1)
    }

    if (!targetTenant || targetTenant.length === 0) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 500 })
    }

    // Create user profile with the correct authenticated user ID and tenant
    const profileData = {
      id: user.id,
      email: user.email!,
      displayName: displayName || null,
      role: 'PARENT' as const,
      tenantId: targetTenant[0].id
    }
    
    try {
      // Create both user profile and membership in a transaction
      await prisma.transaction(async (tx) => {
        // Create user profile
        await tx.insert(userProfiles).values(profileData)
        
        // Create membership to associate user with tenant
        await tx.insert(memberships).values({
          userId: user.id, // This should be text type from Supabase
          tenantId: targetTenant[0].id, // This should be UUID
          role: 'PARENT'
        })
      })
      
      return NextResponse.json({ 
        success: true, 
        tenantSlug: targetTenant[0].slug,
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

