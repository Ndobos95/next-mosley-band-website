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

    // Get all ROSTER students that are unclaimed (no active parent relationships)
    const unclaimedStudents = await prisma.student.findMany({
      where: {
        source: 'ROSTER',
        parents: {
          none: {
            status: 'ACTIVE',
            deletedAt: null
          }
        }
      },
      select: {
        id: true,
        name: true,
        instrument: true,
        source: true
      },
      orderBy: {
        name: 'asc'
      }
    })

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