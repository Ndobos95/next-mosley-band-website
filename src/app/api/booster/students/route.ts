import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user role
    const profile = await prisma.user_profiles.findUnique({
      where: { id: user.id },
      select: { role: true, tenant_id: true }
    })

    if (!profile || !['BOOSTER', 'DIRECTOR'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Booster/Director access required' },
        { status: 403 }
      )
    }

    // Get tenant from user profile (until multi-tenant middleware is implemented)
    const tenantId = profile.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'User profile missing tenant assignment' }, { status: 400 })
    }

    // Boosters need access to students for payment resolution
    const rows = await prisma.students.findMany({
      where: {
        tenant_id: tenantId
      },
      select: {
        id: true,
        name: true,
        instrument: true,
        source: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching students for booster:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}