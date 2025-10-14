import { getSession } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
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
    const studentRow = await prisma.students.findUnique({
      where: { id: studentId }
    });

    if (!studentRow) return null;

    // Get parent relationships
    const parentsRows = await prisma.student_parents.findMany({
      where: {
        student_id: studentId,
        status: 'ACTIVE'
      },
      include: {
        // Note: This would need a relation defined in Prisma schema
        // For now, we'll do a separate query
      }
    });

    // Get user profiles for parents (manual join)
    const parentUserProfiles = await prisma.user_profiles.findMany({
      where: {
        id: { in: parentsRows.map(p => p.user_id) }
      }
    });

    // Create a map for easy lookup
    const userMap = new Map(parentUserProfiles.map(u => [u.id, u]));

    // Get enrollments
    const enrollmentsRows = await prisma.student_payment_enrollments.findMany({
      where: {
        student_id: studentId
      }
    });

    // Get payment categories for enrollments
    const categoryIds = enrollmentsRows.map(e => e.category_id);
    const categories = await prisma.payment_categories.findMany({
      where: {
        id: { in: categoryIds }
      }
    });
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Get payments for these enrollments
    const enrollmentIds = enrollmentsRows.map(e => e.id);
    const paymentsRows = enrollmentIds.length
      ? await prisma.payments.findMany({
          where: {
            enrollment_id: { in: enrollmentIds }
          }
        })
      : [];

    // Get guest payments for this student
    const guestPaymentsRows = await prisma.guest_payments.findMany({
      where: {
        matched_student_id: studentId
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Get categories for guest payments
    const guestCategoryIds = guestPaymentsRows.map(gp => gp.category_id);
    const guestCategories = await prisma.payment_categories.findMany({
      where: {
        id: { in: guestCategoryIds }
      }
    });
    const guestCategoryMap = new Map(guestCategories.map(c => [c.id, c]));

    // Sync Stripe data for all parents of this student to ensure database is current
    const parentUserIds = parentsRows.map(p => p.user_id);
    await Promise.allSettled(
      parentUserIds.map(userId => syncStripeDataToUser(userId))
    );

    // Transform enrollment data
    const paymentsByEnrollment = new Map<string, typeof paymentsRows>();
    for (const p of paymentsRows) {
      const list = paymentsByEnrollment.get(p.enrollment_id) || [];
      list.push(p);
      paymentsByEnrollment.set(p.enrollment_id, list);
    }

    const enrollmentSummary = enrollmentsRows.map(enrollment => {
      const category = categoryMap.get(enrollment.category_id);
      return {
        category: category?.name || 'Unknown',
        categoryId: enrollment.category_id,
        totalOwed: enrollment.total_owed,
        amountPaid: enrollment.amount_paid,
        remaining: enrollment.total_owed - enrollment.amount_paid,
        status: enrollment.status,
        payments: (paymentsByEnrollment.get(enrollment.id) || []).map(payment => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          parentEmail: payment.parent_email,
          studentName: payment.student_name,
          notes: payment.notes || undefined,
          createdAt: payment.created_at.toISOString(),
        })),
      };
    });

    // Transform guest payments
    const guestPaymentsList = guestPaymentsRows.map(payment => {
      const category = guestCategoryMap.get(payment.category_id);
      return {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        parentName: payment.parent_name,
        parentEmail: payment.parent_email,
        studentName: payment.student_name,
        categoryName: category?.name || 'Unknown',
        notes: payment.notes || undefined,
        createdAt: payment.created_at.toISOString(),
        isGuest: true as const,
      };
    });

    // Calculate totals
    const totalOwed = enrollmentSummary.reduce((sum, e) => sum + e.totalOwed, 0);
    const totalPaid = enrollmentSummary.reduce((sum, e) => sum + e.amountPaid, 0);
    const guestPaymentTotal = guestPaymentsRows.reduce(
      (sum, p) => sum + (p.status === 'COMPLETED' ? p.amount : 0),
      0
    );

    return {
      id: studentRow.id,
      name: studentRow.name,
      instrument: studentRow.instrument,
      grade: studentRow.grade ? parseInt(studentRow.grade) : undefined,
      source: studentRow.source,
      parents: parentsRows.map(sp => {
        const user = userMap.get(sp.user_id);
        return {
          id: sp.user_id,
          name: user?.display_name || 'Unknown',
          email: user?.email || '',
          status: sp.status,
          hasStripeAccount: false, // Note: would need to check stripe_customer_id if we add that field
        };
      }),
      enrollments: enrollmentSummary,
      guestPayments: guestPaymentsList,
      totalOwed,
      totalPaid: totalPaid + guestPaymentTotal,
      totalRemaining: totalOwed - totalPaid,
      createdAt: studentRow.created_at.toISOString(),
      updatedAt: studentRow.updated_at.toISOString(),
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
  const user = await prisma.user_profiles.findUnique({
    where: { id: session.user.id },
    select: { role: true }
  });

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
