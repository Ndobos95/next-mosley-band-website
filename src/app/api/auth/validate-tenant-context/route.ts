import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/drizzle'
import { memberships, tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentEnvironment, getTenantUrl } from '@/lib/environment'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ 
        authenticated: false,
        requiresRedirect: false 
      })
    }

    // Get current hostname and expected tenant
    const { searchParams } = new URL(request.url)
    const currentTenantSlug = searchParams.get('tenantSlug')
    const hostname = searchParams.get('hostname')
    const originalPath = searchParams.get('originalPath') || '/dashboard'

    // Get user's tenant memberships
    const userMemberships = await db
      .select({
        tenantId: memberships.tenantId,
        tenantSlug: tenants.slug,
        role: memberships.role
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, user.id))
      .limit(1)
    
    if (userMemberships.length === 0) {
      // User has no tenant membership - redirect to main site
      return NextResponse.json({
        authenticated: true,
        requiresRedirect: true,
        redirectUrl: '/',
        reason: 'no_tenant_membership'
      })
    }
    
    const membership = userMemberships[0]
    const environment = getCurrentEnvironment()
    
    // Check if user is on wrong tenant subdomain
    if (currentTenantSlug && currentTenantSlug !== membership.tenantSlug) {
      const correctUrl = getTenantUrl(membership.tenantSlug, environment)
      return NextResponse.json({
        authenticated: true,
        requiresRedirect: true,
        redirectUrl: `${correctUrl}${originalPath}`,
        reason: 'wrong_tenant'
      })
    }
    
    // Check if user is on main site when they should be on tenant subdomain
    if (!currentTenantSlug && hostname?.includes('localhost:3000')) {
      const correctUrl = getTenantUrl(membership.tenantSlug, environment)
      return NextResponse.json({
        authenticated: true,
        requiresRedirect: true,
        redirectUrl: `${correctUrl}${originalPath}`,
        reason: 'main_site_when_should_be_tenant'
      })
    }
    
    // User is in correct context
    return NextResponse.json({
      authenticated: true,
      requiresRedirect: false,
      userTenant: membership.tenantSlug,
      userRole: membership.role
    })
    
  } catch (error) {
    console.error('Error validating tenant context:', error)
    return NextResponse.json({ 
      authenticated: false,
      requiresRedirect: false,
      error: 'validation_failed'
    })
  }
}