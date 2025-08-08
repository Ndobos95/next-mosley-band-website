// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/drizzle';
import { users, students, studentParents, studentPaymentEnrollments, paymentCategories, payments as paymentsTable, guestPayments } from '@/db/schema';
import { and, asc, desc, eq, isNull, ne } from 'drizzle-orm';
import { syncStripeDataToUser } from '@/lib/stripe-cache';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is director or booster
    const user = (
      await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1)
    )[0];

    if (!user || !['DIRECTOR', 'BOOSTER'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Sync Stripe data for all users with payment data to ensure database is current
    const usersWithStripeData = await db
      .select({ id: users.id })
      .from(users)
      .where(ne(users.stripeCustomerId, null as unknown as string))

    // Sync payment data for all users in parallel
    await Promise.allSettled(
      usersWithStripeData.map(user => syncStripeDataToUser(user.id))
    );

    // Get all students with their enrollment and payment data
    const studentRows = await db.select().from(students).orderBy(asc(students.name))
    const parentRows = await db
      .select({
        studentId: studentParents.studentId,
        parentName: users.name,
        parentEmail: users.email,
        status: studentParents.status,
      })
      .from(studentParents)
      .leftJoin(users, eq(studentParents.userId, users.id))
      .where(eq(studentParents.status, 'ACTIVE'))
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
      .orderBy(desc(paymentsTable.createdAt))
    const guestPaymentRows = await db
      .select({
        id: guestPayments.id,
        studentId: guestPayments.matchedStudentId,
        amount: guestPayments.amount,
        status: guestPayments.status,
        parentName: guestPayments.parentName,
        parentEmail: guestPayments.parentEmail,
        studentName: guestPayments.studentName,
        categoryName: paymentCategories.name,
        notes: guestPayments.notes,
        createdAt: guestPayments.createdAt,
        resolvedAt: guestPayments.resolvedAt,
      })
      .from(guestPayments)
      .leftJoin(paymentCategories, eq(guestPayments.categoryId, paymentCategories.id))
      .orderBy(desc(guestPayments.createdAt))

    // Transform data for easier frontend consumption
    const parentsByStudent = new Map<string, { name: string | null; email: string | null; status: string }[]>()
    for (const p of parentRows) {
      const list = parentsByStudent.get(p.studentId) || []
      list.push({ name: p.parentName, email: p.parentEmail, status: p.status })
      parentsByStudent.set(p.studentId, list)
    }
    const paymentsByEnrollment = new Map<string, typeof paymentRows>()
    for (const pr of paymentRows) {
      const list = paymentsByEnrollment.get(pr.enrollmentId) || []
      list.push(pr)
      paymentsByEnrollment.set(pr.enrollmentId, list)
    }
    const guestByStudent = new Map<string, typeof guestPaymentRows>()
    for (const gp of guestPaymentRows) {
      const sid = gp.studentId || ''
      const list = guestByStudent.get(sid) || []
      list.push(gp)
      guestByStudent.set(sid, list)
    }
    const enrollmentsByStudent = new Map<string, typeof enrollmentRows>()
    for (const er of enrollmentRows) {
      const list = enrollmentsByStudent.get(er.studentId) || []
      list.push(er)
      enrollmentsByStudent.set(er.studentId, list)
    }
    const studentsWithPaymentSummary = studentRows.map(student => {
      const ers = enrollmentsByStudent.get(student.id) || []
      const enrollmentSummary = ers.map(enrollment => ({
        category: enrollment.categoryName,
        categoryId: enrollment.categoryId,
        totalOwed: enrollment.totalOwed,
        amountPaid: enrollment.amountPaid,
        remaining: enrollment.totalOwed - enrollment.amountPaid,
        status: enrollment.status,
        payments: (paymentsByEnrollment.get(enrollment.enrollmentId) || []).map(payment => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          parentEmail: payment.parentEmail,
          studentName: payment.studentName,
          notes: payment.notes,
          createdAt: payment.createdAt,
        })),
      }))
      const guestList = guestByStudent.get(student.id) || []
      const guestPaymentsSummary = guestList.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        parentName: payment.parentName,
        parentEmail: payment.parentEmail,
        studentName: payment.studentName,
        categoryName: payment.categoryName,
        notes: payment.notes,
        createdAt: payment.createdAt,
        resolvedAt: payment.resolvedAt,
        isGuest: true,
      }))
      const totalOwed = enrollmentSummary.reduce((sum, e) => sum + e.totalOwed, 0)
      const totalPaid = enrollmentSummary.reduce((sum, e) => sum + e.amountPaid, 0)
      const guestPaymentTotal = guestPaymentsSummary
        .filter(p => !p.resolvedAt)
        .reduce((sum, p) => sum + (p.status === 'COMPLETED' ? p.amount : 0), 0)
      return {
        id: student.id,
        name: student.name,
        instrument: student.instrument,
        grade: student.grade,
        source: student.source,
        parents: parentsByStudent.get(student.id) || [],
        enrollments: enrollmentSummary,
        guestPayments: guestPaymentsSummary,
        totalOwed,
        totalPaid: totalPaid + guestPaymentTotal,
        totalRemaining: totalOwed - totalPaid,
        createdAt: student.createdAt,
        updatedAt: student.updatedAt,
      }
    })

    return NextResponse.json({ 
      students: studentsWithPaymentSummary 
    });

  } catch (error) {
    console.error('Get students payments API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}