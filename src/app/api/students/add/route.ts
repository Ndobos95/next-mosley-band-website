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

    const { name, instrument } = await request.json()

    if (!name || !instrument) {
      return NextResponse.json({ error: 'Name and instrument are required' }, { status: 400 })
    }

    // Fuzzy matching against the roster
    const normalizedInput = name.toLowerCase().trim()
    const rosterStudents = await prisma.student.findMany()
    
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
      const existingClaim = await prisma.studentParent.findFirst({
        where: {
          studentId: match.id,
          deletedAt: null
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
      await prisma.studentParent.create({
        data: {
          userId: session.user.id,
          studentId: match.id,
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
      const newStudent = await prisma.student.create({
        data: {
          name: name.trim(),
          instrument: instrument.trim(),
          source: 'PARENT_REGISTRATION'
        }
      })

      await prisma.studentParent.create({
        data: {
          userId: session.user.id,
          studentId: newStudent.id,
          status: 'PENDING'
        }
      })

      console.log('Created new student for parent registration:', {
        studentId: newStudent.id,
        studentName: newStudent.name,
        parentName: session.user.name,
        status: 'PENDING'
      })

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