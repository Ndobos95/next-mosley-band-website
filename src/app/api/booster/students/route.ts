// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/drizzle'
import { students } from '@/db/schema'
import { asc } from 'drizzle-orm'

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
    const rows = await db
      .select({ id: students.id, name: students.name, instrument: students.instrument, source: students.source })
      .from(students)
      .orderBy(asc(students.name))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching students for booster:', error)
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    )
  }
}