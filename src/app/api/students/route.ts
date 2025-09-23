import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/auth-context'
import { prisma } from '@/lib/prisma'



export async function GET(_request: NextRequest) {
  try {
    // Get authenticated user and tenant context
    const { user, tenant } = await requireTenant()

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
      .where(and(
        eq(studentParents.tenantId, tenant.id), 
        eq(studentParents.userId, user.id), 
        isNull(studentParents.deletedAt), 
        ne(studentParents.status, 'REJECTED')
      ))
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
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}