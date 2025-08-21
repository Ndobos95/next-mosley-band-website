// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { db } from '@/lib/drizzle'
import { studentParents, students, users } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ relationshipId: string }> }
) {
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

    // Parse request body
    const body = await request.json()
    const { action } = body

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 })
    }

    // Get the relationship ID from params
    const { relationshipId } = await params

    // Check if the relationship exists and is pending
    const existingRelationship = (
      await db
        .select({
          id: studentParents.id,
          status: studentParents.status,
          updatedAt: studentParents.updatedAt,
          parentId: users.id,
          parentName: users.name,
          parentEmail: users.email,
          studentId: students.id,
          studentName: students.name,
          studentInstrument: students.instrument,
          studentSource: students.source,
        })
        .from(studentParents)
        .leftJoin(users, eq(studentParents.userId, users.id))
        .leftJoin(students, eq(studentParents.studentId, students.id))
        .where(and(eq(studentParents.id, relationshipId), isNull(studentParents.deletedAt)))
        .limit(1)
    )[0]

    if (!existingRelationship) {
      return NextResponse.json({ error: 'Student-parent relationship not found' }, { status: 404 })
    }

    if (existingRelationship.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Cannot ${action} relationship with status: ${existingRelationship.status}` 
      }, { status: 400 })
    }

    // Update the relationship status
    const newStatus = action === 'approve' ? 'ACTIVE' : 'REJECTED'
    
    await db
      .update(studentParents)
      .set({ status: newStatus, updatedAt: new Date() })
      .where(eq(studentParents.id, relationshipId))
    const updatedRelationship = { ...existingRelationship, status: newStatus, updatedAt: new Date() }

    // If approving a PARENT_REGISTRATION student, promote it to ROSTER
    if (action === 'approve' && updatedRelationship.studentSource === 'PARENT_REGISTRATION') {
      await db.update(students).set({ source: 'ROSTER' }).where(eq(students.id, updatedRelationship.studentId))
      
      console.log(`Promoted student ${updatedRelationship.student.name} from PARENT_REGISTRATION to ROSTER`)
    }

    console.log(`Director ${session.user.name} ${action}d student relationship:`, {
      relationshipId,
      studentName: updatedRelationship.studentName,
      parentName: updatedRelationship.parentName,
      newStatus
    })

    // Return the updated relationship data
    return NextResponse.json({
      success: true,
      action,
      relationship: {
        id: updatedRelationship.id,
        status: updatedRelationship.status,
        student: { id: updatedRelationship.studentId, name: updatedRelationship.studentName, instrument: updatedRelationship.studentInstrument, source: updatedRelationship.studentSource },
        parent: { id: updatedRelationship.parentId, name: updatedRelationship.parentName, email: updatedRelationship.parentEmail },
        updatedAt: updatedRelationship.updatedAt
      }
    })

  } catch (error) {
    console.error(`Error ${request.method} /api/director/students/[relationshipId]:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}