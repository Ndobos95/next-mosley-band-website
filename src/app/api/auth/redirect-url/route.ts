import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'


import { getCurrentEnvironment, getTenantUrl } from '@/lib/environment'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      .limit(1) // For now, assume one tenant per user
    
    if (userMemberships.length === 0) {
      // No tenant membership - shouldn't happen but handle gracefully
      console.error('User has no tenant membership:', user.id)
      return NextResponse.json({ redirectUrl: '/dashboard' })
    }
    
    const membership = userMemberships[0]
    const environment = getCurrentEnvironment()
    
    // Generate the tenant-specific URL
    const tenantUrl = getTenantUrl(membership.tenantSlug, environment)
    const redirectUrl = `${tenantUrl}/dashboard`
    
    return NextResponse.json({ redirectUrl })
    
  } catch (error) {
    console.error('Error getting login redirect URL:', error)
    return NextResponse.json({ redirectUrl: '/dashboard' })
  }
}