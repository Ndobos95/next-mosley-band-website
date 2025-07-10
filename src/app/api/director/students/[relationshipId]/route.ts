import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
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
    const { action } = body

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 })
    }

    // Get the relationship ID from params
    const { relationshipId } = await params

    // Check if the relationship exists and is pending
    const existingRelationship = await prisma.studentParent.findUnique({
      where: { 
        id: relationshipId,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            instrument: true
          }
        }
      }
    })

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
    
    const updatedRelationship = await prisma.studentParent.update({
      where: { id: relationshipId },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        student: {
          select: {
            id: true,
            name: true,
            instrument: true,
            source: true
          }
        }
      }
    })

    // If approving a PARENT_REGISTRATION student, promote it to ROSTER
    if (action === 'approve' && updatedRelationship.student.source === 'PARENT_REGISTRATION') {
      await prisma.student.update({
        where: { id: updatedRelationship.student.id },
        data: { source: 'ROSTER' }
      })
      
      console.log(`Promoted student ${updatedRelationship.student.name} from PARENT_REGISTRATION to ROSTER`)
    }

    console.log(`Director ${session.user.name} ${action}d student relationship:`, {
      relationshipId,
      studentName: updatedRelationship.student.name,
      parentName: updatedRelationship.user.name,
      newStatus
    })

    // Return the updated relationship data
    return NextResponse.json({
      success: true,
      action,
      relationship: {
        id: updatedRelationship.id,
        status: updatedRelationship.status,
        student: updatedRelationship.student,
        parent: updatedRelationship.user,
        updatedAt: updatedRelationship.updatedAt
      }
    })

  } catch (error) {
    console.error(`Error ${request.method} /api/director/students/[relationshipId]:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}