import { NextResponse } from 'next/server'
import { getPostLoginRedirect, getUserTenantMemberships } from '@/lib/tenant-context'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // DEBUG: Check what's in the JWT
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    console.log('🔍 JWT DEBUG - User ID:', session?.user?.id)
    console.log('🔍 JWT DEBUG - Session user object:', JSON.stringify(session?.user, null, 2))
    console.log('🔍 JWT DEBUG - Session object keys:', Object.keys(session || {}))

    const memberships = await getUserTenantMemberships()
    console.log('🔍 JWT DEBUG - Memberships found:', memberships.length, JSON.stringify(memberships, null, 2))

    // Use the centralized post-login redirect logic
    const redirectUrl = await getPostLoginRedirect()

    if (!redirectUrl) {
      // No tenant memberships - should show error
      return NextResponse.json({
        error: 'No tenant access',
        debug: {
          userId: session?.user?.id,
          hasMemberships: memberships.length > 0,
          memberships: memberships
        }
      }, { status: 403 })
    }

    return NextResponse.json({ redirectUrl })

  } catch (error) {
    console.error('Error getting login redirect URL:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}