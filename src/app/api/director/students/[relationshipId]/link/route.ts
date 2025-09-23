// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'



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
    const { targetStudentId } = body

    if (!targetStudentId) {
      return NextResponse.json({ error: 'Target student ID is required' }, { status: 400 })
    }

    // Get the relationship ID from params
    const { relationshipId } = await params

    // Get the current relationship with student info
    const currentRelationship = (
      await db
        .select({
          id: studentParents.id,
          status: studentParents.status,
          studentId: studentParents.studentId,
          parentId: users.id,
          parentName: users.name,
          parentEmail: users.email,
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

    if (!currentRelationship) {
      return NextResponse.json({ error: 'Student-parent relationship not found' }, { status: 404 })
    }

    if (currentRelationship.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `Cannot link relationship with status: ${currentRelationship.status}` 
      }, { status: 400 })
    }

    // Verify the current student is from parent registration
    if (currentRelationship.student.source !== 'PARENT_REGISTRATION') {
      return NextResponse.json({ 
        error: 'Can only link students created from parent registration' 
      }, { status: 400 })
    }

    // Get the target student (must be ROSTER and unclaimed)
    const targetStudent = (
      await prisma.select().from(students).where(eq(students.id, targetStudentId)).limit(1)
    )[0]

    if (!targetStudent) {
      return NextResponse.json({ error: 'Target student not found' }, { status: 404 })
    }

    if (targetStudent.source !== 'ROSTER') {
      return NextResponse.json({ 
        error: 'Target student must be from the official roster' 
      }, { status: 400 })
    }

    // Check if target student is already claimed
    const existingClaim = (
      await db
        .select()
        .from(studentParents)
        .where(and(eq(studentParents.studentId, targetStudentId), eq(studentParents.status, 'ACTIVE'), isNull(studentParents.deletedAt)))
        .limit(1)
    )[0]
    if (existingClaim) {
      return NextResponse.json({ 
        error: 'Target student is already claimed by another parent' 
      }, { status: 400 })
    }

    // Perform the link operation in a transaction
    await prisma.transaction(async (tx) => {
      await tx.update(studentParents).set({
        studentId: targetStudentId,
        status: 'ACTIVE',
        updatedAt: new Date(),
      }).where(eq(studentParents.id, relationshipId))

      await tx.delete(students).where(eq(students.id, currentRelationship.studentId))
    })

    console.log(`Director ${session.user.name} linked parent registration:`, {
      relationshipId,
      parentName: currentRelationship.parentName,
      fromStudent: currentRelationship.studentName,
      toStudent: targetStudent.name,
      targetStudentId
    })

    // Return success with updated relationship data
    return NextResponse.json({
      success: true,
      message: `Successfully linked ${currentRelationship.parentName} to ${targetStudent.name}`,
      relationship: {
        id: relationshipId,
        status: 'ACTIVE',
        student: {
          id: targetStudent.id,
          name: targetStudent.name,
          instrument: targetStudent.instrument,
          source: targetStudent.source
        },
        parent: { id: currentRelationship.parentId, name: currentRelationship.parentName, email: currentRelationship.parentEmail }
      }
    })

  } catch (error) {
    console.error(`Error linking student relationship:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}