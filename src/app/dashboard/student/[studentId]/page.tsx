// @ts-nocheck
import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/drizzle';
import { students, studentParents, users, studentPaymentEnrollments, paymentCategories, payments, guestPayments } from '@/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { StudentDetails } from '@/components/student-details';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface StudentDetailsPageProps {
  params: Promise<{
    studentId: string;
  }>;
}

async function getStudentDetails(studentId: string) {
  try {
    // Import the stripe cache sync function
    const { syncStripeDataToUser } = await import('@/lib/stripe-cache');
    
    // Find the student first
    const studentRow = (
      await db.select().from(students).where(eq(students.id, studentId)).limit(1)
    )[0];
    if (!studentRow) return null;

    const parentsRows = await db
      .select({
        relationshipId: studentParents.id,
        status: studentParents.status,
        parentId: users.id,
        parentName: users.name,
        parentEmail: users.email,
        stripeCustomerId: users.stripeCustomerId,
      })
      .from(studentParents)
      .leftJoin(users, eq(studentParents.userId, users.id))
      .where(and(eq(studentParents.studentId, studentId), eq(studentParents.status, 'ACTIVE')))

    const enrollmentsRows = await db
      .select({
        enrollmentId: studentPaymentEnrollments.id,
        totalOwed: studentPaymentEnrollments.totalOwed,
        amountPaid: studentPaymentEnrollments.amountPaid,
        status: studentPaymentEnrollments.status,
        categoryId: paymentCategories.id,
        categoryName: paymentCategories.name,
      })
      .from(studentPaymentEnrollments)
      .leftJoin(paymentCategories, eq(studentPaymentEnrollments.categoryId, paymentCategories.id))
      .where(eq(studentPaymentEnrollments.studentId, studentId))

    const enrollmentIds = enrollmentsRows.map(e => e.enrollmentId)
    const paymentsRows = enrollmentIds.length
      ? await db
          .select({
            id: payments.id,
            enrollmentId: payments.enrollmentId,
            amount: payments.amount,
            status: payments.status,
            parentEmail: payments.parentEmail,
            studentName: payments.studentName,
            notes: payments.notes,
            createdAt: payments.createdAt,
          })
          .from(payments)
          .where(and(eq(payments.enrollmentId, enrollmentIds[0])))
      : []

    const guestPaymentsRows = await db
      .select({
        id: guestPayments.id,
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
      .where(eq(guestPayments.matchedStudentId, studentId))
      .orderBy(desc(guestPayments.createdAt))

    if (!studentRow) {
      return null;
    }

    // Sync Stripe data for all parents of this student to ensure database is current
    const parentUserIds = parentsRows.map(p => p.parentId);
    await Promise.allSettled(
      parentUserIds.map(userId => syncStripeDataToUser(userId))
    );

    // Transform enrollment data
    const paymentsByEnrollment = new Map<string, typeof paymentsRows>()
    for (const p of paymentsRows) {
      const list = paymentsByEnrollment.get(p.enrollmentId) || []
      list.push(p)
      paymentsByEnrollment.set(p.enrollmentId, list)
    }
    const enrollmentSummary = enrollmentsRows.map(enrollment => ({
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
        notes: payment.notes || undefined,
        createdAt: payment.createdAt.toISOString(),
      })),
    }))

    // Transform guest payments
    const guestPaymentsList = guestPaymentsRows.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      parentName: payment.parentName,
      parentEmail: payment.parentEmail,
      studentName: payment.studentName,
      categoryName: payment.categoryName,
      notes: payment.notes || undefined,
      createdAt: payment.createdAt.toISOString(),
      isGuest: true as const,
    }))

    // Calculate totals
    const totalOwed = enrollmentSummary.reduce((sum, e) => sum + e.totalOwed, 0);
    const totalPaid = enrollmentSummary.reduce((sum, e) => sum + e.amountPaid, 0);
    const guestPaymentTotal = guestPayments.reduce((sum, p) => sum + (p.status === 'COMPLETED' ? p.amount : 0), 0);

    return {
      id: studentRow.id,
      name: studentRow.name,
      instrument: studentRow.instrument,
      grade: studentRow.grade ? parseInt(studentRow.grade) : undefined,
      source: studentRow.source,
      parents: parentsRows.map(sp => ({
        id: sp.parentId,
        name: sp.parentName || 'Unknown',
        email: sp.parentEmail,
        status: sp.status,
        hasStripeAccount: !!sp.stripeCustomerId,
      })),
      enrollments: enrollmentSummary,
      guestPayments: guestPaymentsList,
      totalOwed,
      totalPaid: totalPaid + guestPaymentTotal,
      totalRemaining: totalOwed - totalPaid,
      createdAt: studentRow.createdAt.toISOString(),
      updatedAt: studentRow.updatedAt.toISOString(),
    };

  } catch (error) {
    console.error('Error fetching student details:', error);
    return null;
  }
}

export default async function StudentDetailsPage({ params }: StudentDetailsPageProps) {
  const session = await getSession();
  
  // Redirect if not authenticated
  if (!session?.user?.id) {
    redirect('/login');
  }

  // Check user role server-side
  const user = (
    await db.select({ role: users.role }).from(users).where(eq(users.id, session.user.id)).limit(1)
  )[0];

  // Only allow Directors and Boosters to access student details
  if (!user || !['DIRECTOR', 'BOOSTER'].includes(user.role)) {
    redirect('/dashboard');
  }
  
  const { studentId } = await params;
  const student = await getStudentDetails(studentId);
  
  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Student Not Found</h1>
          <p className="text-muted-foreground mb-4">
            The student you&apos;re looking for could not be found.
          </p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{student.name}</h1>
        <p className="text-muted-foreground">
          {student.instrument} • Grade {student.grade}
        </p>
      </div>
      
      <StudentDetails student={student} />
    </div>
  );
}