import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const students = await prisma.student.findMany({
      include: {
        parents: {
          where: {
            deletedAt: null
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log('Director Students API - Found students:', students.length)
    console.log('Director Students API - Students with parents:', students.filter(s => s.parents.length > 0).length)

    // Transform the data to match the frontend interface
    const studentsWithParents = students.map(student => {
      const parentRelationship = student.parents[0] // Get the first (most recent) parent relationship
      
      return {
        id: student.id,
        name: student.name,
        instrument: student.instrument,
        parentName: parentRelationship?.user.name || null,
        parentEmail: parentRelationship?.user.email || null,
        status: parentRelationship ? parentRelationship.status : 'UNCLAIMED',
        relationshipId: parentRelationship?.id || null,
        createdAt: parentRelationship?.createdAt || null
      }
    })

    return NextResponse.json({ students: studentsWithParents })
  } catch (error) {
    console.error('Error fetching students for director:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}