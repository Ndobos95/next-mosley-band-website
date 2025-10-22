import { NextRequest, NextResponse } from 'next/server'
import { requireTenant } from '@/lib/auth-context'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Extract tenant slug from query parameter
    const tenantSlug = request.nextUrl.searchParams.get('tenant')

    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 400 })
    }

    // Get authenticated user and tenant context (session-only approach)
    const { user, tenant } = await requireTenant(tenantSlug)

    // Fetch parent's students (exclude rejected ones)
    const relationships = await prisma.student_parents.findMany({
      where: {
        tenant_id: tenant.id,
        user_id: user.id,
        deleted_at: null,
        status: { not: 'REJECTED' }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    // Fetch student data for matched relationships
    const studentIds = relationships.map(r => r.student_id)
    const students = await prisma.students.findMany({
      where: {
        id: { in: studentIds }
      }
    })
    const studentMap = new Map(students.map(s => [s.id, s]))

    const studentsList = relationships.map(sp => {
      const student = studentMap.get(sp.student_id)
      return {
        id: sp.student_id,
        name: student?.name || null,
        instrument: student?.instrument || null,
        status: sp.status,
        relationshipId: sp.id,
        createdAt: sp.created_at,
      }
    })

    return NextResponse.json({ students: studentsList })
  } catch (error) {
    console.error('Error fetching students:', error)

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}