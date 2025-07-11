import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { enrollStudentInCategory, unenrollStudentFromCategory } from '@/lib/stripe-cache';
import type { EnrollmentRequest } from '@/types/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: EnrollmentRequest = await request.json();
    const { studentId, category } = body;

    if (!studentId || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, category' 
      }, { status: 400 });
    }

    // Verify the student-parent relationship exists and is active
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        student: true
      }
    });

    if (!studentParent) {
      return NextResponse.json({ 
        error: 'Student not found or not authorized for this parent' 
      }, { status: 404 });
    }

    // Enroll the student in the category
    const success = await enrollStudentInCategory(
      session.user.id,
      studentId,
      studentParent.student.name,
      category
    );

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to enroll student in category' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully enrolled ${studentParent.student.name} in ${category}` 
    });

  } catch (error) {
    console.error('Enrollment API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: EnrollmentRequest = await request.json();
    const { studentId, category } = body;

    if (!studentId || !category) {
      return NextResponse.json({ 
        error: 'Missing required fields: studentId, category' 
      }, { status: 400 });
    }

    // Verify the student-parent relationship exists and is active
    const studentParent = await prisma.studentParent.findFirst({
      where: {
        userId: session.user.id,
        studentId: studentId,
        status: 'ACTIVE',
        deletedAt: null
      },
      include: {
        student: true
      }
    });

    if (!studentParent) {
      return NextResponse.json({ 
        error: 'Student not found or not authorized for this parent' 
      }, { status: 404 });
    }

    // Unenroll the student from the category
    const success = await unenrollStudentFromCategory(
      session.user.id,
      studentId,
      category
    );

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to unenroll student from category' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully unenrolled ${studentParent.student.name} from ${category}` 
    });

  } catch (error) {
    console.error('Unenrollment API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}