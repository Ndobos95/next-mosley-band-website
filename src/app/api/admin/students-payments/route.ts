import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { syncStripeDataToUser } from '@/lib/stripe-cache';

export async function GET(request: NextRequest) {
  try {
    // Get the current user session from Supabase
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is director or booster
    const profile = (
      await prisma.select({ role: userProfiles.role }).from(userProfiles).where(eq(userProfiles.id, user.id)).limit(1)
    )[0];

    if (!profile || !['DIRECTOR', 'BOOSTER'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get tenant from request headers
    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    // Get users with Stripe data in this tenant
    const usersWithStripeData = await db
      .select({ userId: stripeCache.userId })
      .from(stripeCache)

    // Sync payment data for all users in parallel
    await Promise.allSettled(
      usersWithStripeData.map(u => syncStripeDataToUser(u.userId))
    );

    // Get all students with their enrollment and payment data for this tenant
    const studentRows = await db
      .select()
      .from(students)
      .where(sql`${students.tenantId} = ${tenantId}::uuid`)
      .orderBy(asc(students.name))
    
    const parentRows = await db
      .select({
        studentId: studentParents.studentId,
        parentName: userProfiles.displayName,
        parentEmail: userProfiles.email,
        status: studentParents.status,
      })
      .from(studentParents)
      .leftJoin(userProfiles, eq(studentParents.userId, userProfiles.id))
      .where(and(
        sql`${studentParents.tenantId} = ${tenantId}::uuid`,
        eq(studentParents.status, 'ACTIVE')
      ))
    
    const enrollmentRows = await db
      .select({
        enrollmentId: studentPaymentEnrollments.id,
        studentId: studentPaymentEnrollments.studentId,
        totalOwed: studentPaymentEnrollments.totalOwed,
        amountPaid: studentPaymentEnrollments.amountPaid,
        status: studentPaymentEnrollments.status,
        categoryId: paymentCategories.id,
        categoryName: paymentCategories.name,
      })
      .from(studentPaymentEnrollments)
      .leftJoin(paymentCategories, eq(studentPaymentEnrollments.categoryId, paymentCategories.id))
      .where(sql`${studentPaymentEnrollments.tenantId} = ${tenantId}::uuid`)
    
    const paymentRows = await db
      .select({
        id: paymentsTable.id,
        enrollmentId: paymentsTable.enrollmentId,
        amount: paymentsTable.amount,
        status: paymentsTable.status,
        parentEmail: paymentsTable.parentEmail,
        studentName: paymentsTable.studentName,
        notes: paymentsTable.notes,
        createdAt: paymentsTable.createdAt,
      })
      .from(paymentsTable)
      .where(sql`${paymentsTable.tenantId} = ${tenantId}::uuid`)
    
    const guestPaymentRows = await db
      .select()
      .from(guestPayments)
      .where(sql`${guestPayments.tenantId} = ${tenantId}::uuid`)

    // Build student payment overview
    const studentsWithPayments = studentRows.map(student => {
      const parent = parentRows.find(p => p.studentId === student.id);
      const enrollments = enrollmentRows.filter(e => e.studentId === student.id);
      const enrollmentIds = enrollments.map(e => e.enrollmentId);
      const payments = paymentRows.filter(p => enrollmentIds.includes(p.enrollmentId));
      
      // Guest payments that have been matched to this student
      const matchedGuestPayments = guestPaymentRows.filter(gp => 
        gp.matchedStudentId === student.id && 
        gp.resolvedAt && 
        gp.status === 'COMPLETED'
      );

      const totalOwed = enrollments.reduce((sum, e) => sum + e.totalOwed, 0);
      const totalPaid = enrollments.reduce((sum, e) => sum + e.amountPaid, 0);

      return {
        id: student.id,
        name: student.name,
        instrument: student.instrument,
        parentName: parent?.parentName || null,
        parentEmail: parent?.parentEmail || null,
        status: parent?.status || 'UNLINKED',
        enrollments: enrollments.map(e => ({
          category: e.categoryName || 'Unknown',
          totalOwed: e.totalOwed,
          amountPaid: e.amountPaid,
          status: e.status,
        })),
        payments: payments.map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          notes: p.notes,
          parentEmail: p.parentEmail,
          studentName: p.studentName,
          createdAt: p.createdAt,
        })),
        guestPayments: matchedGuestPayments.map(gp => ({
          id: gp.id,
          amount: gp.amount,
          status: gp.status,
          parentName: gp.parentName,
          parentEmail: gp.parentEmail,
          notes: gp.notes,
          createdAt: gp.createdAt,
        })),
        totalOwed,
        totalPaid,
      };
    });

    return NextResponse.json({ students: studentsWithPayments });
  } catch (error) {
    console.error('Get students payments API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}