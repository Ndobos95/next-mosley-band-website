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

    // Fetch parent's students
    const studentParents = await prisma.studentParent.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null
      },
      include: {
        student: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const students = studentParents.map(sp => ({
      id: sp.student.id,
      name: sp.student.name,
      instrument: sp.student.instrument,
      status: sp.status,
      relationshipId: sp.id,
      createdAt: sp.createdAt
    }))

    return NextResponse.json({ students })
  } catch (error) {
    console.error('Error fetching students:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}