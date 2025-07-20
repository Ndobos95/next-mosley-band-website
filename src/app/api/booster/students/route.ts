import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session?.user || session.user.role !== 'BOOSTER') {
      return NextResponse.json(
        { error: 'Unauthorized - Booster access required' },
        { status: 403 }
      )
    }

    // Boosters need access to students for payment resolution
    const students = await prisma.student.findMany({
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

    return NextResponse.json(students)
  } catch (error) {
    console.error('Error fetching students for booster:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}