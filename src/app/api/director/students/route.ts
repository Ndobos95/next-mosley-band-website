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

    // Get tenant from request headers (set by middleware)
    const tenantIdHeader = request.headers.get('x-tenant-id')
    if (!tenantIdHeader) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    // Simple query - just get students for now
    const studentRows = await db
      .select()
      .from(students)
      .where(sql`${students.tenantId} = ${tenantIdHeader}::uuid`)

    console.log(`Found ${studentRows.length} students for tenant ${tenantIdHeader}`)

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