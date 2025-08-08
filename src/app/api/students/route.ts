// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/drizzle'
import { studentParents, students } from '@/db/schema'
import { and, desc, eq, isNull, ne } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch parent's students (exclude rejected ones)
    const relationships = await db
      .select({
        id: studentParents.id,
        status: studentParents.status,
        createdAt: studentParents.createdAt,
        studentId: studentParents.studentId,
        studentName: students.name,
        studentInstrument: students.instrument,
      })
      .from(studentParents)
      .leftJoin(students, eq(studentParents.studentId, students.id))
      .where(and(eq(studentParents.tenantId, session.user.tenantId as string), eq(studentParents.userId, session.user.id), isNull(studentParents.deletedAt), ne(studentParents.status, 'REJECTED')))
      .orderBy(desc(studentParents.createdAt))

    const studentsList = relationships.map(sp => ({
      id: sp.studentId,
      name: sp.studentName,
      instrument: sp.studentInstrument,
      status: sp.status,
      relationshipId: sp.id,
      createdAt: sp.createdAt,
    }))

    return NextResponse.json({ students: studentsList })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}