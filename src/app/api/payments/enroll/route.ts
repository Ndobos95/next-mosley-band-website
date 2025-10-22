import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { enrollStudentInCategory, unenrollStudentFromCategory } from '@/lib/stripe-cache';
import type { EnrollmentRequest } from '@/types/stripe';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract tenant slug from query params (passed by client)
    const tenantSlug = request.nextUrl.searchParams.get('tenant')
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 400 })
    }

    const body: EnrollmentRequest = await request.json();
    const { studentId, category } = body;

    if (!studentId || !category) {
      return NextResponse.json({
        error: 'Missing required fields: studentId, category'
      }, { status: 400 });
    }

    // Get user profile for tenant info
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: user.id }
    });

    if (!userProfile?.tenant_id) {
      return NextResponse.json({ error: 'User profile or tenant not found' }, { status: 404 });
    }

    // Verify the student-parent relationship exists and is active
    const sp = await prisma.student_parents.findFirst({
      where: {
        tenant_id: userProfile.tenant_id,
        user_id: user.id,
        student_id: studentId,
        status: 'ACTIVE',
        deleted_at: null,
      }
    });

    if (!sp) {
      return NextResponse.json({
        error: 'Student not found or not authorized for this parent'
      }, { status: 404 });
    }

    // Get student name
    const student = await prisma.students.findUnique({
      where: { id: studentId },
      select: { name: true }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Enroll the student in the category
    const success = await enrollStudentInCategory(
      user.id,
      studentId,
      student.name,
      category
    );

    if (!success) {
      return NextResponse.json({
        error: 'Failed to enroll student in category'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully enrolled ${student.name} in ${category}`
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
    // Get authenticated user from Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Extract tenant slug from query params (passed by client)
    const tenantSlug = request.nextUrl.searchParams.get('tenant')
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Missing tenant parameter' }, { status: 400 })
    }

    const body: EnrollmentRequest = await request.json();
    const { studentId, category } = body;

    if (!studentId || !category) {
      return NextResponse.json({
        error: 'Missing required fields: studentId, category'
      }, { status: 400 });
    }

    // Get user profile for tenant info
    const userProfile = await prisma.user_profiles.findUnique({
      where: { id: user.id }
    });

    if (!userProfile?.tenant_id) {
      return NextResponse.json({ error: 'User profile or tenant not found' }, { status: 404 });
    }

    // Verify the student-parent relationship exists and is active
    const sp = await prisma.student_parents.findFirst({
      where: {
        tenant_id: userProfile.tenant_id,
        user_id: user.id,
        student_id: studentId,
        status: 'ACTIVE',
        deleted_at: null,
      }
    });

    if (!sp) {
      return NextResponse.json({
        error: 'Student not found or not authorized for this parent'
      }, { status: 404 });
    }

    // Get student name
    const student = await prisma.students.findUnique({
      where: { id: studentId },
      select: { name: true }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Unenroll the student from the category
    const success = await unenrollStudentFromCategory(
      user.id,
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
      message: `Successfully unenrolled ${student.name} from ${category}`
    });

  } catch (error) {
    console.error('Unenrollment API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
