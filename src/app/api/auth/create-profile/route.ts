import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/drizzle'
import { userProfiles, tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { displayName } = await request.json()

    // Get the actual authenticated user from Supabase
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get default tenant (for now, all users go to default tenant)
    const defaultTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, 'default'))
      .limit(1)

    if (defaultTenant.length === 0) {
      return NextResponse.json({ error: 'Default tenant not found' }, { status: 500 })
    }

    // Create user profile with the correct authenticated user ID
    const profileData = {
      id: user.id,
      email: user.email!,
      displayName: displayName || null,
      role: 'PARENT' as const,
      tenantId: defaultTenant[0].id
    }
    
    await db.insert(userProfiles).values(profileData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}