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
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parents: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                stripeCustomerId: true
              }
            }
          },
          where: {
            status: 'ACTIVE'
          }
        },
        enrollments: {
          include: {
            category: true,
            payments: {
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        guestPayments: {
          include: {
            category: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!student) {
      return null;
    }

    // Sync Stripe data for all parents of this student to ensure database is current
    const parentUserIds = student.parents.map(sp => sp.user.id);
    await Promise.allSettled(
      parentUserIds.map(userId => syncStripeDataToUser(userId))
    );

    // Transform enrollment data
    const enrollmentSummary = student.enrollments.map(enrollment => ({
      category: enrollment.category.name,
      categoryId: enrollment.category.id,
      totalOwed: enrollment.totalOwed,
      amountPaid: enrollment.amountPaid,
      remaining: enrollment.totalOwed - enrollment.amountPaid,
      status: enrollment.status,
      payments: enrollment.payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        parentEmail: payment.parentEmail,
        studentName: payment.studentName,
        notes: payment.notes || undefined,
        createdAt: payment.createdAt.toISOString()
      }))
    }));

    // Transform guest payments
    const guestPayments = student.guestPayments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      parentName: payment.parentName,
      parentEmail: payment.parentEmail,
      studentName: payment.studentName,
      categoryName: payment.category.name,
      notes: payment.notes || undefined,
      createdAt: payment.createdAt.toISOString(),
      isGuest: true as const
    }));

    // Calculate totals
    const totalOwed = enrollmentSummary.reduce((sum, e) => sum + e.totalOwed, 0);
    const totalPaid = enrollmentSummary.reduce((sum, e) => sum + e.amountPaid, 0);
    const guestPaymentTotal = guestPayments.reduce((sum, p) => sum + (p.status === 'COMPLETED' ? p.amount : 0), 0);

    return {
      id: student.id,
      name: student.name,
      instrument: student.instrument,
      grade: student.grade ? parseInt(student.grade) : undefined,
      source: student.source,
      parents: student.parents.map(sp => ({
        id: sp.user.id,
        name: sp.user.name || 'Unknown',
        email: sp.user.email,
        status: sp.status,
        hasStripeAccount: !!sp.user.stripeCustomerId
      })),
      enrollments: enrollmentSummary,
      guestPayments,
      totalOwed,
      totalPaid: totalPaid + guestPaymentTotal,
      totalRemaining: totalOwed - totalPaid,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString()
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
  const user = await prisma.user.findUnique({
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