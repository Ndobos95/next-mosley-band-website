import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Get the current user session from Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to access tenant
    const profile = await prisma.user_profiles.findUnique({
      where: { id: user.id },
      select: { tenant_id: true, role: true }
    })

    if (!profile || !['DIRECTOR', 'BOOSTER'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get tenant from user profile (until multi-tenant middleware is implemented)
    const tenantId = profile.tenant_id
    if (!tenantId) {
      return NextResponse.json({ error: 'User profile missing tenant assignment' }, { status: 400 })
    }

    // Simple query - just get students for now
    const studentRows = await prisma.students.findMany({
      where: {
        tenant_id: tenantId
      }
    })

    console.log(`Found ${studentRows.length} students for tenant ${tenantId}`)

    // Return simplified data
    const studentsData = studentRows.map(student => ({
      id: student.id,
      name: student.name,
      instrument: student.instrument,
      // Simplified - no parent data for now
      parents: [],
      status: 'UNLINKED'
    }))

    return NextResponse.json({ students: studentsData })
  } catch (error) {
    console.error('Error fetching students for director:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}