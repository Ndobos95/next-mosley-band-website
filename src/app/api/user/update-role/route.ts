import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Get the current user session from Supabase
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { role } = await request.json()

    // Validate role
    if (!role || !['PARENT', 'DIRECTOR', 'BOOSTER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Update the user's role in the user_profiles table
    await prisma.user_profiles.update({
      where: {
        id: user.id
      },
      data: {
        role,
        updated_at: new Date()
      }
    })

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