import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/drizzle'
import { userProfiles, tenants } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, displayName } = await request.json()

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // Create user profile
    await db.insert(userProfiles).values({
      id: userId,
      email,
      displayName: displayName || null,
      role: 'PARENT', // Default role
      tenantId: defaultTenant[0].id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating user profile:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}