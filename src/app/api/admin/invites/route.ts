import { NextRequest, NextResponse } from 'next/server'
import { createInviteCode, listInviteCodes } from '@/lib/invite-codes'

// Simple admin password check - you should set this in your environment variables
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme123!'

export async function GET(request: NextRequest) {
  try {
    // For GET requests, we'll allow public viewing of invite codes for now
    // In production, you'd want to add proper authentication here
    const invites = await listInviteCodes()
    
    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Error listing invite codes:', error)
    return NextResponse.json(
      { error: 'Failed to list invite codes' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { schoolName, directorEmail, adminPassword } = body

    // Validate admin password
    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!schoolName || !directorEmail) {
      return NextResponse.json(
        { error: 'School name and director email are required' },
        { status: 400 }
      )
    }

    // Generate the invite code
    const invite = await createInviteCode({
      schoolName,
      directorEmail,
      expiresInDays: 30
    })

    return NextResponse.json({ 
      success: true,
      invite 
    })
  } catch (error) {
    console.error('Error generating invite code:', error)
    return NextResponse.json(
      { error: 'Failed to generate invite code' },
      { status: 500 }
    )
  }
}