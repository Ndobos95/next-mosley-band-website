// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { db } from '@/lib/drizzle'
import { students, studentParents } from '@/db/schema'
import { asc, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a director
    if (session.user.role !== 'DIRECTOR') {
      return NextResponse.json({ error: 'Forbidden - Director access required' }, { status: 403 })
    }

    // Get all ROSTER students that are unclaimed (no active parent relationships)
    const unclaimedStudents = await db
      .select({ id: students.id, name: students.name, instrument: students.instrument, source: students.source })
      .from(students)
      .where(
        sql`(${students}.tenant_id = ${tenant.id}) AND (${students}.source = 'ROSTER') AND NOT EXISTS (SELECT 1 FROM ${studentParents} sp WHERE sp.tenant_id = ${tenant.id} AND sp.student_id = ${students}.id AND sp.status = 'ACTIVE' AND sp.deleted_at IS NULL)`
      )
      .orderBy(asc(students.name))

    console.log(`Director ${session.user.name} requested unclaimed students:`, {
      count: unclaimedStudents.length
    })

    return NextResponse.json({ 
      students: unclaimedStudents 
    })

  } catch (error) {
    console.error('Error fetching unclaimed students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}