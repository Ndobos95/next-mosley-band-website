// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/drizzle'
import { students, studentParents, users } from '@/db/schema'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'

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

    // Fetch all students from the roster with their parent relationships
    const studentRows = await db.select().from(students).where(eq(students.tenantId, tenant.id)).orderBy(asc(students.name))
    const studentIds = studentRows.map(s => s.id)
    const parentRows = await db
      .select({
        relationshipId: studentParents.id,
        studentId: studentParents.studentId,
        status: studentParents.status,
        createdAt: studentParents.createdAt,
        parentId: users.id,
        parentName: users.name,
        parentEmail: users.email,
      })
      .from(studentParents)
      .leftJoin(users, eq(studentParents.userId, users.id))
      .where(and(eq(studentParents.tenantId, tenant.id), isNull(studentParents.deletedAt)))
      .orderBy(desc(studentParents.createdAt))

    console.log('Director Students API - Found students:', students.length)
    console.log('Director Students API - Students with parents:', students.filter(s => s.parents.length > 0).length)

    // Transform the data to match the frontend interface
    const parentsByStudent = new Map<string, typeof parentRows>()
    for (const p of parentRows) {
      const list = parentsByStudent.get(p.studentId) || []
      list.push(p)
      parentsByStudent.set(p.studentId, list)
    }
    const studentsWithParents = studentRows.map(student => {
      const rel = (parentsByStudent.get(student.id) || [])[0]
      return {
        id: student.id,
        name: student.name,
        instrument: student.instrument,
        source: student.source,
        parentName: rel?.parentName || null,
        parentEmail: rel?.parentEmail || null,
        status: rel ? rel.status : 'UNCLAIMED',
        relationshipId: rel?.relationshipId || null,
        createdAt: rel?.createdAt || null,
      }
    })

    return NextResponse.json({ students: studentsWithParents })
  } catch (error) {
    console.error('Error fetching students for director:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}