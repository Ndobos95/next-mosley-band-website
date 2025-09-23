import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-server'
import { prisma } from '@/lib/prisma'
import { EmailService } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, instrument } = await request.json()

    if (!name || !instrument) {
      return NextResponse.json({ error: 'Name and instrument are required' }, { status: 400 })
    }

    // Fuzzy matching against the roster
    const normalizedInput = name.toLowerCase().trim()
    const rosterStudents = await prisma.students.findMany({
      where: { tenant_id: session.user.tenantId as string }
    })
    
    // First, find all name matches
    const nameMatches = rosterStudents.filter(student => {
      const studentName = student.name.toLowerCase()
      
      // Check if names match (contains or similar)
      return studentName.includes(normalizedInput) || 
             normalizedInput.includes(studentName) ||
             studentName.split(' ').some(word => normalizedInput.includes(word))
    })
    
    let match = null
    
    if (nameMatches.length === 1) {
      // Single name match - use it regardless of instrument
      match = nameMatches[0]
    } else if (nameMatches.length > 1) {
      // Multiple name matches - use instrument to resolve conflict
      const inputInstrument = instrument.toLowerCase()
      match = nameMatches.find(student => 
        student.instrument.toLowerCase() === inputInstrument
      )
      
      // If no instrument match found among name matches, director will need to assign
      if (!match) {
        match = null // Forces manual review by director
      }
    }

    if (match) {
      // Check if this student is already claimed by another parent
      const existingClaim = await prisma.student_parents.findFirst({
        where: {
          student_id: match.id,
          deleted_at: null
        }
      })

      if (existingClaim) {
        // Student already claimed - needs director review
        return NextResponse.json({
          success: false,
          status: 'pending',
          message: 'Your account is being set up. A director will review your registration shortly.'
        })
      }

      // Create the student-parent relationship
      await prisma.student_parents.create({
        data: {
          id: crypto.randomUUID(),
          tenant_id: session.user.tenantId as string,
          user_id: session.user.id,
          student_id: match.id,
          status: 'ACTIVE'
        }
      })

      return NextResponse.json({
        success: true,
        status: 'matched',
        message: 'Match found! Student has been added to your account.',
        student: {
          id: match.id,
          name: match.name,
          instrument: match.instrument
        }
      })
    } else {
      // No match found - create new student and pending relationship
      const newStudent = await prisma.students.create({
        data: {
          id: crypto.randomUUID(),
          tenant_id: session.user.tenantId as string,
          name: name.trim(),
          instrument: instrument.trim(),
          source: 'PARENT_REGISTRATION'
        }
      })

      await prisma.student_parents.create({
        data: {
          id: crypto.randomUUID(),
          tenant_id: session.user.tenantId as string,
          user_id: session.user.id,
          student_id: newStudent.id,
          status: 'PENDING'
        }
      })

      console.log('Created new student for parent registration:', {
        studentId: newStudent.id,
        studentName: newStudent.name,
        parentName: session.user.name,
        status: 'PENDING'
      })

      // Send director notification for unmatched registration
      try {
        await EmailService.sendDirectorNotification({
          parentName: session.user.name || 'Parent',
          parentEmail: session.user.email,
          studentName: newStudent.name,
          instrument: newStudent.instrument,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
        })
      } catch (emailError) {
        console.error('Failed to send director notification:', emailError)
        // Don't fail the request if email fails
      }

      return NextResponse.json({
        success: false,
        status: 'pending',
        message: 'Your account is being set up. A director will review your registration shortly.'
      })
    }
  } catch (error) {
    console.error('Error adding student:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}