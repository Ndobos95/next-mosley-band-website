import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role } = await request.json()

    // Validate role
    if (!role || !['PARENT', 'DIRECTOR', 'BOOSTER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Update the user's role in the database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { role }
    })

    // Note: Better Auth will pick up the database change on next session check
    // The page reload will refresh the session with the new role

    return NextResponse.json({ 
      success: true, 
      message: `Role updated to ${role}`,
      role 
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}