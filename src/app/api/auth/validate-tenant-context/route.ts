import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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

    // Check if user is a platform admin
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: user.id }
    })

    if (userProfile?.role === 'PLATFORM_ADMIN') {
      // Platform admins can access any tenant without restrictions
      return NextResponse.json({
        authenticated: true,
        requiresRedirect: false,
        userTenant: currentTenantSlug || 'platform',
        userRole: 'PLATFORM_ADMIN',
        isPlatformAdmin: true
      })
    }

    // Get user's tenant memberships
    const userMemberships = await prisma.memberships.findMany({
      where: { user_id: user.id },
      include: {
        tenants: {
          select: {
            id: true,
            slug: true
          }
        }
      },
      take: 1
    })
    
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
    if (currentTenantSlug && currentTenantSlug !== membership.tenants.slug) {
      const correctUrl = getTenantUrl(membership.tenants.slug, environment)
      return NextResponse.json({
        authenticated: true,
        requiresRedirect: true,
        redirectUrl: `${correctUrl}${originalPath}`,
        reason: 'wrong_tenant'
      })
    }
    
    // Check if user is on main site when they should be on tenant subdomain
    if (!currentTenantSlug && hostname?.includes('localhost:3000')) {
      const correctUrl = getTenantUrl(membership.tenants.slug, environment)
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
      userTenant: membership.tenants.slug,
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